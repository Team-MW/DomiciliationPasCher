/**
 * Contenu des emails envoyés aux clients et prospects (objet, texte, HTML).
 * Fonctions pures : aucune ne lit la base ni n'envoie. L'enveloppe commune (en-tête, pied de
 * page légal, version texte du pied) est ajoutée par sendBrandedMail (api/_email-kit.js).
 *
 * Règles : vouvoiement, une action principale par email (emailButton), signature SIGNATURE,
 * toute donnée utilisateur passée par escapeHtml, liens absolus, montants au format 28,80 €.
 */
import { signupProofToken } from './_signup-proof.js';
import {
    escapeHtml, emailButton, CONTACT_EMAIL, PHONE_DISPLAY, PHONE_HREF,
    greetingText, greetingHtml, formatEuro, signatureHtml, signatureText, escapeMultiline,
} from './_email-kit.js';
import { formatDocumentList, kbisDeadline } from '../shared/documentRequest.js';
import {
    PLAN_CATALOG, PRICING_GRID, EXTRA_FEES_HT, MIN_COMMITMENT_MONTHS,
    planAmountTtc, clientPlanPricing, scanQuotaFor, canRequestPhysicalForward,
} from '../shared/plans.js';
import { DOMICILIATION_ADDRESS_LINES } from '../shared/company.js';
import { PAYMENT_GRACE_MONTHS, addCalendarMonths } from '../shared/paymentGrace.js';

const formatDate = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return value ? String(value) : '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
        .replace(/^1 /, '1er ');
};

const plural = (n, one, many) => (n > 1 ? many : one);
const clientSpace = (baseUrl, tab) => `${baseUrl}/app/espace-client${tab ? `?tab=${tab}` : ''}`;
const heading = (title) => `<h2 style="margin-top:0;color:#0f172a;">${escapeHtml(title)}</h2>`;
/**
 * Accès à l'espace client depuis un email. Un client qui vient de payer n'a PAS encore de compte de
 * connexion : il doit d'abord le créer (/inscription, email prérempli et vérifié), sinon la page
 * « Se connecter » lui répond « compte introuvable » (cas réel : William R., nov. 2026).
 */
export const signupUrl = (baseUrl, email) => {
    const clean = email ? String(email).trim().toLowerCase() : '';
    // ?v= : preuve signée que la personne reçoit les emails de cette adresse → compte validé sans code.
    return `${baseUrl}/inscription${clean ? `?email=${encodeURIComponent(clean)}&v=${signupProofToken(clean)}` : ''}`;
};
const normEmail = (email) => (email ? String(email).trim().toLowerCase() : '');
const accessBlockHtml = (baseUrl, rawEmail, email = normEmail(rawEmail)) => `
        ${emailButton(signupUrl(baseUrl, email), 'Créer mon accès à l’espace client')}
        <p style="font-size:14px;color:#475569;text-align:center;margin-top:-12px;">Première connexion : choisissez votre mot de passe avec l’adresse <strong>${escapeHtml(email || 'utilisée lors de votre souscription')}</strong>.<br>Vous avez déjà créé votre accès ? <a href="${escapeHtml(`${baseUrl}/connexion`)}" style="color:#1A56DB;">Se connecter</a></p>`;
const accessBlockText = (baseUrl, rawEmail, email = normEmail(rawEmail)) => `Première connexion : créez votre accès (mot de passe) avec l'adresse ${email || 'utilisée lors de votre souscription'} : ${signupUrl(baseUrl, email)}
Vous avez déjà créé votre accès ? Se connecter : ${baseUrl}/connexion`;
const infoBox = (inner) => `<p style="background:#eff6ff;border-left:4px solid #1A56DB;padding:12px 16px;border-radius:6px;">${inner}</p>`;
const alertBox = (inner) => `<p style="background:#fff7ed;border-left:4px solid #ea580c;padding:12px 16px;border-radius:6px;">${inner}</p>`;

const PICKUP_TEXT = `Retrait du lundi au vendredi, de 9 h à 18 h, uniquement sur rendez-vous : écrivez-nous à ${CONTACT_EMAIL} au moins 24 h à l'avance (48 h pour un colis volumineux).`;
const PICKUP_HTML = `Retrait du lundi au vendredi, de 9 h à 18 h, uniquement sur rendez-vous : écrivez-nous à <a href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Rendez-vous de retrait')}">${CONTACT_EMAIL}</a> au moins 24 h à l'avance (48 h pour un colis volumineux).`;

/* ---------- Document à joindre (statuts / Kbis) ---------- */

export function buildDocumentRequestEmail({ nom, missing, isCreation, contractSignedAt, baseUrl, reminderDay, isLast }) {
    const docs = formatDocumentList(missing);
    const docsInline = docs.toLowerCase().replace(/kbis/g, 'Kbis');
    const several = (missing || []).length > 1;
    const it = several ? 'les' : 'le';
    const uploadUrl = clientSpace(baseUrl, 'docs');
    const needsKbis = (missing || []).includes('kbis');
    const deadline = needsKbis && isCreation ? kbisDeadline(contractSignedAt) : null;
    const deadlineText = needsKbis && isCreation
        ? (deadline
            ? `Votre société étant en cours de création, vous disposez de 3 mois après la signature du contrat pour nous transmettre votre Kbis, soit jusqu'au ${formatDate(deadline)}.`
            : `Votre société étant en cours de création, vous disposez de 3 mois après la signature du contrat pour nous transmettre votre Kbis.`)
        : '';
    const reminderLine = reminderDay
        ? (isLast
            ? `Ceci est notre dernier rappel : sans ${several ? 'ces documents' : 'ce document'}, nous ne pourrons pas maintenir votre domiciliation.`
            : `Petit rappel : nous n'avons pas encore reçu ${several ? 'ces documents' : 'ce document'}.`)
        : '';

    const missingLabel = several ? 'des documents manquent' : 'il manque un document';
    const subject = isLast
        ? `Dernier rappel : ${missingLabel} pour finaliser votre domiciliation`
        : `${missingLabel.charAt(0).toUpperCase()}${missingLabel.slice(1)} pour finaliser votre domiciliation`;
    const justif = several ? 'ces justificatifs' : 'ce justificatif';

    const text = `${greetingText(nom)}\n\n${reminderLine ? `${reminderLine}\n\n` : ''}Votre dossier de domiciliation est validé. Pour le finaliser, il nous manque : ${docsInline}.\n\nEn tant que domiciliataire agréé, nous sommes légalement tenus de conserver ${justif} dans votre dossier (articles R123-168 et suivants du Code de commerce).${deadlineText ? `\n\n${deadlineText}` : ''}\n\nDéposez-${it} dans votre espace client, rubrique « Mes documents » : ${uploadUrl}\n\n${signatureText()}`;

    const html = `
        ${heading(several ? 'Il manque des documents' : 'Il manque un document')}
        <p>${greetingHtml(nom)}</p>
        ${reminderLine ? `<p><strong>${escapeHtml(reminderLine)}</strong></p>` : ''}
        <p>Votre dossier de domiciliation est validé. Pour le finaliser, il nous manque :</p>
        ${infoBox(`<strong style="font-size:16px;">${escapeHtml(docs)}</strong>`)}
        <p>Pourquoi ? En tant que domiciliataire agréé, nous sommes <strong>légalement tenus</strong> de conserver ${justif} dans votre dossier (articles R123-168 et suivants du Code de commerce).</p>
        ${deadlineText ? `<p>${escapeHtml(deadlineText)}</p>` : ''}
        <p>Déposez-${it} dans votre espace client, rubrique « Mes documents » :</p>
        ${emailButton(uploadUrl, several ? 'Déposer mes documents' : 'Déposer mon document')}
        ${signatureHtml()}`;

    return { subject, text, html };
}

/* ---------- Nouveau courrier (récapitulatif) ---------- */

/**
 * Statut affiché pour un courrier. Ne promet jamais un scan qui n'existe pas : « numérisé »
 * seulement si un aperçu est enregistré, sinon le délai prévu par les CGV (24 h ouvrées).
 * Formule sans numérisation (Essentiel) : original à retirer sur rendez-vous.
 */
export function mailStatusLabel(mailType, plan, status, extra = {}, { preview } = {}) {
    if (/réexp|reexp/i.test(status || '')) return 'En attente de réexpédition';
    if (/colis/i.test(mailType || '')) return 'À retirer sur rendez-vous';
    if (scanQuotaFor(plan, extra) === 0) {
        const pickup = canRequestPhysicalForward(plan, extra)
            ? 'à retirer sur rendez-vous ou à faire réexpédier'
            : 'à retirer sur rendez-vous';
        return preview ? `Photo dans votre espace, original ${pickup}` : `Original ${pickup}`;
    }
    return preview ? 'Numérisé, consultable dans votre espace' : 'Numérisation sous 24 h ouvrées dans votre espace';
}

function mailDigestSubject(mails) {
    const count = mails.length;
    const colis = mails.filter((m) => /colis/i.test(m.type || '')).length;
    const others = count - colis;
    const othersLabel = (n) => `${n} ${plural(n, 'autre courrier', 'autres courriers')}`;
    if (colis > 0) {
        const head = colis === 1 ? 'Un colis' : `${colis} colis`;
        return `${head}${others ? ` et ${othersLabel(others)}` : ''} vous ${count > 1 ? 'attendent' : 'attend'}`;
    }
    if (mails.some((m) => /recommand/i.test(m.type || ''))) {
        return count > 1 ? `Vous avez reçu un courrier recommandé et ${othersLabel(count - 1)}` : 'Vous avez reçu un courrier recommandé';
    }
    return count > 1 ? `Vous avez reçu ${count} nouveaux courriers` : 'Vous avez reçu un nouveau courrier';
}

export function buildMailDigestEmail({ nom, mails, plan, extra = {}, baseUrl }) {
    const hasColis = mails.some((m) => /colis/i.test(m.type || ''));
    const count = mails.length;
    const subject = mailDigestSubject(mails);
    const mailUrl = clientSpace(baseUrl, 'mail');
    const rows = mails.map((m) => {
        const from = String(m.from || '').trim();
        return {
            date: formatDate(m.date),
            from: from && !/inconnu/i.test(from) ? from : 'Non précisé',
            type: String(m.type || '').trim() || 'Lettre simple',
            status: mailStatusLabel(m.type, plan, m.status, extra, { preview: m.preview }),
        };
    });
    const needsPickup = hasColis || scanQuotaFor(plan, extra) === 0;
    const colisText = hasColis
        ? `Un colis est conservé 15 jours à compter de sa réception. Au-delà, il peut être retourné à l'expéditeur ou conservé moyennant ${formatEuro(EXTRA_FEES_HT.parcelStoragePerDay)} HT par jour.`
        : '';
    const intro = count > 1 ? `Vous avez reçu ${count} nouveaux courriers :` : 'Vous avez reçu un nouveau courrier :';

    const text = `${greetingText(nom)}\n\n${intro}\n\n${rows.map((r) => `- ${r.type}${r.date ? ` du ${r.date}` : ''} — expéditeur : ${r.from} — ${r.status}`).join('\n')}${colisText ? `\n\n${colisText}` : ''}${needsPickup ? `\n\n${PICKUP_TEXT}` : ''}\n\nVoir mon courrier : ${mailUrl}\n\n${signatureText()}`;

    const cell = 'padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;';
    const rowsHtml = rows.map((r) => `
        <tr>
            <td style="${cell}"><strong>${escapeHtml(r.type)}</strong>${r.date ? `<br><span style="color:#64748b;font-size:13px;">${escapeHtml(r.date)}</span>` : ''}</td>
            <td style="${cell}">${escapeHtml(r.from)}</td>
            <td style="${cell}font-size:13px;">${escapeHtml(r.status)}</td>
        </tr>`).join('');

    const html = `
        ${heading(subject)}
        <p>${greetingHtml(nom)}</p>
        <p>${count > 1 ? `Vous avez reçu <strong>${count} nouveaux courriers</strong> :` : 'Vous avez reçu un nouveau courrier :'}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
            <tr style="background:#f8fafc;text-align:left;"><th style="padding:8px;">Courrier</th><th style="padding:8px;">Expéditeur</th><th style="padding:8px;">Statut</th></tr>
            ${rowsHtml}
        </table>
        ${colisText ? alertBox(`${escapeHtml(colisText)}`) : ''}
        ${needsPickup ? `<p style="font-size:14px;">${PICKUP_HTML}</p>` : ''}
        ${emailButton(mailUrl, 'Voir mon courrier')}
        ${signatureHtml()}`;

    return { subject, text, html };
}

/* ---------- Inscription commencée mais pas terminée ---------- */

/** Libellés des écrans de /souscription (même ordre que STEPS dans Souscription.jsx). */
const LEAD_STEPS = ['Votre projet', 'Coordonnées', 'Entreprise', 'Adresse', 'Courrier', 'Fréquence', 'Justificatifs', 'Paiement'];

export function buildLeadReminderEmail({ firstName, planId, step, resumeUrl, unsubscribeUrl, reminderIndex }) {
    // Prospect : toujours la grille actuelle.
    const plan = PLAN_CATALOG[planId] || PLAN_CATALOG.essentiel;
    const priceLine = `${plan.name} — ${formatEuro(plan.ht)} HT/mois (${formatEuro(planAmountTtc(plan.ht, 'month'))} TTC)`;
    const current = Math.min(Math.max(Number(step) || 0, 0), LEAD_STEPS.length - 1);
    const remaining = LEAD_STEPS.slice(current);
    const subject = 'Votre domiciliation est presque prête';
    const intro = reminderIndex >= 2
        ? 'Votre dossier vous attend toujours : il ne vous reste que quelques minutes pour obtenir votre adresse à Toulouse.'
        : 'Vous avez commencé votre inscription : il ne vous reste que quelques étapes pour obtenir votre adresse à Toulouse.';
    const perks = ["Sans frais d'ouverture de dossier", '20 % de remise en paiement annuel', 'Attestation de domiciliation sous 24 h'];

    const text = `${greetingText(firstName)}\n\n${intro}\n\nFormule choisie : ${priceLine}\nÉtapes restantes : ${remaining.join(', ')}\n\nVos informations sont sauvegardées : vous reprenez à l'étape où vous vous êtes arrêté, sans rien ressaisir.\n\n${perks.map((p) => `- ${p}`).join('\n')}\n\nReprendre mon inscription : ${resumeUrl}\n\nUne question ? Appelez-nous au ${PHONE_DISPLAY} ou répondez à cet email.\n\n${signatureText()}`;

    const html = `
        ${heading('Votre domiciliation est presque prête')}
        <p>${greetingHtml(firstName)}</p>
        <p>${escapeHtml(intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
            <tr><td style="padding:16px;">
                <p style="margin:0 0 6px;"><strong>Formule choisie :</strong> ${escapeHtml(priceLine)}</p>
                <p style="margin:0;"><strong>Étapes restantes :</strong> ${escapeHtml(remaining.join(' → '))}</p>
            </td></tr>
        </table>
        <p>Vos informations sont <strong>sauvegardées</strong> : vous reprenez à l'étape où vous vous êtes arrêté, sans rien ressaisir.</p>
        <ul style="padding-left:20px;">
            ${perks.map((p) => `<li>${escapeHtml(p)}</li>`).join('\n            ')}
        </ul>
        ${emailButton(resumeUrl, 'Reprendre mon inscription')}
        <p>Une question ? Appelez-nous au <a href="${PHONE_HREF}">${PHONE_DISPLAY}</a> ou répondez à cet email.</p>
        ${signatureHtml()}`;

    return { subject, text, html, unsubscribeUrl };
}

/* ---------- Dossier créé par l'admin : enregistrer la carte ---------- */

/**
 * Prix réellement applicable au client (clientPlanPricing) et nom actuel de sa formule. Sans dossier fourni,
 * le client vient d'être créé : grille actuelle.
 */
export function planPriceLine(planName, frequence, extra) {
    const pricing = clientPlanPricing(planName, extra || { grille_tarifaire: PRICING_GRID });
    // Prix du client (il garde l'ancien s'il a souscrit avant la grille 2026-11), nom actuel de la formule.
    const name = PLAN_CATALOG[pricing.id].name;
    return frequence === 'annuel'
        ? `${name} — ${formatEuro(pricing.annualHt)} HT par an (${formatEuro(pricing.ttcYear)} TTC)`
        : `${name} — ${formatEuro(pricing.ht)} HT par mois (${formatEuro(pricing.ttcMonth)} TTC)`;
}

export function buildAccountCreatedEmail({ nom, email, planName, frequence, payUrl, baseUrl, isReminder = false, extra }) {
    const priceLine = planPriceLine(planName, frequence, extra);
    const accountUrl = signupUrl(baseUrl, email);
    const commitment = frequence === 'annuel'
        ? 'Abonnement annuel renouvelé tacitement, résiliable avec un préavis d\'un mois avant l\'échéance.'
        : `Engagement minimum de ${MIN_COMMITMENT_MONTHS} mois, puis résiliable avec un préavis d'un mois.`;
    const subject = isReminder
        ? 'Rappel : enregistrez votre carte pour activer votre domiciliation'
        : 'Votre dossier de domiciliation est prêt : activez votre abonnement';
    const reminderLine = isReminder
        ? 'Petit rappel : votre abonnement n\'a pas encore démarré. Il vous suffit d\'enregistrer votre carte bancaire.'
        : '';

    const text = `${greetingText(nom)}\n\n${reminderLine ? `${reminderLine}\n\n` : ''}Notre équipe a préparé votre dossier de domiciliation.\n\nFormule : ${priceLine}\n${commitment}\n\n1. Enregistrez votre carte bancaire pour démarrer votre abonnement (paiement sécurisé par Stripe) : ${payUrl}\n\n2. Créez ensuite votre accès à l'espace client avec cette adresse email (${email}) : ${accountUrl}\n\nVos factures seront disponibles dans votre espace client.\n\n${signatureText()}`;

    const html = `
        ${heading('Votre dossier est prêt')}
        <p>${greetingHtml(nom)}</p>
        ${reminderLine ? `<p><strong>${escapeHtml(reminderLine)}</strong></p>` : ''}
        <p>Notre équipe a préparé votre dossier de domiciliation. Il ne vous reste qu'une étape pour démarrer.</p>
        <p style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:8px;"><strong>Formule :</strong> ${escapeHtml(priceLine)}<br><span style="font-size:13px;color:#64748b;">${escapeHtml(commitment)}</span></p>
        ${emailButton(payUrl, 'Enregistrer ma carte et démarrer mon abonnement')}
        <p style="font-size:13px;color:#64748b;">Paiement sécurisé par Stripe. Vos factures seront disponibles dans votre espace client.</p>
        <p>Créez ensuite votre accès à l'espace client avec cette adresse email : <strong>${escapeHtml(email)}</strong> — <a href="${escapeHtml(accountUrl)}">créer mon accès</a>.</p>
        ${signatureHtml()}`;

    return { subject, text, html };
}

/* ---------- Bienvenue (paiement de la souscription confirmé) ---------- */

export function buildWelcomeEmail({ nom, baseUrl, email }) {
    const subject = 'Bienvenue chez Domiciliation Pas Cher : prochaines étapes';
    const steps = [
        ['Vérification de votre dossier', 'notre équipe contrôle votre demande. Vous recevrez un email dès sa validation.'],
        ['Pièces justificatives', 'complétez si besoin votre dossier depuis votre espace client, rubrique « Mes documents » (pièce d\'identité, justificatif de domicile de moins de 3 mois, statuts, extrait Kbis).'],
        ['Signature du contrat', 'signez électroniquement votre contrat de domiciliation depuis la même rubrique.'],
    ];
    const text = `${greetingText(nom)}\n\nMerci pour votre souscription : votre paiement est confirmé.\n\nVos prochaines étapes :\n${steps.map(([t, d], i) => `${i + 1}. ${t} : ${d}`).join('\n')}\n\n${accessBlockText(baseUrl, email)}\n\n${signatureText()}`;
    const html = `
        ${heading('Bienvenue chez Domiciliation Pas Cher')}
        <p>${greetingHtml(nom)}</p>
        <p>Merci pour votre souscription : votre paiement est confirmé.</p>
        <p><strong>Vos prochaines étapes :</strong></p>
        <ol style="padding-left:20px;">
            ${steps.map(([t, d]) => `<li style="margin-bottom:6px;"><strong>${escapeHtml(t)}</strong> : ${escapeHtml(d)}</li>`).join('\n            ')}
        </ol>
        ${accessBlockHtml(baseUrl, email)}
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Dossier validé ---------- */

export function buildApprovalEmail({ nom, baseUrl, email }) {
    const url = clientSpace(baseUrl);
    const subject = 'Votre dossier de domiciliation est validé';
    const addressText = DOMICILIATION_ADDRESS_LINES.join('\n');
    const text = `${greetingText(nom)}\n\nBonne nouvelle : votre dossier de domiciliation est validé.\n\nVotre adresse de domiciliation, à communiquer en entier à vos correspondants (précédée du nom de votre société), bâtiment et lot compris :\n\n${addressText}\n\nSans le bâtiment et le numéro de lot, votre courrier risque de ne pas être distribué.\n\nDepuis votre espace client, vous consultez vos documents et suivez la réception de votre courrier : ${url}\n${accessBlockText(baseUrl, email)}\n\nMerci pour votre confiance.\n\n${signatureText()}`;
    const html = `
        ${heading('Votre dossier est validé')}
        <p>${greetingHtml(nom)}</p>
        <p>Bonne nouvelle : votre dossier de domiciliation est <strong>validé</strong>.</p>
        <p>Votre adresse de domiciliation, à communiquer <strong>en entier</strong> à vos correspondants (précédée du nom de votre société) :</p>
        ${infoBox(DOMICILIATION_ADDRESS_LINES.map(escapeHtml).join('<br>'))}
        <p style="font-size:14px;">Sans le bâtiment et le numéro de lot, votre courrier risque de ne pas être distribué.</p>
        <p>Depuis votre espace client, vous consultez vos documents et suivez la réception de votre courrier.</p>
        ${emailButton(url, 'Accéder à mon espace client')}
        <p style="font-size:14px;color:#475569;text-align:center;margin-top:-12px;">Pas encore d’accès ? <a href="${escapeHtml(signupUrl(baseUrl, email))}" style="color:#1A56DB;">Créez-le ici</a> avec l’adresse <strong>${escapeHtml(normEmail(email) || 'de votre souscription')}</strong>.</p>
        <p>Merci pour votre confiance.</p>
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Contrat signé ---------- */

export function buildPostSignatureEmail({ nom, baseUrl }) {
    const url = clientSpace(baseUrl, 'docs');
    const subject = 'Votre contrat de domiciliation est signé';
    const docs = 'pièce d\'identité, justificatif de domicile de moins de 3 mois, statuts et extrait Kbis';
    const text = `${greetingText(nom)}\n\nNous vous confirmons la signature de votre contrat de domiciliation. Il est disponible dans votre espace client, rubrique « Mes documents ».\n\nSi ce n'est pas déjà fait, déposez-y aussi vos pièces justificatives (${docs}) pour finaliser votre dossier.\n\nAccéder à mes documents : ${url}\n\n${signatureText()}`;
    const html = `
        ${heading('Votre contrat est signé')}
        <p>${greetingHtml(nom)}</p>
        <p>Nous vous confirmons la signature de votre contrat de domiciliation. Il est disponible dans votre espace client, rubrique <strong>« Mes documents »</strong>.</p>
        <p>Si ce n'est pas déjà fait, déposez-y aussi vos pièces justificatives (${escapeHtml(docs)}) pour finaliser votre dossier.</p>
        ${emailButton(url, 'Accéder à mes documents')}
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Message de l'équipe ---------- */

export function buildNewMessageEmail({ nom, content, baseUrl }) {
    const url = clientSpace(baseUrl, 'messages');
    const message = String(content ?? '').trim();
    const subject = 'Nouveau message de votre domiciliataire';
    const text = `${greetingText(nom)}\n\nNotre équipe vous a envoyé un message${message ? ' :' : '.'}\n\n${message ? `${message}\n\n` : ''}Pour y répondre, rendez-vous dans la messagerie de votre espace client : ${url}\n\n${signatureText()}`;
    const html = `
        ${heading('Nouveau message')}
        <p>${greetingHtml(nom)}</p>
        <p>Notre équipe vous a envoyé un message${message ? ' :' : '.'}</p>
        ${message ? `<div style="background:#f8fafc;padding:16px 20px;border-radius:8px;margin:16px 0;border-left:4px solid #1A56DB;">${escapeMultiline(message)}</div>` : ''}
        <p>Pour y répondre, rendez-vous dans la messagerie de votre espace client.</p>
        ${emailButton(url, 'Lire et répondre')}
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Procuration postale ---------- */

export const LA_POSTE_PROCURATION_URL = 'https://www.laposte.fr/donner-procuration/informations-mandant';

export function buildProcurationEmail({ nom }) {
    const subject = 'Procuration postale : une démarche à faire de votre côté';
    const text = `${greetingText(nom)}\n\nPour que nous puissions réceptionner vos courriers recommandés, une procuration postale à notre nom est nécessaire.\n\nCette démarche se fait en ligne, en quelques minutes, sur le site officiel de La Poste : ${LA_POSTE_PROCURATION_URL}\n\n${signatureText()}`;
    const html = `
        ${heading('Procuration postale à mettre en place')}
        <p>${greetingHtml(nom)}</p>
        <p>Pour que nous puissions réceptionner vos <strong>courriers recommandés</strong>, une procuration postale à notre nom est nécessaire.</p>
        <p>Cette démarche se fait en ligne, en quelques minutes, sur le site officiel de La Poste :</p>
        ${emailButton(LA_POSTE_PROCURATION_URL, 'Faire ma procuration sur laposte.fr')}
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Demande de consultation (création d'entreprise) ---------- */

export function buildConsultationEmail({ nom, projetType, telephone, dateDispo, message }) {
    const subject = 'Nous avons bien reçu votre demande de consultation';
    const recap = [
        ['Projet envisagé', projetType || 'Non précisé'],
        ['Téléphone', telephone || 'Non précisé'],
        ['Disponibilité souhaitée', dateDispo || 'Dès que possible'],
        ...(message ? [['Précisions', message]] : []),
    ];
    const next = 'Un conseiller vous contactera sous 24 h ouvrées, par téléphone ou par email, pour faire le point sur votre projet.';
    const text = `${greetingText(nom)}\n\nNous avons bien reçu votre demande d'accompagnement pour votre projet de création d'entreprise.\n\nRécapitulatif :\n${recap.map(([k, v]) => `- ${k} : ${v}`).join('\n')}\n\n${next}\n\n${signatureText()}`;
    const html = `
        ${heading('Demande de consultation reçue')}
        <p>${greetingHtml(nom)}</p>
        <p>Nous avons bien reçu votre demande d'accompagnement pour votre projet de création d'entreprise.</p>
        <div style="background:#f8fafc;padding:16px 20px;border-radius:8px;margin:16px 0;border:1px solid #e2e8f0;">
            ${recap.map(([k, v]) => `<p style="margin:6px 0;"><strong>${escapeHtml(k)} :</strong> ${escapeHtml(v)}</p>`).join('\n            ')}
        </div>
        <p>${escapeHtml(next)}</p>
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Réexpédition ---------- */

export function buildReexpeditionSentEmail({ nom, address, baseUrl }) {
    const url = clientSpace(baseUrl, 'mail');
    const dest = String(address ?? '').trim();
    const subject = 'Votre courrier a été réexpédié';
    const text = `${greetingText(nom)}\n\nVotre demande de réexpédition a été traitée : les originaux de votre courrier ont été envoyés ${dest ? `à l'adresse suivante :\n\n${dest}` : 'à l\'adresse que vous avez indiquée.'}\n\nSuivre mon courrier : ${url}\n\n${signatureText()}`;
    const html = `
        ${heading('Courrier réexpédié')}
        <p>${greetingHtml(nom)}</p>
        <p>Votre demande de réexpédition a été traitée : les originaux de votre courrier ont été envoyés ${dest ? 'à l\'adresse suivante :' : 'à l\'adresse que vous avez indiquée.'}</p>
        ${dest ? infoBox(escapeMultiline(dest)) : ''}
        ${emailButton(url, 'Suivre mon courrier')}
        ${signatureHtml()}`;
    return { subject, text, html };
}

export function buildReexpeditionRefusedEmail({ nom, baseUrl }) {
    const url = clientSpace(baseUrl, 'messages');
    const subject = 'Votre demande de réexpédition n\'a pas pu être traitée';
    const text = `${greetingText(nom)}\n\nVotre demande de réexpédition n'a pas pu être traitée. Écrivez-nous depuis la messagerie de votre espace client (ou au ${PHONE_DISPLAY}) : nous vous expliquerons pourquoi et trouverons une solution.\n\nOuvrir la messagerie : ${url}\n\n${signatureText()}`;
    const html = `
        ${heading('Demande de réexpédition non traitée')}
        <p>${greetingHtml(nom)}</p>
        <p>Votre demande de réexpédition n'a pas pu être traitée. Écrivez-nous depuis la messagerie de votre espace client (ou au <a href="${PHONE_HREF}">${PHONE_DISPLAY}</a>) : nous vous expliquerons pourquoi et trouverons une solution.</p>
        ${emailButton(url, 'Ouvrir la messagerie')}
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Paiement ---------- */

/** « de 28,80 € » si le montant est connu, sinon chaîne vide. */
function amountPhrase(amount) {
    const formatted = typeof amount === 'number' ? formatEuro(amount) : String(amount ?? '').trim();
    return formatted ? ` de ${formatted}` : '';
}

/**
 * Incident de paiement (relance automatique du cron ou envoi manuel par l'admin).
 * Le délai annoncé est celui réellement appliqué par le site : PAYMENT_GRACE_MONTHS
 * (shared/paymentGrace.js), pas les 15/30 jours que les CGV autorisent.
 * @param {string} [deadlineIso] date de résiliation (AAAA-MM-JJ), si connue
 * @param {string} [nextAttemptIso] prochaine tentative de prélèvement Stripe (AAAA-MM-JJ)
 */
export function buildPaymentFailedEmail({ nom, amount, payUrl, deadlineIso, nextAttemptIso }) {
    const grace = `${PAYMENT_GRACE_MONTHS} mois`;
    const deadline = formatDate(deadlineIso);
    const nextAttempt = formatDate(nextAttemptIso);
    const subject = 'Action requise : régulariser votre paiement';
    const what = `Le dernier règlement${amountPhrase(amount)} de votre abonnement de domiciliation n'a pas abouti.`;
    const todo = 'Merci de régler la facture en attente ou de mettre à jour votre moyen de paiement.';
    const consequence = deadline
        ? `Sans règlement avant le ${deadline} (${grace} après l'incident), votre contrat de domiciliation sera résilié et vous ne serez plus domicilié à notre adresse.`
        : `Sans règlement dans un délai de ${grace} après l'incident, votre contrat de domiciliation sera résilié et vous ne serez plus domicilié à notre adresse.`;
    const retry = nextAttempt ? `Une nouvelle tentative de prélèvement est prévue le ${nextAttempt}.` : '';
    const already = 'Si vous avez réglé entre-temps, ne tenez pas compte de ce message.';

    const text = `${greetingText(nom)}\n\n${what}\n\n${todo}\n\nRégulariser mon paiement : ${payUrl}\n\n${consequence}${retry ? `\n\n${retry}` : ''}\n\n${already}\n\n${signatureText()}`;
    const html = `
        ${heading('Incident de paiement : action requise')}
        <p>${greetingHtml(nom)}</p>
        <p>${escapeHtml(what)}</p>
        <p><strong>${escapeHtml(todo)}</strong></p>
        ${emailButton(payUrl, 'Régulariser mon paiement')}
        ${alertBox(escapeHtml(consequence))}
        ${retry ? `<p style="color:#64748b;font-size:14px;">${escapeHtml(retry)}</p>` : ''}
        <p style="color:#64748b;font-size:14px;">${escapeHtml(already)}</p>
        ${signatureHtml()}`;
    return { subject, text, html };
}

/** Relance manuelle d'une facture impayée (envoyée par l'admin avec un lien de paiement). */
export function buildPaymentReminderEmail({ nom, amount, payUrl }) {
    const subject = 'Rappel : une facture reste à régler';
    const what = `Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de votre facture${amountPhrase(amount)}.`;
    const already = 'Si vous avez réglé entre-temps, ne tenez pas compte de ce message.';
    const text = `${greetingText(nom)}\n\n${what}\n\nVous pouvez la régler en ligne : ${payUrl}\n\n${already}\n\n${signatureText()}`;
    const html = `
        ${heading('Rappel de paiement')}
        <p>${greetingHtml(nom)}</p>
        <p>${escapeHtml(what)}</p>
        <p>Vous pouvez la régler en ligne en cliquant sur le bouton ci-dessous :</p>
        ${emailButton(payUrl, 'Régler ma facture')}
        <p style="color:#64748b;font-size:14px;">${escapeHtml(already)}</p>
        ${signatureHtml()}`;
    return { subject, text, html };
}

/** Résiliation automatique après le délai de grâce impayé. */
export function buildTerminationEmail({ nom, amount }) {
    const grace = `${PAYMENT_GRACE_MONTHS} mois`;
    const subject = 'Votre domiciliation est résiliée (défaut de paiement)';
    const what = `Malgré nos relances, l'impayé${amountPhrase(amount)} n'a pas été régularisé dans le délai de ${grace}.`;
    const result = 'Votre contrat de domiciliation est donc résilié : vous n\'êtes plus domicilié à notre adresse.';
    const after = 'Comme le prévoient nos conditions générales, nous informons le greffe de la fin de la domiciliation, et le courrier reçu à partir de maintenant sera retourné à l\'expéditeur. Si le siège social de votre société était domicilié chez nous, vous devez le transférer à une nouvelle adresse.';
    const contact = `Pour toute question, répondez à cet email ou appelez-nous au ${PHONE_DISPLAY}.`;
    const text = `${greetingText(nom)}\n\n${what}\n\n${result}\n\n${after}\n\n${contact}\n\n${signatureText()}`;
    const html = `
        ${heading('Domiciliation résiliée')}
        <p>${greetingHtml(nom)}</p>
        <p>${escapeHtml(what)}</p>
        <p><strong>${escapeHtml(result)}</strong></p>
        <p>${escapeHtml(after)}</p>
        <p>Pour toute question, répondez à cet email ou appelez-nous au <a href="${PHONE_HREF}">${PHONE_DISPLAY}</a>.</p>
        ${signatureHtml()}`;
    return { subject, text, html };
}

/* ---------- Échéance d'un abonnement annuel ---------- */

/**
 * Rappel envoyé 2 mois avant l'échéance (CGV art. 10). La résiliation n'est pas encore
 * disponible en libre-service dans l'espace client : on indique comment nous écrire.
 * @param {string} [periodEndIso] date d'échéance AAAA-MM-JJ
 */
export function buildRenewalReminderEmail({ nom, periodEndIso, baseUrl }) {
    const url = clientSpace(baseUrl, 'messages');
    const end = formatDate(periodEndIso);
    const noticeLimit = formatDate(addCalendarMonths(periodEndIso, -1, { clamp: true }));
    const subject = 'Votre abonnement annuel arrive bientôt à échéance';
    const what = end
        ? `Votre abonnement annuel de domiciliation arrive à échéance le ${end}.`
        : 'Votre abonnement annuel de domiciliation arrive à échéance dans 2 mois.';
    const renew = 'Sans action de votre part, il sera renouvelé automatiquement pour un an (reconduction tacite) : vous n\'avez rien à faire pour conserver votre adresse.';
    const cancel = `Si vous ne souhaitez pas le renouveler, écrivez-nous depuis la messagerie de votre espace client ou à ${CONTACT_EMAIL}${noticeLimit ? `, au plus tard le ${noticeLimit}` : ''} (préavis d'un mois avant l'échéance).`;
    const text = `${greetingText(nom)}\n\n${what}\n\n${renew}\n\n${cancel}\n\nOuvrir la messagerie : ${url}\n\n${signatureText()}`;
    const html = `
        ${heading('Échéance de votre abonnement annuel')}
        <p>${greetingHtml(nom)}</p>
        <p><strong>${escapeHtml(what)}</strong></p>
        <p>${escapeHtml(renew)}</p>
        <p>${escapeHtml(cancel)}</p>
        ${emailButton(url, 'Ouvrir la messagerie')}
        ${signatureHtml()}`;
    return { subject, text, html };
}


/* ---------- Vérification de l'adresse email (code à 6 chiffres) ---------- */

export function buildEmailVerificationEmail({ nom, code }) {
    const digits = String(code ?? '').replace(/\D/g, '').slice(0, 6);
    const subject = `Votre code de vérification : ${digits || '------'}`;
    const text = `${greetingText(nom)}\n\nVoici votre code pour vérifier votre adresse email et accéder à votre espace client :\n\n${digits}\n\nIl est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.\n\n${signatureText()}`;
    const html = `
        ${heading('Vérifiez votre adresse email')}
        <p>${greetingHtml(nom)}</p>
        <p>Voici votre code pour accéder à votre espace client :</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:20px 0;color:#0f172a;">${escapeHtml(digits)}</p>
        <p>Ce code est valable <strong>10 minutes</strong>. Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.</p>
        ${signatureHtml()}`;
    return { subject, text, html };
}

/** Lien « Activer mon accès » : page de connexion + preuve signée (?v=) qui valide le compte sans code. */
export const accessActivationUrl = (baseUrl, email) => {
    const clean = String(email || '').trim().toLowerCase();
    return `${baseUrl}/connexion?email=${encodeURIComponent(clean)}&v=${signupProofToken(clean)}`;
};

/**
 * Envoyé automatiquement (contrôle du matin) à un client dont le compte de connexion n'a pas d'adresse vérifiée :
 * un clic suffit, il n'a aucun code à saisir et n'est jamais bloqué.
 */
export function buildAccessActivationEmail({ nom, email, baseUrl }) {
    const url = accessActivationUrl(baseUrl, email);
    const subject = 'Activez votre accès à l’espace client (1 clic)';
    const text = `${greetingText(nom)}\n\nVotre compte est presque prêt : il reste à confirmer que cette adresse (${normEmail(email)}) est bien la vôtre.\n\nCliquez sur ce lien puis connectez-vous, votre espace client s'ouvre directement : ${url}\n\nAucun code à saisir. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.\n\n${signatureText()}`;
    const html = `
        ${heading('Activez votre accès en 1 clic')}
        <p>${greetingHtml(nom)}</p>
        <p>Votre compte est presque prêt : il reste à confirmer que l’adresse <strong>${escapeHtml(normEmail(email))}</strong> est bien la vôtre.</p>
        ${emailButton(url, 'Activer mon accès')}
        <p style="font-size:14px;color:#475569;">Cliquez, connectez-vous, et votre espace client s’ouvre directement : aucun code à saisir.<br>Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement cet email.</p>
        ${signatureHtml()}`;
    return { subject, text, html };
}
