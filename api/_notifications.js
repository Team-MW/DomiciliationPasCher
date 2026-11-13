import { parisDaysBetween } from '../shared/parisDate.js';
import { ADMIN_EMAIL } from './_smtp.js';
import { readServerEnv } from './_env.js';
import { GOOGLE_REVIEW_URL } from '../shared/company.js';
import { fetchStripeBilling } from './_stripe-billing.js';
import { reconcilePendingPayment } from './_payment-reconcile.js';
import { sendBrandedMail } from './_email-kit.js';
import { deliverEmail } from './_email-core.js';
import { buildDocumentRequestEmail, buildMailDigestEmail, buildLeadReminderEmail, buildAccountCreatedEmail, buildReviewRequestEmail } from './_email-templates.js';
import { computeMissingDocuments, dueDocumentReminder, clientUploadsSince } from '../shared/documentRequest.js';
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

/** extra_info FRAIS d'un client (repli : l'instantané déjà lu si la relecture échoue). */
async function readFreshExtra(conn, clientId, fallback) {
    try {
        const res = await conn.execute('SELECT extra_info FROM clients WHERE id = ?', [clientId]);
        if (res?.rows?.[0]) return parseExtra(res.rows[0].extra_info);
    } catch {
        // on garde l'instantané
    }
    return fallback;
}

/**
 * Écrit extra_info en ne modifiant QUE les clés du cron, à partir de la valeur la plus récente. Avant, le cron
 * réécrivait la copie lue au début de sa boucle : un paiement (webhook) ou un dépôt de document survenu pendant
 * les envois d'emails était écrasé (le client payé redevenait « en attente » et recevait la relance suivante).
 */
async function mergeClientExtra(conn, clientId, fallback, mutate) {
    const fresh = await readFreshExtra(conn, clientId, fallback);
    await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify(mutate({ ...fresh })), clientId]);
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
export async function processMailNotifications({ conn, transporter, from, baseUrl, clientId = null, minGapMs = 0 }) {
    if (!conn || !transporter) return { mailDigestsSent: 0 };
    await ensureMailNotifiedColumn(conn);

    // Envoi immédiat après un dépôt : un seul client, et pas si on vient de le prévenir (le récap horaire regroupera la suite).
    if (clientId && minGapMs > 0) {
        const last = await conn.execute("SELECT MAX(notified_at) AS last FROM mail WHERE clientId = ? AND notified_at LIKE '20%'", [clientId]);
        const lastAt = last.rows?.[0]?.last;
        if (lastAt && Date.now() - new Date(lastAt).getTime() < minGapMs) return { mailDigestsSent: 0 };
    }

    // Réservation abandonnée (fonction coupée en plein envoi) depuis plus de 10 min : on la libère.
    await conn.execute(
        "UPDATE mail SET notified_at = NULL WHERE notified_at LIKE 'sending:%' AND notified_at < ?",
        [`sending:${Date.now() - 10 * 60 * 1000}`],
    );

    const res = await conn.execute(
        `SELECT m.id, m.clientId, m.type, m.\`from\` AS mailFrom, m.date, m.status, m.preview, c.email, c.name, c.plan, c.status AS clientStatus, c.extra_info
         FROM mail m JOIN clients c ON c.id = m.clientId
         WHERE m.notified_at IS NULL${clientId ? ' AND m.clientId = ?' : ''}`,
        clientId ? [clientId] : [],
    );

    const byClient = new Map();
    for (const row of res.rows || []) {
        if (!byClient.has(row.clientId)) byClient.set(row.clientId, { client: row, mails: [] });
        byClient.get(row.clientId).mails.push({ id: row.id, type: row.type, from: row.mailFrom, date: row.date, status: row.status, preview: row.preview });
    }

    let sent = 0;
    for (const { client, mails: candidates } of byClient.values()) {
        // Réserver les courriers AVANT d'envoyer : deux dépôts simultanés (double clic, deux admins, cron + dépôt)
        // lisaient les mêmes courriers « non notifiés » et envoyaient chacun le même email au client.
        // Un envoi est déjà en cours pour ce client (cron + dépôt au même moment) : on le laisse finir, le reste partira au
        // prochain passage, plutôt que deux emails à la même seconde.
        const busy = await conn.execute("SELECT id FROM mail WHERE clientId = ? AND notified_at LIKE 'sending:%' LIMIT 1", [client.clientId]);
        if (busy.rows?.length) continue;
        const token = `sending:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
        const candidateIds = candidates.map((m) => m.id);
        await conn.execute(
            `UPDATE mail SET notified_at = ? WHERE notified_at IS NULL AND id IN (${candidateIds.map(() => '?').join(', ')})`,
            [token, ...candidateIds],
        );
        const claimed = new Set(((await conn.execute('SELECT id FROM mail WHERE notified_at = ?', [token])).rows || []).map((r) => String(r.id)));
        const mails = candidates.filter((m) => claimed.has(String(m.id)));
        if (!mails.length) continue; // un autre envoi s'en occupe déjà
        const markNotified = (value) => conn.execute('UPDATE mail SET notified_at = ? WHERE notified_at = ?', [value, token]);
        const extra = parseExtra(client.extra_info);
        const to = String(extra.emailCourrier || client.email || '').trim();
        if (!to || client.clientStatus === 'résilié') {
            await markNotified('skipped');
            continue;
        }
        try {
            const { subject, text, html } = buildMailDigestEmail({ nom: client.name, mails, plan: client.plan, extra, baseUrl });
            await sendBrandedMail(transporter, { conn, from, to, subject, text, html, type: 'new_mail' });
            await markNotified(new Date().toISOString());
            sent++;
        } catch (err) {
            console.error('Cron courrier: envoi échoué pour', to, err.message);
            await markNotified(null); // libéré : le prochain passage réessaiera
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
            const docsRes = await conn.execute('SELECT name, owner, uploadedAt FROM documents WHERE clientId = ?', [client.id]);
            const missing = computeMissingDocuments(request.missing, { extra, documents: docsRes.rows || [] });
            const save = (patch) => mergeClientExtra(conn, client.id, extra, (e) => ({ ...e, doc_request: { ...(e.doc_request || request), ...patch } }));

            if (missing.length === 0) {
                await save({ completed_at: now.toISOString() });
                continue;
            }
            // Le client a déposé un fichier (nom libre : « scan001.pdf ») depuis la demande : relances suspendues,
            // l'admin vérifie et clôture la demande. Avant : « Dernier rappel… » envoyé malgré le dépôt.
            if (request.client_upload_noticed) continue;
            const uploads = clientUploadsSince(docsRes.rows || [], request.requested_at);
            if (uploads.length > 0) {
                await save({ client_upload_noticed: now.toISOString() });
                try {
                    const names = uploads.map((d) => d.name).filter(Boolean).join(', ') || 'document';
                    await sendBrandedMail(transporter, {
                        conn, from, to: ADMIN_EMAIL, type: 'admin_document_uploaded', source: 'auto',
                        subject: `Document déposé par ${client.name || client.email} — à vérifier`,
                        text: `${client.name || client.email} (${client.email}) a déposé : ${names}.\n\nPièces encore réclamées automatiquement : ${missing.join(', ')}. Les relances sont suspendues : vérifiez le document dans sa fiche puis arrêtez la demande de documents si tout est bon.`,
                        html: `<p><strong>${client.name || client.email}</strong> (${client.email}) a déposé : <strong>${names}</strong>.</p><p>Pièces encore réclamées automatiquement : ${missing.join(', ')}. Les relances sont <strong>suspendues</strong> : vérifiez le document dans sa fiche, puis arrêtez la demande de documents si tout est bon.</p>`,
                    });
                } catch (err) {
                    console.error('Cron documents: alerte admin non envoyée:', err.message);
                }
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

/** Au-delà de 7 jours après la saisie de l'email, un prospect n'est plus relancé. */
export const LEAD_REMINDER_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Relances 1 h / J+1 / J+3 pour les inscriptions commencées et non terminées. */
export async function processSouscriptionLeads({ conn, transporter, from, baseUrl, now = new Date() }) {
    if (!conn || !transporter) return { leadRemindersSent: 0 };
    await conn.execute(SOUSCRIPTION_LEADS_DDL);

    const res = await conn.execute(
        'SELECT * FROM souscription_leads WHERE completed_at IS NULL AND unsubscribed_at IS NULL AND reminders_sent < ? AND created_at > ?',
        [LEAD_REMINDER_OFFSETS_MS.length, new Date(now.getTime() - LEAD_REMINDER_MAX_AGE_MS).toISOString()],
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
            // Prospect trop ancien : pas de relance tardive (« reprenez votre inscription » 3 semaines après serait déplacé).
            // Important depuis la réparation du cron horaire : d'anciens prospects abandonnés ne doivent pas être relancés d'un coup.
            if (elapsed > LEAD_REMINDER_MAX_AGE_MS) continue;
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

/** Demande d'avis : entre J+7 et J+30 après la souscription (les clients plus anciens ne sont jamais sollicités d'un coup). */
export const REVIEW_REQUEST_MIN_DAYS = 7;
export const REVIEW_REQUEST_MAX_DAYS = 30;
const REVIEW_REQUESTS_PER_RUN = 30;

/** Lien d'avis : variable serveur GOOGLE_REVIEW_URL, sinon la constante de shared/company.js. Vide = désactivé. */
export function resolveReviewUrl() {
    const raw = String(readServerEnv('GOOGLE_REVIEW_URL') || GOOGLE_REVIEW_URL || '').trim();
    return /^https:\/\/[^\s"'<>]+$/.test(raw) ? raw : '';
}

/**
 * Une semaine après la souscription : « laissez-nous un avis Google ». Une seule fois par client, clients actifs
 * dont la carte est enregistrée ; le marqueur `review_request_sent_at` est posé dans extra_info.
 */
export async function processReviewRequests({ conn, transporter, from, baseUrl, now = new Date(), reviewUrl = resolveReviewUrl() }) {
    if (!conn || !transporter) return { reviewRequestsSent: 0 };
    if (!reviewUrl) return { reviewRequestsSent: 0, reviewRequestsSkipped: 'lien d’avis non configuré' };
    const res = await conn.execute("SELECT id, name, email, status, since, extra_info FROM clients WHERE status = 'actif'");
    let sent = 0;
    for (const client of res.rows || []) {
        if (sent >= REVIEW_REQUESTS_PER_RUN) break;
        const extra = parseExtra(client.extra_info);
        if (extra.review_request_sent_at || extra.payment_status === 'pending' || !client.email) continue;
        const days = parisDaysBetween(client.since, now);
        if (!Number.isFinite(days) || days < REVIEW_REQUEST_MIN_DAYS || days > REVIEW_REQUEST_MAX_DAYS) continue;
        try {
            const { subject, text, html } = buildReviewRequestEmail({ nom: client.name, reviewUrl, baseUrl });
            await sendBrandedMail(transporter, { conn, from, to: client.email, clientEmail: client.email, subject, text, html, type: 'review_request', source: 'auto' });
            await mergeClientExtra(conn, client.id, extra, (e) => ({ ...e, review_request_sent_at: now.toISOString() }));
            sent++;
        } catch (err) {
            console.error('Cron avis: envoi échoué pour', client.email, err.message);
        }
    }
    return { reviewRequestsSent: sent };
}

export async function processPendingPayments({ conn, transporter, from, baseUrl, now = new Date(), stripe = null }) {
    if (!conn || !transporter) return { paymentRemindersSent: 0 };
    const res = await conn.execute(
        "SELECT id, email, name, plan, status, extra_info FROM clients WHERE extra_info LIKE '%payment_token%'"
    );

    let sent = 0;
    for (const client of res.rows || []) {
        const extra = parseExtra(client.extra_info);
        if (extra.payment_status !== 'pending' || !extra.payment_token || !extra.payment_requested_at) continue;
        if (extra.stripe_subscription_id || client.status === 'résilié') continue;

        const elapsedDays = parisDaysBetween(extra.payment_requested_at, now); // jours calendaires : J+2 = surlendemain
        const already = new Set(extra.payment_reminders_sent || []);
        const due = PAYMENT_REMINDER_DAYS.filter((day) => elapsedDays >= day && !already.has(day));
        if (due.length === 0) continue;

        try {
            // Stripe a-t-il déjà un abonnement actif pour cet email (payé sans revenir sur le site, webhook manqué) ?
            // Alors on rattache le paiement à la fiche et on ne relance PAS « enregistrez votre carte ».
            if (stripe) {
                try {
                    const billing = await fetchStripeBilling(stripe, { email: client.email, customerId: extra.stripe_customer_id || null });
                    const r = await reconcilePendingPayment({
                        conn, clientId: client.id, billing,
                        notify: ({ email: to, nom }) => deliverEmail({ type: 'approval', email: to, nom }, { baseUrl, source: 'auto' }),
                    });
                    if (r.changed) continue;
                } catch (err) {
                    console.error('Cron paiement: vérification Stripe impossible pour', client.email, err?.message || err);
                }
            }
            // Le client a peut-être payé depuis le début du passage du cron : on ne relance pas quelqu'un qui a déjà payé.
            const latest = await readFreshExtra(conn, client.id, extra);
            if (latest.payment_status !== 'pending' || latest.stripe_subscription_id) continue;
            const { subject, text, html } = buildAccountCreatedEmail({
                nom: client.name,
                email: client.email,
                planName: client.plan,
                frequence: extra.frequence,
                payUrl: `${baseUrl}/api/pay?token=${encodeURIComponent(extra.payment_token)}`,
                baseUrl,
                isReminder: true,
                extra,
            });
            await sendBrandedMail(transporter, { conn, from, to: client.email, subject, text, html, type: 'payment_link_reminder' });
            await mergeClientExtra(conn, client.id, extra, (e) => ({
                ...e,
                payment_reminders_sent: [...new Set([...(e.payment_reminders_sent || []), ...already, ...due])],
            }));
            sent++;
        } catch (err) {
            console.error('Cron paiement: relance échouée pour', client.email, err.message);
        }
    }
    return { paymentRemindersSent: sent };
}
