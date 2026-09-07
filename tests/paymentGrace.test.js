import { describe, it, expect } from 'vitest';
import {
    PAYMENT_GRACE_MONTHS,
    earliestIsoDate,
    addCalendarMonths,
    paymentGraceDeadline,
    isPaymentGraceExpired,
    formatDateFr,
} from '../shared/paymentGrace.js';

describe('délai de grâce impayé (2 mois)', () => {
    it('ajoute 2 mois calendaires', () => {
        expect(PAYMENT_GRACE_MONTHS).toBe(2);
        expect(addCalendarMonths('2026-01-07', 2)).toBe('2026-03-07');
        expect(paymentGraceDeadline('2026-07-07')).toBe('2026-09-07');
    });

    it('expire à partir du jour d’échéance', () => {
        expect(isPaymentGraceExpired('2026-01-07', new Date('2026-03-06T12:00:00Z'))).toBe(false);
        expect(isPaymentGraceExpired('2026-01-07', new Date('2026-03-07T00:00:00Z'))).toBe(true);
        expect(isPaymentGraceExpired('2026-01-07', new Date('2026-04-01T00:00:00Z'))).toBe(true);
    });

    it('ne résilie pas sans date d’incident', () => {
        expect(isPaymentGraceExpired(null)).toBe(false);
        expect(paymentGraceDeadline(undefined)).toBe(null);
    });

    it('garde la plus ancienne date d’impayé', () => {
        expect(earliestIsoDate('2026-03-01', '2026-01-15', '2026-02-01')).toBe('2026-01-15');
        expect(earliestIsoDate(null, 'bad', '2026-09-01')).toBe('2026-09-01');
    });

    it('formate une date FR', () => {
        expect(formatDateFr('2026-09-07')).toBe('07/09/2026');
    });
});
