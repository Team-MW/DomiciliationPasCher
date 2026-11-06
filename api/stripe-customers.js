import { getStripe } from './_stripe-client.js';
import { requireAdmin, sendServerError } from './_auth.js';

/** Recherche de clients Stripe (lier une fiche). Réservé à l'admin. */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query } = req.query || {};
    if (!query) {
        return res.status(400).json({ error: 'Recherche vide' });
    }

    let stripe;
    try {
        stripe = getStripe();
    } catch {
        return res.status(500).json({ error: 'Clé Stripe non configurée' });
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    try {
        // Guillemets et antislash retirés : ils changeraient la syntaxe de la recherche Stripe.
        const safe = String(query).replace(/["\\]/g, '').slice(0, 100);
        const customers = await stripe.customers.search({
            query: `name~"${safe}" OR email~"${safe}"`,
            limit: 10,
        });
        const results = customers.data.map((c) => ({ id: c.id, name: c.name, email: c.email }));
        return res.status(200).json({ customers: results });
    } catch (error) {
        return sendServerError(res, error, 'stripe-customers');
    }
}
