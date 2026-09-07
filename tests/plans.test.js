import { describe, it, expect } from 'vitest';
import { canRequestPhysicalForward, resolvePlanId } from '../shared/plans.js';

describe('canRequestPhysicalForward', () => {
    it('refuse le forfait Essentiel (scan de base)', () => {
        expect(canRequestPhysicalForward('Essentiel')).toBe(false);
        expect(canRequestPhysicalForward('essentiel')).toBe(false);
        expect(canRequestPhysicalForward('', { offre: 'notification' })).toBe(false);
        expect(resolvePlanId('Essentiel')).toBe('essentiel');
    });

    it('autorise Scan+ et Physique+', () => {
        expect(canRequestPhysicalForward('Scan+')).toBe(true);
        expect(canRequestPhysicalForward('Plan Scan+')).toBe(true);
        expect(canRequestPhysicalForward('Physique+')).toBe(true);
        expect(canRequestPhysicalForward('Essentiel', { offre: 'scan' })).toBe(true);
    });
});
