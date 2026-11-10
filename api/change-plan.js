import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { requireUser, getOwnership, sendServerError } from './_auth.js';
import { PLAN_CATALOG, resolvePlanId, planAmountTtc, PRICING_GRID, isCurrentPricing } from '../shared/plans.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { clientId, planId } = req.body || {};
    // ADMIN : passer un client de l'ancienne grille au tarif actuel (même formule), dans Stripe ET dans le dossier.
    const alignGrid = req.body?.alignGrid === true;
    const catalog = PLAN_CATALOG[planId];
    if (!clientId || !catalog) {
        return res.status(400).json({ error: 'Paramètres invalides' });
    }

    const conn = getDbConn();
    if (!conn) {
        return res.status(500).json({ error: 'Configuration DB manquante' });
    }

    // Changement facturé immédiatement : l'appelant doit être le titulaire (ou l'admin).
    // Avant, connaître l'email (non secret) et l'id (horodatage) suffisait.
    const user = await requireUser(req, res);
    if (!user) return;

    try {
        if (!user.isAdmin) {
            const ownership = await getOwnership(conn, user);
            if (!ownership.ids.has(String(clientId))) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
        }
        const select = await conn.execute(
            'SELECT id, email, plan, extra_info FROM clients WHERE id = ?',
            [clientId]
        );
        const client = select.rows?.[0];
        if (!client) {
            return res.status(404).json({ error: 'Client introuvable' });
        }
        const email = String(client.email || '').trim().toLowerCase();

        // Double encodage géré ; JSON illisible → on REFUSE (sinon tout le dossier était écrasé par 3 champs).
        let extra;
        try {
            extra = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info || '{}') : (client.extra_info || {});
            if (typeof extra === 'string') extra = JSON.parse(extra);
        } catch {
            extra = null;
        }
        if (!extra || typeof extra !== 'object' || Array.isArray(extra)) {
            return res.status(500).json({ error: 'extra_info_unreadable', message: 'Dossier illisible : changement de formule impossible, contactez-nous.' });
        }

        if (alignGrid && !user.isAdmin) {
            return res.status(403).json({ error: 'Accès réservé à l’administration' });
        }
        const currentId = resolvePlanId(client.plan);
        // Passage au tarif actuel = MÊME formule (sinon montée en gamme gratuite jusqu'à l'échéance, sans prorata).
        if (alignGrid && currentId !== planId) {
            return res.status(400).json({ error: 'alignGrid_same_plan_only' });
        }
        if (currentId === planId && !(alignGrid && !isCurrentPricing(extra))) {
            return res.status(200).json({ ok: true, unchanged: true, plan: catalog.name, planId });
        }
        const saveGrid = async (customerId) => {
            const merged = {
                ...extra,
                offre: catalog.offre,
                grille_tarifaire: PRICING_GRID,
                ...(customerId ? { stripe_customer_id: customerId } : {}),
            };
            await conn.execute('UPDATE clients SET plan = ?, extra_info = ? WHERE id = ?', [catalog.name, JSON.stringify(merged), clientId]);
            return merged;
        };

        const stripe = getStripe();
        let customerId = extra.stripe_customer_id || extra.stripeCustomerId || null;
        if (!customerId) {
            const customers = await stripe.customers.list({
                email,
                limit: 1,
            });
            customerId = customers.data[0]?.id || null;
        }
        if (!customerId && alignGrid) {
            // Pas de paiement Stripe (facturation manuelle) : seul le dossier change.
            const merged = await saveGrid(null);
            return res.status(200).json({ ok: true, plan: catalog.name, planId, stripeUpdated: false, extra_info: merged });
        }
        if (!customerId) {
            return res.status(404).json({
                error: 'no_stripe',
                message: 'Aucun compte Stripe trouvé pour ce dossier.',
            });
        }

        const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 20,
        });
        // Pas de changement sur un abonnement en impayé : la facture de prorata
        // s'ajouterait à la dette (l'interface le bloquait déjà, le serveur non).
        if ((subs.data || []).some((s) => ['past_due', 'unpaid'].includes(s.status))) {
            return res.status(409).json({
                error: 'payment_issue',
                message: 'Régularisez d’abord le paiement en attente avant de changer de formule.',
            });
        }
        const sub = (subs.data || []).find((s) => ['active', 'trialing'].includes(s.status));
        if ((!sub || !sub.items?.data?.[0]) && alignGrid) {
            const merged = await saveGrid(customerId);
            return res.status(200).json({ ok: true, plan: catalog.name, planId, stripeUpdated: false, extra_info: merged });
        }
        if (!sub || !sub.items?.data?.[0]) {
            return res.status(404).json({
                error: 'no_subscription',
                message: 'Aucun abonnement Stripe actif.',
            });
        }

        const item = sub.items.data[0];
        const interval = item.price?.recurring?.interval
            || (extra.frequence === 'annuel' ? 'year' : 'month');
        const amountTtc = planAmountTtc(catalog.ht, interval);
        const unitAmount = Math.round(amountTtc * 100);

        const price = await stripe.prices.create({
            currency: 'eur',
            unit_amount: unitAmount,
            recurring: { interval },
            product_data: { name: `Forfait ${catalog.name}` },
        });

        await stripe.subscriptions.update(sub.id, {
            items: [{ id: item.id, price: price.id }],
            // Passage au tarif actuel : le nouveau prix s'applique à la prochaine échéance, sans facture de prorata.
            proration_behavior: alignGrid ? 'none' : 'always_invoice',
            metadata: {
                ...(sub.metadata || {}),
                planId,
                planName: catalog.name,
            },
        });

        // Un changement de formule se fait au tarif en vigueur : le client passe sur la grille actuelle.
        const merged = await saveGrid(customerId);

        return res.status(200).json({
            ok: true,
            plan: catalog.name,
            planId,
            amountTtc,
            stripeUpdated: true,
            extra_info: merged,
        });
    } catch (error) {
        return sendServerError(res, error, 'change-plan');
    }
}
