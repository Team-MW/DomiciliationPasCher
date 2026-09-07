import { getStripe } from './_stripe-client.js';
import { scanFailedPayments } from './_stripe-failures.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const failures = await scanFailedPayments(getStripe());
        return res.status(200).json({ failures, count: failures.length });
    } catch (error) {
        console.error('Erreur Stripe failed-payments:', error);
        return res.status(500).json({ error: error.message });
    }
}
