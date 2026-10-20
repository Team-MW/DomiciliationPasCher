import { sendBrandedMail } from './_email-kit.js';
import { buildDocumentRequestEmail, buildMailDigestEmail, buildLeadReminderEmail, buildAccountCreatedEmail } from './_email-templates.js';
import { computeMissingDocuments, dueDocumentReminder } from '../shared/documentRequest.js';
import { SOUSCRIPTION_LEADS_DDL, LEAD_REMINDER_OFFSETS_MS } from '../shared/emailTables.js';

function parseExtra(raw) {
    try {
        let extra = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof extra === 'string') extra = JSON.parse(extra);
        return extra && typeof extra === 'object' ? extra : {};
    } catch {
        return {};
    }
}

/**
 * Ajoute mail.notified_at. À la création de la colonne, l'historique est marqué « legacy »
 * pour ne pas renvoyer d'email pour d'anciens courriers.
 */
async function ensureMailNotifiedColumn(conn) {
    try {
        await conn.execute('ALTER TABLE mail ADD COLUMN notified_at VARCHAR(64) NULL');
        await conn.execute("UPDATE mail SET notified_at = 'legacy' WHERE notified_at IS NULL");
    } catch {
        // colonne déjà présente
    }
}

/** Un seul email récapitulatif par client pour tous les courriers enregistrés depuis le dernier passage. */
export async function processMailNotifications({ conn, transporter, from, baseUrl }) {
    if (!conn || !transporter) return { mailDigestsSent: 0 };
    await ensureMailNotifiedColumn(conn);

    const res = await conn.execute(
        `SELECT m.id, m.clientId, m.type, m.\`from\` AS mailFrom, m.date, m.status, c.email, c.name, c.plan, c.status AS clientStatus, c.extra_info
         FROM mail m JOIN clients c ON c.id = m.clientId
         WHERE m.notified_at IS NULL`
    );

    const byClient = new Map();
    for (const row of res.rows || []) {
        if (!byClient.has(row.clientId)) byClient.set(row.clientId, { client: row, mails: [] });
        byClient.get(row.clientId).mails.push({ id: row.id, type: row.type, from: row.mailFrom, date: row.date, status: row.status });
    }

    let sent = 0;
    for (const { client, mails } of byClient.values()) {
        const ids = mails.map((m) => m.id);
        const markNotified = (value) => conn.execute(
            `UPDATE mail SET notified_at = ? WHERE id IN (${ids.map(() => '?').join(', ')})`,
            [value, ...ids],
        );
        const extra = parseExtra(client.extra_info);
        const to = String(extra.emailCourrier || client.email || '').trim();
        if (!to || client.clientStatus === 'résilié') {
            await markNotified('skipped');
            continue;
        }
        try {
            const { subject, text, html } = buildMailDigestEmail({ nom: client.name, mails, plan: client.plan, baseUrl });
            await sendBrandedMail(transporter, { conn, from, to, subject, text, html, type: 'new_mail' });
            await markNotified(new Date().toISOString());
            sent++;
        } catch (err) {
            console.error('Cron courrier: envoi échoué pour', to, err.message);
        }
    }
    return { mailDigestsSent: sent };
}

/** Relances J+7 / J+30 / J+60 / J+80 tant que statuts / Kbis manquent. */
export async function processDocumentRequests({ conn, transporter, from, baseUrl, now = new Date() }) {
    if (!conn || !transporter) return { documentRemindersSent: 0 };
    const res = await conn.execute(
        "SELECT id, email, name, status, extra_info FROM clients WHERE extra_info LIKE '%doc_request%'"
    );

    let sent = 0;
    for (const client of res.rows || []) {
        const extra = parseExtra(client.extra_info);
        const request = extra.doc_request;
        if (!request || request.completed_at || client.status === 'résilié') continue;

        try {
            const docsRes = await conn.execute('SELECT name FROM documents WHERE clientId = ?', [client.id]);
            const missing = computeMissingDocuments(request.missing, { extra, documents: docsRes.rows || [] });
            const save = (patch) => conn.execute(
                'UPDATE clients SET extra_info = ? WHERE id = ?',
                [JSON.stringify({ ...extra, doc_request: { ...request, ...patch } }), client.id],
            );

            if (missing.length === 0) {
                await save({ completed_at: now.toISOString() });
                continue;
            }

            const due = dueDocumentReminder(request, now);
            if (!due) continue;

            const { subject, text, html } = buildDocumentRequestEmail({
                nom: client.name,
                missing,
                isCreation: Boolean(request.is_creation),
                contractSignedAt: extra.contractSignedAt,
                baseUrl,
                reminderDay: due.day,
                isLast: due.isLast,
            });
            await sendBrandedMail(transporter, {
                conn, from, to: client.email, subject, text, html,
                type: due.initial ? 'request_documents' : 'request_documents_reminder',
            });
            await save(due.initial
                ? { missing, initial_pending: false, requested_at: now.toISOString() }
                : {
                    missing,
                    reminders_sent: [...new Set([...(request.reminders_sent || []), ...due.covered])],
                    last_reminder_at: now.toISOString(),
                });
            sent++;
        } catch (err) {
            console.error('Cron documents: relance échouée pour', client.email, err.message);
        }
    }
    return { documentRemindersSent: sent };
}

/** Relances 1 h / J+1 / J+3 pour les inscriptions commencées et non terminées. */
export async function processSouscriptionLeads({ conn, transporter, from, baseUrl, now = new Date() }) {
    if (!conn || !transporter) return { leadRemindersSent: 0 };
    await conn.execute(SOUSCRIPTION_LEADS_DDL);

    const res = await conn.execute(
        'SELECT * FROM souscription_leads WHERE completed_at IS NULL AND unsubscribed_at IS NULL AND reminders_sent < ?',
        [LEAD_REMINDER_OFFSETS_MS.length],
    );

    let sent = 0;
    for (const lead of res.rows || []) {
        try {
            const done = await conn.execute(
                "SELECT 1 FROM clients WHERE email = ? UNION SELECT 1 FROM demandes WHERE email = ? AND status = 'en_attente' LIMIT 1",
                [lead.email, lead.email],
            );
            if (done.rows?.length) {
                await conn.execute('UPDATE souscription_leads SET completed_at = ? WHERE email = ?', [now.toISOString(), lead.email]);
                continue;
            }

            // Inscription encore en cours de saisie : on ne relance pas.
            if (lead.updated_at && now.getTime() - new Date(lead.updated_at).getTime() < 30 * 60 * 1000) continue;

            const elapsed = now.getTime() - new Date(lead.created_at).getTime();
            const reached = LEAD_REMINDER_OFFSETS_MS.filter((offset) => elapsed >= offset).length;
            const already = Number(lead.reminders_sent) || 0;
            if (reached <= already) continue;

            const resumeUrl = `${baseUrl}/souscription?plan=${encodeURIComponent(lead.plan || 'essentiel')}&reprise=${encodeURIComponent(lead.token)}`;
            const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(lead.token)}`;
            const { subject, text, html } = buildLeadReminderEmail({
                firstName: lead.first_name,
                planId: lead.plan,
                step: lead.step,
                resumeUrl,
                unsubscribeUrl,
                reminderIndex: reached - 1,
            });
            await sendBrandedMail(transporter, {
                conn, from, to: lead.email, subject, text, html, type: 'souscription_reminder', unsubscribeUrl,
            });
            await conn.execute(
                'UPDATE souscription_leads SET reminders_sent = ?, last_reminder_at = ? WHERE email = ?',
                [reached, now.toISOString(), lead.email],
            );
            sent++;
        } catch (err) {
            console.error('Cron inscription: relance échouée pour', lead.email, err.message);
        }
    }
    return { leadRemindersSent: sent };
}

/** Relances J+2 / J+5 du lien de paiement envoyé aux clients créés depuis l'admin. */
export const PAYMENT_REMINDER_DAYS = [2, 5];

export async function processPendingPayments({ conn, transporter, from, baseUrl, now = new Date() }) {
    if (!conn || !transporter) return { paymentRemindersSent: 0 };
    const res = await conn.execute(
        "SELECT id, email, name, plan, status, extra_info FROM clients WHERE extra_info LIKE '%payment_token%'"
    );

    let sent = 0;
    for (const client of res.rows || []) {
        const extra = parseExtra(client.extra_info);
        if (extra.payment_status !== 'pending' || !extra.payment_token || !extra.payment_requested_at) continue;
        if (extra.stripe_subscription_id || client.status === 'résilié') continue;

        const elapsedDays = Math.floor((now.getTime() - new Date(extra.payment_requested_at).getTime()) / (24 * 60 * 60 * 1000));
        const already = new Set(extra.payment_reminders_sent || []);
        const due = PAYMENT_REMINDER_DAYS.filter((day) => elapsedDays >= day && !already.has(day));
        if (due.length === 0) continue;

        try {
            const { subject, text, html } = buildAccountCreatedEmail({
                nom: client.name,
                email: client.email,
                planName: client.plan,
                frequence: extra.frequence,
                payUrl: `${baseUrl}/api/pay?token=${encodeURIComponent(extra.payment_token)}`,
                baseUrl,
                isReminder: true,
            });
            await sendBrandedMail(transporter, { conn, from, to: client.email, subject, text, html, type: 'payment_link_reminder' });
            await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [
                JSON.stringify({ ...extra, payment_reminders_sent: [...already, ...due] }),
                client.id,
            ]);
            sent++;
        } catch (err) {
            console.error('Cron paiement: relance échouée pour', client.email, err.message);
        }
    }
    return { paymentRemindersSent: sent };
}
