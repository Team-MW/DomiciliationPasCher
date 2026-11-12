/**
 * Redirige vers un Stripe Checkout asynchrone sécurisé par backend
 * @param {string} planId - Identifiant du plan choisi
 * @param {number} amount - Montant en euros
 * @param {string} productName - Nom descriptif du forfait
 * @param {string} interval - 'month' ou 'year'
 */
export const handleCheckout = async (planId, amount, productName = '', interval = 'month', customSuccessUrl = null, customCancelUrl = null, email = '', clientName = '', metadata = {}, promoCode = '') => {
    try {
        // Pas de Stripe.js ici : le serveur crée la session et on redirige vers son URL. Charger Stripe.js
        // ajoutait un délai et un point de panne (bloqueur de publicité, réseau d'entreprise).
        console.log(`Initialisation paiement Stripe pour le plan ${planId} : ${amount}€ (${interval})`);

        let finalInterval = interval;
        if (interval === 'annuel') finalInterval = 'year';
        else if (interval === 'mensuel') finalInterval = 'month';

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                planId,
                amount,
                productName: productName || `Forfait Domiciliation`,
                interval: finalInterval,
                successUrl: customSuccessUrl || `${window.location.origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: customCancelUrl || `${window.location.origin}/souscription`,
                email,
                clientName,
                metadata,
                promoCode: promoCode || undefined,
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
            throw Object.assign(new Error(session.error), { code: session.code });
        }

        // Redirige directement le client vers l'URL officielle de paiement Stripe
        if (session.url) {
            window.location.href = session.url;
        } else {
            throw new Error("L'API n'a pas retourné l'URL de paiement.");
        }
    } catch (err) {
        console.error("Erreur Checkout Stripe:", err);
        throw Object.assign(new Error(err.message || "Impossible de contacter la banque."), { code: err.code });
    }
};

/**
 * Vérifie un code promo avant le paiement (aucun dossier ni paiement créé).
 * Renvoie { valid, message?, label?, code? }.
 */
export async function checkPromoCode({ code, planId, interval, email }) {
    const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkPromo', code, planId, interval, email }),
    });
    let body = null;
    try { body = await response.json(); } catch { /* réponse illisible */ }
    if (!response.ok || !body || typeof body.valid !== 'boolean') {
        throw new Error((body && body.error) || 'Vérification du code impossible pour le moment. Réessayez.');
    }
    return body;
}
