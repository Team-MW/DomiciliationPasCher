import { escapeHtml, emailButton, CONTACT_EMAIL, PHONE_DISPLAY, PHONE_HREF } from './_email-kit.js';
import { formatDocumentList, kbisDeadline } from '../shared/documentRequest.js';
import { PLAN_CATALOG, resolvePlanId, planAmountTtc } from '../shared/plans.js';

const formatDate = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return value ? String(value) : '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
};

const formatEuro = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const hello = (nom) => `Bonjour ${escapeHtml(nom || '')}`.trim() + ',';

/* ---------- Document à joindre (statuts / Kbis) ---------- */

export function buildDocumentRequestEmail({ nom, missing, isCreation, contractSignedAt, baseUrl, reminderDay, isLast }) {
    const docs = formatDocumentList(missing);
    const uploadUrl = `${baseUrl}/app/espace-client?tab=docs`;
    const needsKbis = (missing || []).includes('kbis');
    const deadline = needsKbis && isCreation ? kbisDeadline(contractSignedAt) : null;
    const deadlineText = needsKbis && isCreation
        ? (deadline
            ? `Votre société étant en cours de création, vous disposez de 3 mois après la signature du contrat pour nous transmettre votre Kbis, soit jusqu'au ${formatDate(deadline)}.`
            : `Votre société étant en cours de création, vous disposez de 3 mois après la signature du contrat pour nous transmettre votre Kbis.`)
        : '';
    const reminderLine = reminderDay
        ? (isLast
            ? 'Ceci est notre dernier rappel : sans ce document, nous ne pourrons pas maintenir votre domiciliation.'
            : 'Petit rappel : nous n\'avons pas encore reçu ce document.')
        : '';

    const subject = isLast
        ? 'Dernier rappel : il manque un document pour finaliser votre domiciliation'
        : 'Il manque un document pour finaliser votre domiciliation';

    const text = `Bonjour ${nom || ''},\n\n${reminderLine ? `${reminderLine}\n\n` : ''}Votre dossier de domiciliation est validé. Il nous manque : ${docs}.\n\nEn tant que domiciliataire agréé, nous sommes légalement tenus de conserver ce justificatif dans votre dossier (articles R123-168 et suivants du Code de commerce).${deadlineText ? `\n\n${deadlineText}` : ''}\n\nDéposer mon document : ${uploadUrl}\n\nBien cordialement,\nLe service client`;

    const html = `
        <h2 style="margin-top:0;color:#0f172a;">Il manque un document</h2>
        <p>${hello(nom)}</p>
        ${reminderLine ? `<p><strong>${escapeHtml(reminderLine)}</strong></p>` : ''}
        <p>Votre dossier de domiciliation est validé. Pour le finaliser, il nous manque :</p>
        <p style="background:#eff6ff;border-left:4px solid #1A56DB;padding:12px 16px;border-radius:6px;font-size:16px;"><strong>${escapeHtml(docs)}</strong></p>
        <p>Pourquoi ? En tant que domiciliataire agréé, nous sommes <strong>légalement tenus</strong> de conserver ce justificatif dans votre dossier (articles R123-168 et suivants du Code de commerce).</p>
        ${deadlineText ? `<p>${escapeHtml(deadlineText)}</p>` : ''}
        ${emailButton(uploadUrl, 'Déposer mon document')}
        <p>Bien cordialement,<br>Le service client</p>`;

    return { subject, text, html };
}

/* ---------- Nouveau courrier (récapitulatif) ---------- */

export function mailStatusLabel(mailType, plan, status) {
    if (/réexp|reexp/i.test(status || '')) return 'En attente de réexpédition';
    if (/colis/i.test(mailType || '')) return 'À récupérer sur place';
    const planId = resolvePlanId(plan);
    if (planId === 'physique') return 'À récupérer sur place';
    if (planId === 'scan-plus') return 'Scanné, disponible dans votre espace — en attente de réexpédition';
    return 'Scanné, disponible dans votre espace';
}

export function buildMailDigestEmail({ nom, mails, plan, baseUrl }) {
    const hasColis = mails.some((m) => /colis/i.test(m.type || ''));
    const hasRecommande = mails.some((m) => /recommand/i.test(m.type || ''));
    const count = mails.length;

    let subject;
    if (hasColis) subject = count > 1 ? `📦 Un colis et ${count - 1} autre(s) courrier(s) vous attendent` : '📦 Un colis vous attend';
    else if (hasRecommande) subject = count > 1 ? `Courrier recommandé reçu + ${count - 1} autre(s) courrier(s)` : 'Vous avez reçu un courrier recommandé';
    else subject = count > 1 ? `Vous avez reçu ${count} nouveaux courriers` : 'Vous avez reçu un nouveau courrier';

    const mailUrl = `${baseUrl}/app/espace-client?tab=mail`;
    const rows = mails.map((m) => ({
        date: formatDate(m.date),
        from: m.from && !/inconnu/i.test(m.from) ? m.from : 'Non lisible',
        type: m.type || 'Lettre simple',
        status: mailStatusLabel(m.type, plan, m.status),
    }));

    const colisText = hasColis
        ? `Votre colis est conservé 15 jours à notre centre. Pour le récupérer, prenez rendez-vous en écrivant à ${CONTACT_EMAIL} (ou au ${PHONE_DISPLAY}).`
        : '';

    const text = `Bonjour ${nom || ''},\n\n${count > 1 ? `Vous avez reçu ${count} nouveaux courriers :` : 'Vous avez reçu un nouveau courrier :'}\n\n${rows.map((r) => `- ${r.type} reçu le ${r.date} — expéditeur : ${r.from} — ${r.status}`).join('\n')}${colisText ? `\n\n${colisText}` : ''}\n\nVoir mon courrier : ${mailUrl}\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;

    const rowsHtml = rows.map((r) => `
        <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;"><strong>${escapeHtml(r.type)}</strong><br><span style="color:#64748b;font-size:13px;">Reçu le ${escapeHtml(r.date)}</span></td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(r.from)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:13px;">${escapeHtml(r.status)}</td>
        </tr>`).join('');

    const html = `
        <h2 style="margin-top:0;color:#0f172a;">${escapeHtml(subject)}</h2>
        <p>${hello(nom)}</p>
        <p>${count > 1 ? `Vous avez reçu <strong>${count} nouveaux courriers</strong> :` : 'Vous avez reçu un nouveau courrier :'}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
            <tr style="background:#f8fafc;text-align:left;"><th style="padding:8px;">Courrier</th><th style="padding:8px;">Expéditeur</th><th style="padding:8px;">Statut</th></tr>
            ${rowsHtml}
        </table>
        ${hasColis ? `<p style="background:#fff7ed;border-left:4px solid #ea580c;padding:12px 16px;border-radius:6px;margin-top:20px;">📦 Votre colis est conservé <strong>15 jours</strong> à notre centre. Pour le récupérer, prenez rendez-vous par email à <a href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Rendez-vous retrait colis')}">${CONTACT_EMAIL}</a> (ou au <a href="${PHONE_HREF}">${PHONE_DISPLAY}</a>).</p>` : ''}
        ${emailButton(mailUrl, 'Voir mon courrier', '#0f172a')}
        <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>`;

    return { subject, text, html };
}

/* ---------- Inscription commencée mais pas terminée ---------- */

/** Libellés des écrans de /souscription (même ordre que STEPS dans Souscription.jsx). */
const LEAD_STEPS = ['Votre projet', 'Coordonnées', 'Entreprise', 'Adresse', 'Courrier', 'Fréquence', 'Justificatifs', 'Paiement'];

export function buildLeadReminderEmail({ firstName, planId, step, resumeUrl, unsubscribeUrl, reminderIndex }) {
    const plan = PLAN_CATALOG[planId] || PLAN_CATALOG.essentiel;
    const priceTtc = formatEuro(planAmountTtc(plan.ht, 'month'));
    const current = Math.min(Math.max(Number(step) || 0, 0), LEAD_STEPS.length - 1);
    const remaining = LEAD_STEPS.slice(current);
    const subject = 'Votre domiciliation est presque prête';
    const intro = reminderIndex >= 2
        ? 'Votre dossier vous attend toujours : il ne vous reste que quelques minutes pour obtenir votre adresse à Toulouse.'
        : 'Vous avez commencé votre inscription : il ne vous reste que quelques étapes pour obtenir votre adresse à Toulouse.';

    const text = `Bonjour ${firstName || ''},\n\n${intro}\n\nFormule choisie : ${plan.name} — ${plan.ht} € HT/mois (${priceTtc} TTC)\nÉtapes restantes : ${remaining.join(', ')}\n\nVos informations sont sauvegardées, vous n'aurez rien à ressaisir.\n\n- Sans frais d'ouverture de dossier\n- 2 mois offerts en paiement annuel\n- Attestation de domiciliation sous 24h\n\nReprendre mon inscription : ${resumeUrl}\n\nUne question ? ${PHONE_DISPLAY} ou répondez à cet email.\n\nL'équipe Domiciliation Pas Cher`;

    const html = `
        <h2 style="margin-top:0;color:#0f172a;">Votre domiciliation est presque prête</h2>
        <p>Bonjour ${escapeHtml(firstName || '')},</p>
        <p>${escapeHtml(intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
            <tr><td style="padding:16px;">
                <p style="margin:0 0 6px;"><strong>Formule choisie :</strong> ${escapeHtml(plan.name)} — ${plan.ht} € HT/mois (${escapeHtml(priceTtc)} TTC)</p>
                <p style="margin:0;"><strong>Étapes restantes :</strong> ${escapeHtml(remaining.join(' → '))}</p>
            </td></tr>
        </table>
        <p>✅ Vos informations sont <strong>sauvegardées</strong> : vous reprenez exactement là où vous vous étiez arrêté.</p>
        <ul style="padding-left:20px;">
            <li>Sans frais d'ouverture de dossier</li>
            <li>2 mois offerts en paiement annuel</li>
            <li>Attestation de domiciliation sous 24h</li>
        </ul>
        ${emailButton(resumeUrl, 'Reprendre mon inscription')}
        <p>Une question ? Appelez-nous au <a href="${PHONE_HREF}">${PHONE_DISPLAY}</a> ou répondez à cet email.</p>
        <p>L'équipe Domiciliation Pas Cher</p>`;

    return { subject, text, html, unsubscribeUrl };
}

/* ---------- Dossier créé par l'admin : enregistrer la carte ---------- */

export function buildAccountCreatedEmail({ nom, email, planName, frequence, payUrl, baseUrl, isReminder = false }) {
    const plan = PLAN_CATALOG[resolvePlanId(planName)];
    const interval = frequence === 'annuel' ? 'year' : 'month';
    const priceTtc = formatEuro(planAmountTtc(plan.ht, interval));
    const priceLine = `${plan.name} — ${priceTtc} TTC / ${interval === 'year' ? 'an' : 'mois'}`;
    const subject = isReminder
        ? 'Rappel : votre domiciliation attend votre carte bancaire'
        : 'Activez votre domiciliation — Domiciliation Pas Cher';
    const reminderLine = isReminder
        ? 'Petit rappel : votre abonnement n’a pas encore démarré. Il suffit d’enregistrer votre carte bancaire.'
        : '';

    const text = `Bonjour ${nom || ''},\n\n${reminderLine ? `${reminderLine}\n\n` : ''}Notre équipe a préparé votre dossier de domiciliation.\n\nFormule : ${priceLine}\n\nPour démarrer votre abonnement, il vous reste à enregistrer votre carte bancaire (paiement sécurisé Stripe) : ${payUrl}\n\nEnsuite, créez votre accès à l'espace client avec cette adresse email (${email}) : ${baseUrl}/inscription\n\nBien cordialement,\nLe service client`;

    const html = `
        <h2 style="margin-top:0;color:#0f172a;">Votre dossier est prêt</h2>
        <p>${hello(nom)}</p>
        ${reminderLine ? `<p><strong>${escapeHtml(reminderLine)}</strong></p>` : ''}
        <p>Notre équipe a préparé votre dossier de domiciliation. Il ne vous reste qu'une étape pour démarrer.</p>
        <p style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:8px;"><strong>Formule :</strong> ${escapeHtml(priceLine)}</p>
        ${emailButton(payUrl, 'Enregistrer ma carte et démarrer mon abonnement', '#16a34a')}
        <p style="font-size:13px;color:#64748b;">Paiement 100 % sécurisé par Stripe. Vous recevrez votre facture par email.</p>
        <p>Ensuite, créez votre accès à l'espace client avec cette adresse email : <strong>${escapeHtml(email)}</strong> — <a href="${escapeHtml(`${baseUrl}/inscription`)}">créer mon accès</a>.</p>
        <p>Bien cordialement,<br>Le service client</p>`;

    return { subject, text, html };
}
