import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { getAuthUser, getOwnership, sendServerError } from './_auth.js';
import { PLAN_CATALOG, planAmountTtc, resolvePlanId } from '../shared/plans.js';
import { parseExtraInfo } from '../src/utils/contractLegalFields.js';
import { MEETING_TYPES, MEETING_DURATIONS, meetingPriceTtc } from '../src/utils/meetingPrices.js';

/** Stripe n’ajoute `{CHECKOUT_SESSION_ID}` que si on le met dans l’URL. Sans ça, le retour ne peut pas être vérifié. */
export function withCheckoutSessionId(url, origin) {
    const fallback = `${origin || ''}?success=true&session_id={CHECKOUT_SESSION_ID}`;
    if (!url || typeof url !== 'string') return fallback;
    if (url.includes('{CHECKOUT_SESSION_ID}') || /[?&]session_id=/.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
}

/** URL de retour limitée au site lui-même (pas de redirection ouverte via Stripe). */
export function sameOriginUrl(url, origin, fallback) {
    if (!url || typeof url !== 'string' || !origin) return fallback;
    try {
        const parsed = new URL(url, origin);
        return parsed.origin === new URL(origin).origin ? parsed.toString().replace(/%7B/g, '{').replace(/%7D/g, '}') : fallback;
    } catch {
        return fallback;
    }
}

const MEETING_TYPE_VALUES = new Set(Object.values(MEETING_TYPES));
const MEETING_DURATION_VALUES = new Set(Object.values(MEETING_DURATIONS));

/** « 2026-02-31 » ou « 2026-13-45 » ne sont pas des dates : on refuse (le format seul laissait tout passer). */
export function isRealCalendarDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return false;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(y, mo - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Date du jour à Paris (YYYY-MM-DD). */
export function todayInParis(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Paris' }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Le prix n'est JAMAIS lu dans la requête : il est déduit du forfait (PLAN_CATALOG) ou de la
 * prestation réservée (meetingPrices). Un `amount` envoyé par le navigateur est ignoré.
 */
export function resolveCheckoutPrice({ planId, interval, metadata = {} }) {
    if (interval === 'one_time') {
        const type = metadata.meeting_type;
        const duration = metadata.duration;
        if (metadata.type !== 'meeting_booking' || !MEETING_TYPE_VALUES.has(type) || !MEETING_DURATION_VALUES.has(duration)) {
            throw Object.assign(new Error('Réservation invalide'), { statusCode: 400 });
        }
        if (!isRealCalendarDate(String(metadata.date || ''))) {
            throw Object.assign(new Error('Date de réservation invalide'), { statusCode: 400 });
        }
        if (String(metadata.date) < todayInParis()) {
            throw Object.assign(new Error('La date de réservation est déjà passée'), { statusCode: 400 });
        }
        // Tarifs affichés HT : on encaisse le TTC (TVA 20 %). Avant, le HT était encaissé tel quel.
        return { amount: meetingPriceTtc(type, duration), mode: 'payment' };
    }
    const catalog = PLAN_CATALOG[planId];
    if (!catalog) throw Object.assign(new Error('Forfait inconnu'), { statusCode: 400 });
    if (interval !== 'month' && interval !== 'year') {
        throw Object.assign(new Error('Fréquence invalide'), { statusCode: 400 });
    }
    return { amount: planAmountTtc(catalog.ht, interval), mode: 'subscription', catalog };
}

const clip = (value, max = 200) => String(value ?? '').slice(0, max);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    let stripe;
    try {
        stripe = getStripe();
    } catch (error) {
        console.error('[checkout]', error);
        return res.status(500).json({ error: 'La Clé Secrète Stripe (STRIPE_SECRET_KEY) est manquante ou invalide.' });
    }

    try {
        const { productName, successUrl, cancelUrl, clientName } = req.body || {};
        let { planId } = req.body || {};
        const rawMetadata = (req.body?.metadata && typeof req.body.metadata === 'object') ? req.body.metadata : {};
        let interval = req.body?.interval;
        if (interval === 'annuel') interval = 'year';
        if (interval === 'mensuel') interval = 'month';
        let email = String(req.body?.email || '').trim().toLowerCase();

        // Abonnement : le forfait et la fréquence sont ceux de la demande enregistrée,
        // pas ceux de la requête (sinon : payer Essentiel et être validé en Premium).
        let demandeId;
        if (interval !== 'one_time') {
            demandeId = /^req_[A-Za-z0-9]+$/.test(String(rawMetadata.demande_id || '')) ? rawMetadata.demande_id : null;
            if (!demandeId) return res.status(400).json({ error: 'Demande de souscription manquante' });
            const conn = getDbConn();
            const found = conn ? await conn.execute('SELECT plan, email, status, extra_info FROM demandes WHERE id = ?', [demandeId]) : { rows: [] };
            const demande = found.rows?.[0];
            if (!demande || demande.status !== 'en_attente_paiement') {
                return res.status(400).json({ error: 'Demande introuvable ou déjà payée' });
            }
            const extra = parseExtraInfo(demande.extra_info);
            planId = resolvePlanId(demande.plan || extra.offre);
            interval = extra.frequence === 'annuel' ? 'year' : 'month';
            email = String(demande.email || email).trim().toLowerCase();
        }

        let price;
        try {
            price = resolveCheckoutPrice({ planId, interval, metadata: rawMetadata });
        } catch (err) {
            return res.status(err.statusCode || 400).json({ error: err.message });
        }

        // Métadonnées : liste blanche, et les valeurs serveur passent en dernier.
        let metadata;
        if (price.mode === 'payment') {
            // Réservation : client connecté et titulaire de la fiche indiquée.
            const user = await getAuthUser(req);
            if (!user || !user.email) return res.status(401).json({ error: 'Authentification requise' });
            const clientId = clip(rawMetadata.client_id, 50);
            if (!user.isAdmin) {
                const ownership = await getOwnership(getDbConn(), user);
                if (!ownership.ids.has(clientId)) return res.status(403).json({ error: 'Accès refusé' });
            }
            if (!email) email = user.email;
            metadata = {
                type: 'meeting_booking',
                client_id: clientId,
                meeting_type: rawMetadata.meeting_type,
                duration: rawMetadata.duration,
                date: clip(rawMetadata.date, 10),
                city: clip(rawMetadata.city, 80),
            };
        } else {
            metadata = { demande_id: demandeId, planId, interval };
        }
        metadata = { ...metadata, email, clientName: clip(clientName, 120) };

        const priceData = {
            currency: 'eur',
            // Abonnement : nom de la formule lu dans le catalogue (jamais celui envoyé par le navigateur).
            product_data: { name: price.catalog ? `Forfait ${price.catalog.name}` : (clip(productName, 200) || `Forfait ${planId}`) },
            unit_amount: Math.round(price.amount * 100), // centimes
        };
        if (price.mode === 'subscription') priceData.recurring = { interval };

        // --- Client Stripe : réutiliser l'existant, sinon créer (clé d'idempotence anti double-clic) ---
        let customerId = null;
        if (email) {
            try {
                const customers = await stripe.customers.list({ email, limit: 1 });
                if (customers.data.length > 0) {
                    customerId = customers.data[0].id;
                    if (clientName && !customers.data[0].name) {
                        await stripe.customers.update(customerId, { name: clip(clientName, 120) });
                    }
                } else {
                    const newCustomer = await stripe.customers.create(
                        { email, name: clip(clientName, 120) || undefined, metadata },
                        { idempotencyKey: `customer-create-${email}` }
                    );
                    customerId = newCustomer.id;
                }
            } catch (err) {
                console.error('Erreur lors de la recherche/création du client Stripe:', err);
            }
        }

        const origin = req.headers?.origin || (req.headers?.host ? `https://${req.headers.host}` : '');
        const defaultSuccess = `${origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`;
        const sessionOptions = {
            payment_method_types: ['card'],
            line_items: [{ price_data: priceData, quantity: 1 }],
            mode: price.mode,
            allow_promotion_codes: interval === 'month', // codes promo : abonnements mensuels uniquement
            success_url: withCheckoutSessionId(sameOriginUrl(successUrl, origin, defaultSuccess), origin),
            cancel_url: sameOriginUrl(cancelUrl, origin, `${origin}/souscription`),
            metadata,
        };

        if (customerId) sessionOptions.customer = customerId;
        else if (email) sessionOptions.customer_email = email;

        // Copier les métadonnées sur le PaymentIntent ou l'abonnement.
        if (price.mode === 'payment') sessionOptions.payment_intent_data = { metadata };
        else sessionOptions.subscription_data = { metadata };

        const session = await stripe.checkout.sessions.create(sessionOptions);
        return res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        return sendServerError(res, error, 'checkout');
    }
}
