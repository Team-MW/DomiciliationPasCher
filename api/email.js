import { getAuthUser } from './_auth.js';
import { getBaseUrl } from './_email-kit.js';
import { deliverEmail } from './_email-core.js';
import { isSingleEmail } from './_email-kit.js';
import { getDbConn } from './_db.js';

/** Longueur maximale des champs libres d'un formulaire public (nom, message, etc.). */
export const PUBLIC_FIELD_LIMITS = Object.freeze({
    nom: 120, telephone: 40, address: 300, message: 2000, content: 2000, notes: 1000,
    projetType: 200, dateDispo: 100, company: 200, plan: 60,
});

/** Formulaires publics : au plus 4 emails par adresse et par type sur 24 h (anti-relais de spam via notre SMTP). */
export const PUBLIC_DAILY_LIMIT = 4;

export async function tooManyRecentEmails(conn, email, type) {
    if (!conn) return false;
    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const res = await conn.execute(
            'SELECT COUNT(*) AS n FROM email_logs WHERE LOWER(client_email) = ? AND type = ? AND sent_at > ?',
            [email.trim().toLowerCase(), type, since],
        );
        return Number(res.rows?.[0]?.n || 0) >= PUBLIC_DAILY_LIMIT;
    } catch {
        return false; // table absente / base indisponible : on n'empêche pas l'envoi
    }
}

/**
 * Envoi d'emails transactionnels depuis le front.
 *
 * Avant : n'importe qui pouvait faire partir n'importe quel email (lien de paiement compris)
 * vers n'importe quelle adresse depuis le SMTP officiel. Désormais chaque type a une règle :
 */

// Formulaires publics : le destinataire est forcé (boîte interne) ou c'est le prospect lui-même.
const PUBLIC_TYPES = new Set(['contact_advisor', 'souscription_lead', 'consultation_creation']);
// Client connecté → notification interne ; l'email affiché est celui du compte, pas celui du body.
const CLIENT_TO_ADMIN_TYPES = new Set(['admin_new_message', 'admin_reexpedition', 'admin_document_uploaded']);
// Client connecté → accusé envoyé à sa propre adresse.
const CLIENT_SELF_TYPES = new Set(['post_signature', 'procuration_postale']);
// Tout le reste (bienvenue, validation, impayé, nouveau message, compte créé…) : admin uniquement.

export function classifyEmailType(type) {
    if (PUBLIC_TYPES.has(type)) return 'public';
    if (CLIENT_TO_ADMIN_TYPES.has(type)) return 'client_to_admin';
    if (CLIENT_SELF_TYPES.has(type)) return 'client_self';
    return 'admin';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const body = { ...(req.body || {}) };
    const access = classifyEmailType(body.type);

    if (access === 'public') {
        if (!isSingleEmail(body.email)) {
            return res.status(400).json({ error: 'Adresse email invalide.' });
        }
        // Formulaires publics : textes libres plafonnés (le contenu est repris dans des emails envoyés par notre domaine).
        for (const [key, max] of Object.entries(PUBLIC_FIELD_LIMITS)) {
            if (typeof body[key] === 'string') body[key] = body[key].slice(0, max);
            else if (body[key] !== undefined && body[key] !== null) delete body[key];
        }
        if (await tooManyRecentEmails(getDbConn(), body.email, body.type)) {
            return res.status(429).json({ error: 'Trop de demandes pour cette adresse. Réessayez demain ou appelez-nous au 09 60 39 69 07.' });
        }
    }
    if (access !== 'public') {
        const user = await getAuthUser(req);
        if (!user || !user.email) {
            return res.status(401).json({ error: 'Authentification requise' });
        }
        if (access === 'admin' && !user.isAdmin) {
            return res.status(403).json({ error: 'Accès réservé à l’administration' });
        }
        if ((access === 'client_to_admin' || access === 'client_self') && !user.isAdmin) {
            body.email = user.email;
        }
    }
    // Seul un admin peut fournir un lien de paiement.
    if (access !== 'admin') delete body.paymentLink;

    try {
        const source = { admin: 'manuel', client_self: 'client', client_to_admin: 'interne', public: 'interne' }[access];
        await deliverEmail(body, { baseUrl: getBaseUrl(req), source: access === 'public' && body.type === 'consultation_creation' ? 'client' : source });
        return res.status(200).json({ success: true, message: 'Email envoyé' });
    } catch (error) {
        if (error?.statusCode === 400) {
            return res.status(400).json({ error: error.message });
        }
        console.error('[email] échec envoi:', error);
        return res.status(500).json({ error: 'Envoi de l’email impossible pour le moment.' });
    }
}
