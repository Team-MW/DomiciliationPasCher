import { getStripe } from '../_stripe-client.js';
import { getTransporter, getSmtpConfig } from '../_smtp.js';
import { getDbConn } from '../_db.js';
import { processFailedPayments } from '../_payment-dunning.js';

export default async function handler(req, res) {
    // Vercel envoie CRON_SECRET en Bearer sur chaque invocation planifiée. Sans ce secret
    // l'URL est publiquement appelable, et ce cron envoie des emails aux clients : on refuse
    // donc de tourner s'il n'est pas configuré, plutôt que de laisser l'endpoint ouvert.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error("Cron: CRON_SECRET non configuré, exécution refusée. Ajoutez la variable dans Vercel et dans .env.local.");
        return res.status(401).json({ error: 'CRON_SECRET non configuré' });
    }
    if (req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const stripe = getStripe();
        
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
                const item = sub.items?.data?.[0];
                if (!item) continue;

                const interval = item.plan?.interval || item.price?.recurring?.interval;
                // Depuis l'API 2025-03-31, current_period_end est porté par l'item
                // et non plus par l'abonnement. On garde le fallback pour les anciennes versions.
                const currentPeriodEnd = item.current_period_end ?? sub.current_period_end;
                if (!currentPeriodEnd) continue;
                
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

        const dunning = await processFailedPayments(stripe, { conn: getDbConn() });

        return res.status(200).json({ success: true, remindersSent, ...dunning });
    } catch (error) {
        console.error("Cron Reminder Error:", error);
        return res.status(500).json({ error: error.message });
    }
}

async function sendReminderEmail(email, name) {
    try {
        const transporter = getTransporter();
        if (!transporter) {
            console.error("Cron: configuration SMTP manquante, rappel non envoyé à", email);
            return;
        }
        const { from: smtpFrom } = getSmtpConfig();

        const message = `Bonjour,\n\nNous vous informons que votre contrat de domiciliation arrive à échéance dans 2 mois. Conformément à la législation, ce message a pour but de vous rappeler la possibilité d'exercer votre droit de résiliation si vous ne souhaitez pas renouveler votre abonnement.\n\nSans action de votre part, le contrat sera reconduit tacitement.\n\nCordialement,\nL'équipe Domiciliation-Pas-Cher.com`;

        const htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Rappel d'échéance de contrat</h2>
                <p>Bonjour ${name || 'Client'},</p>
                <p>Nous vous informons que votre contrat de domiciliation arrive à échéance dans 2 mois.</p>
                <p>Conformément à la législation, ce message a pour but de vous rappeler la possibilité d'exercer votre droit de résiliation si vous ne souhaitez pas renouveler votre abonnement.</p>
                <p>Sans action de votre part, le contrat sera reconduit tacitement.</p>
                <p>Cordialement,<br>L'équipe Domiciliation-Pas-Cher.com</p>
            </div>
        `;

        await transporter.sendMail({
            from: smtpFrom,
            to: email,
            subject: "Rappel d'échéance - Domiciliation Pas Cher",
            text: message,
            html: htmlMessage,
        });
    } catch (err) {
        console.error("Erreur envoi email rappel:", err);
    }
}
