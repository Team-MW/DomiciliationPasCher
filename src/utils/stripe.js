import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

/**
 * Initialise Stripe avec la clé publique fournie dans le .env
 */
export const getStripe = () => {
    if (!stripePromise) {
        const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.split(' ')[0];
        stripePromise = loadStripe(key || 'pk_test_placeholder');
    }
    return stripePromise;
};

/**
 * Redirige vers un Stripe Checkout asynchrone sécurisé par backend
 * @param {string} planId - Identifiant du plan choisi
 * @param {number} amount - Montant en euros
 * @param {string} productName - Nom descriptif du forfait
 * @param {string} interval - 'month' ou 'year'
 */
export const handleCheckout = async (planId, amount, productName = '', interval = 'month') => {
    try {
        const stripe = await getStripe();

        console.log(`Initialisation paiement Stripe pour le plan ${planId} : ${amount}€ (${interval})`);

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                planId,
                amount,
                productName: productName || `Forfait Domiciliation`,
                interval: interval === 'annuel' ? 'year' : 'month',
                successUrl: `${window.location.origin}/?success=true`,
                cancelUrl: `${window.location.origin}/souscription?plan=${planId}`,
            }),
        });

        // Tente de lire l'erreur éventuelle du serveur
        let session;
        try {
            session = await response.json();
        } catch (err) {
            throw new Error("L'API a retourné une réponse invalide (vérifiez que le serveur ou Vercel tourne).");
        }

        if (session.error) {
            throw new Error(session.error);
        }

        // Redirige directement le client vers l'URL officielle de paiement Stripe
        if (session.url) {
            window.location.href = session.url;
        } else {
            throw new Error("L'API n'a pas retourné l'URL de paiement.");
        }
    } catch (err) {
        console.error("Erreur Checkout Stripe:", err);
        alert(`Erreur de paiement : ${err.message}`);
    }
};
