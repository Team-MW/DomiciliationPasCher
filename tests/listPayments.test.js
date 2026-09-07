import { describe, test, expect, vi, beforeEach } from 'vitest';
import handler from '../api/list-payments.js';
import Stripe from 'stripe';

// Mock stripe module
vi.mock('stripe', () => {
    const listCustomers = vi.fn();
    const listPaymentIntents = vi.fn();
    const listSubscriptions = vi.fn();
    const listInvoices = vi.fn();
    const searchPaymentIntents = vi.fn();
    return {
        default: class {
            constructor() {
                return {
                    customers: {
                        list: listCustomers,
                    },
                    paymentIntents: {
                        list: listPaymentIntents,
                        search: searchPaymentIntents,
                    },
                    subscriptions: {
                        list: listSubscriptions,
                    },
                    invoices: {
                        list: listInvoices,
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
            listSubscriptions: stripe.subscriptions.list,
            listInvoices: stripe.invoices.list,
            searchPaymentIntents: stripe.paymentIntents.search,
        };
        stripeMocks.searchPaymentIntents.mockResolvedValue({ data: [] });
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
        expect(mockRes.json).toHaveBeenCalledWith({
            payments: [],
            subscriptionStatus: 'non_trouvé',
            foundCustomerId: null
        });
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

        stripeMocks.listSubscriptions.mockResolvedValue({
            data: [{ status: 'active' }]
        });
        stripeMocks.listInvoices.mockResolvedValue({ data: [] });

        await handler(mockReq, mockRes);

        expect(stripeMocks.listCustomers).toHaveBeenCalledWith({
            email: 'test@example.com',
            limit: 100
        });
        expect(stripeMocks.listPaymentIntents).toHaveBeenCalledWith({
            customer: 'cus_test_123',
            limit: 100,
            expand: ['data.latest_charge']
        });
        expect(stripeMocks.listInvoices).toHaveBeenCalledWith({
            customer: 'cus_test_123',
            limit: 100,
            expand: ['data.payments']
        });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            payments: [
                {
                    id: 'pi_1',
                    amount: 24,
                    currency: 'eur',
                    status: 'payé',
                    method: 'Carte (Stripe)',
                    invoice_ref: 'Invoice #10',
                    date: expect.any(String),
                    receipt_url: null
                },
                {
                    id: 'pi_2',
                    amount: 15.5,
                    currency: 'eur',
                    status: 'échec',
                    method: 'Carte (Stripe)',
                    invoice_ref: expect.stringContaining('PAIEMENT-'),
                    date: expect.any(String),
                    receipt_url: null
                }
            ],
            subscriptionStatus: 'active',
            foundCustomerId: 'cus_test_123'
        }));
    });

    test('ne duplique pas un paiement déjà porté par sa facture', async () => {
        stripeMocks.listCustomers.mockResolvedValue({ data: [{ id: 'cus_test_123' }] });
        stripeMocks.listSubscriptions.mockResolvedValue({ data: [{ status: 'active' }] });

        stripeMocks.listInvoices.mockResolvedValue({
            data: [{
                id: 'in_1',
                status: 'paid',
                total: 2880,
                currency: 'eur',
                created: 1770000000,
                number: 'FAC-0001',
                payments: { data: [{ payment: { payment_intent: 'pi_linked' } }] }
            }]
        });

        // Même paiement vu côté PaymentIntent, sans description exploitable.
        stripeMocks.listPaymentIntents.mockResolvedValue({
            data: [{
                id: 'pi_linked',
                amount: 2880,
                currency: 'eur',
                status: 'succeeded',
                created: 1770000000,
                payment_method_types: ['card'],
                description: null
            }]
        });

        await handler(mockReq, mockRes);

        const { payments } = mockRes.json.mock.calls[0][0];
        expect(payments).toHaveLength(1);
        expect(payments[0].id).toBe('in_1');
    });

    test('signale une facture relancée sans succès comme un échec', async () => {
        stripeMocks.listCustomers.mockResolvedValue({ data: [{ id: 'cus_test_123' }] });
        stripeMocks.listSubscriptions.mockResolvedValue({ data: [{ status: 'past_due' }] });
        stripeMocks.listPaymentIntents.mockResolvedValue({ data: [] });
        stripeMocks.listInvoices.mockResolvedValue({
            data: [{
                id: 'in_fail',
                status: 'open',
                attempt_count: 2,
                total: 2880,
                currency: 'eur',
                created: 1770000000,
                number: 'FAC-0002'
            }]
        });

        await handler(mockReq, mockRes);

        const { payments, subscriptionStatus } = mockRes.json.mock.calls[0][0];
        expect(payments[0].status).toBe('échec');
        expect(subscriptionStatus).toBe('past_due');
    });

    test('retrouve un paiement invité qui n\'est rattaché à aucune fiche client Stripe', async () => {
        stripeMocks.listCustomers.mockResolvedValue({ data: [] });
        stripeMocks.searchPaymentIntents.mockResolvedValue({
            data: [{
                id: 'pi_guest',
                amount: 9900,
                currency: 'eur',
                status: 'succeeded',
                created: 1770000000,
                payment_method_types: ['card'],
                description: 'Frais de dossier',
                latest_charge: { receipt_url: 'https://stripe.test/recu' }
            }]
        });

        await handler(mockReq, mockRes);

        expect(stripeMocks.searchPaymentIntents).toHaveBeenCalledWith(
            expect.objectContaining({ query: "metadata['email']:'test@example.com'" })
        );
        const { payments, subscriptionStatus } = mockRes.json.mock.calls[0][0];
        expect(payments).toHaveLength(1);
        expect(payments[0].id).toBe('pi_guest');
        expect(payments[0].amount).toBe(99);
        expect(payments[0].receipt_url).toBe('https://stripe.test/recu');
        expect(subscriptionStatus).toBe('non_trouvé');
    });

    test('retient le statut le plus préoccupant quand plusieurs abonnements coexistent', async () => {
        stripeMocks.listCustomers.mockResolvedValue({ data: [{ id: 'cus_test_123' }] });
        stripeMocks.listPaymentIntents.mockResolvedValue({ data: [] });
        stripeMocks.listInvoices.mockResolvedValue({ data: [] });
        stripeMocks.listSubscriptions.mockResolvedValue({
            data: [{ status: 'active' }, { status: 'past_due' }]
        });

        await handler(mockReq, mockRes);

        expect(mockRes.json.mock.calls[0][0].subscriptionStatus).toBe('past_due');
    });
});
