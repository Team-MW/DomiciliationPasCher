// Google Ads « conversions améliorées » : montant réel + email + téléphone (E.164) sur la page de confirmation.
import { describe, it, expect, vi } from 'vitest';
import { toE164French } from '../shared/phone.js';
import { buildPurchaseEvent, pushPurchaseEvent } from '../src/utils/purchaseEvent.js';

const db = vi.hoisted(() => ({ execute: vi.fn(async () => ({ rows: [] })) }));
vi.mock('../api/_db.js', () => ({ getDbConn: () => db }));
const { buildOrder } = await import('../api/verify-session.js');

describe('toE164French', () => {
    it.each([
        ['06 12 34 56 78', '+33612345678'],
        ['06.12.34.56.78', '+33612345678'],
        ['0612345678', '+33612345678'],
        ['+33 6 12 34 56 78', '+33612345678'],
        ['+33612345678', '+33612345678'],
        ['0033612345678', '+33612345678'],
        ['33612345678', '+33612345678'],
        ['+41 79 123 45 67', '+41791234567'],
    ])('« %s » → %s', (input, expected) => {
        expect(toE164French(input)).toBe(expected);
    });
    it('rejette les numéros inexploitables', () => {
        expect(toE164French('')).toBeNull();
        expect(toE164French('123')).toBeNull();
        expect(toE164French('0000000000')).toBeNull();
        expect(toE164French(null)).toBeNull();
    });
});

describe('buildOrder (verify-session)', () => {
    it('montant réel, identifiant, email et téléphone de la demande au format +33', async () => {
        db.execute.mockImplementation(async (sql) => (/FROM demandes WHERE id/.test(sql)
            ? { rows: [{ extra_info: JSON.stringify({ telephone: '06 12 34 56 78' }) }] }
            : { rows: [] }));
        const order = await buildOrder({ id: 'cs_1', amount_total: 27648, currency: 'eur', customer_details: { email: 'Client@Test.fr' }, metadata: { demande_id: 'req_1' } });
        expect(order).toEqual({ transaction_id: 'cs_1', value: 276.48, currency: 'EUR', email: 'client@test.fr', phone_number: '+33612345678' });
    });
    it('dossier créé par l’admin : téléphone de la fiche ; sans téléphone, la clé est absente', async () => {
        db.execute.mockImplementation(async (sql) => (/FROM clients WHERE id/.test(sql) ? { rows: [{ phone: '0033 7 11 22 33 44', extra_info: '{}' }] } : { rows: [] }));
        const order = await buildOrder({ id: 'cs_2', amount_total: 1920, currency: 'eur', metadata: { admin_client_id: 'c9', email: 'a@b.fr' } });
        expect(order.phone_number).toBe('+33711223344');
        expect(order.value).toBe(19.2);
        db.execute.mockResolvedValue({ rows: [] });
        const noPhone = await buildOrder({ id: 'cs_3', amount_total: 1920, currency: 'eur', metadata: {} });
        expect(noPhone).toEqual({ transaction_id: 'cs_3', value: 19.2, currency: 'EUR' });
    });
});

describe('pushPurchaseEvent (dataLayer)', () => {
    it('pousse « purchase » avec montant, devise, identifiant et user_data, une seule fois par session', () => {
        const target = {};
        const order = { transaction_id: 'cs_1', value: 276.48, currency: 'EUR', email: 'client@test.fr', phone_number: '+33612345678' };
        expect(pushPurchaseEvent('cs_1', order, target)).toBe(true);
        expect(pushPurchaseEvent('cs_1', order, target)).toBe(false); // rechargement / double effet
        expect(target.dataLayer).toEqual([{
            event: 'purchase', value: 276.48, currency: 'EUR', transaction_id: 'cs_1',
            user_data: { email: 'client@test.fr', phone_number: '+33612345678' },
        }]);
    });
    it('sans commande : rien n’est poussé ; sans données client : pas de user_data', () => {
        const target = {};
        expect(pushPurchaseEvent('cs_x', null, target)).toBe(false);
        expect(target.dataLayer).toBeUndefined();
        expect(buildPurchaseEvent('cs_y', { value: 16, currency: 'eur' })).toEqual({ event: 'purchase', value: 16, currency: 'EUR', transaction_id: 'cs_y' });
    });
});
