import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    it('renvoie metadata et customer si payé', async () => {
        retrieve.mockResolvedValue({
            id: 'cs_paid',
            payment_status: 'paid',
            customer: 'cus_ok',
            customer_details: { email: 'a@test.fr' },
            metadata: { demande_id: 'req_1', type: 'meeting_booking' },
        });
        await handler({ method: 'GET', query: { session_id: 'cs_paid' } }, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            status: 'paid',
            customer_email: 'a@test.fr',
            customer_id: 'cus_ok',
            session_id: 'cs_paid',
            metadata: { demande_id: 'req_1', type: 'meeting_booking' },
        });
    });
});
