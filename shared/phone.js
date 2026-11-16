/**
 * Numéro de téléphone au format international E.164 (« +33612345678 »), attendu par Google Ads
 * (conversions améliorées) et par tout service qui compare des numéros.
 * Entrées acceptées : « 06 12 34 56 78 », « 06.12.34.56.78 », « +33 6 12 34 56 78 », « 0033612345678 », « 33612345678 ».
 * @returns {string|null} null si le numéro n'est pas exploitable
 */
export function toE164French(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return null;
    // Déjà international hors France : on garde tel quel si plausible (+ suivi de 8 à 15 chiffres).
    if (/^\+/.test(value) && !/^\+33/.test(value)) {
        const digits = value.replace(/\D/g, '');
        return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    }
    let digits = value.replace(/\D/g, '');
    if (/^(\+|00)\s*33/.test(value) || (/^33/.test(digits) && digits.length >= 11)) {
        digits = digits.replace(/^(00)?33/, '');
        digits = digits.replace(/^0+/, '');
    } else {
        digits = digits.replace(/^0/, '');
    }
    return /^[1-9]\d{8}$/.test(digits) ? `+33${digits}` : null;
}
