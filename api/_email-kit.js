import { DOMICILIATION_ADDRESS_ONE_LINE, AGREMENT_NUMBER } from '../shared/company.js';
import { EMAIL_LOGS_DDL, EMAIL_LOGS_MIGRATIONS, EMAIL_LOG_BODY_MAX } from '../shared/emailTables.js';
import { emailTypeInfo } from '../shared/emailTypes.js';

export const BRAND_NAME = 'Domiciliation Pas Cher';
/** Nom affiché comme expéditeur dans la boîte de réception (demande client, nov. 2026). */
export const SENDER_NAME = 'domiciliation-pas-cher.com';
export const CONTACT_EMAIL = 'contact@domiciliation-pas-cher.com';
export const COMPANY_ADDRESS = DOMICILIATION_ADDRESS_ONE_LINE;
export const AGREMENT = AGREMENT_NUMBER;
export const PHONE_DISPLAY = '09 60 39 69 07';
export const PHONE_HREF = 'tel:+33960396907';
/** Domaine réel du site (le .fr est mort). */
export const SITE_URL = 'https://www.domiciliation-pas-cher.com';
/** Signature commune à tous les emails envoyés aux clients et prospects. */
export const SIGNATURE = "L'équipe Domiciliation Pas Cher";

/**
 * UNE seule adresse email valide (pas de liste « a@x.fr, b@y.fr », pas de « > » ni de saut de ligne) :
 * nodemailer transforme une liste en plusieurs destinataires et un « \r\nBcc: » en destinataire caché,
 * ce qui transformait le formulaire public en relais de phishing depuis notre domaine.
 */
export function isSingleEmail(value) {
    if (typeof value !== 'string') return false;
    const email = value.trim();
    return email.length > 0 && email.length <= 254 && /^[^\s@,;<>"()\\]+@[^\s@,;<>"()\\]+\.[^\s@,;<>"()\\]+$/.test(email);
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** "domiciliation-pas-cher.com" <adresse> — garde l'adresse SMTP_FROM, impose le nom d'expéditeur. */
export function brandedFrom(smtpFrom) {
    const raw = String(smtpFrom || CONTACT_EMAIL);
    const match = raw.match(/<([^>]+)>/);
    const address = (match ? match[1] : raw).trim();
    return `"${SENDER_NAME}" <${address}>`;
}

/** URL publique du site pour les emails envoyés sans requête (cron). */
export function publicSiteUrl() {
    return String(process.env.PUBLIC_SITE_URL || SITE_URL).replace(/\/+$/, '');
}

export function getBaseUrl(req) {
    const host = req?.headers?.host;
    if (host) return `${req.headers['x-forwarded-proto'] || 'https'}://${host}`;
    return publicSiteUrl();
}

/**
 * Nom à afficher dans la formule d'appel : vide si absent ou si l'appelant a passé une valeur
 * de repli technique (« Client », « undefined »…) — on écrit alors simplement « Bonjour, ».
 */
export function displayName(nom) {
    const name = String(nom ?? '').trim();
    if (!name || /^(client|undefined|null)$/i.test(name)) return '';
    return name;
}

export function greetingText(nom) {
    const name = displayName(nom);
    return name ? `Bonjour ${name},` : 'Bonjour,';
}

export function greetingHtml(nom) {
    const name = displayName(nom);
    return name ? `Bonjour ${escapeHtml(name)},` : 'Bonjour,';
}

/** Montant au format français : 28,80 € (virgule, espace avant €). Chaîne vide si invalide. */
export function formatEuro(value) {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isFinite(n)) return '';
    const [int, dec] = n.toFixed(2).split('.');
    return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec} €`;
}

/** Signature HTML et texte (identiques dans tous les emails). */
export function signatureHtml(closing = 'Bien cordialement,') {
    return `<p style="margin-top:24px;">${closing}<br>${SIGNATURE}</p>`;
}

export function signatureText(closing = 'Bien cordialement,') {
    return `${closing}\n${SIGNATURE}`;
}

/** Texte saisi par un utilisateur, échappé, avec ses retours à la ligne conservés. */
export function escapeMultiline(value) {
    return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

export function emailButton(href, label, color = '#1A56DB') {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;"><tr><td style="border-radius:6px;background:${color};">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

const LEGACY_WRAPPER = /^\s*<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;[^"]*">([\s\S]*)<\/div>\s*$/;

/** Gabarit responsive commun : en-tête marque, contenu, pied avec adresse et agrément. */
export function wrapEmail(innerHtml, { unsubscribeUrl, preheader } = {}) {
    const content = String(innerHtml || '').replace(LEGACY_WRAPPER, '$1');
    const unsubscribe = unsubscribeUrl
        ? `<p style="margin:12px 0 0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Se désinscrire de ces emails</a></p>`
        : '';
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND_NAME}</title>
<style>@media only screen and (max-width:620px){.dpc-container{width:100% !important;}.dpc-body{padding:22px 18px !important;}}</style></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" class="dpc-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
<tr><td style="background:#0f172a;padding:18px 28px;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">${BRAND_NAME}</td></tr>
<tr><td class="dpc-body" style="padding:30px 32px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155;">${content}</td></tr>
<tr><td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#64748b;">
<p style="margin:0;"><strong>${BRAND_NAME}</strong> — ${COMPANY_ADDRESS}</p>
<p style="margin:4px 0 0;">Agrément préfectoral de domiciliation n° ${AGREMENT}</p>
<p style="margin:4px 0 0;"><a href="${PHONE_HREF}" style="color:#64748b;">${PHONE_DISPLAY}</a> · <a href="mailto:${CONTACT_EMAIL}" style="color:#64748b;">${CONTACT_EMAIL}</a> · <a href="${SITE_URL}" style="color:#64748b;">www.domiciliation-pas-cher.com</a></p>
${unsubscribe}
</td></tr></table></td></tr></table></body></html>`;
}

export function textFooter(unsubscribeUrl) {
    return `\n\n--\n${BRAND_NAME} — ${COMPANY_ADDRESS}\nAgrément préfectoral de domiciliation n° ${AGREMENT}\n${PHONE_DISPLAY} · ${CONTACT_EMAIL} · ${SITE_URL}${unsubscribeUrl ? `\nSe désinscrire : ${unsubscribeUrl}` : ''}`;
}

/** Version texte de secours : un email sans partie texte est plus souvent classé en spam. */
export function htmlToText(html) {
    return String(html || '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
        .replace(/<(br|\/p|\/h[1-6]|\/li|\/tr|\/div)\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
}

let emailTablesReady = false;

export async function ensureEmailLogTable(conn) {
    if (!conn || emailTablesReady) return;
    await conn.execute(EMAIL_LOGS_DDL);
    for (const sql of EMAIL_LOGS_MIGRATIONS) {
        try {
            await conn.execute(sql);
        } catch {
            // colonne déjà présente
        }
    }
    emailTablesReady = true;
}

/**
 * Journalise un email (envoyé OU en échec) dans email_logs : c'est la source de l'historique
 * de la fiche client. Ne lève jamais : un journal en panne ne doit pas bloquer un envoi.
 */
export async function logEmail(conn, entry) {
    if (!conn) return;
    const base = [
        `eml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        String(entry.to).trim().toLowerCase().slice(0, 500),
        String(entry.clientEmail || entry.to).trim().toLowerCase().slice(0, 250),
        entry.type || null,
        String(entry.subject || '').slice(0, 500),
        entry.status,
        entry.error || null,
        new Date().toISOString(),
    ];
    try {
        await ensureEmailLogTable(conn);
        await conn.execute(
            'INSERT INTO email_logs (id, to_email, client_email, type, subject, status, error, sent_at, body_text, source, message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                ...base,
                entry.bodyText ? String(entry.bodyText).slice(0, EMAIL_LOG_BODY_MAX) : null,
                entry.source || emailTypeInfo(entry.type).source,
                entry.messageId ? String(entry.messageId).slice(0, 255) : null,
            ],
        );
    } catch (err) {
        console.error('[email-log] insert failed:', err?.message || err);
        // Les colonnes ajoutées (contenu, origine) peuvent manquer si la migration a été refusée : on journalise au moins
        // l'essentiel (destinataire, objet, statut), pour que l'historique et le plafond public continuent de fonctionner.
        try {
            await conn.execute(
                'INSERT INTO email_logs (id, to_email, client_email, type, subject, status, error, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                base,
            );
        } catch (fallbackErr) {
            console.error('[email-log] insert de repli failed:', fallbackErr?.message || fallbackErr);
        }
    }
}

/**
 * Envoi au gabarit de la marque + journalisation dans email_logs (historique visible dans la fiche admin).
 * Relance l'erreur SMTP après l'avoir journalisée.
 */
export async function sendBrandedMail(transporter, {
    conn, from, to, subject, text, html, type, replyTo = CONTACT_EMAIL, unsubscribeUrl, preheader, clientEmail, source,
}) {
    const headers = {
        'X-Entity-Ref-ID': `${type || 'generic'}-${Date.now()}`,
    };
    if (unsubscribeUrl) {
        headers['List-Unsubscribe'] = `<${unsubscribeUrl}>, <mailto:${CONTACT_EMAIL}?subject=unsubscribe>`;
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
    const plainText = text || htmlToText(html);
    try {
        const info = await transporter.sendMail({
            from: brandedFrom(from),
            to,
            subject,
            text: `${plainText}${textFooter(unsubscribeUrl)}`,
            html: wrapEmail(html, { unsubscribeUrl, preheader }),
            replyTo,
            headers,
        });
        await logEmail(conn, { to, clientEmail, type, subject, status: 'sent', bodyText: plainText, source, messageId: info?.messageId });
        return info;
    } catch (err) {
        await logEmail(conn, { to, clientEmail, type, subject, status: 'failed', error: err?.message || String(err), bodyText: plainText, source });
        throw err;
    }
}
