// Dossier créé par l'admin « carte non enregistrée » alors que Stripe a un abonnement actif : rattachement automatique.
import { describe, it, expect, vi } from 'vitest';
import { pendingPaymentPatch, reconcilePendingPayment } from '../api/_payment-reconcile.js';
import { fetchStripeBilling } from '../api/_stripe-billing.js';
import { processPendingPayments } from '../api/_notifications.js';
import { createDataService } from '../api/_data-service.js';
import { createSqlJsConn } from './helpers/sqlJsConn.js';

const billingOk = { hasHealthySubscription: true, healthySubscriptionId: 'sub_1', healthyCustomerId: 'cus_1', healthySubscriptionCreated: '2026-11-13T09:00:00.000Z' };

describe('pendingPaymentPatch', () => {
    it('passe la fiche en payé et retire le lien de paiement', () => {
        const next = pendingPaymentPatch({ payment_status: 'pending', payment_token: 'tok', payment_requested_at: '2026-11-13', payment_reminders_sent: [2], frequence: 'mensuel' }, billingOk);
        expect(next).toMatchObject({ payment_status: 'paid', paid_at: '2026-11-13T09:00:00.000Z', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', frequence: 'mensuel' });
        expect(next.payment_token).toBeUndefined();
        expect(next.payment_reminders_sent).toBeUndefined();
    });
    it('ne touche à rien sans abonnement sain, ou si la fiche n’est pas « en attente »', () => {
        expect(pendingPaymentPatch({ payment_status: 'pending' }, { hasHealthySubscription: false })).toBeNull();
        expect(pendingPaymentPatch({ payment_status: 'paid' }, billingOk)).toBeNull();
    });
});

describe('fetchStripeBilling expose l’abonnement sain', () => {
    it('id, client Stripe et date de création', async () => {
        const stripe = {
            customers: { list: vi.fn(async () => ({ data: [{ id: 'cus_1' }] })) },
            subscriptions: { list: vi.fn(async () => ({ data: [{ id: 'sub_old', status: 'canceled', created: 1 }, { id: 'sub_1', status: 'active', created: 1794646800 }] })) },
            paymentIntents: { list: vi.fn(async () => ({ data: [] })), search: vi.fn(async () => ({ data: [] })) },
            invoices: { list: vi.fn(async () => ({ data: [] })) },
        };
        const b = await fetchStripeBilling(stripe, { email: 'a@x.fr' });
        expect(b.healthySubscriptionId).toBe('sub_1');
        expect(b.healthyCustomerId).toBe('cus_1');
        expect(b.healthySubscriptionCreated).toBe(new Date(1794646800 * 1000).toISOString());
    });
});

describe('reconcilePendingPayment + relances + tunnel', () => {
    const insertPending = (conn, id, email) => conn.execute(
        "INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES (?, 'MFK', ?, 'MFK ELITE', 'Toulouse', 'scan-plus', 'en_attente_validation', '2026-11-13', '2026-11-13', '', '', ?)",
        [id, email, JSON.stringify({ payment_status: 'pending', payment_token: 'a'.repeat(32), payment_requested_at: '2026-11-11T10:00:00.000Z', frequence: 'mensuel', grille_tarifaire: '2026-11' })],
    );

    it('la fiche devient « payé » (relecture fraîche), puis plus rien ne change', async () => {
        const conn = await createSqlJsConn();
        const service = createDataService({ conn });
        await service.init();
        await insertPending(conn, 'c1', 'mfk@x.fr');
        expect(await service.hasPaidDossier('mfk@x.fr')).toBe(false); // carte non enregistrée : peut payer via le site
        const notify = vi.fn(async () => {});
        expect((await reconcilePendingPayment({ conn, clientId: 'c1', billing: billingOk, notify })).changed).toBe(true);
        expect(notify).toHaveBeenCalledWith({ email: 'mfk@x.fr', nom: 'MFK' }); // « dossier actif, créez votre accès »
        const extra = JSON.parse((await conn.execute("SELECT extra_info FROM clients WHERE id = 'c1'")).rows[0].extra_info);
        expect(extra).toMatchObject({ payment_status: 'paid', stripe_subscription_id: 'sub_1', grille_tarifaire: '2026-11' });
        expect(extra.payment_token).toBeUndefined();
        expect((await reconcilePendingPayment({ conn, clientId: 'c1', billing: billingOk, notify })).changed).toBe(false);
        expect(notify).toHaveBeenCalledTimes(1);
        expect(await service.hasPaidDossier('mfk@x.fr')).toBe(true);
    });

    it('relance J+2 : si Stripe a un abonnement actif, la fiche est rattachée et AUCUN « enregistrez votre carte » ne part', async () => {
        const conn = await createSqlJsConn();
        await createDataService({ conn }).init();
        await insertPending(conn, 'c2', 'paid@x.fr');
        const stripe = {
            customers: { list: vi.fn(async () => ({ data: [{ id: 'cus_2' }] })) },
            subscriptions: { list: vi.fn(async () => ({ data: [{ id: 'sub_2', status: 'active', created: 1794646800 }] })) },
            paymentIntents: { list: vi.fn(async () => ({ data: [] })), search: vi.fn(async () => ({ data: [] })) },
            invoices: { list: vi.fn(async () => ({ data: [] })) },
        };
        const transporter = { sendMail: vi.fn(async () => ({})) };
        const res = await processPendingPayments({ conn, transporter, from: 's@x.fr', baseUrl: 'https://s', now: new Date('2026-11-14T08:00:00.000Z'), stripe });
        expect(res.paymentRemindersSent).toBe(0);
        expect(transporter.sendMail).not.toHaveBeenCalled();
        const extra = JSON.parse((await conn.execute("SELECT extra_info FROM clients WHERE id = 'c2'")).rows[0].extra_info);
        expect(extra.payment_status).toBe('paid');
    });

    it('relance J+2 : sans abonnement Stripe, la relance part comme avant', async () => {
        const conn = await createSqlJsConn();
        await createDataService({ conn }).init();
        await insertPending(conn, 'c3', 'nopay@x.fr');
        const stripe = {
            customers: { list: vi.fn(async () => ({ data: [] })) },
            subscriptions: { list: vi.fn(async () => ({ data: [] })) },
            paymentIntents: { list: vi.fn(async () => ({ data: [] })), search: vi.fn(async () => ({ data: [] })) },
            invoices: { list: vi.fn(async () => ({ data: [] })) },
        };
        const transporter = { sendMail: vi.fn(async () => ({})) };
        const res = await processPendingPayments({ conn, transporter, from: 's@x.fr', baseUrl: 'https://s', now: new Date('2026-11-14T08:00:00.000Z'), stripe });
        expect(res.paymentRemindersSent).toBe(1);
    });
});

describe('fetchStripeBilling : identifiant relié ET fiches Stripe du même email', () => {
    it('un identifiant relié sans abonnement ne cache plus les factures de l’autre fiche Stripe', async () => {
        const subsByCustomer = { cus_wrong: [], cus_right: [{ id: 'sub_r', status: 'active', created: 1794646800 }] };
        const invoicesByCustomer = { cus_wrong: [], cus_right: [{ id: 'in_1', status: 'paid', amount_paid: 2880, created: 1794646800, currency: 'eur', payments: { data: [] } }] };
        const stripe = {
            customers: { list: vi.fn(async () => ({ data: [{ id: 'cus_right' }] })) },
            subscriptions: { list: vi.fn(async ({ customer }) => ({ data: subsByCustomer[customer] || [] })) },
            paymentIntents: { list: vi.fn(async () => ({ data: [] })), search: vi.fn(async () => ({ data: [] })) },
            invoices: { list: vi.fn(async ({ customer }) => ({ data: invoicesByCustomer[customer] || [] })) },
        };
        const b = await fetchStripeBilling(stripe, { email: 'mfk@x.fr', customerId: 'cus_wrong' });
        expect(b.subscriptionStatus).toBe('active');
        expect(b.healthyCustomerId).toBe('cus_right');
        expect(b.foundCustomerId).toBe('cus_right');
        expect(b.payments.length).toBeGreaterThan(0);
    });
});
