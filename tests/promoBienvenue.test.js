import { describe, it, expect, vi } from 'vitest';
import { describeCurrentPlan } from '../src/utils/contractBuilderCurrent.js';
import { buildLeadReminderEmail } from '../api/_email-templates.js';
import { promoSummary, isPromoEligible, normalizePromoCode } from '../api/checkout.js';

const { fulfillCheckoutSession } = await import('../api/_checkout-fulfillment.js');

describe('BIENVENUE : règles et libellés', () => {
    it('éligible uniquement Essentiel mensuel', () => {
        expect(isPromoEligible('essentiel', 'month')).toBe(true);
        expect(isPromoEligible('essentiel', 'year')).toBe(false);
        expect(isPromoEligible('scan-plus', 'month')).toBe(false);
        expect(isPromoEligible('physique', 'month')).toBe(false);
    });
    it('code normalisé, saisie farfelue rejetée', () => {
        expect(normalizePromoCode(' bienvenue ')).toBe('BIENVENUE');
        expect(normalizePromoCode('<script>')).toBe('');
        expect(normalizePromoCode('')).toBe('');
    });
    it('récapitulatif « 1er mois : 0 € » pour un coupon 100 % une fois', () => {
        expect(promoSummary({ coupon: { percent_off: 100, duration: 'once' } }).label).toBe('1er mois : 0 €');
        expect(promoSummary({ promotion: { coupon: { percent_off: 100, duration: 'once' } } }).label).toBe('1er mois : 0 €');
        expect(promoSummary({ coupon: { percent_off: 10, duration: 'forever' } }).label).toBe('-10 %');
    });
});

describe('BIENVENUE : contrat (Annexe 1) et email de relance', () => {
    const current = { grille_tarifaire: '2026-11' };
    it('Annexe 1 : code promo appliqué', () => {
        expect(describeCurrentPlan({ plan: 'essentiel' }, { ...current, code_promo: 'BIENVENUE' }).promo).toBe('Code BIENVENUE (1er mois offert)');
        expect(describeCurrentPlan({ plan: 'essentiel' }, current).promo).toBe('Aucune');
        expect(describeCurrentPlan({ plan: 'physique' }, { ...current, frequence: 'annuel' }).promo).toBe('Remise annuelle de 20 %');
    });
    it('relance inscription : pas de mois offert annoncé, -20 % annuel rappelé', () => {
        const base = { firstName: 'Ada', step: 2, resumeUrl: 'https://s/r', unsubscribeUrl: 'https://s/u', reminderIndex: 1 };
        expect(buildLeadReminderEmail({ ...base, planId: 'essentiel' }).text).not.toMatch(/BIENVENUE|offert/);
        expect(buildLeadReminderEmail({ ...base, planId: 'essentiel' }).text).toMatch(/20 % de remise en paiement annuel/);
    });
});

describe('BIENVENUE : le code utilisé est noté dans le dossier après paiement', () => {
    const makeConn = () => {
        const state = { status: 'en_attente_paiement', extra: JSON.stringify({ frequence: 'mensuel' }) };
        const conn = { execute: vi.fn(async (sql, params) => {
            if (/^SELECT \* FROM demandes WHERE id/i.test(sql)) return { rows: [{ id: 'd1', email: 'a@b.fr', clientName: 'Ada', plan: 'Essentiel', status: state.status, extra_info: state.extra }] };
            if (/^SELECT status, extra_info FROM demandes/i.test(sql)) return { rows: [{ status: state.status, extra_info: state.extra }] };
            if (/^SELECT extra_info FROM demandes WHERE id/i.test(sql)) return { rows: [{ extra_info: state.extra }] };
            if (/^UPDATE demandes SET status = 'en_attente'/i.test(sql)) {
                if (state.status !== 'en_attente_paiement') return { rows: [], rowsAffected: 0 };
                state.status = 'en_attente'; state.extra = params[0];
                return { rows: [], rowsAffected: 1 };
            }
            if (/^UPDATE demandes SET extra_info/i.test(sql)) { state.extra = params[0]; return { rows: [], rowsAffected: 1 }; }
            return { rows: [], rowsAffected: 1 };
        }) };
        return { conn, current: () => JSON.parse(state.extra) };
    };
    const session = (meta = {}, extra = {}) => ({ id: 'cs_1', status: 'complete', payment_status: 'no_payment_required', customer: 'cus_1', metadata: { demande_id: 'd1', planId: 'essentiel', interval: 'month', email: 'a@b.fr', ...meta }, ...extra });

    it('code saisi dans le tunnel → code_promo = BIENVENUE', async () => {
        const { conn, current } = makeConn();
        await fulfillCheckoutSession(session({ promo_code: 'BIENVENUE' }, { total_details: { amount_discount: 1920 } }), { conn, baseUrl: 'https://s', sendEmail: async () => {} });
        expect(current().code_promo).toBe('BIENVENUE');
    });
    it('sans remise → aucun code noté', async () => {
        const { conn, current } = makeConn();
        await fulfillCheckoutSession({ ...session(), payment_status: 'paid' }, { conn, baseUrl: 'https://s', sendEmail: async () => {} });
        expect(current().code_promo).toBeUndefined();
    });
});
