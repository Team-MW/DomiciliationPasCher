import { getTransporter, getSmtpConfig, ADMIN_EMAIL } from './_smtp.js';
import { scanFailedPayments } from './_stripe-failures.js';
import { isPaymentGraceExpired, paymentGraceDeadline, formatDateFr } from '../shared/paymentGrace.js';

const formatAmount = (amount, currency = 'eur') =>
    typeof amount === 'number'
        ? amount.toLocaleString('fr-FR', { style: 'currency', currency: currency.toUpperCase() })
        : 'montant inconnu';

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

            if (expired) {
                await terminateDomiciliation({ stripe, failure, conn, client, transporter });
                terminated++;
                continue;
            }

            if (client && client.status === 'actif') {
                await markClientStatus(conn, client, 'echec_paiement', {
                    payment_issue_since: failure.failedAt || new Date(now).toISOString().slice(0, 10),
                });
            }

            if (!transporter || !failure.email || !failure.invoiceId) continue;
            if (String(failure.lastDunningAttempt) === String(failure.attemptCount)) continue;

            await sendFailedPaymentEmail(transporter, failure);
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
            await sendAdminFailureDigest(transporter, openFailures, dunningEmailsSent, terminated);
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
    await markStripeTerminated(stripe, failure);

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

    if (transporter && failure.email) {
        await sendTerminationEmail(transporter, failure);
    }
}

async function sendFailedPaymentEmail(transporter, failure) {
    const from = getSmtpConfig()?.from || 'contact@domiciliation-pas-cher.com';
    const amount = formatAmount(failure.amountDue, failure.currency);
    const link = failure.invoiceUrl || 'https://domiciliation-pas-cher.fr/connexion';
    const deadline = formatDateFr(paymentGraceDeadline(failure.failedAt));
    const deadlineLine = deadline
        ? `Sans règlement avant le ${deadline} (2 mois après l'incident), votre contrat de domiciliation sera résilié et vous ne serez plus domicilié à notre adresse.`
        : `Sans règlement sous 2 mois, votre contrat de domiciliation sera résilié et vous ne serez plus domicilié à notre adresse.`;

    const text = `Bonjour ${failure.name || 'Client'},\n\nNous vous informons qu'un incident est survenu lors de votre dernier règlement de ${amount}.\n\nVeuillez régler votre situation. ${deadlineLine}\n\nVous pouvez régulariser ici : ${link}\n\nBien cordialement,\nLe service comptabilité`;

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2>Incident de paiement — action requise</h2>
            <p>Bonjour ${failure.name || 'Client'},</p>
            <p>Nous vous informons qu'un incident est survenu lors de votre dernier règlement de <strong>${amount}</strong>.</p>
            <p><strong>Veuillez régler votre situation.</strong> ${deadlineLine}</p>
            <p style="margin: 24px 0;">
                <a href="${link}" style="background:#DC2626;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Régler ma facture</a>
            </p>
            ${failure.nextAttempt ? `<p style="color:#64748B;font-size:14px;">Une nouvelle tentative de prélèvement est prévue le ${failure.nextAttempt}.</p>` : ''}
            <p>Bien cordialement,<br>Le service comptabilité</p>
        </div>
    `;

    await transporter.sendMail({
        from,
        to: failure.email,
        subject: 'Veuillez régler — sinon votre domiciliation sera résiliée',
        text,
        html,
    });
}

async function sendTerminationEmail(transporter, failure) {
    const from = getSmtpConfig()?.from || 'contact@domiciliation-pas-cher.com';
    const amount = formatAmount(failure.amountDue, failure.currency);

    const text = `Bonjour ${failure.name || 'Client'},\n\nMalgré nos relances, l'impayé de ${amount} n'a pas été régularisé dans le délai de 2 mois.\n\nVotre contrat de domiciliation est donc résilié. Vous n'êtes plus domicilié à notre adresse.\n\nPour toute question, répondez à cet e-mail.\n\nBien cordialement,\nLe service comptabilité`;

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2>Domiciliation résiliée</h2>
            <p>Bonjour ${failure.name || 'Client'},</p>
            <p>Malgré nos relances, l'impayé de <strong>${amount}</strong> n'a pas été régularisé dans le délai de 2 mois.</p>
            <p><strong>Votre contrat de domiciliation est donc résilié. Vous n'êtes plus domicilié à notre adresse.</strong></p>
            <p>Pour toute question, répondez à cet e-mail.</p>
            <p>Bien cordialement,<br>Le service comptabilité</p>
        </div>
    `;

    await transporter.sendMail({
        from,
        to: failure.email,
        subject: 'Domiciliation résiliée — défaut de paiement',
        text,
        html,
    });
}

async function sendAdminFailureDigest(transporter, failures, dunningEmailsSent, terminated) {
    const from = getSmtpConfig()?.from || 'contact@domiciliation-pas-cher.com';
    const rows = failures.map((f) => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${f.name || 'Sans nom'}<br><span style="color:#64748B;font-size:12px;">${f.email || f.customerId}</span></td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formatAmount(f.amountDue, f.currency)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${f.subscriptionStatus || f.invoiceStatus || '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${f.attemptCount || '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formatDateFr(paymentGraceDeadline(f.failedAt)) || '—'}</td>
        </tr>`).join('');

    await transporter.sendMail({
        from,
        to: ADMIN_EMAIL,
        subject: `${failures.length} paiement(s) en échec — ${terminated} résiliation(s) auto`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto;">
                <h2>Paiements en échec</h2>
                <p>${failures.length} dossier(s) en impayé. ${dunningEmailsSent} relance(s) client envoyée(s). ${terminated} domiciliation(s) résiliée(s) automatiquement (délai de 2 mois dépassé).</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead><tr style="background:#F8FAFC;text-align:left;">
                        <th style="padding:8px;">Client</th><th style="padding:8px;">Montant dû</th><th style="padding:8px;">Statut</th><th style="padding:8px;">Tentatives</th><th style="padding:8px;">Résiliation le</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <p style="color:#64748B;font-size:13px;">Détail dans l'onglet « Paiements Échoués » de l'administration.</p>
            </div>
        `,
    });
}
