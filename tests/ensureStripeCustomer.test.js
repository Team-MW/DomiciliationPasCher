import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/ensure-stripe-customer.js';
import Stripe from 'stripe';
import { __setAuthVerifierForTests } from '../api/_auth.js';

vi.mock('stripe', () => {
    const list = vi.fn();
    const update = vi.fn();
    const create = vi.fn();
    return {
        default: class {
            constructor() {
                return {
                    customers: { list, update, create }
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

describe('Ensure Stripe Customer API Handler (api/ensure-stripe-customer.js)', () => {
    let mockReq;
    let mockRes;
    let stripeMocks;

    beforeEach(() => {
        vi.clearAllMocks();
        
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
        // Utilisateur connecté (jeton Clerk vérifié) dont l'email est celui demandé.
        __setAuthVerifierForTests(async (token) => (token === 'valid' ? { userId: 'user_1', email: 'test@example.com' } : null));

        mockReq = {
            method: 'POST',
            headers: { authorization: 'Bearer valid' },
            body: { 
                email: 'test@example.com',
                name: 'John Doe',
                company: 'Test Corp'
            }
        };

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        const stripe = new Stripe();
        stripeMocks = {
            list: stripe.customers.list,
            update: stripe.customers.update,
            create: stripe.customers.create
        };
        
        stripeMocks.list.mockResolvedValue({ data: [] });
        stripeMocks.update.mockResolvedValue({});
        stripeMocks.create.mockResolvedValue({ id: 'cus_new_123' });
    });

    it('should return 405 Method Not Allowed if request method is not POST', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('should return 400 if email is missing', async () => {
        mockReq.body.email = undefined;
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email is required' });
    });

    it('should throw an error if STRIPE_SECRET_KEY is missing or invalid', async () => {
        process.env.STRIPE_SECRET_KEY = 'sk_live_remplace_moi';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(stripeMocks.list).not.toHaveBeenCalled();
    });

    it('should create a new customer if none exists for the email', async () => {
        stripeMocks.list.mockResolvedValue({ data: [] });

        await handler(mockReq, mockRes);
        
        expect(stripeMocks.list).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
        expect(stripeMocks.create).toHaveBeenCalledWith({
            email: 'test@example.com',
            name: 'John Doe',
            metadata: { source: 'auto_ensure_customer' }
        }, { idempotencyKey: 'customer-create-test@example.com' });
        expect(stripeMocks.update).not.toHaveBeenCalled();
        
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ customerId: 'cus_new_123' });
    });

    it('should return existing customer id if one exists for the email', async () => {
        stripeMocks.list.mockResolvedValue({ 
            data: [{ id: 'cus_existing_456', name: 'John Doe' }] 
        });

        await handler(mockReq, mockRes);
        
        expect(stripeMocks.list).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
        expect(stripeMocks.create).not.toHaveBeenCalled();
        
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ customerId: 'cus_existing_456' });
    });

    it('should update existing customer name if it was not set', async () => {
        stripeMocks.list.mockResolvedValue({ 
            data: [{ id: 'cus_existing_456', name: null }] 
        });

        await handler(mockReq, mockRes);
        
        expect(stripeMocks.update).toHaveBeenCalledWith('cus_existing_456', { name: 'John Doe' });
        
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ customerId: 'cus_existing_456' });
    });

    it('should trim and lowercase email when querying and creating', async () => {
        mockReq.body.email = ' TEST@EXAMPLE.com ';
        
        await handler(mockReq, mockRes);
        
        expect(stripeMocks.list).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
        expect(stripeMocks.create).toHaveBeenCalledWith(expect.objectContaining({
            email: 'test@example.com'
        }), expect.anything());
    });

    it('should return 500 on Stripe API error', async () => {
        stripeMocks.list.mockRejectedValue(new Error('Stripe API Error'));
        await handler(mockReq, mockRes);
        
        expect(mockRes.status).toHaveBeenCalledWith(500);
        // Le détail technique reste dans les logs, jamais renvoyé au navigateur.
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Erreur serveur, réessayez plus tard.' });
    });

    it('refuse un appel sans jeton de session (401)', async () => {
        mockReq.headers = {};
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(stripeMocks.list).not.toHaveBeenCalled();
    });

    it('refuse de créer ou retrouver le client Stripe d’un autre email (403)', async () => {
        mockReq.body.email = 'victime@example.com';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(stripeMocks.list).not.toHaveBeenCalled();
        expect(stripeMocks.create).not.toHaveBeenCalled();
    });
});
