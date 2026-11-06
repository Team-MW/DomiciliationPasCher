/**
 * Envois d'emails depuis le front : tout passe par /api/email (contrôle d'accès côté serveur,
 * jeton Clerk joint automatiquement par installApiAuth).
 *
 * Une seule fonction d'envoi (`postEmail`) : elle lève une erreur avec le message du serveur
 * (« Configuration SMTP du serveur manquante. », « Accès réservé à l'administration »…) pour
 * que l'admin sache POURQUOI un email n'est pas parti, au lieu d'un échec silencieux.
 *
 * Règle : un envoi déclenché par l'admin doit toujours dire à l'admin s'il a échoué.
 * Les types acceptés sont listés dans api/_email-core.js (EMAIL_TYPES) ; un type inconnu est refusé.
 */

export class EmailSendError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'EmailSendError';
        this.status = status;
    }
}

/** Envoie un email transactionnel. Résout `true`, ou lève une EmailSendError lisible. */
export async function postEmail(payload) {
    let response;
    try {
        response = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch {
        throw new EmailSendError('Serveur injoignable (connexion internet ?).', 0);
    }
    if (response.ok) return true;
    const data = await response.json().catch(() => ({}));
    const fallback = response.status === 401 || response.status === 403
        ? 'Session expirée ou droits insuffisants : reconnectez-vous.'
        : `Erreur serveur (${response.status}).`;
    throw new EmailSendError(data.error || data.message || fallback, response.status);
}

/** Variante « sans bloquer » : true/false, l'erreur est seulement journalisée. */
async function tryPostEmail(payload, label) {
    try {
        return await postEmail(payload);
    } catch (err) {
        console.error(`Email « ${label} » non envoyé :`, err.message);
        return false;
    }
}

// ─── Envois déclenchés par l'administration (l'erreur remonte : l'admin doit être prévenu) ───

/** Client déclaré impayé. */
export const sendFailedPaymentEmail = (email, nom) =>
    postEmail({ type: 'payment_failed', email, nom });

/** Réponse de l'admin dans la messagerie : prévient le client par email. */
export const sendAdminMessageEmail = ({ email, nom, content }) =>
    postEmail({ type: 'new_message', email, nom, content });

/** Validation du dossier (renvoi manuel de l'email de validation). */
export const sendApprovalEmail = async (email, nom) => {
    try {
        await postEmail({ type: 'approval', email, nom: nom || '' });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

/** Réexpédition traitée (expédiée ou refusée). Résout true/false. */
export const sendReexpeditionStatusEmail = ({ email, nom, status, address }) =>
    tryPostEmail({
        type: status === 'expediee' ? 'reexpedition_sent' : 'reexpedition_refused',
        email,
        nom,
        address,
    }, 'statut réexpédition');

/** Dossier créé depuis l'admin : lien pour enregistrer la carte et démarrer l'abonnement. */
export const sendAccountCreatedEmail = (email, nom, { paymentToken, plan, frequence } = {}) =>
    postEmail({ type: 'account_created', email, nom: nom || '', paymentToken, plan, frequence });

// ─── Envois déclenchés par le client connecté (vers l'admin ou vers lui-même) ───

/** Nouveau message du client → boîte interne. */
export const sendClientNewMessageEmail = (email, nom, content) =>
    tryPostEmail({ type: 'admin_new_message', email, nom, content }, 'nouveau message client');

/** Demande de réexpédition du client → boîte interne. */
export const sendReexpeditionRequestEmail = ({ email, nom, company, address, notes }) =>
    tryPostEmail({ type: 'admin_reexpedition', email, nom, company, address, notes }, 'demande de réexpédition');

/** Document déposé par le client → boîte interne. */
export const sendAdminDocumentUploadedEmail = ({ email, nom, company, documentName }) =>
    postEmail({ type: 'admin_document_uploaded', email, nom: nom || '', company, documentName });

// ─── Formulaires publics ───

/** « Parler à un conseiller » → contact@domiciliation-pas-cher.com */
export const sendContactAdvisorEmail = ({ nom, email, telephone, city, message }) =>
    postEmail({ type: 'contact_advisor', nom, email, telephone, address: city || '', message: message || '' });

/** Lead du formulaire de souscription (même si le parcours n'est pas terminé). */
export const sendSouscriptionLeadEmail = (lead) =>
    postEmail({
        type: 'souscription_lead',
        nom: lead.nom,
        email: lead.email,
        telephone: lead.telephone || '',
        address: lead.address || '',
        dateDispo: lead.dateNaissance || '',
        projetType: lead.lieuNaissance || '',
        company: lead.nationalite || '',
        notes: lead.qualite || '',
        content: lead.typeProjet || '',
        message: lead.formeJuridique || '',
        plan: lead.plan || '',
    });
