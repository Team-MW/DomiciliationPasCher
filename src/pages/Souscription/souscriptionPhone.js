/**
 * Téléphone du tunnel (champ « 🇫🇷 +33 »).
 * Avant : maxLength 10 + « refuse au-delà de 10 chiffres » → « +33 6 12 34 56 78 » devenait « 336123 »,
 * « +33612345678 » devenait un faux numéro, et « 0000000000 » passait la validation.
 */

/** Saisie ou collage → chiffres nationaux (préfixe +33 / 0033 / 33 remplacé par 0), 10 chiffres maximum. */
export function normalizeFrenchPhone(raw) {
    let value = String(raw ?? '').trim();
    const international = /^(\+|00)\s*33/.test(value);
    let digits = value.replace(/\D/g, '');
    if (international) {
        digits = digits.replace(/^(00)?33/, '');
        digits = digits.startsWith('0') ? digits : `0${digits}`;
    }
    return digits.slice(0, 10);
}

/** Numéro français valide : 0 puis 1-9, soit 10 chiffres (0612345678). Refuse 0000000000. */
export function isValidFrenchPhone(digits) {
    return /^0[1-9]\d{8}$/.test(String(digits ?? '').replace(/\D/g, ''));
}
