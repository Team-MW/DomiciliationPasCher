import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { customerId } = req.query;

    if (!customerId) {
        return res.status(400).json({ error: 'Missing customerId' });
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
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });

        if (paymentMethods.data.length > 0) {
            const card = paymentMethods.data[0].card;
            return res.status(200).json({
                brand: card.brand,
                last4: card.last4,
                exp_month: card.exp_month,
                exp_year: card.exp_year
            });
        }

        return res.status(200).json({ brand: null, last4: null });
    } catch (error) {
        console.error('Erreur Stripe:', error);
        return res.status(500).json({ error: error.message });
    }
}
