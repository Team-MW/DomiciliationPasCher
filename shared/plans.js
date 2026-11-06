/**
 * Catalogue officiel des formules — SEULE source des noms et des prix (voir AI_INSTRUCTIONS.md).
 *
 * Grille « 2026-11 » (contrat de domiciliation de novembre 2026) :
 *   Essentiel 16 € HT · Confort 24 € HT · Premium 38 € HT par mois, annuel = −20 %.
 * Les identifiants internes (essentiel / scan-plus / physique) ne changent pas : ils sont
 * stockés en base et dans les métadonnées Stripe des clients existants.
 *
 * Les clients souscrits AVANT cette grille gardent leur prix et leur contrat
 * (LEGACY_PLAN_CATALOG, annuel = 10 mensualités) : voir clientPlanPricing().
 */
export const PRICING_GRID = '2026-11';
export const ANNUAL_DISCOUNT = 0.2;

export const PLAN_CATALOG = {
    essentiel: {
        id: 'essentiel', name: 'Essentiel', ht: 16, offre: 'notification',
        scanQuota: 0, forwardsIncluded: 0, parcelsIncluded: false,
    },
    'scan-plus': {
        id: 'scan-plus', name: 'Confort', ht: 24, offre: 'scan',
        scanQuota: 40, forwardsIncluded: 0, parcelsIncluded: false,
    },
    physique: {
        id: 'physique', name: 'Premium', ht: 38, offre: 'reexpedition',
        scanQuota: 100, forwardsIncluded: 2, parcelsIncluded: true,
    },
};

/** Ancienne grille (avant novembre 2026) : prix et noms conservés pour les clients existants. */
export const LEGACY_PLAN_CATALOG = {
    essentiel: { id: 'essentiel', name: 'Essentiel', ht: 20, offre: 'notification' },
    'scan-plus': { id: 'scan-plus', name: 'Scan+', ht: 24, offre: 'scan' },
    physique: { id: 'physique', name: 'Physique+', ht: 38, offre: 'reexpedition' },
};

/** Prestations complémentaires (€ HT) — article 2 et Annexe 1 du contrat. */
export const EXTRA_FEES_HT = {
    scanPerPage: 0.5,
    forward: 3,
    parcel: 3,
    parcelStoragePerDay: 2,
    meetingRoomHour: 25,
};

/** Durée minimale légale (art. R123-168 du Code de commerce) et préavis de résiliation. */
export const MIN_COMMITMENT_MONTHS = 3;
export const NOTICE_MONTHS = 1;

const round2 = (n) => Math.round(n * 100) / 100;

export function resolvePlanId(plan) {
    const p = String(plan || '').toLowerCase();
    if (p.includes('scan') || p.includes('confort')) return 'scan-plus';
    if (p.includes('physique') || p.includes('reexp') || p.includes('premium')) return 'physique';
    return 'essentiel';
}

/** Prix annuel HT de la grille actuelle : 12 mois − 20 %. */
export function annualHt(ht) {
    return round2(ht * 12 * (1 - ANNUAL_DISCOUNT));
}

/** Montant TTC facturé pour la grille actuelle (mensuel, ou annuel remisé de 20 %). */
export function planAmountTtc(ht, interval) {
    const baseHt = interval === 'year' ? annualHt(ht) : ht;
    return round2(baseHt * 1.2);
}

/** Le dossier (extra_info) a-t-il été souscrit avec la grille actuelle ? */
export function isCurrentPricing(extra = {}) {
    return extra?.grille_tarifaire === PRICING_GRID;
}

/**
 * Formule et prix APPLICABLES à un client : grille actuelle s'il a souscrit après son entrée en
 * vigueur (marqueur extra_info.grille_tarifaire), sinon ancienne grille (il garde son prix).
 * @returns {{ id, name, ht, annualHt, ttcMonth, ttcYear, legacy }}
 */
export function clientPlanPricing(plan, extra = {}) {
    const id = resolvePlanId(plan || extra?.offre);
    if (isCurrentPricing(extra)) {
        const p = PLAN_CATALOG[id];
        return { ...p, annualHt: annualHt(p.ht), ttcMonth: planAmountTtc(p.ht, 'month'), ttcYear: planAmountTtc(p.ht, 'year'), legacy: false };
    }
    const p = LEGACY_PLAN_CATALOG[id];
    const legacyAnnualHt = p.ht * 10; // ancienne règle : 2 mois offerts
    return { ...p, annualHt: legacyAnnualHt, ttcMonth: round2(p.ht * 1.2), ttcYear: round2(legacyAnnualHt * 1.2), legacy: true };
}

/**
 * Réexpédition physique : ouverte à toutes les formules de la grille actuelle (payante sauf
 * 2 par mois incluses en Premium). Ancienne grille : réservée à Scan+ et Physique+, comme
 * dans le contrat signé par ces clients.
 */
export function canRequestPhysicalForward(plan, extra = {}) {
    if (isCurrentPricing(extra)) return true;
    const id = resolvePlanId(plan);
    if (id === 'scan-plus' || id === 'physique') return true;
    const offre = String(extra?.offre || '').toLowerCase();
    return offre === 'scan' || offre === 'reexpedition';
}

/**
 * Début de la période de quota en cours (numérisation, réexpéditions incluses).
 * CGV art. 3 : les quotas sont mensuels et remis à zéro à chaque DATE ANNIVERSAIRE de la
 * souscription (pas le 1er du mois). Un jour absent du mois (31) est ramené au dernier jour.
 * @param {string} sinceIso date de souscription (YYYY-MM-DD ou ISO)
 * @returns {Date} minuit (heure locale) du début de la période courante
 */
export function currentQuotaPeriodStart(sinceIso, now = new Date()) {
    const since = new Date(sinceIso);
    const day = Number.isNaN(since.getTime()) ? 1 : since.getDate();
    const anniversary = (year, month) => {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(day, lastDay));
    };
    let start = anniversary(now.getFullYear(), now.getMonth());
    if (start > now) start = anniversary(now.getFullYear(), now.getMonth() - 1);
    if (!Number.isNaN(since.getTime()) && start < since) start = new Date(since.getFullYear(), since.getMonth(), since.getDate());
    return start;
}

/**
 * Quota de numérisation applicable à un client : nombre de plis inclus par période, ou
 * `null` si illimité (ancienne grille Scan+/Physique+), ou 0 si non inclus (Essentiel).
 */
export function scanQuotaFor(plan, extra = {}) {
    const pricing = clientPlanPricing(plan, extra);
    if (pricing.legacy) return pricing.id === 'essentiel' ? 0 : null;
    return PLAN_CATALOG[pricing.id].scanQuota;
}
