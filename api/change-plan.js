import fs from 'fs';
import { connect } from '@planetscale/database';
import { getStripe } from './_stripe-client.js';
import { PLAN_CATALOG, resolvePlanId, planAmountTtc } from '../shared/plans.js';

const readEnv = (key) => {
    if (process.env[key]) return process.env[key].trim().replace(/^['"]|['"]$/g, '');
    try {
        if (fs.existsSync('.env.local')) {
            const match = fs.readFileSync('.env.local', 'utf-8').match(new RegExp(`^${key}=(.*)`, 'm'));
            if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
        }
    } catch { /* ignore */ }
    return null;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { clientId, planId, email } = req.body || {};
    const catalog = PLAN_CATALOG[planId];
    if (!clientId || !email || !catalog) {
        return res.status(400).json({ error: 'Paramètres invalides' });
    }

    const dbHost = readEnv('VITE_DATABASE_HOST');
    const dbUsername = readEnv('VITE_DATABASE_USERNAME');
    const dbPassword = readEnv('VITE_DATABASE_PASSWORD');
    if (!dbHost || !dbUsername || !dbPassword) {
        return res.status(500).json({ error: 'Configuration DB manquante' });
    }

    try {
        const conn = connect({ host: dbHost, username: dbUsername, password: dbPassword });
        const select = await conn.execute(
            'SELECT id, email, plan, extra_info FROM clients WHERE id = ?',
            [clientId]
        );
        const client = select.rows?.[0];
        if (!client) {
            return res.status(404).json({ error: 'Client introuvable' });
        }
        if ((client.email || '').trim().toLowerCase() !== String(email).trim().toLowerCase()) {
            return res.status(403).json({ error: 'Email ne correspond pas au dossier' });
        }

        const currentId = resolvePlanId(client.plan);
        if (currentId === planId) {
            return res.status(200).json({ ok: true, unchanged: true, plan: catalog.name, planId });
        }

        let extra = {};
        try {
            extra = typeof client.extra_info === 'string'
                ? JSON.parse(client.extra_info)
                : (client.extra_info || {});
        } catch { extra = {}; }

        const stripe = getStripe();
        let customerId = extra.stripe_customer_id || extra.stripeCustomerId || null;
        if (!customerId) {
            const customers = await stripe.customers.list({
                email: String(email).trim().toLowerCase(),
                limit: 1,
            });
            customerId = customers.data[0]?.id || null;
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
        const sub = (subs.data || []).find((s) =>
            ['active', 'trialing', 'past_due'].includes(s.status)
        );
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
            proration_behavior: 'always_invoice',
            metadata: {
                ...(sub.metadata || {}),
                planId,
                planName: catalog.name,
            },
        });

        const merged = {
            ...extra,
            offre: catalog.offre,
            stripe_customer_id: customerId,
        };
        await conn.execute(
            'UPDATE clients SET plan = ?, extra_info = ? WHERE id = ?',
            [catalog.name, JSON.stringify(merged), clientId]
        );

        return res.status(200).json({
            ok: true,
            plan: catalog.name,
            planId,
            amountTtc,
            extra_info: merged,
        });
    } catch (error) {
        console.error('change-plan error:', error);
        return res.status(500).json({ error: error.message || 'Erreur lors du changement de formule' });
    }
}
