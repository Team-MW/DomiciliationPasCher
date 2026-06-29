import { describe, test, expect, vi, beforeEach } from 'vitest';
import handler from '../api/checkout.js';
import Stripe from 'stripe';

// Mock stripe module
vi.mock('stripe', () => {
    const list = vi.fn();
    const create = vi.fn();
    const update = vi.fn();
    const sessionsCreate = vi.fn();
    return {
        default: class {
            constructor() {
                return {
                    customers: {
                        list,
                        create,
                        update,
                    },
                    checkout: {
                        sessions: {
                            create: sessionsCreate,
                        }
                    }
                };
            }
        }
    };
});

// Mock fs to simulate env variables detection
vi.mock('fs', () => {
    return {
        default: {
            existsSync: vi.fn().mockReturnValue(false),
            readFileSync: vi.fn(),
        }
    };
});

describe('Checkout API Handler (api/checkout.js)', () => {
    let mockReq;
    let mockRes;
    let originalEnv;
    let stripeMocks;

    beforeEach(() => {
        vi.clearAllMocks();
        originalEnv = process.env;
        process.env = {
            ...originalEnv,
            STRIPE_SECRET_KEY: 'sk_test_mock_secret_key'
        };

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        mockReq = {
            method: 'POST',
            headers: {
                origin: 'http://localhost'
            },
            body: {}
        };

        // Retrieve mock references from a Stripe instance
        const stripe = new Stripe();
        stripeMocks = {
            list: stripe.customers.list,
            create: stripe.customers.create,
            update: stripe.customers.update,
            sessionsCreate: stripe.checkout.sessions.create,
        };
    });

    test('should return 405 Method Not Allowed if request method is not POST', async () => {
        mockReq.method = 'GET';

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    test('should reject request if STRIPE_SECRET_KEY is missing', async () => {
        delete process.env.STRIPE_SECRET_KEY;
        mockReq.body = {};

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('STRIPE_SECRET_KEY') })
        );
    });

    test('should handle subscription checkout successfully for existing customer', async () => {
        mockReq.body = {
            planId: 'scan',
            amount: 24,
            productName: 'Forfait Scan+',
            interval: 'month',
            email: 'test@example.com',
            clientName: 'Alice Test',
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel',
            metadata: { customField: 'value1' }
        };

        // Customer list returns existing customer
        stripeMocks.list.mockResolvedValue({
            data: [{ id: 'cus_existing123', name: 'Alice Test' }]
        });

        // Checkout session creation mock return
        stripeMocks.sessionsCreate.mockResolvedValue({
            id: 'cs_test_session123',
            url: 'https://stripe.com/checkout/mock-url'
        });

        await handler(mockReq, mockRes);

        // Check customer search called with normalized email
        expect(stripeMocks.list).toHaveBeenCalledWith({
            email: 'test@example.com',
            limit: 1
        });
        
        // Existing customer was found, so no update or create should be called
        expect(stripeMocks.create).not.toHaveBeenCalled();
        expect(stripeMocks.update).not.toHaveBeenCalled();

        // Check checkout session creation options
        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: { name: 'Forfait Scan+' },
                        unit_amount: 2400, // 24 * 100
                        recurring: { interval: 'month' }
                    },
                    quantity: 1,
                }
            ],
            mode: 'subscription',
            success_url: 'http://localhost/success',
            cancel_url: 'http://localhost/cancel',
            customer: 'cus_existing123',
            metadata: {
                email: 'test@example.com',
                clientName: 'Alice Test',
                customField: 'value1'
            },
            subscription_data: {
                metadata: {
                    email: 'test@example.com',
                    clientName: 'Alice Test',
                    customField: 'value1'
                }
            }
        });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            id: 'cs_test_session123',
            url: 'https://stripe.com/checkout/mock-url'
        });
    });

    test('should create customer if not exists and update name if needed', async () => {
        mockReq.body = {
            planId: 'physique',
            amount: 38,
            productName: 'Forfait Physique+',
            interval: 'year',
            email: 'new-client@example.com',
            clientName: 'Bob Client',
        };

        // No existing customer found
        stripeMocks.list.mockResolvedValue({ data: [] });

        // Customer creation returns new customer
        stripeMocks.create.mockResolvedValue({ id: 'cus_new999' });

        stripeMocks.sessionsCreate.mockResolvedValue({
            id: 'cs_test_session999',
            url: 'https://stripe.com/checkout/mock-url-2'
        });

        await handler(mockReq, mockRes);

        expect(stripeMocks.create).toHaveBeenCalledWith({
            email: 'new-client@example.com',
            name: 'Bob Client',
            metadata: {}
        });

        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                customer: 'cus_new999',
                mode: 'subscription',
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: { name: 'Forfait Physique+' },
                            unit_amount: 3800,
                            recurring: { interval: 'year' }
                        },
                        quantity: 1,
                    }
                ]
            })
        );
    });

    test('should handle one_time payments (payment mode) with correct options', async () => {
        mockReq.body = {
            planId: 'depot_kbis',
            amount: 15.5,
            productName: 'Depot Kbis',
            interval: 'one_time',
            email: 'onetime@example.com',
            clientName: 'Charlie',
        };

        stripeMocks.list.mockResolvedValue({ data: [] });
        stripeMocks.create.mockResolvedValue({ id: 'cus_charlie' });
        stripeMocks.sessionsCreate.mockResolvedValue({
            id: 'cs_session_onetime',
            url: 'https://stripe.com/checkout/onetime'
        });

        await handler(mockReq, mockRes);

        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: { name: 'Depot Kbis' },
                        unit_amount: 1550, // 15.5 * 100
                    },
                    quantity: 1,
                }
            ],
            mode: 'payment',
            success_url: 'http://localhost?success=true&session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost/souscription',
            customer: 'cus_charlie',
            metadata: {
                email: 'onetime@example.com',
                clientName: 'Charlie',
            },
            payment_intent_data: {
                metadata: {
                    email: 'onetime@example.com',
                    clientName: 'Charlie',
                }
            }
        });

        expect(mockRes.status).toHaveBeenCalledWith(200);
    });
});
