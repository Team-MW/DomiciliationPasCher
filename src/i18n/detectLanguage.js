/**
 * Détection de la langue à partir des préférences du navigateur uniquement
 * (navigator.languages / navigator.language). Aucun appel à un service tiers :
 * l'adresse IP du visiteur n'est jamais transmise.
 */
const SUPPORTED = ['fr', 'en', 'ru'];
const DEFAULT_LANG = 'fr';

export function detectBrowserLanguage(nav = typeof navigator !== 'undefined' ? navigator : undefined) {
    if (!nav) return DEFAULT_LANG;
    const candidates = [
        ...(Array.isArray(nav.languages) ? nav.languages : []),
        nav.language,
    ].filter((l) => typeof l === 'string' && l);
    for (const raw of candidates) {
        const base = raw.toLowerCase().split('-')[0];
        if (SUPPORTED.includes(base)) return base;
    }
    return DEFAULT_LANG;
}

/** Nom historique conservé pour les appelants (ne fait plus de géolocalisation IP). */
export async function detectLanguageFromIP() {
    return detectBrowserLanguage();
}
