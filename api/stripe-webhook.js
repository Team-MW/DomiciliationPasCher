import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { readServerEnv } from './_env.js';
import { fulfillCheckoutSession } from './_checkout-fulfillment.js';

/**
 * Webhook Stripe : `checkout.session.completed` et `checkout.session.async_payment_succeeded`.
 *
 * Sans lui, un client qui paie puis ferme l'onglet avant le retour sur le site reste
 * « non payé » en base (et reçoit des relances d'inscription inachevée).
 *
 * Mise en service : Stripe Dashboard > Développeurs > Webhooks > endpoint
 * https://<domaine>/api/stripe-webhook, puis STRIPE_WEBHOOK_SECRET=whsec_… dans Vercel.
 */
export const config = { api: { bodyParser: false } };

/**
 * Corps brut exigé par la vérification de signature. On lit le flux AVANT de toucher à
 * `req.body` : sur Vercel, ce getter parse le JSON en consommant le flux, et la signature
 * ne pourrait plus être vérifiée. (Serveur de dev : le flux est déjà lu, `req.body` est un Buffer.)
 */
async function readRawBody(req) {
    if (typeof req[Symbol.asyncIterator] === 'function' && !req.readableEnded) {
        const chunks = [];
        for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        if (chunks.length > 0) return Buffer.concat(chunks);
    }
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    return Buffer.alloc(0);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const secret = readServerEnv('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
        console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET manquant');
        return res.status(503).json({ error: 'Webhook non configuré' });
    }

    let event;
    try {
        const stripe = getStripe();
        const raw = await readRawBody(req);
        event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], secret);
    } catch (err) {
        console.warn('[stripe-webhook] signature invalide:', err?.message);
        return res.status(400).json({ error: 'Signature invalide' });
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        try {
            const baseUrl = readServerEnv('PUBLIC_SITE_URL') || 'https://www.domiciliation-pas-cher.com';
            const result = await fulfillCheckoutSession(event.data.object, { conn: getDbConn(), baseUrl });
            console.log('[stripe-webhook]', event.type, event.data.object?.id, result?.kind, result?.ok);
        } catch (err) {
            console.error('[stripe-webhook] traitement impossible:', err);
            // 500 → Stripe réessaiera plus tard.
            return res.status(500).json({ error: 'Traitement impossible' });
        }
    }

    return res.status(200).json({ received: true });
}
