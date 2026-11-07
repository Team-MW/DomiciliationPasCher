/**
 * Téléphone du tunnel (champ « 🇫🇷 +33 »).
 * Fonctionne en collage ET en saisie caractère par caractère : « +33612345678 », « 33612345678 », « 0033 6 12 34 56 78 »
 * et « +33 (0)6 12 34 56 78 » donnent tous « 0612345678 » (un numéro français national ne commence jamais par « 33 »).
 */

/** Saisie ou collage → chiffres nationaux (préfixe international remplacé par 0), 10 chiffres maximum. */
export function normalizeFrenchPhone(raw) {
    const value = String(raw ?? '').trim();
    let digits = value.replace(/\D/g, '');
    const international = /^(\+|00)\s*33/.test(value) || /^33/.test(digits);
    if (international) {
        digits = digits.replace(/^(00)?33/, '');
        digits = `0${digits.replace(/^0+/, '')}`;
    }
    return digits.slice(0, 10);
}

/** Numéro français valide : 0 puis 1-9, soit 10 chiffres (0612345678). Refuse 0000000000. */
export function isValidFrenchPhone(digits) {
    return /^0[1-9]\d{8}$/.test(String(digits ?? '').replace(/\D/g, ''));
}
