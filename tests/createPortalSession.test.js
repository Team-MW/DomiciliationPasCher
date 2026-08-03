import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/create-portal-session.js';
import Stripe from 'stripe';

vi.mock('stripe', () => {
    const sessionsCreate = vi.fn();
    return {
        default: class {
            constructor() {
                return {
                    billingPortal: {
                        sessions: {
                            create: sessionsCreate
                        }
                    }
                };
            }
        }
    };
});

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn()
    }
}));

describe('Create Portal Session API Handler (api/create-portal-session.js)', () => {
    let mockReq;
    let mockRes;
    let stripeMocks;

    beforeEach(() => {
        vi.clearAllMocks();
        
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';

        mockReq = {
            method: 'POST',
            body: { customerId: 'cus_test_123' },
            headers: {
                origin: 'http://localhost:5173'
            }
        };

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        const stripe = new Stripe();
        stripeMocks = {
            sessionsCreate: stripe.billingPortal.sessions.create
        };
        stripeMocks.sessionsCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/session/test' });
    });

    it('should return 405 Method Not Allowed if request method is not POST', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('should return 400 if customerId is missing', async () => {
        mockReq.body = {};
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Customer ID is required' });
    });

    it('should return 500 if STRIPE_SECRET_KEY is missing', async () => {
        delete process.env.STRIPE_SECRET_KEY;
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing STRIPE_SECRET_KEY' }));
    });

    it('should create a portal session and return the url', async () => {
        await handler(mockReq, mockRes);
        
        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith({
            customer: 'cus_test_123',
            return_url: 'http://localhost:5173/espace-client'
        });
        
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ url: 'https://billing.stripe.com/p/session/test' });
    });

    it('should use referer as return_url if available', async () => {
        mockReq.headers.referer = 'https://mydomain.com/factures';
        await handler(mockReq, mockRes);
        
        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith({
            customer: 'cus_test_123',
            return_url: 'https://mydomain.com/factures'
        });
    });

    it('should return 500 on Stripe API error', async () => {
        stripeMocks.sessionsCreate.mockRejectedValue(new Error('Stripe error'));
        await handler(mockReq, mockRes);
        
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stripe error' });
    });
});
