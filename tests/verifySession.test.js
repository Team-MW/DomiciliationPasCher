import { describe, it, expect, vi, beforeEach } from 'vitest';
const { deliverEmail, execute } = vi.hoisted(() => ({ deliverEmail: vi.fn(), execute: vi.fn() }));
vi.mock('../api/_email-core.js', () => ({ deliverEmail }));
vi.mock('../api/_db.js', () => ({ getDbConn: () => ({ execute }) }));

import handler from '../api/verify-session.js';
import Stripe from 'stripe';

vi.mock('stripe', () => {
    const retrieve = vi.fn();
    return {
        default: class {
            constructor() {
                return { checkout: { sessions: { retrieve } } };
            }
        },
    };
});

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
    },
}));

describe('GET /api/verify-session', () => {
    let mockRes;
    let retrieve;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        retrieve = new Stripe().checkout.sessions.retrieve;
    });

    it('refuse une méthode autre que GET', async () => {
        await handler({ method: 'POST', query: {} }, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('refuse sans session_id', async () => {
        await handler({ method: 'GET', query: {} }, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Session ID manquant' });
    });

    it('ne valide que si Stripe dit paid', async () => {
        retrieve.mockResolvedValue({
            id: 'cs_1',
            payment_status: 'unpaid',
            customer: 'cus_1',
            metadata: { type: 'meeting_booking' },
        });
        await handler({ method: 'GET', query: { session_id: 'cs_1' } }, mockRes);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            status: 'unpaid',
        }));
    });

    it('payé : renvoie le strict nécessaire (pas d’email ni de métadonnées libres)', async () => {
        retrieve.mockResolvedValue({
            id: 'cs_paid',
            status: 'complete',
            payment_status: 'paid',
            customer: 'cus_ok',
            customer_details: { email: 'a@test.fr' },
            metadata: { type: 'meeting_booking', client_id: 'cli_1', email: 'a@test.fr' },
        });
        await handler({ method: 'GET', query: { session_id: 'cs_paid' } }, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            status: 'paid',
            customer_id: 'cus_ok',
            session_id: 'cs_paid',
            confirmed: false, // les réservations sont confirmées par /api/data (client authentifié)
            metadata: { type: 'meeting_booking', demande_id: null },
        });
    });

    it('code promo à 100 % (no_payment_required) : considéré comme payé', async () => {
        execute.mockResolvedValue({ rows: [] });
        retrieve.mockResolvedValue({
            id: 'cs_free', status: 'complete', payment_status: 'no_payment_required',
            customer: 'cus_free', metadata: {},
        });
        await handler({ method: 'GET', query: { session_id: 'cs_free' } }, mockRes);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('confirme la demande côté serveur et n’envoie la bienvenue qu’une fois', async () => {
        let status = 'en_attente_paiement';
        execute.mockImplementation(async (sql) => {
            if (/^SELECT \* FROM demandes WHERE id/.test(sql) || /^SELECT status, extra_info FROM demandes/.test(sql)) {
                return { rows: [{ id: 'req_1', email: 'ada@test.fr', clientName: 'Ada - 📞 0600', status, extra_info: '{}' }] };
            }
            if (/^UPDATE demandes SET status = 'en_attente'/.test(sql)) status = 'en_attente';
            return { rows: [] };
        });
        retrieve.mockResolvedValue({
            id: 'cs_sub', status: 'complete', payment_status: 'paid', customer: 'cus_ada',
            metadata: { demande_id: 'req_1', email: 'ada@test.fr', clientName: 'Ada Lovelace' },
        });

        await handler({ method: 'GET', query: { session_id: 'cs_sub' }, headers: {} }, mockRes);
        await handler({ method: 'GET', query: { session_id: 'cs_sub' }, headers: {} }, mockRes);

        expect(status).toBe('en_attente');
        expect(deliverEmail).toHaveBeenCalledTimes(1);
        expect(deliverEmail).toHaveBeenCalledWith({ email: 'ada@test.fr', nom: 'Ada Lovelace' }, expect.anything());
        expect(mockRes.json).toHaveBeenLastCalledWith(expect.objectContaining({ success: true, confirmed: true }));
    });

    it('refuse un session_id mal formé', async () => {
        await handler({ method: 'GET', query: { session_id: 'abc; DROP' } }, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });
});
