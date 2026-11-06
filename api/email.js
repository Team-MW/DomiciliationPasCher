import { getAuthUser } from './_auth.js';
import { getBaseUrl } from './_email-kit.js';
import { deliverEmail } from './_email-core.js';

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
