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
 * Redirige vers un Stripe Checkout (Simulé si pas de clé réelle)
 * @param {string} planId - Identifiant du plan choisi
 * @param {number} amount - Montant en euros
 */
export const handleCheckout = async (planId, amount) => {
    const stripe = await getStripe();

    // Pour un projet réel, il faudrait appeler une API backend
    // qui crée une session Stripe Checkout et renvoie le sessionId.
    // Ici, on simule l'intention d'achat pour la démonstration.

    console.log(`Initialisation paiement Stripe pour le plan ${planId} : ${amount}€`);

    // Simuler une petite attente de chargement
    return new Promise((resolve) => {
        setTimeout(() => {
            alert(`Redirection vers Stripe Checkout...\nPlan : ${planId}\nMontant : ${amount}€\n\n(Note : Nécessite un backend pour finaliser le paiement réel)`);
            window.location.href = `/souscription?plan=${planId}`;
            resolve();
        }, 800);
    });
};
