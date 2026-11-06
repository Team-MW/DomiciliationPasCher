import { getStripe } from './_stripe-client.js';
import { scanFailedPayments } from './_stripe-failures.js';
import { requireAdmin, sendServerError } from './_auth.js';

/** Liste nominative des impayés Stripe. Réservé à l'admin (données personnelles). */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    try {
        const failures = await scanFailedPayments(getStripe());
        return res.status(200).json({ failures, count: failures.length });
    } catch (error) {
        return sendServerError(res, error, 'stripe-failed-payments');
    }
}
