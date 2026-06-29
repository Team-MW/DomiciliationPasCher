import { describe, test, expect, vi, beforeEach } from 'vitest';
import handler from '../api/list-payments.js';
import Stripe from 'stripe';

// Mock stripe module
vi.mock('stripe', () => {
    const listCustomers = vi.fn();
    const listPaymentIntents = vi.fn();
    return {
        default: class {
            constructor() {
                return {
                    customers: {
                        list: listCustomers,
                    },
                    paymentIntents: {
                        list: listPaymentIntents,
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

describe('List Payments API Handler (api/list-payments.js)', () => {
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
            method: 'GET',
            query: {
                email: 'test@example.com'
            }
        };

        const stripe = new Stripe();
        stripeMocks = {
            listCustomers: stripe.customers.list,
            listPaymentIntents: stripe.paymentIntents.list,
        };
    });

    test('should return 405 Method Not Allowed if request method is not GET', async () => {
        mockReq.method = 'POST';

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    test('should return 400 if both email and customerId are missing', async () => {
        mockReq.query = {};

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email or CustomerId is required' });
    });

    test('should return empty payments list if no customer matches the email', async () => {
        stripeMocks.listCustomers.mockResolvedValue({ data: [] });

        await handler(mockReq, mockRes);

        expect(stripeMocks.listCustomers).toHaveBeenCalledWith({
            email: 'test@example.com',
            limit: 100
        });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ payments: [] });
    });

    test('should fetch and process payment intents correctly for matching customer', async () => {
        stripeMocks.listCustomers.mockResolvedValue({
            data: [{ id: 'cus_test_123' }]
        });

        stripeMocks.listPaymentIntents.mockResolvedValue({
            data: [
                {
                    id: 'pi_1',
                    amount: 2400,
                    currency: 'eur',
                    status: 'succeeded',
                    created: 1770000000,
                    payment_method_types: ['card'],
                    description: 'Invoice #10'
                },
                {
                    id: 'pi_2',
                    amount: 1550,
                    currency: 'eur',
                    status: 'failed',
                    created: 1770010000,
                    payment_method_types: ['card'],
                    description: null
                }
            ]
        });

        await handler(mockReq, mockRes);

        expect(stripeMocks.listCustomers).toHaveBeenCalledWith({
            email: 'test@example.com',
            limit: 100
        });
        expect(stripeMocks.listPaymentIntents).toHaveBeenCalledWith({
            customer: 'cus_test_123',
            limit: 100
        });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            payments: [
                {
                    id: 'pi_1',
                    amount: 24,
                    currency: 'eur',
                    status: 'payé',
                    date: expect.any(String),
                    method: 'Carte (Stripe)',
                    invoice_ref: 'Invoice #10'
                },
                {
                    id: 'pi_2',
                    amount: 15.5,
                    currency: 'eur',
                    status: 'échec',
                    date: expect.any(String),
                    method: 'Carte (Stripe)',
                    invoice_ref: expect.stringContaining('FAC-')
                }
            ]
        });
    });

    test('should filter out payment intents created before the since date parameter', async () => {
        mockReq.query = {
            email: 'test@example.com',
            since: '2026-06-29' // Unix time is approx 1782747000
        };

        stripeMocks.listCustomers.mockResolvedValue({
            data: [{ id: 'cus_test_123' }]
        });

        stripeMocks.listPaymentIntents.mockResolvedValue({
            data: [
                {
                    id: 'pi_old',
                    amount: 2400,
                    currency: 'eur',
                    status: 'succeeded',
                    created: 1750000000, // old payment before 2026-06-29
                    payment_method_types: ['card'],
                },
                {
                    id: 'pi_new',
                    amount: 2400,
                    currency: 'eur',
                    status: 'succeeded',
                    created: 1782750000, // new payment after 2026-06-29
                    payment_method_types: ['card'],
                }
            ]
        });

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const responseJson = mockRes.json.mock.calls[0][0];
        expect(responseJson.payments).toHaveLength(1);
        expect(responseJson.payments[0].id).toBe('pi_new');
    });
});
