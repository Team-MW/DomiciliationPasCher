import nodemailer from 'nodemailer';
import { ADMIN_EMAIL } from './_smtp.js';
import { readServerEnv } from './_env.js';
import { getDbConn } from './_db.js';
import { sendBrandedMail, escapeHtml, emailButton } from './_email-kit.js';
import { buildDocumentRequestEmail, buildAccountCreatedEmail, buildMailDigestEmail } from './_email-templates.js';

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
 * Construit et envoie un email transactionnel. Utilisé par api/email.js (après contrôle
 * d'accès) et directement par le serveur (confirmation de paiement, validation de dossier).
 * Lève une erreur en cas d'échec ; `err.statusCode = 400` pour une requête invalide.
 */
export async function deliverEmail(body = {}, { baseUrl = 'https://www.domiciliation-pas-cher.com' } = {}) {
    const smtpHost = readServerEnv('SMTP_HOST');
    const smtpPort = readServerEnv('SMTP_PORT') || 465;
    const smtpUser = readServerEnv('SMTP_USER');
    const smtpPass = readServerEnv('SMTP_PASS');
    const smtpFrom = readServerEnv('SMTP_FROM') || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.error("Configuration SMTP manquante.");
        throw new Error('Configuration SMTP du serveur manquante.');
    }

    const { email, nom, type, amount, paymentLink: rawPaymentLink, content: msgContent, telephone, projetType, dateDispo, message: customMsg, address, notes, company, plan, documents, isCreation, contractSignedAt, paymentToken, frequence, documentName, mailType, mailFrom, mailDate } = body;

    if (!email) {
        const err = new Error("L'email est requis.");
        err.statusCode = 400;
        throw err;
    }

    // Lien de paiement : uniquement une URL http(s) — jamais javascript:, data:, etc.
    const paymentLink = safeHttpUrl(rawPaymentLink);
    // Toutes les valeurs insérées dans du HTML passent par escapeHtml.
    const H = Object.fromEntries(Object.entries({
        nom, amount, paymentLink, msgContent, telephone, projetType, dateDispo,
        customMsg, address, notes, company, email,
    }).map(([k, v]) => [k, v === undefined || v === null || v === '' ? v : escapeHtml(v)]));

    let subject = "Notification - Domiciliation Pas Cher";
    let textMessage = "";
    let htmlMessage = "";

    // Définition des contenus selon le type
    if (type === 'payment_failed') {
        subject = "Action requise : régulariser votre paiement — Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nNous vous informons qu'un incident est survenu lors de votre dernier règlement de ${amount || 'votre abonnement'}.\n\nMerci de mettre à jour votre moyen de paiement. Sans régularisation sous 2 mois, votre contrat de domiciliation pourra être résilié.\n\nVous pouvez régulariser ici : ${paymentLink || baseUrl + '/connexion'}\n\nBien cordialement,\nLe service comptabilité`;
        
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Action requise sur votre paiement</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Nous vous informons qu'un incident est survenu lors de votre dernier règlement de <strong>${H.amount || 'votre abonnement'}</strong>.</p>
                <p>Merci de mettre à jour votre moyen de paiement. Sans régularisation sous 2 mois, votre contrat de domiciliation pourra être résilié.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${H.paymentLink || baseUrl + '/connexion'}" style="background-color: #1A56DB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Mettre à jour mon paiement</a>
                </div>
                <p>Bien cordialement,<br>Le service comptabilité<br>Domiciliation Pas Cher<br>contact@domiciliation-pas-cher.com</p>
            </div>
        `;
    } else if (type === 'payment_reminder') {
        subject = "Rappel de paiement — Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nSauf erreur de notre part, nous n'avons pas reçu le règlement de votre facture d'un montant de ${amount || ''}.\n\nVous pouvez régulariser la situation en cliquant sur le lien suivant : ${paymentLink}\n\nBien cordialement,\nLe service comptabilité`;
        
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Rappel de paiement</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Sauf erreur de notre part, nous n'avons pas reçu le règlement de votre facture d'un montant de <strong>${H.amount || ''}</strong>.</p>
                <p>Vous pouvez régulariser la situation très simplement en cliquant sur le bouton ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${H.paymentLink}" style="background-color: #1A56DB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Régler ma facture</a>
                </div>
                <p>Bien cordialement,<br>Le service comptabilité<br>Domiciliation Pas Cher<br>contact@domiciliation-pas-cher.com</p>
            </div>
        `;
    } else if (type === 'post_signature') {
        subject = "Confirmation de signature - Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nNous vous confirmons la signature de votre contrat. Ce document est dès à présent disponible dans votre espace sécurisé.\n\nAfin de finaliser l'ouverture de votre dossier, nous vous invitons à nous transmettre vos pièces justificatives (Pièce d'identité, justificatif de domicile, extrait Kbis) directement depuis l'onglet "Mes Documents".\n\nAccédez à votre portail ici : ${baseUrl}/connexion\n\nBien cordialement,\nLe service client`;
        
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Contrat signé avec succès !</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Nous vous confirmons la signature de votre contrat. Ce document est dès à présent disponible dans votre espace sécurisé.</p>
                <p>Afin de finaliser l'ouverture de votre dossier, nous vous invitons à nous transmettre vos pièces justificatives (Pièce d'identité, justificatif de domicile, extrait Kbis) directement depuis l'onglet <strong>"Mes Documents"</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${baseUrl}/connexion" style="background-color: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accéder à mon espace</a>
                </div>
                <p>Bien cordialement,<br>Le service client</p>
            </div>
        `;
    } else if (type === 'new_message') {
        subject = "Nouveau message - Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nVous avez reçu un nouveau message de la part de notre équipe :\n\n"${msgContent}"\n\nPour répondre à ce message, veuillez vous connecter à votre Espace Client : ${baseUrl}/connexion\n\nBien cordialement,\nLe service client`;
        
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Nouveau message reçu 📩</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Vous avez reçu un nouveau message de la part de notre équipe :</p>
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
                    <p style="margin: 0; font-style: italic;">"${H.msgContent}"</p>
                </div>
                <p>Pour y répondre, connectez-vous à votre Espace Client.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${baseUrl}/connexion" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Répondre au message</a>
                </div>
                <p>Bien cordialement,<br>Le service client</p>
            </div>
        `;
    } else if (type === 'admin_new_message') {
        subject = `Nouveau message de ${nom || 'Client'}`;
        textMessage = `Bonjour,\n\nVous avez reçu un nouveau message du client ${nom || 'Client'} (${email}) :\n\n"${msgContent}"\n\nPour répondre à ce message, veuillez vous connecter à l'interface d'administration.\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;
        
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Nouveau message client 📩</h2>
                <p>Bonjour,</p>
                <p>Vous avez reçu un nouveau message de <strong>${H.nom || 'Client'}</strong> (${H.email}) :</p>
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38a169;">
                    <p style="margin: 0; font-style: italic;">"${H.msgContent}"</p>
                </div>
                <p>Pour y répondre, connectez-vous à l'interface d'administration.</p>
                <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>
            </div>
        `;
    } else if (type === 'new_mail') {
        ({ subject, text: textMessage, html: htmlMessage } = buildMailDigestEmail({
            nom,
            plan,
            baseUrl,
            mails: [{ type: mailType, from: mailFrom, date: mailDate || new Date().toISOString() }],
        }));
    } else if (type === 'consultation_creation') {
        subject = "Confirmation de votre demande de consultation - Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || ''},\n\nNous avons bien reçu votre demande de consultation pour votre projet de création d'entreprise (${projetType || 'Projet de création'}).\n\nUn de nos juristes / conseillers experts prendra contact avec vous rapidement (par téléphone ou email) au ${telephone || ''} pour faire le point sur votre projet et vous orienter vers la meilleure forme juridique.\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;

        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Demande de consultation reçue ! 🚀</h2>
                <p>Bonjour ${H.nom || ''},</p>
                <p>Nous avons bien enregistré votre demande d'accompagnement pour votre projet de création d'entreprise.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Récapitulatif de votre demande :</h3>
                    <p><strong>Statut / Projet envisagé :</strong> ${H.projetType || 'Non précisé'}</p>
                    <p><strong>Téléphone :</strong> ${H.telephone || 'Non précisé'}</p>
                    <p><strong>Disponibilité souhaitée :</strong> ${H.dateDispo || 'Dès que possible'}</p>
                    ${H.customMsg ? `<p><strong>Précisions :</strong> ${H.customMsg}</p>` : ''}
                </div>
                <p>Un conseiller spécialisé vous contactera sous 24h ouvrées pour faire le point gratuitement sur vos démarches, statuts et formalités.</p>
                <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>
            </div>
        `;
    } else if (type === 'procuration_postale') {
        subject = "Procuration postale requise - Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nAfin que notre centre puisse réceptionner vos courriers recommandés, la mise en place d'une procuration postale est requise.\n\nNous vous invitons à réaliser cette démarche sur le site officiel de La Poste :\nhttps://www.laposte.fr/donner-procuration/informations-mandant\n\nBien cordialement,\nLe service administratif`;
        
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Procuration postale requise</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Afin que notre centre puisse réceptionner vos courriers recommandés, la mise en place d'une procuration postale est requise.</p>
                <p>Nous vous invitons à réaliser cette démarche en ligne sur le site officiel de La Poste :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.laposte.fr/donner-procuration/informations-mandant" style="background-color: #d69e2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Faire ma procuration</a>
                </div>
                <p>Bien cordialement,<br>Le service administratif</p>
            </div>
        `;
    } else if (type === 'admin_reexpedition') {
        subject = `Réexpédition physique — ${company || nom || 'Client'}`;
        textMessage = `Nouvelle demande de réexpédition physique.\n\nClient : ${nom || ''}\nSociété : ${company || ''}\nEmail : ${email}\nAdresse : ${address || ''}\nInstructions : ${notes || 'aucune'}\n\nTraitez la demande depuis l'onglet Courrier de l'administration.`;
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Demande de réexpédition physique</h2>
                <p>Un client Scan+ / Physique+ demande l'envoi postal de ses originaux.</p>
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="margin: 6px 0;"><strong>Client :</strong> ${H.nom || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Société :</strong> ${H.company || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Email :</strong> ${H.email}</p>
                    <p style="margin: 6px 0;"><strong>Adresse de destination :</strong> ${H.address || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Instructions :</strong> ${H.notes || 'aucune'}</p>
                </div>
                <p>Traitez la demande depuis l'onglet <strong>Courrier</strong> de l'administration.</p>
            </div>
        `;
    } else if (type === 'reexpedition_sent') {
        subject = "Votre courrier a été réexpédié - Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nVotre demande de réexpédition physique a été traitée. Les originaux ont été expédiés vers : ${address || 'l’adresse indiquée'}.\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Courrier réexpédié</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Votre demande de réexpédition physique a été traitée. Les originaux ont été expédiés vers :</p>
                <p><strong>${H.address || 'l’adresse indiquée'}</strong></p>
                <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>
            </div>
        `;
    } else if (type === 'reexpedition_refused') {
        subject = "Demande de réexpédition - Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nVotre demande de réexpédition physique n'a pas pu être traitée. Contactez-nous via la messagerie de votre espace client pour plus d'informations.\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Demande de réexpédition</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Votre demande de réexpédition physique n'a pas pu être traitée. Contactez-nous via la messagerie de votre espace client pour plus d'informations.</p>
                <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>
            </div>
        `;
    } else if (type === 'souscription_lead') {
        subject = `Lead souscription (abandon possible) — ${nom || email}`;
        textMessage = `Un prospect a renseigné ses coordonnées dans le formulaire de souscription (pas forcément finalisé).\n\nNom : ${nom || ''}\nEmail : ${email}\nTéléphone : ${telephone || ''}\nAdresse : ${address || ''}\nDate de naissance : ${dateDispo || ''}\nLieu de naissance : ${projetType || ''}\nNationalité : ${company || ''}\nQualité : ${notes || ''}\nType de projet : ${msgContent || ''}\nForme juridique : ${customMsg || ''}`;
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Lead souscription — à relancer</h2>
                <p>Ce prospect a rempli ses coordonnées dans le parcours. Il n'a peut-être pas terminé le paiement.</p>
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="margin: 6px 0;"><strong>Nom :</strong> ${H.nom || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Email :</strong> ${H.email}</p>
                    <p style="margin: 6px 0;"><strong>Téléphone :</strong> ${H.telephone || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Adresse :</strong> ${H.address || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Naissance :</strong> ${H.dateDispo || '—'} — ${H.projetType || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Nationalité / Qualité :</strong> ${H.company || '—'} / ${H.notes || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Projet / Forme :</strong> ${H.msgContent || '—'} / ${H.customMsg || '—'}</p>
                </div>
                <p style="font-size: 13px; color: #64748b;">Vous pouvez le recontacter même s'il n'a pas finalisé l'inscription.</p>
            </div>
        `;
    } else if (type === 'contact_advisor') {
        subject = `Demande conseiller — ${nom || email}`;
        textMessage = `Nouvelle demande « Parler à un conseiller ».\n\nNom : ${nom || ''}\nEmail : ${email}\nTéléphone : ${telephone || ''}\nVille : ${address || ''}\nMessage : ${customMsg || msgContent || '—'}`;
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Demande « Parler à un conseiller »</h2>
                <p>Un prospect souhaite être recontacté (ville / domiciliation).</p>
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="margin: 6px 0;"><strong>Nom :</strong> ${H.nom || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Email :</strong> ${H.email}</p>
                    <p style="margin: 6px 0;"><strong>Téléphone :</strong> ${H.telephone || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Ville souhaitée :</strong> ${H.address || '—'}</p>
                    <p style="margin: 6px 0;"><strong>Message :</strong> ${H.customMsg || H.msgContent || '—'}</p>
                </div>
                <p style="font-size: 13px; color: #64748b;">Merci de recontacter ce prospect rapidement.</p>
            </div>
        `;
    } else if (type === 'request_documents') {
        ({ subject, text: textMessage, html: htmlMessage } = buildDocumentRequestEmail({
            nom,
            missing: Array.isArray(documents) && documents.length ? documents : ['statuts', 'kbis'],
            isCreation: Boolean(isCreation),
            contractSignedAt,
            baseUrl,
        }));
    } else if (type === 'account_created') {
        const payUrl = paymentToken
            ? `${baseUrl}/api/pay?token=${encodeURIComponent(paymentToken)}`
            : `${baseUrl}/inscription`;
        ({ subject, text: textMessage, html: htmlMessage } = buildAccountCreatedEmail({
            nom, email, planName: plan, frequence, payUrl, baseUrl,
        }));
    } else if (type === 'admin_document_uploaded') {
        subject = `Document à valider — ${company || nom || email}`;
        textMessage = `Le client ${nom || ''} (${email}${company ? `, ${company}` : ''}) vient de déposer : ${documentName || 'un document'}.\n\nVérifiez-le et validez-le depuis l'onglet Documents de sa fiche : ${baseUrl}/admin`;
        htmlMessage = `
            <h2 style="margin-top:0;">Nouveau document à valider</h2>
            <p><strong>${escapeHtml(nom || '—')}</strong> (${escapeHtml(email)}${H.company ? `, ${escapeHtml(company)}` : ''}) vient de déposer :</p>
            <p style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:8px;"><strong>${escapeHtml(documentName || 'Document')}</strong></p>
            <p>Vérifiez-le et validez-le depuis l'onglet <strong>Documents</strong> de la fiche client.</p>
            ${emailButton(`${baseUrl}/admin`, 'Ouvrir l’administration', '#0f172a')}
        `;
    } else if (type === 'approval') {
        subject = "Dossier validé - Bienvenue chez Domiciliation Pas Cher";
        textMessage = `Bonjour ${nom || 'Client'},\n\nVotre dossier de domiciliation a été validé avec succès !\n\nVous pouvez dès à présent accéder à votre espace client pour consulter vos documents et suivre la réception de votre courrier.\n\nAccédez à votre portail ici : ${baseUrl}/connexion\n\nBien cordialement,\nLe service client`;

        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Votre dossier est validé ! 🎉</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Nous avons le plaisir de vous informer que votre dossier de domiciliation a été <strong>validé avec succès</strong>.</p>
                <p>Vous pouvez dès à présent accéder à votre espace client pour consulter vos documents contractuels et suivre la réception de votre courrier quotidiennement.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${baseUrl}/connexion" style="background-color: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accéder à mon espace</a>
                </div>
                <p>Nous vous remercions de votre confiance.</p>
                <p>Bien cordialement,<br>Le service client</p>
            </div>
        `;
    } else {
        // Default welcome / generic email (Inscription)
        subject = "Bienvenue chez Domiciliation Pas Cher - Prochaines étapes";
        textMessage = `Bonjour ${nom || 'Client'},\n\nFélicitations pour votre souscription ! Votre paiement a été validé avec succès.\n\nVoici les prochaines étapes de votre dossier :\n1. Attendez de recevoir notre email confirmant que votre dossier a été approuvé.\n2. Connectez-vous à votre Espace Client pour déposer les documents manquants (Pièce d'identité, justificatif de domicile, extrait Kbis).\n3. Procédez à la signature de votre contrat de domiciliation.\n\nAccédez à votre espace ici : ${baseUrl}/connexion\n\nBien cordialement,\nLe service client`;
        htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2>Bienvenue ! 🎉</h2>
                <p>Bonjour ${H.nom || 'Client'},</p>
                <p>Félicitations pour votre souscription ! Votre paiement a été validé avec succès.</p>
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2b6cb0;">Vos prochaines étapes :</h3>
                    <ol style="line-height: 1.6; margin-bottom: 0;">
                        <li><strong>Attendez l'approbation :</strong> Vous recevrez bientôt un email confirmant que votre dossier a été approuvé par notre équipe.</li>
                        <li><strong>Déposez vos documents :</strong> Connectez-vous à votre Espace Client pour ajouter les pièces justificatives manquantes (Pièce d'identité, justificatif de domicile, KBIS).</li>
                        <li><strong>Signez votre contrat :</strong> Vous pourrez ensuite signer électroniquement votre contrat de domiciliation directement en ligne.</li>
                    </ol>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${baseUrl}/connexion" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accéder à mon espace</a>
                </div>
                <p>Bien cordialement,<br>Le service client</p>
            </div>
        `;
    }

    // 2. Configuration du transporteur Nodemailer
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465, // true for 465, false for other ports (587)
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    // 3. Envoi de l'email
    let toAddress = email;
    if (type === 'admin_new_message' || type === 'admin_reexpedition' || type === 'admin_document_uploaded' || type === 'contact_advisor' || type === 'souscription_lead') {
        toAddress = (type === 'contact_advisor' || type === 'souscription_lead')
            ? 'contact@domiciliation-pas-cher.com'
            : ADMIN_EMAIL;
    }

    const conn = getDbConn();
    const info = await sendBrandedMail(transporter, {
        conn,
        from: smtpFrom,
        type: type || 'welcome',
        to: toAddress,
        clientEmail: type === 'contact_advisor' ? undefined : email,
        subject,
        text: textMessage || undefined,
        html: htmlMessage,
        // Réponses clients → boîte pro (sauf lead/conseiller où on répond au prospect)
        replyTo: (type === 'souscription_lead' || type === 'contact_advisor')
            ? email
            : 'contact@domiciliation-pas-cher.com',
    });

    console.log('[email] envoyé (%s): %s', type || 'welcome', info.messageId);

    // 4. Notification Admin pour les nouveaux clients
    if (!type) {
        try {
            const adminSubject = `Nouveau client inscrit : ${nom || email}`;
            const adminHtml = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #2b6cb0;">Nouveau client inscrit ! 🎉</h2>
                    <p>Un nouveau client vient de finaliser son paiement et son inscription sur Domiciliation Pas Cher.</p>
                    <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p><strong>Nom / Prénom :</strong> ${H.nom || 'Non renseigné'}</p>
                        <p><strong>Email :</strong> ${H.email}</p>
                    </div>
                    <p>Ce client est en attente d'approbation et du dépôt de ses pièces justificatives.</p>
                </div>
            `;
            
            await sendBrandedMail(transporter, {
                conn,
                from: smtpFrom,
                type: type ? 'admin_consultation' : 'admin_new_client',
                to: ADMIN_EMAIL,
                clientEmail: email,
                subject: adminSubject,
                html: adminHtml,
            });
            console.log("Admin notification sent to %s", ADMIN_EMAIL);
        } catch (adminErr) {
            console.error("Failed to send admin notification:", adminErr);
        }
    } else if (type === 'consultation_creation') {
        try {
            const adminSubject = `🚨 Nouvelle demande de consultation création : ${nom || ''} (${projetType || 'Création'})`;
            const adminHtml = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px;">
                    <h2 style="color: #1e3a8a; margin-top: 0;">Nouvelle demande de consultation reçue ! 📞</h2>
                    <p>Un porteur de projet souhaite être accompagné pour la création de son entreprise :</p>
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 6px 0;"><strong>Nom / Prénom :</strong> ${H.nom || 'Non renseigné'}</p>
                        <p style="margin: 6px 0;"><strong>Email :</strong> ${H.email}</p>
                        <p style="margin: 6px 0;"><strong>Téléphone :</strong> ${H.telephone || 'Non renseigné'}</p>
                        <p style="margin: 6px 0;"><strong>Forme / Statut visé :</strong> ${H.projetType || 'Non précisé'}</p>
                        <p style="margin: 6px 0;"><strong>Disponibilité souhaitée :</strong> ${H.dateDispo || 'Dès que possible'}</p>
                        ${H.customMsg ? `<p style="margin: 6px 0;"><strong>Message :</strong> ${H.customMsg}</p>` : ''}
                    </div>
                    <p style="font-size: 13px; color: #64748b;">Merci de recontacter ce prospect dans les plus brefs délais.</p>
                </div>
            `;
            await sendBrandedMail(transporter, {
                conn,
                from: smtpFrom,
                type: type ? 'admin_consultation' : 'admin_new_client',
                to: ADMIN_EMAIL,
                clientEmail: email,
                subject: adminSubject,
                html: adminHtml,
            });
            console.log("Admin consultation notification sent to %s", ADMIN_EMAIL);
        } catch (adminErr) {
            console.error("Failed to send admin consultation notification:", adminErr);
        }
    }

    return info;
}
