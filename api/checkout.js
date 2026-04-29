import Stripe from 'stripe';

// On parse l'environnement local manuellement au cas où nous sommes via Vite
import fs from 'fs';
import path from 'path';

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
        } catch (e) { }
        
        if (!secretKey) secretKey = process.env.STRIPE_SECRET_KEY;

        if (!secretKey || secretKey === 'sk_live_remplace_moi') {
            throw new Error("La Clé Secrète Stripe (STRIPE_SECRET_KEY) est manquante ou invalide.");
        }

        const stripe = new Stripe(secretKey);

        const { planId, amount, productName, interval, successUrl, cancelUrl } = req.body;

        const isOneTime = interval === 'one_time';

        const priceData = {
            currency: 'eur',
            product_data: {
                name: productName || `Forfait ${planId}`,
            },
            unit_amount: Math.round(amount * 100), // En centimes
        };

        if (!isOneTime) {
            priceData.recurring = {
                interval: interval || 'month',
            };
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: priceData,
                    quantity: 1,
                },
            ],
            mode: isOneTime ? 'payment' : 'subscription',
            success_url: successUrl || `${req.headers.origin}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.origin}/souscription`,
        });

        res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
}
