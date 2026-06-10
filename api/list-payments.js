import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, customerId, since } = req.query;
    if (!email && !customerId) {
        return res.status(400).json({ error: 'Email or CustomerId is required' });
    }

    try {
        let sinceUnix = 0;
        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
                sinceUnix = Math.floor(sinceDate.getTime() / 1000);
            }
        }

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

        let customerIds = [];

        if (customerId) {
            customerIds = [customerId];
        } else if (email) {
            // Rechercher TOUS les clients Stripe par email (pas seulement le premier)
            const customers = await stripe.customers.list({ email: email.trim().toLowerCase(), limit: 100 });
            customerIds = customers.data.map(c => c.id);
        }

        if (customerIds.length === 0) {
            return res.status(200).json({ payments: [] });
        }

        // Récupérer les paiements pour TOUS les customer IDs trouvés
        const allPayments = [];
        for (const cid of customerIds) {
            const paymentIntents = await stripe.paymentIntents.list({
                customer: cid,
                limit: 100
            });
            allPayments.push(...paymentIntents.data);
        }

        // Dédupliquer les paiements par ID et filtrer par date d'inscription
        const uniquePayments = new Map();
        for (const pi of allPayments) {
            if (pi.created < sinceUnix) continue; // Ignorer les paiements d'avant l'inscription

            if (!uniquePayments.has(pi.id)) {
                uniquePayments.set(pi.id, {
                    id: pi.id,
                    amount: pi.amount / 100,
                    currency: pi.currency,
                    status: pi.status === 'succeeded' ? 'payé' : 'échec',
                    date: new Date(pi.created * 1000).toISOString().split('T')[0],
                    method: pi.payment_method_types[0] === 'card' ? 'Carte (Stripe)' : pi.payment_method_types[0],
                    invoice_ref: pi.description || `FAC-${new Date(pi.created * 1000).getFullYear()}${String(new Date(pi.created * 1000).getMonth() + 1).padStart(2, '0')}`
                });
            }
        }

        const payments = Array.from(uniquePayments.values());

        res.status(200).json({ payments });
    } catch (error) {
        console.error('Stripe sync error:', error);
        res.status(500).json({ error: error.message });
    }
}
