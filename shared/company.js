/**
 * Identité du Domiciliataire et adresse de domiciliation — SEULE source (front + serveur).
 *
 * L'adresse doit TOUJOURS être donnée complète, bâtiment et lot compris : l'article 12 des CGV
 * et l'article 2.1 du contrat imposent au client de la communiquer ainsi, sinon son courrier
 * peut ne pas être distribué.
 */
export const DOMICILIATION_ADDRESS = {
    street: '150 rue Nicolas Louis Vauquelin',
    building: 'Bâtiment B, Lot 308',
    postalCode: '31100',
    city: 'Toulouse',
    country: 'FRANCE',
};

/** « 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse » */
export const DOMICILIATION_ADDRESS_ONE_LINE =
    `${DOMICILIATION_ADDRESS.street}, ${DOMICILIATION_ADDRESS.building}, ${DOMICILIATION_ADDRESS.postalCode} ${DOMICILIATION_ADDRESS.city}`;

/** Lignes postales (format enveloppe), sans le nom de la société. */
export const DOMICILIATION_ADDRESS_LINES = [
    DOMICILIATION_ADDRESS.street,
    DOMICILIATION_ADDRESS.building,
    `${DOMICILIATION_ADDRESS.postalCode} ${DOMICILIATION_ADDRESS.city}`,
    DOMICILIATION_ADDRESS.country,
];

/** Adresse postale complète d'une société domiciliée, prête à copier. */
export function postalAddressFor(companyName) {
    return [companyName, ...DOMICILIATION_ADDRESS_LINES].filter(Boolean).join('\n');
}

export const AGREMENT_NUMBER = 'AG/DOM/2026/06';

/** Identité légale du domiciliataire (SIRET = SIREN + établissement 00019 : voir mentions légales et CGV). */
export const COMPANY_SIREN = '101512531';
export const COMPANY_SIRET = '10151253100019';
