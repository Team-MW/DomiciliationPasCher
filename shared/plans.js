/** Catalogue officiel des formules (aligné sur /tarifs et la souscription). */
export const PLAN_CATALOG = {
    essentiel: { id: 'essentiel', name: 'Essentiel', ht: 20, offre: 'notification' },
    'scan-plus': { id: 'scan-plus', name: 'Scan+', ht: 24, offre: 'scan' },
    physique: { id: 'physique', name: 'Physique+', ht: 38, offre: 'reexpedition' },
};

export function resolvePlanId(plan) {
    const p = (plan || '').toLowerCase();
    if (p.includes('scan')) return 'scan-plus';
    if (p.includes('physique') || p.includes('reexp')) return 'physique';
    return 'essentiel';
}

/** Réexpédition physique : Scan+ et Physique+ uniquement (pas le forfait Essentiel / scan de base). */
export function canRequestPhysicalForward(plan, extra = {}) {
    const id = resolvePlanId(plan);
    if (id === 'scan-plus' || id === 'physique') return true;
    const offre = String(extra?.offre || '').toLowerCase();
    return offre === 'scan' || offre === 'reexpedition';
}

export function planAmountTtc(ht, interval) {
    const baseHt = interval === 'year' ? ht * 10 : ht;
    return Math.round(baseHt * 1.2 * 100) / 100;
}
