import { getStripe } from '../_stripe-client.js';
import { getTransporter, getSmtpConfig } from '../_smtp.js';
import { getDbConn } from '../_db.js';
import { processFailedPayments } from '../_payment-dunning.js';
import crypto from 'crypto';
import { readServerEnv } from '../_env.js';
import { sendBrandedMail, getBaseUrl, publicSiteUrl } from '../_email-kit.js';
import { buildRenewalReminderEmail } from '../_email-templates.js';
import { addCalendarMonths } from '../../shared/paymentGrace.js';
import { runHealthCheck } from '../_health-check.js';
import { processMailNotifications, processDocumentRequests, processSouscriptionLeads, processPendingPayments } from '../_notifications.js';

const DAILY_RUN_HOUR_UTC = 8;

/**
 * Heure (0-23) à Paris. Avant : Number(Intl fr-FR « 09 h ») = NaN → « NaN >= 8 » faux → le récap courrier et les
 * relances d'inscription ne partaient JAMAIS (aucun email « nouveau courrier » n'a été envoyé en production).
 */
export function getParisHour(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Paris' }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    return Number.isFinite(hour) ? hour : 12; // valeur neutre : mieux vaut tourner que ne jamais tourner
}

export default async function handler(req, res) {
    // Vercel envoie CRON_SECRET en Bearer sur chaque invocation planifiée. Sans ce secret
    // l'URL est publiquement appelable, et ce cron envoie des emails aux clients : on refuse
    // donc de tourner s'il n'est pas configuré, plutôt que de laisser l'endpoint ouvert.
    const cronSecret = readServerEnv('CRON_SECRET');
    if (!cronSecret) {
        console.error("Cron: CRON_SECRET non configuré, exécution refusée. Ajoutez la variable dans Vercel et dans .env.local.");
        return res.status(401).json({ error: 'CRON_SECRET non configuré' });
    }
    if (!safeEqual(req.headers?.authorization || '', `Bearer ${cronSecret}`)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = getDbConn();
    const transporter = getTransporter();
    const from = getSmtpConfig()?.from;
    const baseUrl = process.env.PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : getBaseUrl(req));
    const ctx = { conn, transporter, from, baseUrl };

    // Toutes les heures, de 8 h à 20 h (Paris) : récap courrier et relances d'inscription.
    // La nuit, les envois attendent le premier passage du matin.
    const parisHour = getParisHour();
    const hourlyTasks = parisHour >= 8 && parisHour <= 20 ? [processMailNotifications, processSouscriptionLeads] : [];
    const hourly = {};
    for (const task of hourlyTasks) {
        try {
            Object.assign(hourly, await task(ctx));
        } catch (err) {
            console.error(`Cron ${task.name}:`, err);
        }
    }

    const runDaily = new Date().getUTCHours() === DAILY_RUN_HOUR_UTC || req.query?.daily === '1';
    if (!runDaily) {
        return res.status(200).json({ success: true, daily: false, ...hourly });
    }

    for (const task of [processDocumentRequests, processPendingPayments]) {
        try {
            Object.assign(hourly, await task(ctx));
        } catch (err) {
            console.error(`Cron ${task.name}:`, err);
        }
    }

    let stripe;
    try {
        stripe = getStripe();
    } catch (error) {
        console.error('Cron: Stripe indisponible:', error);
        return res.status(500).json({ error: 'Stripe indisponible' });
    }

    // Blocs séparés : une erreur dans les rappels d'échéance ne doit pas empêcher
    // les relances d'impayés (et inversement).
    let remindersSent = 0;
    try {
        remindersSent = await sendRenewalReminders(stripe, conn);
    } catch (error) {
        console.error('Cron: rappels d’échéance:', error);
    }

    // Contrôle de santé : signale aux admins les clients bloqués (email non vérifié, pas de compte, Stripe introuvable…).
    try {
        Object.assign(hourly, await runHealthCheck({ ...ctx, stripe }));
    } catch (error) {
        console.error('Cron: contrôle de santé:', error);
    }

    try {
        const dunning = await processFailedPayments(stripe, { conn });
        return res.status(200).json({ success: true, daily: true, remindersSent, ...hourly, ...dunning });
    } catch (error) {
        console.error('Cron: relances impayés:', error);
        return res.status(500).json({ error: 'Relances impayés en échec' });
    }
}

function safeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * Rappel légal 2 mois avant l'échéance des abonnements annuels.
 * Date de rappel = échéance − 2 mois (ramenée au dernier jour du mois) : plus de jours
 * sautés ni de doublons en fin de mois. Chaque échéance n'est rappelée qu'une fois
 * (métadonnée `dpc_renewal_reminded` sur l'abonnement), même si le cron est relancé.
 */
export async function sendRenewalReminders(stripe, conn, now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    let remindersSent = 0;
    let startingAfter = null;
    let hasMore = true;

    while (hasMore) {
        const listParams = { status: 'active', limit: 100 };
        if (startingAfter) listParams.starting_after = startingAfter;
        const subscriptions = await stripe.subscriptions.list(listParams);

        for (const sub of subscriptions.data) {
            try {
                const item = sub.items?.data?.[0];
                if (!item) continue;
                const interval = item.plan?.interval || item.price?.recurring?.interval;
                if (interval !== 'year') continue;
                // Résiliation déjà demandée (portail Stripe) : un « votre abonnement se renouvelle » serait faux.
                if (sub.cancel_at_period_end || sub.cancel_at) continue;
                // Depuis l'API 2025-03-31, current_period_end est porté par l'item.
                const currentPeriodEnd = item.current_period_end ?? sub.current_period_end;
                if (!currentPeriodEnd) continue;

                const periodEndDay = new Date(currentPeriodEnd * 1000).toISOString().slice(0, 10);
                const reminderDay = addCalendarMonths(periodEndDay, -2, { clamp: true });
                // Rattrapage : si le passage du jour J a échoué, le rappel part les jours suivants
                // (dans la limite de 7 jours) ; la métadonnée empêche tout doublon.
                const catchUpLimit = new Date(Date.parse(today) - 7 * 86400000).toISOString().slice(0, 10);
                if (!reminderDay || reminderDay > today || reminderDay < catchUpLimit) continue;
                if (sub.metadata?.dpc_renewal_reminded === periodEndDay) continue;

                const customer = await stripe.customers.retrieve(sub.customer);
                if (customer && customer.email && !customer.deleted) {
                    // Rappel légal : l'abonnement n'est marqué « rappelé » QUE si l'email est parti.
                    // Sinon il repart au passage suivant (rattrapage sur 7 jours).
                    const sent = await sendReminderEmail(customer.email, customer.name, conn, periodEndDay);
                    if (!sent) continue;
                    await stripe.subscriptions.update(sub.id, {
                        metadata: { ...(sub.metadata || {}), dpc_renewal_reminded: periodEndDay },
                    });
                    remindersSent++;
                }
            } catch (err) {
                console.error('Cron: rappel d’échéance échoué pour', sub.id, err.message);
            }
        }

        hasMore = subscriptions.has_more;
        if (hasMore) startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    }
    return remindersSent;
}

/** @returns {Promise<boolean>} true si l'email est parti. */
export async function sendReminderEmail(email, name, conn, periodEndDay) {
    try {
        const transporter = getTransporter();
        if (!transporter) {
            console.error("Cron: configuration SMTP manquante, rappel non envoyé à", email);
            return false;
        }
        const { from: smtpFrom } = getSmtpConfig();
        const { subject, text, html } = buildRenewalReminderEmail({
            nom: name,
            periodEndIso: periodEndDay,
            baseUrl: publicSiteUrl(),
        });

        await sendBrandedMail(transporter, {
            conn,
            type: 'renewal_reminder',
            from: smtpFrom,
            to: email,
            subject,
            text,
            html,
        });
        return true;
    } catch (err) {
        console.error("Erreur envoi email rappel:", err);
        return false;
    }
}
