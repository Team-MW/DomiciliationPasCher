/** Fermé par le visiteur : reste fermé pendant la visite (onglet), réapparaît à la prochaine visite. */
export const PROMO_DISMISS_KEY = 'dpc_promo_closed';

/**
 * Pages où le bandeau est masqué : dès que la personne commence l'inscription (tunnel de souscription,
 * création de compte, connexion) et dans les espaces connectés (client, admin).
 */
const HIDDEN_PREFIXES = ['/souscription', '/inscription', '/connexion', '/app', '/espace-client', '/admin'];

export function isPromoHiddenOn(pathname = '') {
    const p = String(pathname || '/').toLowerCase();
    return HIDDEN_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}
