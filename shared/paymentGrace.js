/** Délai avant résiliation automatique de la domiciliation en cas d'impayé. */
export const PAYMENT_GRACE_MONTHS = 2;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

export function earliestIsoDate(...dates) {
    const valid = dates
        .map((d) => (typeof d === 'string' && ISO_DAY.test(d) ? d.slice(0, 10) : null))
        .filter(Boolean);
    if (valid.length === 0) return null;
    return valid.sort()[0];
}

/**
 * Ajoute des mois calendaires à une date AAAA-MM-JJ.
 * - par défaut (`clamp: false`) : comportement historique, un jour inexistant déborde sur le
 *   mois suivant (31/12 + 2 mois = 03/03). C'est celui du délai de grâce impayé, qu'il ne faut
 *   pas raccourcir sans décision explicite (AI_INSTRUCTIONS.md).
 * - `clamp: true` : ramené au dernier jour du mois cible (31/12 + 2 mois = 28/02), utilisé pour
 *   les rappels d'échéance afin de ne sauter aucun jour.
 */
export function addCalendarMonths(isoDate, months, { clamp = false } = {}) {
    if (!isoDate || !ISO_DAY.test(isoDate)) return null;
    const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
    if (!clamp) {
        const date = new Date(Date.UTC(y, m - 1, d));
        date.setUTCMonth(date.getUTCMonth() + months);
        return date.toISOString().slice(0, 10);
    }
    const target = new Date(Date.UTC(y, m - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return target.toISOString().slice(0, 10);
}

export function paymentGraceDeadline(failedAt) {
    return addCalendarMonths(failedAt, PAYMENT_GRACE_MONTHS);
}

/** Vrai à partir du jour d'échéance (2 mois révolus). */
export function isPaymentGraceExpired(failedAt, now = new Date()) {
    const deadline = paymentGraceDeadline(failedAt);
    if (!deadline) return false;
    const today = now.toISOString().slice(0, 10);
    return today >= deadline;
}

export function formatDateFr(isoDate) {
    if (!isoDate || !ISO_DAY.test(isoDate)) return isoDate || '';
    const [y, m, d] = isoDate.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}
