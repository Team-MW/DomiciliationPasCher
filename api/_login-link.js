/**
 * Lien de connexion par email (« Recevoir un lien de connexion »).
 *
 * Pourquoi : les codes et emails envoyés par Clerk lui-même (mot de passe oublié, connexion depuis
 * un nouvel appareil) n'arrivent pas toujours. Ce lien part de NOTRE serveur d'emails : un clic
 * connecte le client (jeton de connexion Clerk à usage unique) ET prouve qu'il lit cette boîte
 * (preuve signée ?v=, qui valide l'adresse sans code).
 *
 * Sécurité : le lien n'est envoyé qu'à l'adresse du compte ; la réponse est toujours la même
 * (on ne révèle pas si un compte existe) ; au plus PUBLIC_DAILY_LIMIT envois par adresse et par jour.
 */
import { signupProofToken } from './_signup-proof.js';
import { sendBrandedMail } from './_email-kit.js';
import { buildLoginLinkEmail, buildCreateAccessEmail } from './_email-templates.js';

export const LOGIN_LINK_TTL_SECONDS = 60 * 60; // 1 h
export const ACTIVATION_LINK_TTL_SECONDS = 7 * 24 * 60 * 60; // lien du contrôle du matin : 7 jours

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLoginEmail(value) {
    const email = String(value ?? '').trim().toLowerCase();
    return EMAIL_RE.test(email) && email.length <= 254 ? email : '';
}

/** URL de connexion en 1 clic : /connexion?ticket=…&email=…&v=… */
export function loginLinkUrl(baseUrl, email, ticket) {
    const params = new URLSearchParams({ ticket, email, v: signupProofToken(email) });
    return `${String(baseUrl || '').replace(/\/$/, '')}/connexion?${params.toString()}`;
}

/** Jeton de connexion Clerk pour ce compte (null si impossible). */
export async function createLoginTicket(clerk, userId, expiresInSeconds = LOGIN_LINK_TTL_SECONDS) {
    if (!clerk || !userId) return null;
    const token = await clerk.signInTokens.createSignInToken({ userId, expiresInSeconds });
    return token?.token || null;
}

async function findClerkUser(clerk, email) {
    const result = await clerk.users.getUserList({ emailAddress: [email], limit: 5 });
    const users = result?.data || result || [];
    return users.find((u) => !u.banned && !u.locked) || null;
}

async function knownCustomer(conn, email) {
    for (const sql of [
        'SELECT name FROM clients WHERE LOWER(email) = ? LIMIT 1',
        "SELECT clientName AS name FROM demandes WHERE LOWER(email) = ? AND status <> 'en_attente_paiement' LIMIT 1",
    ]) {
        try {
            const row = (await conn.execute(sql, [email])).rows?.[0];
            if (row) return { name: String(row.name || '').replace(/\s*-?\s*📞.*$/, '').trim() };
        } catch { /* table absente : on continue */ }
    }
    return null;
}

/**
 * Envoie le bon email selon la situation, puis renvoie toujours { ok: true }.
 *  - compte Clerk trouvé → lien de connexion en 1 clic ;
 *  - pas de compte mais client connu (a payé) → lien « Créer mon accès » (adresse déjà validée) ;
 *  - inconnu → rien n'est envoyé.
 */
export async function sendLoginLink({ conn, clerk, transporter, from, baseUrl, email: rawEmail, isRateLimited }) {
    const email = normalizeLoginEmail(rawEmail);
    if (!email) return { ok: false, error: 'Adresse email invalide.' };
    if (!transporter || !clerk) return { ok: false, error: 'Envoi impossible pour le moment. Appelez-nous au 09 60 39 69 07.' };
    if (isRateLimited && await isRateLimited(email)) return { ok: true, sent: false, reason: 'rate_limited' };

    const user = await findClerkUser(clerk, email);
    if (user) {
        const ticket = await createLoginTicket(clerk, user.id);
        if (!ticket) return { ok: true, sent: false };
        const mail = buildLoginLinkEmail({ nom: user.firstName || '', url: loginLinkUrl(baseUrl, email, ticket) });
        await sendBrandedMail(transporter, { conn, from, to: email, clientEmail: email, type: 'login_link', source: 'client', ...mail });
        return { ok: true, sent: true, kind: 'login' };
    }
    const customer = conn ? await knownCustomer(conn, email) : null;
    if (customer) {
        const mail = buildCreateAccessEmail({ nom: customer.name, email, baseUrl });
        await sendBrandedMail(transporter, { conn, from, to: email, clientEmail: email, type: 'login_link', source: 'client', ...mail });
        return { ok: true, sent: true, kind: 'signup' };
    }
    return { ok: true, sent: false };
}
