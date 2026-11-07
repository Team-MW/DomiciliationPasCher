import nodemailer from 'nodemailer';
import { ADMIN_EMAIL } from './_smtp.js';
import { readServerEnv } from './_env.js';
import { getDbConn } from './_db.js';
import { sendBrandedMail, logEmail, htmlToText, isSingleEmail, escapeHtml, escapeMultiline, emailButton, displayName, CONTACT_EMAIL, SITE_URL } from './_email-kit.js';
import {
    buildDocumentRequestEmail, buildAccountCreatedEmail, buildMailDigestEmail, buildWelcomeEmail, buildApprovalEmail,
    buildPostSignatureEmail, buildNewMessageEmail, buildProcurationEmail, buildConsultationEmail,
    buildReexpeditionSentEmail, buildReexpeditionRefusedEmail, buildPaymentFailedEmail, buildPaymentReminderEmail,
} from './_email-templates.js';

export function safeHttpUrl(value) {
    if (!value || typeof value !== 'string') return undefined;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Tous les types acceptés par buildTransactionalEmail. `welcome` = type absent (paiement confirmé).
 * Un type inconnu est REFUSÉ (400) : avant, une faute de frappe envoyait l'email de bienvenue au
 * client et une fausse alerte « nouveau client » à l'admin.
 */
export const EMAIL_TYPES = Object.freeze([
    'welcome', 'approval', 'payment_failed', 'payment_reminder', 'post_signature', 'procuration_postale',
    'new_message', 'admin_new_message', 'new_mail', 'consultation_creation', 'admin_reexpedition',
    'reexpedition_sent', 'reexpedition_refused', 'souscription_lead', 'contact_advisor',
    'request_documents', 'account_created', 'admin_document_uploaded',
    'admin_payment_received', 'admin_payment_problem',
]);

export function isKnownEmailType(type) {
    return type === undefined || type === null || type === '' || EMAIL_TYPES.includes(type);
}

/** Types envoyés à la boîte interne (jamais au client). */
export const ADMIN_INBOX_TYPES = new Set(['admin_new_message', 'admin_reexpedition', 'admin_document_uploaded', 'admin_payment_received', 'admin_payment_problem']);
const CONTACT_INBOX_TYPES = new Set(['contact_advisor', 'souscription_lead']);

const field = (label, value, fallback = '—') =>
    `<p style="margin:6px 0;"><strong>${escapeHtml(label)} :</strong> ${value === undefined || value === null || String(value).trim() === '' ? escapeHtml(fallback) : escapeMultiline(value)}</p>`;
const fieldText = (label, value, fallback = '—') =>
    `${label} : ${value === undefined || value === null || String(value).trim() === '' ? fallback : value}`;
const box = (inner) => `<div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;">${inner}</div>`;

/**
 * Contenu d'un email transactionnel, sans rien envoyer (fonction pure, testable).
 * @returns {{ subject, text, html, to, replyTo, clientEmail, logType, adminCopy?: { subject, text, html, type } }}
 */
export function buildTransactionalEmail(body = {}, { baseUrl = SITE_URL } = {}) {
    if (!isKnownEmailType(body.type)) {
        const err = new Error(`Type d'email inconnu : ${String(body.type).slice(0, 60)}`);
        err.statusCode = 400;
        throw err;
    }
    const { email, type: rawType, amount, paymentLink: rawPaymentLink, content: msgContent, telephone, projetType, dateDispo, message: customMsg, address, notes, company, plan, documents, isCreation, contractSignedAt, paymentToken, frequence, documentName, mailType, mailFrom, mailDate } = body;
    const type = rawType === 'welcome' ? undefined : rawType;
    // « Client » (valeur de repli des appelants) n'est pas un nom : « Bonjour, » plutôt que « Bonjour Client, ».
    const nom = displayName(body.nom) || undefined;
    // Lien de paiement : uniquement une URL http(s) — jamais javascript:, data:, etc.
    const paymentLink = safeHttpUrl(rawPaymentLink);
    const adminUrl = `${baseUrl}/app/admin`;
    const who = nom || email;

    let built;
    let adminCopy;

    if (type === 'payment_failed') {
        built = buildPaymentFailedEmail({ nom, amount, payUrl: paymentLink || `${baseUrl}/app/espace-client?tab=paiement` });
    } else if (type === 'payment_reminder') {
        built = buildPaymentReminderEmail({ nom, amount, payUrl: paymentLink || `${baseUrl}/app/espace-client?tab=factures` });
    } else if (type === 'post_signature') {
        built = buildPostSignatureEmail({ nom, baseUrl });
    } else if (type === 'new_message') {
        built = buildNewMessageEmail({ nom, content: msgContent, baseUrl });
    } else if (type === 'admin_new_message') {
        built = {
            subject: `Nouveau message de ${who}`,
            text: `Nouveau message du client ${nom ? `${nom} ` : ''}(${email}) :\n\n${msgContent || '(message vide)'}\n\nRépondre depuis l'administration : ${adminUrl}`,
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Nouveau message client</h2>
                <p><strong>${escapeHtml(nom || '—')}</strong> (${escapeHtml(email)}) vous a écrit :</p>
                <div style="background:#f8fafc;padding:16px 20px;border-radius:8px;margin:16px 0;border-left:4px solid #1A56DB;">${escapeMultiline(msgContent || '(message vide)')}</div>
                ${emailButton(adminUrl, 'Répondre depuis l’administration', '#0f172a')}`,
        };
    } else if (type === 'new_mail') {
        built = buildMailDigestEmail({
            nom,
            plan,
            baseUrl,
            mails: [{ type: mailType, from: mailFrom, date: mailDate || new Date().toISOString() }],
        });
    } else if (type === 'consultation_creation') {
        built = buildConsultationEmail({ nom, projetType, telephone, dateDispo, message: customMsg });
        adminCopy = {
            type: 'admin_consultation',
            subject: `Nouvelle demande de consultation création : ${who}${projetType ? ` (${projetType})` : ''}`,
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Nouvelle demande de consultation</h2>
                <p>Un porteur de projet souhaite être accompagné pour la création de son entreprise :</p>
                ${box([
                    field('Nom / Prénom', nom, 'Non renseigné'),
                    field('Email', email),
                    field('Téléphone', telephone, 'Non renseigné'),
                    field('Forme / Statut visé', projetType, 'Non précisé'),
                    field('Disponibilité souhaitée', dateDispo, 'Dès que possible'),
                    customMsg ? field('Message', customMsg) : '',
                ].join(''))}
                <p style="font-size:13px;color:#64748b;">Merci de recontacter ce prospect sous 24 h ouvrées (délai annoncé dans son email de confirmation).</p>`,
        };
    } else if (type === 'procuration_postale') {
        built = buildProcurationEmail({ nom });
    } else if (type === 'admin_reexpedition') {
        built = {
            subject: `Réexpédition demandée — ${company || who}`,
            text: ['Nouvelle demande de réexpédition physique.', '', fieldText('Client', nom), fieldText('Société', company), fieldText('Email', email), fieldText('Adresse de destination', address), fieldText('Instructions', notes, 'aucune'), '', `Traitez la demande depuis l'onglet Courrier de l'administration : ${adminUrl}`].join('\n'),
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Demande de réexpédition physique</h2>
                <p>Un client demande l'envoi postal de ses originaux (payant, sauf réexpéditions incluses dans sa formule).</p>
                ${box([field('Client', nom), field('Société', company), field('Email', email), field('Adresse de destination', address), field('Instructions', notes, 'aucune')].join(''))}
                <p>Traitez la demande depuis l'onglet <strong>Courrier</strong> de l'administration.</p>
                ${emailButton(adminUrl, 'Ouvrir l’administration', '#0f172a')}`,
        };
    } else if (type === 'reexpedition_sent') {
        built = buildReexpeditionSentEmail({ nom, address, baseUrl });
    } else if (type === 'reexpedition_refused') {
        built = buildReexpeditionRefusedEmail({ nom, baseUrl });
    } else if (type === 'souscription_lead') {
        const rows = [
            ['Nom', nom], ['Email', email], ['Téléphone', telephone], ['Adresse', address],
            ['Date de naissance', dateDispo], ['Lieu de naissance', projetType], ['Nationalité', company],
            ['Qualité', notes], ['Type de projet', msgContent], ['Forme juridique', customMsg],
        ];
        built = {
            subject: `Lead souscription (abandon possible) — ${who}`,
            text: `Un prospect a renseigné ses coordonnées dans le formulaire de souscription (pas forcément finalisé).\n\n${rows.map(([k, v]) => fieldText(k, v)).join('\n')}\n\nRépondre à cet email écrit directement au prospect.`,
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Lead souscription — à relancer</h2>
                <p>Ce prospect a rempli ses coordonnées dans le parcours. Il n'a peut-être pas terminé le paiement.</p>
                ${box(rows.map(([k, v]) => field(k, v)).join(''))}
                <p style="font-size:13px;color:#64748b;">Répondre à cet email écrit directement au prospect.</p>`,
        };
    } else if (type === 'contact_advisor') {
        const rows = [['Nom', nom], ['Email', email], ['Téléphone', telephone], ['Ville souhaitée', address], ['Message', customMsg || msgContent]];
        built = {
            subject: `Demande conseiller — ${who}`,
            text: `Nouvelle demande « Parler à un conseiller ».\n\n${rows.map(([k, v]) => fieldText(k, v)).join('\n')}\n\nRépondre à cet email écrit directement au prospect.`,
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Demande « Parler à un conseiller »</h2>
                <p>Un prospect souhaite être recontacté.</p>
                ${box(rows.map(([k, v]) => field(k, v)).join(''))}
                <p style="font-size:13px;color:#64748b;">Merci de le recontacter rapidement. Répondre à cet email écrit directement au prospect.</p>`,
        };
    } else if (type === 'request_documents') {
        built = buildDocumentRequestEmail({
            nom,
            missing: Array.isArray(documents) && documents.length ? documents : ['statuts', 'kbis'],
            isCreation: Boolean(isCreation),
            contractSignedAt,
            baseUrl,
        });
    } else if (type === 'account_created') {
        const payUrl = paymentToken
            ? `${baseUrl}/api/pay?token=${encodeURIComponent(paymentToken)}`
            : `${baseUrl}/inscription`;
        built = buildAccountCreatedEmail({ nom, email, planName: plan, frequence, payUrl, baseUrl });
    } else if (type === 'admin_document_uploaded') {
        built = {
            subject: `Document à valider — ${company || who}`,
            text: `Le client ${nom ? `${nom} ` : ''}(${email}${company ? `, ${company}` : ''}) vient de déposer : ${documentName || 'un document'}.\n\nVérifiez-le et validez-le depuis l'onglet Documents de sa fiche : ${adminUrl}`,
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Nouveau document à valider</h2>
                <p><strong>${escapeHtml(nom || '—')}</strong> (${escapeHtml(email)}${company ? `, ${escapeHtml(company)}` : ''}) vient de déposer :</p>
                <p style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:8px;"><strong>${escapeHtml(documentName || 'Document')}</strong></p>
                <p>Vérifiez-le et validez-le depuis l'onglet <strong>Documents</strong> de la fiche client.</p>
                ${emailButton(adminUrl, 'Ouvrir l’administration', '#0f172a')}`,
        };
    } else if (type === 'admin_payment_received') {
        built = {
            subject: `Abonnement démarré — ${company || who}`,
            text: `${nom ? `${nom} ` : ''}(${email}) a enregistré sa carte : l'abonnement Stripe est actif.\n\nFiche : ${adminUrl}`,
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Abonnement démarré</h2>
                <p><strong>${escapeHtml(nom || '—')}</strong> (${escapeHtml(email)}) a enregistré sa carte : l'abonnement Stripe est actif.</p>
                ${emailButton(adminUrl, 'Ouvrir l’administration', '#0f172a')}`,
        };
    } else if (type === 'admin_payment_problem') {
        const reasons = {
            plan_mismatch: 'la formule ou la fréquence payée ne correspond plus à la demande (demande modifiée pendant le paiement)',
            amount_mismatch: 'le montant encaissé est inférieur au tarif attendu',
            missing_metadata: 'la session de paiement est incomplète',
            no_db: 'la base de données était indisponible au moment du paiement',
            client_not_found: 'la fiche du client est introuvable',
            not_paid: 'la session de paiement n’est pas réglée',
        };
        const unknownClient = /@example\.invalid$/i.test(String(email || ''));
        const who2 = nom || (unknownClient ? 'client inconnu' : email);
        const why = reasons[notes] || `cause : ${notes || 'inconnue'}`;
        built = {
            subject: `Paiement reçu, dossier non activé : ${who2}`,
            text: `Un paiement a été encaissé mais le dossier n'a pas pu être activé automatiquement : ${why}.\n\nSession Stripe : ${documentName || '—'}\nClient : ${who2}\n\nVérifiez le paiement dans Stripe puis traitez le dossier à la main : ${adminUrl}`,
            html: `
                <h2 style="margin-top:0;color:#B91C1C;">Paiement reçu, dossier non activé</h2>
                <p>Un client a payé mais son dossier n'a pas pu être activé automatiquement : <strong>${escapeHtml(why)}</strong>.</p>
                ${box([field('Client', who2), field('Session Stripe', documentName)].join(''))}
                <p>Vérifiez le paiement dans Stripe, puis validez ou traitez le dossier à la main.</p>
                ${emailButton(adminUrl, 'Ouvrir l’administration', '#0f172a')}`,
        };
    } else if (type === 'approval') {
        built = buildApprovalEmail({ nom, baseUrl, email });
    } else {
        // Bienvenue (type absent) : paiement de la souscription confirmé.
        built = buildWelcomeEmail({ nom, baseUrl, email });
        adminCopy = {
            type: 'admin_new_client',
            subject: `Nouveau client inscrit : ${who}`,
            html: `
                <h2 style="margin-top:0;color:#0f172a;">Nouveau client inscrit</h2>
                <p>Un nouveau client vient de finaliser son paiement et son inscription.</p>
                ${box([field('Nom / Prénom', nom, 'Non renseigné'), field('Email', email)].join(''))}
                <p>Ce client est en attente de validation et du dépôt de ses pièces justificatives.</p>
                ${emailButton(adminUrl, 'Ouvrir l’administration', '#0f172a')}`,
        };
    }

    let to = email;
    if (ADMIN_INBOX_TYPES.has(type)) to = ADMIN_EMAIL;
    if (CONTACT_INBOX_TYPES.has(type)) to = CONTACT_EMAIL;

    return {
        ...built,
        // Un saut de ligne dans l'objet pourrait injecter un en-tête (le nom du client y est repris).
        subject: String(built.subject || '').replace(/[\r\n]+/g, ' ').trim(),
        to,
        logType: type || 'welcome',
        clientEmail: email, // aussi pour contact_advisor : sinon le plafond par adresse ne le voyait jamais
        // Réponses clients → boîte pro (sauf lead/conseiller où l'on répond au prospect).
        replyTo: CONTACT_INBOX_TYPES.has(type) ? email : CONTACT_EMAIL,
        adminCopy,
    };
}

/**
 * Construit et envoie un email transactionnel. Utilisé par api/email.js (après contrôle
 * d'accès) et directement par le serveur (confirmation de paiement, validation de dossier).
 * Lève une erreur en cas d'échec ; `err.statusCode = 400` pour une requête invalide.
 */
export async function deliverEmail(body = {}, { baseUrl = SITE_URL, source } = {}) {
    const smtpHost = readServerEnv('SMTP_HOST');
    const smtpPort = readServerEnv('SMTP_PORT') || 465;
    const smtpUser = readServerEnv('SMTP_USER');
    const smtpPass = readServerEnv('SMTP_PASS');
    const smtpFrom = readServerEnv('SMTP_FROM') || smtpUser;

    if (!body.email) {
        const err = new Error("L'email est requis.");
        err.statusCode = 400;
        throw err;
    }
    if (!isSingleEmail(body.email)) {
        const err = new Error('Adresse email invalide.');
        err.statusCode = 400;
        throw err;
    }

    const mail = buildTransactionalEmail(body, { baseUrl });
    const conn = getDbConn();

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.error("Configuration SMTP manquante.");
        // Journalisé quand même : l'admin voit dans l'historique qu'un email n'est PAS parti, et pourquoi.
        await logEmail(conn, {
            to: mail.to, clientEmail: mail.clientEmail, type: mail.logType, subject: mail.subject, status: 'failed',
            error: 'Configuration SMTP du serveur manquante.', bodyText: mail.text || htmlToText(mail.html), source,
        });
        throw new Error('Configuration SMTP du serveur manquante.');
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465, // true for 465, false for other ports (587)
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    });

    const info = await sendBrandedMail(transporter, {
        conn,
        source,
        from: smtpFrom,
        type: mail.logType,
        to: mail.to,
        clientEmail: mail.clientEmail,
        subject: mail.subject,
        text: mail.text || undefined,
        html: mail.html,
        replyTo: mail.replyTo,
    });

    console.log('[email] envoyé (%s): %s', mail.logType, info.messageId);

    // Copie interne : nouveau client (bienvenue) ou demande de consultation.
    if (mail.adminCopy) {
        try {
            await sendBrandedMail(transporter, {
                conn,
                from: smtpFrom,
                type: mail.adminCopy.type,
                source: 'interne',
                to: ADMIN_EMAIL,
                clientEmail: body.email,
                subject: mail.adminCopy.subject,
                text: mail.adminCopy.text,
                html: mail.adminCopy.html,
            });
        } catch (adminErr) {
            console.error("Failed to send admin notification:", adminErr);
        }
    }

    return info;
}
