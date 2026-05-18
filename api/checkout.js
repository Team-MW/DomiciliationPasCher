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

        const { planId, amount, productName, interval, successUrl, cancelUrl, email, clientName, metadata } = req.body;

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

        // --- Résolution du client Stripe ---
        let customerId = null;
        if (email) {
            try {
                const cleanEmail = email.trim().toLowerCase();
                const customers = await stripe.customers.list({ email: cleanEmail, limit: 1 });
                if (customers.data.length > 0) {
                    customerId = customers.data[0].id;
                    // Mettre à jour le nom si fourni
                    if (clientName && !customers.data[0].name) {
                        await stripe.customers.update(customerId, { name: clientName });
                    }
                } else {
                    const newCustomer = await stripe.customers.create({
                        email: cleanEmail,
                        name: clientName || undefined,
                        metadata: metadata || {}
                    });
                    customerId = newCustomer.id;
                }
            } catch (err) {
                console.error("Erreur lors de la recherche/création du client Stripe:", err);
            }
        }

        const sessionOptions = {
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
            metadata: {
                email: email || '',
                clientName: clientName || '',
                ...(metadata || {})
            }
        };

        // Associer le client Stripe
        if (customerId) {
            sessionOptions.customer = customerId;
        } else if (email) {
            sessionOptions.customer_email = email.trim().toLowerCase();
        }

        // Copier les métadonnées sur le PaymentIntent ou la Subscription correspondante
        if (isOneTime) {
            sessionOptions.payment_intent_data = {
                metadata: {
                    email: email || '',
                    clientName: clientName || '',
                    ...(metadata || {})
                }
            };
        } else {
            sessionOptions.subscription_data = {
                metadata: {
                    email: email || '',
                    clientName: clientName || '',
                    ...(metadata || {})
                }
            };
        }

        const session = await stripe.checkout.sessions.create(sessionOptions);

        res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
}

