/**
 * Filtrage des champs d'extra_info écrits par un client (ou un visiteur, pour une demande).
 *
 * - Jamais : paiement, offre, relances, statut… (sinon il pourrait se déclarer « payé »
 *   ou passer en Premium, ou changer de grille tarifaire). `stripe_customer_id` est retiré ici et traité à part.
 * - Signature (contractSigned…, procurationSigned…) : uniquement via /api/update-client-extra,
 *   qui exige une preuve dans signature_logs.
 * - Toute valeur d'un champ « …Url » doit être une URL sûre : ces liens sont ouverts tels
 *   quels dans l'admin, et React ne bloque pas `javascript:` (XSS dans la session admin).
 */
const CLIENT_FORBIDDEN_EXTRA = /^(stripe|payment|dpc_|doc_request|offre|plan$|status$|email$|emailcourrier|admin|subscription|clerk|renewal|since$|grille_tarifaire|tarif|contract_version)/i;
const SIGNATURE_KEYS = /^(contract|procuration)(Signed|SignedAt|SignedUrl|SignatureUrl)$/;
const URL_KEY = /url$/i;

/** https:, data: PDF/image/binaire, ou ancre locale (#local-signature…). */
export function isSafeDocumentUrl(url) {
    if (url === null || url === undefined || url === '') return true;
    // Un tableau / objet passait (String(['https://…']) = « https://… ») puis faisait planter l'admin (.startsWith).
    if (typeof url !== 'string') return false;
    const value = url;
    if (/^#[\w-]*$/.test(value)) return true;
    if (/^data:(application\/pdf|application\/octet-stream|image\/(png|jpe?g))[;,]/i.test(value)) return true;
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}

/** Document hébergé chez nous : Cloudinary, ancre locale de signature (#local-…), ou fichier encodé (PDF / image). */
export function isTrustedDocumentUrl(url) {
    if (url === null || url === undefined || url === '') return true;
    if (typeof url !== 'string') return false;
    if (/^#[\w-]*$/.test(url)) return true;
    if (/^data:(application\/(x-)?pdf|application\/octet-stream|image\/(png|jpe?g|webp|gif))[;,]/i.test(url)) return true;
    return /^https:\/\/res\.cloudinary\.com\//i.test(url);
}

const SIGNATURE_IMAGE_KEY = /SignatureUrl$/;
const SIGNED_DOC_KEY = /SignedUrl$/;
const SIGNATURE_IMAGE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const SIGNATURE_IMAGE_MAX_CHARS = 300_000;

/** La fréquence fixe le prix facturé : choisie à la souscription (demande), jamais modifiable ensuite par le client. */
const FREQUENCY_KEY = /^frequence$/i;

export function sanitizeClientExtra(data, { allowSignature = false, allowFrequence = false } = {}) {
    const clean = {};
    for (const [key, value] of Object.entries(data || {})) {
        if (key === 'stripe_customer_id') continue;
        if (value === HEAVY_PLACEHOLDER) continue;
        if (CLIENT_FORBIDDEN_EXTRA.test(key)) continue;
        if (!allowFrequence && FREQUENCY_KEY.test(key)) continue;
        if (!allowSignature && SIGNATURE_KEYS.test(key)) continue;
        if (allowSignature && SIGNATURE_IMAGE_KEY.test(key) && SIGNATURE_KEYS.test(key)) {
            // Une signature est une image PNG dessinée dans le navigateur, jamais un lien vers un autre site (pixel espion).
            if (typeof value !== 'string' || value.length > SIGNATURE_IMAGE_MAX_CHARS || !SIGNATURE_IMAGE.test(value)) continue;
        } else if (allowSignature && SIGNED_DOC_KEY.test(key) && SIGNATURE_KEYS.test(key) && !isTrustedDocumentUrl(value)) {
            continue;
        }
        if (URL_KEY.test(key) && !isSafeDocumentUrl(value)) continue;
        clean[key] = value;
    }
    return clean;
}

import { HEAVY_PLACEHOLDER } from '../shared/heavyPlaceholder.js';
export { HEAVY_PLACEHOLDER };

/** Retire les valeurs « marqueur » d'une mise à jour : elles ne représentent aucun fichier et écraseraient le vrai. */
export function dropPlaceholders(data) {
    return Object.fromEntries(Object.entries(data || {}).filter(([, value]) => value !== HEAVY_PLACEHOLDER));
}

/**
 * Version légère d'extra_info pour la liste admin : les fichiers encodés dans la fiche (PDF Kbis en base64 :
 * jusqu'à ~1 Mo CHACUN) sont remplacés par un marqueur. Sans ça, la liste renvoyait plus de 1,3 Mo pour 17
 * clients et dépassait la limite de réponse de Vercel (4,5 Mo) dès une dizaine de Kbis déposés.
 * Les petites valeurs (signatures de 10-15 Ko) restent intactes. N'écrit jamais en base.
 * @returns {string} extra_info en JSON (inchangé s'il est illisible ou déjà léger)
 */
export function lightenExtraInfo(raw, maxChars = 20000) {
    if (raw === null || raw === undefined) return raw;
    if (typeof raw === 'string' && raw.length <= maxChars) return raw;
    try {
        let extra = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof extra === 'string') extra = JSON.parse(extra);
        if (!extra || typeof extra !== 'object') return raw;
        const light = {};
        for (const [key, value] of Object.entries(extra)) {
            const isFile = typeof value === 'string' && value.length > maxChars && /^data:/i.test(value) && !SIGNATURE_IMAGE_KEY.test(key);
            light[key] = isFile ? HEAVY_PLACEHOLDER : value;
        }
        return JSON.stringify(light);
    } catch {
        return raw;
    }
}
