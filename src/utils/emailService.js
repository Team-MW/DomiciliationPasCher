/**
 * Envoie un email de bienvenue ultra-sécurisé via le backend Vercel/Node
 */
export const sendWelcomeEmail = async (email, nom) => {
    try {
        const response = await fetch('/api/emailjs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nom })
        });

        if (response.ok) {
            console.log("Email automatique envoyé de manière sécurisée (backend) !");
        } else {
            const errorData = await response.json();
            console.error("Erreur Backend lors de l'envoi de l'email :", errorData.error);
        }
    } catch (err) {
        console.error("Erreur serveur lors de la requête Backend EmailJS :", err);
    }
};

/**
 * Envoie un email d'incident de paiement / impayé
 */
export const sendFailedPaymentEmail = async (email, nom) => {
    try {
        const response = await fetch('/api/emailjs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nom, type: 'payment_failed' })
        });

        if (response.ok) {
            console.log("Email d'incident de paiement envoyé avec succès !");
            return true;
        } else {
            const errorData = await response.json();
            console.error("Erreur Backend lors de l'envoi de l'email d'impayé :", errorData.error);
            throw new Error(errorData.error || "Erreur inconnue EmailJS");
        }
    } catch (err) {
        console.error("Erreur serveur lors de la requête Backend EmailJS (impayé) :", err);
        throw err;
    }
};

/**
 * Envoie un email de relance de paiement (manuel)
 */
export const sendPaymentReminderEmail = async (email, nom, amount, paymentLink) => {
    try {
        const response = await fetch('/api/emailjs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nom, type: 'payment_reminder', amount, paymentLink })
        });

        if (response.ok) {
            console.log("Email de relance envoyé avec succès !");
            return true;
        } else {
            const errorData = await response.json();
            console.error("Erreur Backend lors de l'envoi de la relance :", errorData.error);
            return false;
        }
    } catch (err) {
        console.error("Erreur serveur lors de la requête Backend EmailJS (relance) :", err);
        return false;
    }
};
