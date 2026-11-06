import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { requireUser, getOwnership, sendServerError } from './_auth.js';

/**
 * Retrouve (ou crée) le client Stripe d'un email. Un client ne peut le faire que pour
 * l'un de ses propres emails ; l'admin pour n'importe lequel.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, name } = req.body || {};
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    let stripe;
    try {
        stripe = getStripe();
    } catch (error) {
        return sendServerError(res, error, 'ensure-stripe-customer');
    }

    const user = await requireUser(req, res);
    if (!user) return;

    try {
        const cleanEmail = String(email).trim().toLowerCase();
        if (!user.isAdmin) {
            const ownership = await getOwnership(getDbConn(), user);
            if (!ownership.emails.has(cleanEmail)) return res.status(403).json({ error: 'Accès refusé' });
        }

        const customers = await stripe.customers.list({ email: cleanEmail, limit: 1 });
        let customerId;
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            if (name && !customers.data[0].name) {
                await stripe.customers.update(customerId, { name: String(name).slice(0, 120) });
            }
        } else {
            const newCustomer = await stripe.customers.create(
                { email: cleanEmail, name: name ? String(name).slice(0, 120) : undefined, metadata: { source: 'auto_ensure_customer' } },
                { idempotencyKey: `customer-create-${cleanEmail}` }
            );
            customerId = newCustomer.id;
        }
        return res.status(200).json({ customerId });
    } catch (error) {
        return sendServerError(res, error, 'ensure-stripe-customer');
    }
}
