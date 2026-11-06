import { getTransporter, getSmtpConfig, ADMIN_EMAIL } from './_smtp.js';
import { scanFailedPayments } from './_stripe-failures.js';
import { sendBrandedMail, escapeHtml, formatEuro, publicSiteUrl, CONTACT_EMAIL } from './_email-kit.js';
import { buildPaymentFailedEmail, buildTerminationEmail } from './_email-templates.js';
import { isPaymentGraceExpired, paymentGraceDeadline, formatDateFr, PAYMENT_GRACE_MONTHS } from '../shared/paymentGrace.js';

/** Montant au format français (28,80 €) ; null si inconnu ou dans une autre devise que l'euro. */
const formatAmount = (amount, currency = 'eur') => {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
    if (String(currency || 'eur').toLowerCase() !== 'eur') {
        return amount.toLocaleString('fr-FR', { style: 'currency', currency: String(currency).toUpperCase() });
    }
    return formatEuro(amount);
};

/** Lien de paiement : facture Stripe (https) si disponible, sinon l'espace client. */
const safeInvoiceUrl = (url) => (typeof url === 'string' && /^https:\/\//i.test(url) ? url : null);

function parseExtra(raw) {
    try {
        let extra = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof extra === 'string') extra = JSON.parse(extra);
        return extra && typeof extra === 'object' ? extra : {};
    } catch {
        return {};
    }
}

async function findClient(conn, failure) {
    if (!conn) return null;
    const email = failure.email?.trim().toLowerCase();
    if (email) {
        const res = await conn.execute('SELECT id, email, status, extra_info FROM clients WHERE email = ?', [email]);
        if (res.rows[0]) return res.rows[0];
    }
    if (failure.customerId) {
        const res = await conn.execute(
            "SELECT id, email, status, extra_info FROM clients WHERE JSON_UNQUOTE(JSON_EXTRACT(extra_info, '$.stripe_customer_id')) = ?",
            [failure.customerId]
        );
        if (res.rows[0]) return res.rows[0];
    }
    return null;
}

async function markClientStatus(conn, client, status, extraPatch = {}) {
    if (!conn || !client?.id) return;
    const extra = { ...parseExtra(client.extra_info), ...extraPatch };
    await conn.execute(
        'UPDATE clients SET status = ?, extra_info = ? WHERE id = ?',
        [status, JSON.stringify(extra), client.id]
    );
    client.status = status;
    client.extra_info = extra;
}

async function markStripeTerminated(stripe, failure) {
    const patch = { dpc_domicile_terminated: '1' };
    if (failure.invoiceId) {
        await stripe.invoices.update(failure.invoiceId, {
            metadata: {
                ...patch,
                dpc_last_dunning_attempt: String(failure.attemptCount || ''),
            },
        });
    }
    if (failure.subscriptionId) {
        await stripe.subscriptions.update(failure.subscriptionId, { metadata: patch });
    }
}

/**
 * Relance les impayés et résilie automatiquement la domiciliation au bout de 2 mois.
 */
export async function applyPaymentGracePolicy({
    stripe,
    failures,
    transporter,
    conn,
    now = new Date(),
}) {
    const openFailures = failures.filter((f) => !f.alreadyTerminated);
    if (openFailures.length === 0) {
        return { failedPayments: 0, dunningEmailsSent: 0, terminated: 0 };
    }

    if (!transporter) {
        console.error('Cron: configuration SMTP manquante, %d impayé(s) non relancé(s)', openFailures.length);
    }

    let dunningEmailsSent = 0;
    let terminated = 0;

    for (const failure of openFailures) {
        try {
            const client = await findClient(conn, failure);
            const expired = isPaymentGraceExpired(failure.failedAt, now);
            // Pas de résiliation automatique d'un client qui a un abonnement sain : une facture
            // isolée (ancien abonnement) reste relancée et signalée à l'admin.
            // (Sans abonnement en échec — déjà annulé par Stripe après relances — mais sans
            // aucun abonnement sain non plus, la résiliation reste due.)
            const canTerminate = !failure.hasHealthySubscription;

            if (expired && canTerminate) {
                await terminateDomiciliation({ stripe, failure, conn, client, transporter });
                terminated++;
                continue;
            }

            if (client && client.status === 'actif' && !failure.hasHealthySubscription) {
                await markClientStatus(conn, client, 'echec_paiement', {
                    payment_issue_since: failure.failedAt || new Date(now).toISOString().slice(0, 10),
                });
            }

            if (!transporter || !failure.email || !failure.invoiceId) continue;
            if (String(failure.lastDunningAttempt) === String(failure.attemptCount)) continue;

            await sendFailedPaymentEmail(transporter, failure, conn);
            await stripe.invoices.update(failure.invoiceId, {
                metadata: { dpc_last_dunning_attempt: String(failure.attemptCount) },
            });
            dunningEmailsSent++;
        } catch (err) {
            console.error('Cron: traitement impayé échoué pour', failure.email || failure.customerId, err.message);
        }
    }

    if (transporter) {
        try {
            await sendAdminFailureDigest(transporter, openFailures, dunningEmailsSent, terminated, conn);
        } catch (err) {
            console.error('Cron: récapitulatif admin non envoyé:', err.message);
        }
    }

    return { failedPayments: openFailures.length, dunningEmailsSent, terminated };
}

export async function processFailedPayments(stripe, { conn, now } = {}) {
    const failures = await scanFailedPayments(stripe);
    const transporter = getTransporter();
    return applyPaymentGracePolicy({ stripe, failures, transporter, conn, now });
}

async function terminateDomiciliation({ stripe, failure, conn, client, transporter }) {
    if (failure.subscriptionId) {
        try {
            await stripe.subscriptions.cancel(failure.subscriptionId);
        } catch (err) {
            // Déjà résilié côté Stripe : on continue pour figer le dossier.
            if (!/already been canceled|No such subscription/i.test(err.message || '')) {
                throw err;
            }
        }
    }

    if (client && client.status !== 'résilié') {
        await markClientStatus(conn, client, 'résilié', {
            domicile_terminated_at: new Date().toISOString().slice(0, 10),
            payment_issue_since: failure.failedAt || parseExtra(client.extra_info).payment_issue_since || null,
        });
    }

    // Marqueur posé en dernier : s'il était posé avant et que l'annulation échouait,
    // le dossier serait exclu des passages suivants sans jamais être résilié.
    await markStripeTerminated(stripe, failure);

    // La résiliation est faite : un échec d'email ne doit pas la faire compter comme ratée
    // (l'échec est journalisé dans email_logs et visible dans la fiche client).
    if (transporter && failure.email) {
        try {
            await sendTerminationEmail(transporter, failure, conn);
        } catch (err) {
            console.error('Cron: email de résiliation non envoyé à', failure.email, err.message);
        }
    }
}

async function sendFailedPaymentEmail(transporter, failure, conn) {
    const from = getSmtpConfig()?.from || CONTACT_EMAIL;
    const { subject, text, html } = buildPaymentFailedEmail({
        nom: failure.name,
        amount: formatAmount(failure.amountDue, failure.currency),
        payUrl: safeInvoiceUrl(failure.invoiceUrl) || `${publicSiteUrl()}/app/espace-client?tab=paiement`,
        deadlineIso: paymentGraceDeadline(failure.failedAt),
        nextAttemptIso: failure.nextAttempt,
    });
    await sendBrandedMail(transporter, { conn, type: 'payment_failed', from, to: failure.email, subject, text, html });
}

async function sendTerminationEmail(transporter, failure, conn) {
    const from = getSmtpConfig()?.from || CONTACT_EMAIL;
    const { subject, text, html } = buildTerminationEmail({
        nom: failure.name,
        amount: formatAmount(failure.amountDue, failure.currency),
    });
    await sendBrandedMail(transporter, { conn, type: 'domicile_terminated', from, to: failure.email, subject, text, html });
}

async function sendAdminFailureDigest(transporter, failures, dunningEmailsSent, terminated, conn) {
    const from = getSmtpConfig()?.from || CONTACT_EMAIL;
    const rows = failures.map((f) => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(f.name || 'Sans nom')}<br><span style="color:#64748B;font-size:12px;">${escapeHtml(f.email || f.customerId)}</span></td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(formatAmount(f.amountDue, f.currency) || 'inconnu')}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(f.subscriptionStatus || f.invoiceStatus || '—')}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(f.attemptCount || '—')}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formatDateFr(paymentGraceDeadline(f.failedAt)) || '—'}</td>
        </tr>`).join('');

    await sendBrandedMail(transporter, {
        conn,
        type: 'admin_payment_failures',
        from,
        to: ADMIN_EMAIL,
        subject: `${failures.length} paiement(s) en échec — ${terminated} résiliation(s) auto`,
        html: `
            <div>
                <h2 style="margin-top:0;color:#0f172a;">Paiements en échec</h2>
                <p>${failures.length} dossier(s) en impayé. ${dunningEmailsSent} relance(s) client envoyée(s). ${terminated} domiciliation(s) résiliée(s) automatiquement (délai de ${PAYMENT_GRACE_MONTHS} mois dépassé).</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead><tr style="background:#F8FAFC;text-align:left;">
                        <th style="padding:8px;">Client</th><th style="padding:8px;">Montant dû</th><th style="padding:8px;">Statut</th><th style="padding:8px;">Tentatives</th><th style="padding:8px;">Résiliation le</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <p style="color:#64748B;font-size:13px;">Détail dans l'onglet « Paiements Échoués » de l'administration : ${publicSiteUrl()}/app/admin</p>
            </div>
        `,
    });
}
