
import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ error: "Session ID manquant" });
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
        const stripe = new Stripe(secretKey);

        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        // On vérifie si la session est payée
        const isPaid = session.payment_status === 'paid';

        return res.status(200).json({ 
            success: isPaid, 
            status: session.payment_status,
            customer_email: session.customer_details?.email,
            customer_id: session.customer, // Récupérer l'ID client Stripe
            session_id: session.id,
            metadata: session.metadata || {}
        });
    } catch (error) {
        console.error('Verify session error:', error);
        return res.status(500).json({ error: error.message });
    }
}
