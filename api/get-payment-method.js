import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { requireUser, userOwnsStripeCustomer, sendServerError } from './_auth.js';

/** Carte enregistrée (marque, 4 derniers chiffres) d'un customer appartenant à l'utilisateur. */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { customerId } = req.query || {};
    if (!customerId) {
        return res.status(400).json({ error: 'Missing customerId' });
    }

    let stripe;
    try {
        stripe = getStripe();
    } catch {
        return res.status(500).json({ error: 'Clé Stripe non configurée' });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    try {
        const owns = await userOwnsStripeCustomer({ stripe, conn: getDbConn(), user, customerId: String(customerId) });
        if (!owns) return res.status(403).json({ error: 'Accès refusé' });

        // Carte réellement prélevée en priorité, sinon la première enregistrée.
        let card = null;
        try {
            const customer = await stripe.customers.retrieve(String(customerId), {
                expand: ['invoice_settings.default_payment_method'],
            });
            card = customer?.invoice_settings?.default_payment_method?.card || null;
        } catch {
            card = null;
        }
        if (!card) {
            const paymentMethods = await stripe.paymentMethods.list({ customer: String(customerId), type: 'card' });
            card = paymentMethods.data[0]?.card || null;
        }
        if (card) {
            return res.status(200).json({
                brand: card.brand,
                last4: card.last4,
                exp_month: card.exp_month,
                exp_year: card.exp_year,
            });
        }
        return res.status(200).json({ brand: null, last4: null });
    } catch (error) {
        return sendServerError(res, error, 'get-payment-method');
    }
}
