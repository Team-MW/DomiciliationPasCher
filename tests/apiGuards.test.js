import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('stripe', () => ({
    default: class {
        constructor() {
            return {
                paymentMethods: { list: vi.fn().mockResolvedValue({ data: [] }) },
            };
        }
    },
}));

vi.mock('nodemailer', () => ({
    default: { createTransport: vi.fn() },
}));

vi.mock('@clerk/clerk-sdk-node', () => ({
    createClerkClient: vi.fn(),
}));

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
    },
}));

vi.mock('../api/_stripe-client.js', () => ({
    getStripe: vi.fn(),
}));
vi.mock('../api/_smtp.js', () => ({
    getTransporter: vi.fn(),
    getSmtpConfig: vi.fn(),
    ADMIN_EMAIL: 'admin@test.fr',
}));
vi.mock('../api/_db.js', () => ({
    getDbConn: vi.fn(),
}));
vi.mock('../api/_payment-dunning.js', () => ({
    processFailedPayments: vi.fn(),
}));

import emailHandler from '../api/email.js';
import clerkInviteHandler from '../api/clerk-invite.js';
import deleteUserHandler from '../api/delete-user.js';
import getPaymentMethodHandler from '../api/get-payment-method.js';
import cronHandler from '../api/cron/reminders.js';

function mockRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
}

describe('gardes des API (déploiement)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.CLERK_SECRET_KEY;
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.CRON_SECRET;
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
    });

    it('POST /api/email refuse GET, un SMTP manquant, et un body sans email', async () => {
        const res = mockRes();
        await emailHandler({ method: 'GET', body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(405);

        const res2 = mockRes();
        await emailHandler({ method: 'POST', body: { email: 'a@test.fr' }, headers: {} }, res2);
        expect(res2.status).toHaveBeenCalledWith(500);

        process.env.SMTP_HOST = 'smtp.test';
        process.env.SMTP_USER = 'user';
        process.env.SMTP_PASS = 'pass';
        const res3 = mockRes();
        await emailHandler({ method: 'POST', body: {}, headers: {} }, res3);
        expect(res3.status).toHaveBeenCalledWith(400);
    });

    it('POST /api/clerk-invite refuse sans email et sans secret Clerk', async () => {
        const res = mockRes();
        await clerkInviteHandler({ method: 'GET', body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(405);

        const res2 = mockRes();
        await clerkInviteHandler({ method: 'POST', body: {} }, res2);
        expect(res2.status).toHaveBeenCalledWith(400);

        const res3 = mockRes();
        await clerkInviteHandler({ method: 'POST', body: { email: 'a@test.fr' }, headers: {} }, res3);
        expect(res3.status).toHaveBeenCalledWith(500);
    });

    it('POST /api/delete-user refuse un clerkId invalide', async () => {
        const res = mockRes();
        await deleteUserHandler({ method: 'POST', body: { clerkId: 'user_unknown' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('GET /api/get-payment-method refuse sans customerId', async () => {
        const res = mockRes();
        await getPaymentMethodHandler({ method: 'POST', query: {} }, res);
        expect(res.status).toHaveBeenCalledWith(405);

        const res2 = mockRes();
        await getPaymentMethodHandler({ method: 'GET', query: {} }, res2);
        expect(res2.status).toHaveBeenCalledWith(400);
    });

    it('cron reminders refuse sans CRON_SECRET ou avec un Bearer faux', async () => {
        const res = mockRes();
        await cronHandler({ method: 'GET', headers: {} }, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'CRON_SECRET non configuré' });

        process.env.CRON_SECRET = 'secret-ok';
        const res2 = mockRes();
        await cronHandler({ method: 'GET', headers: { authorization: 'Bearer nope' } }, res2);
        expect(res2.status).toHaveBeenCalledWith(401);
        expect(res2.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
});
