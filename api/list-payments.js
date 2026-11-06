import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { requireUser, getOwnership, userOwnsStripeCustomer, sendServerError } from './_auth.js';
import { fetchStripeBilling } from './_stripe-billing.js';

/**
 * Historique de facturation Stripe.
 * Un client ne peut interroger que ses propres emails / customers ; l'admin, n'importe lequel.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, customerId } = req.query || {};
    if (!email && !customerId) {
        return res.status(400).json({ error: 'Email or CustomerId is required' });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    let stripe;
    try {
        stripe = getStripe();
    } catch (err) {
        return sendServerError(res, err, 'list-payments');
    }

    try {
        if (!user.isAdmin) {
            const conn = getDbConn();
            const ownership = await getOwnership(conn, user);
            if (customerId) {
                const owns = await userOwnsStripeCustomer({ stripe, conn, user, customerId, ownership });
                if (!owns) return res.status(403).json({ error: 'Accès refusé' });
            }
            // L'email sert aussi à rechercher des paiements invités : il doit être le sien.
            if (email && !ownership.emails.has(String(email).trim().toLowerCase())) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
        }

        const billing = await fetchStripeBilling(stripe, { email, customerId });
        return res.status(200).json(billing);
    } catch (error) {
        return sendServerError(res, error, 'list-payments');
    }
}
