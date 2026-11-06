/**
 * Consentement cookies (CNIL / RGPD) — Google Consent Mode v2.
 * Le consentement par défaut (« denied ») est posé dans index.html avant GTM/gtag ;
 * ce module lit/écrit le choix du visiteur et pousse la mise à jour vers gtag.
 * La clé et le format doivent rester alignés avec le script inline d'index.html.
 */
export const CONSENT_STORAGE_KEY = 'dpc_cookie_consent';
export const OPEN_CONSENT_EVENT = 'dpc:open-cookie-consent';

/** Durée de validité d'un choix (CNIL : 6 mois recommandés avant de redemander). */
export const CONSENT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 182;

export function consentState(granted) {
    const v = granted ? 'granted' : 'denied';
    return {
        ad_storage: v,
        analytics_storage: v,
        ad_user_data: v,
        ad_personalization: v,
    };
}

/** Retourne 'granted' | 'denied' | null (aucun choix valide enregistré). */
export function readConsent(now = Date.now()) {
    try {
        const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || (parsed.value !== 'granted' && parsed.value !== 'denied')) return null;
        if (typeof parsed.ts === 'number' && now - parsed.ts > CONSENT_MAX_AGE_MS) return null;
        return parsed.value;
    } catch {
        return null;
    }
}

function gtagCall(...args) {
    if (typeof window === 'undefined') return;
    if (typeof window.gtag === 'function') {
        window.gtag(...args);
        return;
    }
    window.dataLayer = window.dataLayer || [];
    // gtag attend un objet `arguments`, pas un tableau.
    (function pushArgs() { window.dataLayer.push(arguments); })(...args);
}

/** Enregistre le choix et met à jour Google Consent Mode. */
export function saveConsent(granted, now = Date.now()) {
    const value = granted ? 'granted' : 'denied';
    try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ value, ts: now }));
    } catch {
        /* stockage indisponible : le choix vaut pour la page courante */
    }
    gtagCall('consent', 'update', consentState(granted));
    try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'cookie_consent_update', cookie_consent: value });
    } catch {
        /* ignore */
    }
    return value;
}

/** Rouvre le bandeau (lien « Gérer les cookies »). */
export function openCookieConsent() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
