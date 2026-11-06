import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { requireUser, userOwnsStripeCustomer } from './_auth.js';
import { readServerEnv } from './_env.js';
import { getBaseUrl } from './_email-kit.js';

/** Portail de facturation Stripe, uniquement pour un customer appartenant à l'utilisateur. */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { customerId } = req.body || {};
    if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    try {
        const stripe = getStripe();
        const owns = await userOwnsStripeCustomer({ stripe, conn: getDbConn(), user, customerId: String(customerId) });
        if (!owns) return res.status(403).json({ error: 'Accès refusé' });

        // URL de retour fixée côté serveur (l'ancien code reprenait le Referer, contrôlable).
        const baseUrl = readServerEnv('PUBLIC_SITE_URL') || getBaseUrl(req);
        const returnPath = user.isAdmin ? '/app/admin' : '/app/espace-client?tab=factures';
        const session = await stripe.billingPortal.sessions.create({
            customer: String(customerId),
            return_url: `${baseUrl}${returnPath}`,
        });
        return res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe Portal error:', error);
        // « No such customer » est exploité par le front pour réinitialiser un id périmé.
        const message = /No such customer/i.test(error?.message || '') ? 'No such customer' : 'Ouverture du portail impossible.';
        return res.status(500).json({ error: message });
    }
}
