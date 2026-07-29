import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 1. Récupération sécurisée des clés depuis l'environnement
        let serviceId = process.env.EMAILJS_SERVICE_ID;
        let templateId = process.env.EMAILJS_TEMPLATE_ID;
        let publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY;
        let privateKey = process.env.EMAILJS_PRIVATE_KEY;

        // Fallback local pour Vite / Vercel en dev
        if (!privateKey) {
            try {
                if (fs.existsSync('.env.local')) {
                    const content = fs.readFileSync('.env.local', 'utf-8');
                    const getEnv = (key) => {
                        const match = content.match(new RegExp(`${key}=(.*)`));
                        return match ? match[1].trim() : null;
                    };
                    serviceId = getEnv('EMAILJS_SERVICE_ID') || serviceId;
                    templateId = getEnv('EMAILJS_TEMPLATE_ID') || templateId;
                    publicKey = getEnv('VITE_EMAILJS_PUBLIC_KEY') || publicKey;
                    privateKey = getEnv('EMAILJS_PRIVATE_KEY') || privateKey;
                }
            } catch (e) { console.error(e) }
        }

        const { email, nom, type } = req.body;

        if (!email) {
            return res.status(400).json({ error: "L'email est requis." });
        }

        let message = "Votre paiement a été validé avec succès. Merci de créer votre compte Espace Client et de déposer vos pièces justificatives.";
        if (type === 'payment_failed') {
            message = "⚠️ Attention : Votre dernier prélèvement ou paiement de domiciliation a échoué ou a été bloqué. Votre accès à l'Espace Client Sécurisé est momentanément restreint. Veuillez régulariser votre paiement au plus vite afin de réactiver votre adresse professionnelle et conserver l'accès à vos courriers.";
        } else if (type === 'post_signature') {
            message = `Bonjour ${nom || 'Client'},\n\nVotre contrat de domiciliation a bien été signé électroniquement. Il est désormais disponible dans votre Espace Client.\n\nMerci de vous connecter pour y déposer les documents obligatoires (Kbis/Statuts, CNI, Justificatif de domicile de moins de 3 mois) via l'onglet "Mes Documents".\n\nLien de l'espace client : https://domiciliation-pas-cher.com/espace-client\n\nCordialement,\nL'équipe Domiciliation-Pas-Cher`;
        } else if (type === 'procuration_postale') {
            message = `Bonjour ${nom || 'Client'},\n\nPour que nous puissions réceptionner vos courriers recommandés, il est impératif d'établir une procuration postale officielle auprès de La Poste.\n\nVeuillez effectuer cette démarche en ligne sur le site de La Poste via ce lien sécurisé :\nhttps://www.laposte.fr/donner-procuration/informations-mandant\n\nCordialement,\nL'équipe Domiciliation-Pas-Cher`;
        }

        // 2. Appel à l'API EmailJS côté serveur (La clé privée reste protégée !)
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                accessToken: privateKey, // C'est ici que la clé privée est utilisée de manière ultra-sécurisée
                template_params: {
                    to_email: email,
                    to_name: nom || "Client",
                    message: message
                }
            })
        });

        if (response.ok) {
            return res.status(200).json({ success: true, message: "Email envoyé" });
        } else {
            const errorText = await response.text();
            throw new Error(errorText);
        }
    } catch (error) {
        console.error('EmailJS Server error:', error);
        return res.status(500).json({ error: error.message });
    }
}
