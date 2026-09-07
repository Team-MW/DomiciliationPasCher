/**
 * Envoie un email de bienvenue ultra-sécurisé via le backend Vercel/Node
 */
export const sendWelcomeEmail = async (email, nom) => {
    try {
        const response = await fetch('/api/email', {
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
        console.error("Erreur serveur lors de la requête Backend Email :", err);
    }
};

/**
 * Envoie un email d'incident de paiement / impayé
 */
export const sendFailedPaymentEmail = async (email, nom) => {
    try {
        const response = await fetch('/api/email', {
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
            throw new Error(errorData.error || "Erreur inconnue Email");
        }
    } catch (err) {
        console.error("Erreur serveur lors de la requête Backend Email (impayé) :", err);
        throw err;
    }
};

/**
 * Envoie un email de relance de paiement (manuel)
 */
export const sendPaymentReminderEmail = async (email, nom, amount, paymentLink) => {
    try {
        const response = await fetch('/api/email', {
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
        console.error("Erreur serveur lors de la requête Backend Email (relance) :", err);
        return false;
    }
};

/**
 * Envoie un email à l'admin quand un client envoie un nouveau message
 */
export const sendClientNewMessageEmail = async (email, nom, content) => {
    try {
        const response = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nom, type: 'admin_new_message', content })
        });

        if (response.ok) {
            console.log("Email de notification admin envoyé avec succès !");
            return true;
        } else {
            const errorData = await response.json();
            console.error("Erreur Backend lors de l'envoi de la notification admin :", errorData.error);
            return false;
        }
    } catch (err) {
        console.error("Erreur serveur lors de la requête Backend Email (notification admin) :", err);
        return false;
    }
};

export const sendReexpeditionRequestEmail = async ({ email, nom, company, address, notes }) => {
    try {
        const response = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                nom,
                company,
                address,
                notes,
                type: 'admin_reexpedition',
            }),
        });
        return response.ok;
    } catch (err) {
        console.error('Erreur email demande réexpédition:', err);
        return false;
    }
};

export const sendReexpeditionStatusEmail = async ({ email, nom, status, address }) => {
    try {
        const response = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                nom,
                address,
                type: status === 'expediee' ? 'reexpedition_sent' : 'reexpedition_refused',
            }),
        });
        return response.ok;
    } catch (err) {
        console.error('Erreur email statut réexpédition:', err);
        return false;
    }
};
