/**
 * Vérification de l'adresse email d'un compte de connexion, par NOTRE serveur d'emails.
 *
 * Pourquoi : le serveur refuse tout compte dont l'email n'est pas vérifié chez Clerk (sinon n'importe qui pourrait
 * s'inscrire avec l'adresse d'un autre et réclamer son dossier). Quand le code de Clerk n'arrive pas (spam, délai,
 * domaine d'envoi), le client restait bloqué. Ici le code part de notre SMTP (le même que les emails de bienvenue,
 * dont on voit l'historique) : la preuve reste la même, l'adresse reçoit bien le code, mais on maîtrise l'envoi.
 *
 * Sécurité : code à 6 chiffres haché (HMAC), valable 10 min, 5 essais, 1 envoi / 45 s, 5 envois / heure,
 * lié à l'adresse exacte du compte. Quelqu'un qui s'inscrit avec l'adresse d'un autre ne reçoit jamais le code.
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { createClerkClient } from '@clerk/backend';
import { readServerEnv } from './_env.js';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const MIN_RESEND_MS = 45 * 1000;
export const MAX_SENDS_PER_HOUR = 5;

class VerificationError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

let tableReady = false;
async function ensureTable(conn) {
    if (tableReady) return;
    await conn.execute(
        'CREATE TABLE IF NOT EXISTS email_verifications (user_id VARCHAR(64) PRIMARY KEY, email VARCHAR(255) NOT NULL, code_hash VARCHAR(64) NOT NULL, expires_at BIGINT NOT NULL, attempts INT NOT NULL DEFAULT 0, last_sent_at BIGINT NOT NULL DEFAULT 0, window_start BIGINT NOT NULL DEFAULT 0, send_count INT NOT NULL DEFAULT 0)',
    );
    tableReady = true;
}

const hashCode = (userId, email, code) => createHmac('sha256', readServerEnv('CLERK_SECRET_KEY') || 'dpc').update(`${userId}:${email}:${code}`).digest('hex');
const maskEmail = (email) => email.replace(/^(.{2})[^@]*(@.*)$/, '$1•••$2');

async function loadPrimary(userId) {
    const secretKey = readServerEnv('CLERK_SECRET_KEY');
    if (!secretKey) throw new VerificationError(500, 'Clerk non configuré');
    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(userId);
    const primary = clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId) || clerkUser.emailAddresses?.[0];
    if (!primary?.emailAddress) throw new VerificationError(400, 'Aucune adresse email sur ce compte.');
    return { clerk, clerkUser, primary, email: String(primary.emailAddress).trim().toLowerCase() };
}

export async function sendEmailVerificationCode({ conn, sendEmail }, userId) {
    const { clerkUser, primary, email } = await loadPrimary(userId);
    if (primary.verification?.status === 'verified') return { alreadyVerified: true, email: maskEmail(email) };
    await ensureTable(conn);

    const now = Date.now();
    const row = (await conn.execute('SELECT * FROM email_verifications WHERE user_id = ?', [userId])).rows?.[0];
    if (row && now - Number(row.last_sent_at) < MIN_RESEND_MS) {
        throw new VerificationError(429, 'Un code vient d’être envoyé. Patientez une minute avant d’en demander un autre (pensez à vérifier les courriers indésirables).');
    }
    const freshWindow = !row || now - Number(row.window_start) > 60 * 60 * 1000;
    const sendCount = freshWindow ? 0 : Number(row.send_count);
    if (sendCount >= MAX_SENDS_PER_HOUR) {
        throw new VerificationError(429, 'Trop de demandes de code. Réessayez dans une heure ou contactez-nous au 09 60 39 69 07.');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
        await sendEmail({ type: 'email_verification', email, nom: clerkUser.firstName || '', code });
    } catch (err) {
        console.error('[email-verification] envoi impossible:', err?.message || err);
        throw new VerificationError(502, 'L’email n’a pas pu être envoyé pour le moment. Réessayez dans une minute ou contactez-nous.');
    }
    await conn.execute(
        'INSERT INTO email_verifications (user_id, email, code_hash, expires_at, attempts, last_sent_at, window_start, send_count) VALUES (?, ?, ?, ?, 0, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), attempts = 0, last_sent_at = VALUES(last_sent_at), window_start = VALUES(window_start), send_count = VALUES(send_count)',
        [userId, email, hashCode(userId, email, code), now + CODE_TTL_MS, now, freshWindow ? now : Number(row.window_start), sendCount + 1],
    );
    return { sent: true, email: maskEmail(email) };
}

export async function confirmEmailVerificationCode({ conn }, userId, rawCode) {
    const code = String(rawCode ?? '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) throw new VerificationError(400, 'Le code comporte 6 chiffres.');
    await ensureTable(conn);

    const row = (await conn.execute('SELECT * FROM email_verifications WHERE user_id = ?', [userId])).rows?.[0];
    if (!row) throw new VerificationError(400, 'Aucun code en cours : demandez-en un nouveau.');
    if (Date.now() > Number(row.expires_at)) throw new VerificationError(400, 'Ce code a expiré : demandez-en un nouveau.');
    if (Number(row.attempts) >= MAX_ATTEMPTS) throw new VerificationError(429, 'Trop d’essais incorrects : demandez un nouveau code.');

    const { clerk, primary, email } = await loadPrimary(userId);
    if (row.email !== email) throw new VerificationError(400, 'L’adresse du compte a changé : demandez un nouveau code.');

    const expected = Buffer.from(String(row.code_hash));
    const given = Buffer.from(hashCode(userId, email, code));
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
        await conn.execute('UPDATE email_verifications SET attempts = attempts + 1 WHERE user_id = ?', [userId]);
        throw new VerificationError(400, 'Code incorrect.');
    }

    await clerk.emailAddresses.updateEmailAddress(primary.id, { verified: true });
    await conn.execute('DELETE FROM email_verifications WHERE user_id = ?', [userId]);
    return { verified: true };
}

/** ADMIN : marque l'adresse du compte comme vérifiée (le client a prouvé son identité autrement, ex. au téléphone). */
export async function markClerkEmailVerified(userId) {
    const { clerk, primary, email } = await loadPrimary(userId);
    if (primary.verification?.status !== 'verified') await clerk.emailAddresses.updateEmailAddress(primary.id, { verified: true });
    return { verified: true, email };
}

export { VerificationError };
