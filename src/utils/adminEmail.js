/**
 * Un compte est administrateur si son email figure dans VITE_ADMIN_EMAILS (séparés par des virgules).
 * Comparaison identique au serveur (api/_auth.js) : espaces ignorés, majuscules ignorées. Sans ça, un 2e admin
 * saisi « a@x.fr, B@Gmail.com » était accepté par l'API mais refusé par l'écran.
 */
import { BUILT_IN_ADMIN_EMAILS } from '../../shared/adminEmails.js';

export function adminEmails(raw = import.meta.env.VITE_ADMIN_EMAILS) {
    return String(raw || 'mwcrea.agency@gmail.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email, raw) {
    const clean = String(email || '').trim().toLowerCase();
    return Boolean(clean) && (BUILT_IN_ADMIN_EMAILS.includes(clean) || adminEmails(raw).includes(clean));
}
