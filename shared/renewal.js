import { parisDateIso } from './parisDate.js';
import { addCalendarMonths } from './paymentGrace.js';

/**
 * Prochaine échéance d'un abonnement : première date anniversaire (mensuelle ou annuelle) STRICTEMENT après aujourd'hui.
 * Le jour est celui de la souscription, ramené au dernier jour du mois s'il n'existe pas (31 → 30, 29 février…).
 * Avant : la base stockait `renewal = since`, et l'espace client affichait la date de souscription comme « prochaine échéance ».
 * @param {string} sinceIso  date de souscription (YYYY-MM-DD ou ISO)
 * @param {string} frequence 'mensuel' | 'annuel'
 * @param {string} [todayIso] YYYY-MM-DD (défaut : aujourd'hui)
 * @returns {string|null} YYYY-MM-DD
 */
export function nextRenewalIso(sinceIso, frequence, todayIso = parisDateIso()) {
    const since = String(sinceIso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return null;
    const step = frequence === 'annuel' ? 12 : 1;
    for (let n = 1; n <= 1200; n++) {
        const candidate = addCalendarMonths(since, n * step, { clamp: true });
        if (!candidate) return null;
        if (candidate > todayIso) return candidate;
    }
    return null;
}
