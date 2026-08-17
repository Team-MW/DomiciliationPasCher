import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Recherche vide' });
    }

    let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        try {
            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) stripeSecretKey = match[1].trim();
            }
            if (!stripeSecretKey && fs.existsSync('.env')) {
                const content = fs.readFileSync('.env', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) stripeSecretKey = match[1].trim();
            }
        } catch (e) { console.error(e) }
    }

    if (!stripeSecretKey) {
        return res.status(500).json({ error: 'Clé Stripe non configurée' });
    }

    const stripe = new Stripe(stripeSecretKey);

    try {
        const customers = await stripe.customers.search({
            query: `name~"${query}" OR email~"${query}"`,
            limit: 10
        });

        const results = customers.data.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email
        }));

        return res.status(200).json({ customers: results });
    } catch (error) {
        console.error('Erreur recherche Stripe:', error);
        return res.status(500).json({ error: error.message });
    }
}
