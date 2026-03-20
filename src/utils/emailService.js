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
