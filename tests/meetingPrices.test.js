import { describe, it, expect } from 'vitest';
import {
    MEETING_TYPES,
    MEETING_DURATIONS,
    meetingPriceHt,
    formatMeetingPrice,
    formatBookingDate,
    localIsoDate,
} from '../src/utils/meetingPrices.js';

describe('tarifs salles & bureaux', () => {
    it('matche la grille /tarifs (salle et bureau 25/75/140)', () => {
        expect(meetingPriceHt(MEETING_TYPES.room, MEETING_DURATIONS.hour)).toBe(25);
        expect(meetingPriceHt(MEETING_TYPES.room, MEETING_DURATIONS.morning)).toBe(75);
        expect(meetingPriceHt(MEETING_TYPES.room, MEETING_DURATIONS.afternoon)).toBe(75);
        expect(meetingPriceHt(MEETING_TYPES.room, MEETING_DURATIONS.fullday)).toBe(140);
        expect(meetingPriceHt(MEETING_TYPES.office, MEETING_DURATIONS.hour)).toBe(25);
        expect(meetingPriceHt(MEETING_TYPES.office, MEETING_DURATIONS.morning)).toBe(75);
        expect(meetingPriceHt(MEETING_TYPES.office, MEETING_DURATIONS.fullday)).toBe(140);
        expect(meetingPriceHt(MEETING_TYPES.cowork, MEETING_DURATIONS.morning)).toBe(15);
        expect(meetingPriceHt(MEETING_TYPES.cowork, MEETING_DURATIONS.fullday)).toBe(30);
    });

    it('formate le prix HT comme sur le bouton de paiement', () => {
        expect(formatMeetingPrice(25)).toBe('25,00');
        expect(formatMeetingPrice(40)).toBe('40,00');
    });

    it('affiche une date YYYY-MM-DD sans décalage UTC', () => {
        expect(formatBookingDate('2026-09-07')).toBe('07/09/2026');
        expect(formatBookingDate('')).toBe('—');
    });

    it('localIsoDate is YYYY-MM-DD', () => {
        expect(localIsoDate(new Date(2026, 8, 7))).toBe('2026-09-07');
    });
});
