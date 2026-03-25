import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        let secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) secretKey = match[1].trim();
            }
        }

        if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");

        const stripe = new Stripe(secretKey);

        // Rechercher le client Stripe par email
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(200).json({ payments: [] });
        }

        const customerId = customers.data[0].id;

        // Récupérer les paiements (charges ou invoices)
        const paymentIntents = await stripe.paymentIntents.list({
            customer: customerId,
            limit: 10
        });

        const payments = paymentIntents.data.map(pi => ({
            id: pi.id,
            amount: pi.amount / 100,
            currency: pi.currency,
            status: pi.status === 'succeeded' ? 'payé' : 'échec',
            date: new Date(pi.created * 1000).toISOString().split('T')[0],
            method: pi.payment_method_types[0] === 'card' ? 'Carte (Stripe)' : pi.payment_method_types[0],
            invoice_ref: pi.description || `FAC-${new Date(pi.created * 1000).getFullYear()}${String(new Date(pi.created * 1000).getMonth() + 1).padStart(2, '0')}`
        }));

        res.status(200).json({ payments });
    } catch (error) {
        console.error('Stripe sync error:', error);
        res.status(500).json({ error: error.message });
    }
}
