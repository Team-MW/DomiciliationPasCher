import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/ensure-stripe-customer.js';
import Stripe from 'stripe';

const listMock = vi.fn();
const updateMock = vi.fn();
const createMock = vi.fn();

// Mock Stripe module
vi.mock('stripe', () => {
    return {
        default: class StripeMock {
            constructor() {
                this.customers = {
                    list: listMock,
                    update: updateMock,
                    create: createMock
                };
            }
        }
    };
});

describe('API - ensure-stripe-customer', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        vi.clearAllMocks();
        
        process.env.STRIPE_SECRET_KEY = 'sk_test_mocked';

        mockReq = {
            method: 'POST',
            body: {}
        };

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
    });

    it('should return 405 if method is not POST', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should return 400 if email is missing', async () => {
        mockReq.body = { name: 'Test' };
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email is required' });
    });

    it('should return existing customerId if found in Stripe', async () => {
        mockReq.body = { email: 'test@example.com', name: 'Existing User' };
        
        listMock.mockResolvedValueOnce({
            data: [{ id: 'cus_existing123', name: 'Existing User' }]
        });

        await handler(mockReq, mockRes);

        expect(listMock).toHaveBeenCalledWith({
            email: 'test@example.com',
            limit: 1
        });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ customerId: 'cus_existing123' });
    });

    it('should create new customer if not found in Stripe', async () => {
        mockReq.body = { email: 'new@example.com', name: 'New User' };
        
        // Return empty list to simulate not found
        listMock.mockResolvedValueOnce({
            data: []
        });
        
        createMock.mockResolvedValueOnce({
            id: 'cus_new456'
        });

        await handler(mockReq, mockRes);

        expect(createMock).toHaveBeenCalledWith({
            email: 'new@example.com',
            name: 'New User',
            metadata: { source: 'auto_ensure_customer' }
        });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ customerId: 'cus_new456' });
    });
});
