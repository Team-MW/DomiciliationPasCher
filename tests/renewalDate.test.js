// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nextRenewalIso } from '../shared/renewal.js';

describe('nextRenewalIso : prochaine échéance', () => {
    it('mensuel : première date anniversaire strictement après aujourd’hui', () => {
        expect(nextRenewalIso('2026-11-06', 'mensuel', '2026-11-10')).toBe('2026-12-06');
        expect(nextRenewalIso('2026-11-06', 'mensuel', '2026-11-06')).toBe('2026-12-06'); // le jour même : prélèvement déjà passé
        expect(nextRenewalIso('2026-11-06', 'mensuel', '2026-12-05')).toBe('2026-12-06');
        expect(nextRenewalIso('2026-01-06', 'mensuel', '2026-11-10')).toBe('2026-12-06'); // ancien client : on saute les mois passés
    });
    it('annuel : un an après la souscription, puis chaque année', () => {
        expect(nextRenewalIso('2026-11-06', 'annuel', '2026-11-10')).toBe('2027-11-06');
        expect(nextRenewalIso('2024-03-15', 'annuel', '2026-11-10')).toBe('2027-03-15');
    });
    it('jour absent du mois : ramené au dernier jour (31 → 30, 29 février)', () => {
        expect(nextRenewalIso('2026-01-31', 'mensuel', '2026-02-01')).toBe('2026-02-28');
        expect(nextRenewalIso('2026-01-31', 'mensuel', '2026-03-01')).toBe('2026-03-31');
        expect(nextRenewalIso('2024-02-29', 'annuel', '2024-03-01')).toBe('2025-02-28');
    });
    it('fréquence inconnue = mensuel ; date illisible = null ; accepte un ISO complet', () => {
        expect(nextRenewalIso('2026-11-06', undefined, '2026-11-10')).toBe('2026-12-06');
        expect(nextRenewalIso('', 'mensuel')).toBeNull();
        expect(nextRenewalIso('Non spécifié', 'mensuel')).toBeNull();
        expect(nextRenewalIso('2026-11-06T09:30:00.000Z', 'mensuel', '2026-11-10')).toBe('2026-12-06');
    });
});
