import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        let secretKey = null;
        try {
            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) secretKey = match[1].trim();
            }
        } catch (e) {}
        
        if (!secretKey) secretKey = process.env.STRIPE_SECRET_KEY;

        if (!secretKey || secretKey === 'sk_live_remplace_moi') {
            throw new Error("La Clé Secrète Stripe (STRIPE_SECRET_KEY) est manquante ou invalide.");
        }

        const stripe = new Stripe(secretKey);
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const customers = await stripe.customers.list({ email: cleanEmail, limit: 1 });

        let customerId;

        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            // Optionnel : mettre à jour le nom si non défini
            if (name && !customers.data[0].name) {
                await stripe.customers.update(customerId, { name });
            }
        } else {
            const newCustomer = await stripe.customers.create({
                email: cleanEmail,
                name: name || undefined,
                metadata: {
                    source: 'auto_ensure_customer'
                }
            });
            customerId = newCustomer.id;
        }

        return res.status(200).json({ customerId });

    } catch (error) {
        console.error('Stripe ensure customer error:', error);
        return res.status(500).json({ error: error.message });
    }
}
