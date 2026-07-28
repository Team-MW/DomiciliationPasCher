import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { customerId } = req.body;
    if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
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

        const returnUrl = req.headers.referer || `${req.headers.origin || 'http://localhost:5173'}/espace-client`;

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe Portal error:', error);
        res.status(500).json({ error: error.message });
    }
}
