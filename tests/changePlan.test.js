import { describe, it, expect, vi, beforeEach } from 'vitest';

const execute = vi.fn();
const customersList = vi.fn();
const subscriptionsList = vi.fn();
const pricesCreate = vi.fn();
const subscriptionsUpdate = vi.fn();

vi.mock('@planetscale/database', () => ({
    connect: () => ({ execute }),
}));

vi.mock('../api/_stripe-client.js', () => ({
    getStripe: () => ({
        customers: { list: customersList },
        subscriptions: { list: subscriptionsList, update: subscriptionsUpdate },
        prices: { create: pricesCreate },
    }),
}));

import handler from '../api/change-plan.js';

const clientRow = {
    id: 'cli_1',
    email: 'client@example.com',
    plan: 'Scan+',
    extra_info: JSON.stringify({ stripe_customer_id: 'cus_1', frequence: 'mensuel' }),
};

function mockRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
}

describe('POST /api/change-plan', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.VITE_DATABASE_HOST = 'h';
        process.env.VITE_DATABASE_USERNAME = 'u';
        process.env.VITE_DATABASE_PASSWORD = 'p';
        process.env.STRIPE_SECRET_KEY = 'sk_test_x';
        execute.mockResolvedValue({ rows: [clientRow] });
        customersList.mockResolvedValue({ data: [] });
        subscriptionsList.mockResolvedValue({
            data: [{
                id: 'sub_1',
                status: 'active',
                metadata: {},
                items: {
                    data: [{
                        id: 'si_1',
                        price: { recurring: { interval: 'month' } },
                    }],
                },
            }],
        });
        pricesCreate.mockResolvedValue({ id: 'price_new' });
        subscriptionsUpdate.mockResolvedValue({ id: 'sub_1' });
    });

    it('refuse une méthode autre que POST', async () => {
        const res = mockRes();
        await handler({ method: 'GET', body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    it('refuse un planId inconnu', async () => {
        const res = mockRes();
        await handler({
            method: 'POST',
            body: { clientId: 'cli_1', email: 'client@example.com', planId: 'gold' },
        }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('refuse si l’email ne correspond pas', async () => {
        const res = mockRes();
        await handler({
            method: 'POST',
            body: { clientId: 'cli_1', email: 'autre@example.com', planId: 'essentiel' },
        }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(subscriptionsUpdate).not.toHaveBeenCalled();
    });

    it('met à jour Stripe et le plan en base', async () => {
        const res = mockRes();
        await handler({
            method: 'POST',
            body: { clientId: 'cli_1', email: 'client@example.com', planId: 'physique' },
        }, res);
        expect(pricesCreate).toHaveBeenCalledWith(expect.objectContaining({
            unit_amount: 4560,
            recurring: { interval: 'month' },
        }));
        expect(subscriptionsUpdate).toHaveBeenCalledWith('sub_1', expect.objectContaining({
            items: [{ id: 'si_1', price: 'price_new' }],
            proration_behavior: 'always_invoice',
        }));
        expect(execute).toHaveBeenCalledWith(
            'UPDATE clients SET plan = ?, extra_info = ? WHERE id = ?',
            expect.arrayContaining(['Physique+', expect.any(String), 'cli_1'])
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            ok: true,
            plan: 'Physique+',
            planId: 'physique',
        }));
    });

    it('ne touche pas Stripe si le client est déjà sur cette formule', async () => {
        const res = mockRes();
        await handler({
            method: 'POST',
            body: { clientId: 'cli_1', email: 'client@example.com', planId: 'scan-plus' },
        }, res);
        expect(subscriptionsUpdate).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ unchanged: true }));
    });
});
