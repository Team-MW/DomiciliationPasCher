import Stripe from 'stripe';

export default async function handler(req, res) {
    // Sécurité : Vercel CRON envoie un header spécifique.
    // On vérifie que la requête vient bien de Vercel (si la clé CRON_SECRET est définie)
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey || secretKey === 'sk_live_remplace_moi' || secretKey.startsWith('pk_')) {
            throw new Error("Clé Stripe invalide");
        }

        const stripe = new Stripe(secretKey);
        
        // On récupère les abonnements actifs
        let hasMore = true;
        let startingAfter = null;
        let remindersSent = 0;
        
        // Date dans exactement 2 mois
        const today = new Date();
        const targetDate = new Date();
        targetDate.setMonth(today.getMonth() + 2);
        
        // On définit une fenêtre d'un jour (entre targetDate et targetDate + 1 jour)
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const startUnix = Math.floor(startOfDay.getTime() / 1000);
        const endUnix = Math.floor(endOfDay.getTime() / 1000);

        while (hasMore) {
            const listParams = {
                status: 'active',
                limit: 100,
            };
            if (startingAfter) listParams.starting_after = startingAfter;

            const subscriptions = await stripe.subscriptions.list(listParams);
            
            for (const sub of subscriptions.data) {
                const interval = sub.items.data[0].plan.interval;
                const currentPeriodEnd = sub.current_period_end; // Unix timestamp
                
                // On ne relance que les abonnements annuels pour l'échéance (Chatel)
                // ou on pourrait le faire pour tous, mais la durée légale implique un engagement annuel.
                if (interval === 'year') {
                    if (currentPeriodEnd >= startUnix && currentPeriodEnd <= endUnix) {
                        // C'est le moment d'envoyer l'e-mail !
                        const customerId = sub.customer;
                        const customer = await stripe.customers.retrieve(customerId);
                        
                        if (customer && customer.email && !customer.deleted) {
                            await sendReminderEmail(customer.email, customer.name);
                            remindersSent++;
                        }
                    }
                }
            }
            
            hasMore = subscriptions.has_more;
            if (hasMore) {
                startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
            }
        }

        return res.status(200).json({ success: true, remindersSent });
    } catch (error) {
        console.error("Cron Reminder Error:", error);
        return res.status(500).json({ error: error.message });
    }
}

async function sendReminderEmail(email, name) {
    try {
        let serviceId = process.env.EMAILJS_SERVICE_ID;
        // Si vous avez un template dédié au rappel d'échéance, mettez son ID ici. Sinon on utilise le générique.
        let templateId = process.env.EMAILJS_TEMPLATE_ID; 
        let publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY;
        let privateKey = process.env.EMAILJS_PRIVATE_KEY;

        const message = `Bonjour,\n\nNous vous informons que votre contrat de domiciliation arrive à échéance dans 2 mois. Conformément à la législation, ce message a pour but de vous rappeler la possibilité d'exercer votre droit de résiliation si vous ne souhaitez pas renouveler votre abonnement.\n\nSans action de votre part, le contrat sera reconduit tacitement.\n\nCordialement,\nL'équipe Domiciliation-Pas-Cher.com`;

        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                accessToken: privateKey,
                template_params: {
                    to_email: email,
                    to_name: name || "Client",
                    message: message
                }
            })
        });
    } catch (err) {
        console.error("Erreur envoi email rappel:", err);
    }
}
