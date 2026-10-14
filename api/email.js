import nodemailer from 'nodemailer';
import fs from 'fs';
import { ADMIN_EMAIL } from './_smtp.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 1. Récupération des variables d'environnement
        let smtpHost = process.env.SMTP_HOST;
        let smtpPort = process.env.SMTP_PORT || 465;
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASS;
        let smtpFrom = process.env.SMTP_FROM || smtpUser;

        // Fallback local pour Vite / Vercel en dev
        if (!smtpUser) {
            try {
                if (fs.existsSync('.env.local')) {
                    const content = fs.readFileSync('.env.local', 'utf-8');
                    const getEnv = (key) => {
                        const match = content.match(new RegExp(`${key}=(.*)`));
                        return match ? match[1].trim().replace(/^['"](.*)['"]$/, '$1') : null;
                    };
                    smtpHost = getEnv('SMTP_HOST') || smtpHost;
                    smtpPort = getEnv('SMTP_PORT') || smtpPort;
                    smtpUser = getEnv('SMTP_USER') || smtpUser;
                    smtpPass = getEnv('SMTP_PASS') || smtpPass;
                    smtpFrom = getEnv('SMTP_FROM') || getEnv('SMTP_USER') || smtpFrom;
                }
            } catch (e) { console.error(e) }
        }

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.error("Configuration SMTP manquante.");
            return res.status(500).json({ error: "Configuration SMTP du serveur manquante." });
        }

        const { email, nom, type, amount, paymentLink, content: msgContent, telephone, projetType, dateDispo, message: customMsg, address, notes, company } = req.body;

        if (!email) {
            return res.status(400).json({ error: "L'email est requis." });
        }

        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = host ? `${protocol}://${host}` : 'https://domiciliation-pas-cher.fr';

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
                    <p>Bonjour ${nom || 'Client'},</p>
                    <p>Nous vous informons qu'un incident est survenu lors de votre dernier règlement de <strong>${amount || 'votre abonnement'}</strong>.</p>
                    <p>Merci de mettre à jour votre moyen de paiement. Sans régularisation sous 2 mois, votre contrat de domiciliation pourra être résilié.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${paymentLink || baseUrl + '/connexion'}" style="background-color: #1A56DB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Mettre à jour mon paiement</a>
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
                    <p>Bonjour ${nom || 'Client'},</p>
                    <p>Sauf erreur de notre part, nous n'avons pas reçu le règlement de votre facture d'un montant de <strong>${amount || ''}</strong>.</p>
                    <p>Vous pouvez régulariser la situation très simplement en cliquant sur le bouton ci-dessous :</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${paymentLink}" style="background-color: #1A56DB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Régler ma facture</a>
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
                    <p>Bonjour ${nom || 'Client'},</p>
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
                    <p>Bonjour ${nom || 'Client'},</p>
                    <p>Vous avez reçu un nouveau message de la part de notre équipe :</p>
                    <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
                        <p style="margin: 0; font-style: italic;">"${msgContent}"</p>
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
                    <p>Vous avez reçu un nouveau message de <strong>${nom || 'Client'}</strong> (${email}) :</p>
                    <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38a169;">
                        <p style="margin: 0; font-style: italic;">"${msgContent}"</p>
                    </div>
                    <p>Pour y répondre, connectez-vous à l'interface d'administration.</p>
                    <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>
                </div>
            `;
        } else if (type === 'new_mail') {
            subject = "Nouveau courrier reçu - Domiciliation Pas Cher";
            textMessage = `Bonjour ${nom || 'Client'},\n\nUn nouveau courrier a été déposé dans votre boîte aux lettres numérisée.\n\nVous pouvez le consulter dès maintenant en vous connectant à votre espace client.\n\nAccédez à votre portail ici : ${baseUrl}/connexion\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;

            htmlMessage = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2>Nouveau courrier reçu 📬</h2>
                    <p>Bonjour ${nom || 'Client'},</p>
                    <p>Un nouveau courrier a été déposé dans votre boîte aux lettres numérisée.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/connexion" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Consulter mon courrier</a>
                    </div>
                    <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>
                </div>
            `;
        } else if (type === 'consultation_creation') {
            subject = "Confirmation de votre demande de consultation - Domiciliation Pas Cher";
            textMessage = `Bonjour ${nom || ''},\n\nNous avons bien reçu votre demande de consultation pour votre projet de création d'entreprise (${projetType || 'Projet de création'}).\n\nUn de nos juristes / conseillers experts prendra contact avec vous rapidement (par téléphone ou email) au ${telephone || ''} pour faire le point sur votre projet et vous orienter vers la meilleure forme juridique.\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;

            htmlMessage = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2>Demande de consultation reçue ! 🚀</h2>
                    <p>Bonjour ${nom || ''},</p>
                    <p>Nous avons bien enregistré votre demande d'accompagnement pour votre projet de création d'entreprise.</p>
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <h3 style="margin-top: 0; color: #1e3a8a;">Récapitulatif de votre demande :</h3>
                        <p><strong>Statut / Projet envisagé :</strong> ${projetType || 'Non précisé'}</p>
                        <p><strong>Téléphone :</strong> ${telephone || 'Non précisé'}</p>
                        <p><strong>Disponibilité souhaitée :</strong> ${dateDispo || 'Dès que possible'}</p>
                        ${customMsg ? `<p><strong>Précisions :</strong> ${customMsg}</p>` : ''}
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
                    <p>Bonjour ${nom || 'Client'},</p>
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
                        <p style="margin: 6px 0;"><strong>Client :</strong> ${nom || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Société :</strong> ${company || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Email :</strong> ${email}</p>
                        <p style="margin: 6px 0;"><strong>Adresse de destination :</strong> ${address || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Instructions :</strong> ${notes || 'aucune'}</p>
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
                    <p>Bonjour ${nom || 'Client'},</p>
                    <p>Votre demande de réexpédition physique a été traitée. Les originaux ont été expédiés vers :</p>
                    <p><strong>${address || 'l’adresse indiquée'}</strong></p>
                    <p>Bien cordialement,<br>L'équipe Domiciliation Pas Cher</p>
                </div>
            `;
        } else if (type === 'reexpedition_refused') {
            subject = "Demande de réexpédition - Domiciliation Pas Cher";
            textMessage = `Bonjour ${nom || 'Client'},\n\nVotre demande de réexpédition physique n'a pas pu être traitée. Contactez-nous via la messagerie de votre espace client pour plus d'informations.\n\nBien cordialement,\nL'équipe Domiciliation Pas Cher`;
            htmlMessage = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2>Demande de réexpédition</h2>
                    <p>Bonjour ${nom || 'Client'},</p>
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
                        <p style="margin: 6px 0;"><strong>Nom :</strong> ${nom || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Email :</strong> ${email}</p>
                        <p style="margin: 6px 0;"><strong>Téléphone :</strong> ${telephone || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Adresse :</strong> ${address || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Naissance :</strong> ${dateDispo || '—'} — ${projetType || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Nationalité / Qualité :</strong> ${company || '—'} / ${notes || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Projet / Forme :</strong> ${msgContent || '—'} / ${customMsg || '—'}</p>
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
                        <p style="margin: 6px 0;"><strong>Nom :</strong> ${nom || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Email :</strong> ${email}</p>
                        <p style="margin: 6px 0;"><strong>Téléphone :</strong> ${telephone || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Ville souhaitée :</strong> ${address || '—'}</p>
                        <p style="margin: 6px 0;"><strong>Message :</strong> ${customMsg || msgContent || '—'}</p>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">Merci de recontacter ce prospect rapidement.</p>
                </div>
            `;
        } else if (type === 'approval') {
            subject = "Dossier validé - Bienvenue chez Domiciliation Pas Cher";
            textMessage = `Bonjour ${nom || 'Client'},\n\nVotre dossier de domiciliation a été validé avec succès !\n\nVous pouvez dès à présent accéder à votre espace client pour consulter vos documents et suivre la réception de votre courrier.\n\nAccédez à votre portail ici : ${baseUrl}/connexion\n\nBien cordialement,\nLe service client`;

            htmlMessage = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2>Votre dossier est validé ! 🎉</h2>
                    <p>Bonjour ${nom || 'Client'},</p>
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
                    <p>Bonjour ${nom || 'Client'},</p>
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
        if (type === 'admin_new_message' || type === 'admin_reexpedition' || type === 'contact_advisor' || type === 'souscription_lead') {
            toAddress = (type === 'contact_advisor' || type === 'souscription_lead')
                ? 'contact@domiciliation-pas-cher.com'
                : ADMIN_EMAIL;
        }

        const info = await transporter.sendMail({
            from: smtpFrom,
            to: toAddress,
            subject: subject,
            text: textMessage,
            html: htmlMessage,
            // Réponses clients → boîte pro (sauf lead/conseiller où on répond au prospect)
            replyTo: (type === 'souscription_lead' || type === 'contact_advisor')
                ? email
                : 'contact@domiciliation-pas-cher.com',
            headers: {
                'X-Mailer': 'Domiciliation-Pas-Cher',
                'X-Entity-Ref-ID': `${type || 'welcome'}-${Date.now()}`,
            },
        });

        console.log("Message sent to %s: %s", toAddress, info.messageId);

        // 4. Notification Admin pour les nouveaux clients
        if (!type) {
            try {
                const adminSubject = `Nouveau client inscrit : ${nom || email}`;
                const adminHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #2b6cb0;">Nouveau client inscrit ! 🎉</h2>
                        <p>Un nouveau client vient de finaliser son paiement et son inscription sur Domiciliation Pas Cher.</p>
                        <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p><strong>Nom / Prénom :</strong> ${nom || 'Non renseigné'}</p>
                            <p><strong>Email :</strong> ${email}</p>
                        </div>
                        <p>Ce client est en attente d'approbation et du dépôt de ses pièces justificatives.</p>
                    </div>
                `;
                
                await transporter.sendMail({
                    from: smtpFrom,
                    to: ADMIN_EMAIL,
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
                            <p style="margin: 6px 0;"><strong>Nom / Prénom :</strong> ${nom || 'Non renseigné'}</p>
                            <p style="margin: 6px 0;"><strong>Email :</strong> ${email}</p>
                            <p style="margin: 6px 0;"><strong>Téléphone :</strong> ${telephone || 'Non renseigné'}</p>
                            <p style="margin: 6px 0;"><strong>Forme / Statut visé :</strong> ${projetType || 'Non précisé'}</p>
                            <p style="margin: 6px 0;"><strong>Disponibilité souhaitée :</strong> ${dateDispo || 'Dès que possible'}</p>
                            ${customMsg ? `<p style="margin: 6px 0;"><strong>Message :</strong> ${customMsg}</p>` : ''}
                        </div>
                        <p style="font-size: 13px; color: #64748b;">Merci de recontacter ce prospect dans les plus brefs délais.</p>
                    </div>
                `;
                await transporter.sendMail({
                    from: smtpFrom,
                    to: ADMIN_EMAIL,
                    subject: adminSubject,
                    html: adminHtml,
                });
                console.log("Admin consultation notification sent to %s", ADMIN_EMAIL);
            } catch (adminErr) {
                console.error("Failed to send admin consultation notification:", adminErr);
            }
        }

        return res.status(200).json({ success: true, message: "Email envoyé" });
        
    } catch (error) {
        console.error('Nodemailer Server error:', error);
        return res.status(500).json({ error: error.message });
    }
}
