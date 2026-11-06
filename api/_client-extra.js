/**
 * Filtrage des champs d'extra_info écrits par un client (ou un visiteur, pour une demande).
 *
 * - Jamais : paiement, offre, relances, statut… (sinon il pourrait se déclarer « payé »
 *   ou passer en Physique+). `stripe_customer_id` est retiré ici et traité à part.
 * - Signature (contractSigned…, procurationSigned…) : uniquement via /api/update-client-extra,
 *   qui exige une preuve dans signature_logs.
 * - Toute valeur d'un champ « …Url » doit être une URL sûre : ces liens sont ouverts tels
 *   quels dans l'admin, et React ne bloque pas `javascript:` (XSS dans la session admin).
 */
const CLIENT_FORBIDDEN_EXTRA = /^(stripe|payment|dpc_|doc_request|offre|plan$|status$|email$|emailcourrier|admin|subscription|clerk|renewal|since$)/i;
const SIGNATURE_KEYS = /^(contract|procuration)(Signed|SignedAt|SignedUrl|SignatureUrl)$/;
const URL_KEY = /url$/i;

/** https:, data: PDF/image/binaire, ou ancre locale (#local-signature…). */
export function isSafeDocumentUrl(url) {
    if (url === null || url === undefined || url === '') return true;
    const value = String(url);
    if (/^#[\w-]*$/.test(value)) return true;
    if (/^data:(application\/pdf|application\/octet-stream|image\/(png|jpe?g))[;,]/i.test(value)) return true;
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}

export function sanitizeClientExtra(data, { allowSignature = false } = {}) {
    const clean = {};
    for (const [key, value] of Object.entries(data || {})) {
        if (key === 'stripe_customer_id') continue;
        if (CLIENT_FORBIDDEN_EXTRA.test(key)) continue;
        if (!allowSignature && SIGNATURE_KEYS.test(key)) continue;
        if (URL_KEY.test(key) && !isSafeDocumentUrl(value)) continue;
        clean[key] = value;
    }
    return clean;
}
