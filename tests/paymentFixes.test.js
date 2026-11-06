import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMail = vi.fn(async () => ({ messageId: 'x' }));
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));
vi.mock('../api/_db.js', () => ({ getDbConn: () => null }));

const { scanFailedPayments } = await import('../api/_stripe-failures.js');
const { sendRenewalReminders } = await import('../api/cron/reminders.js');
const { fulfillCheckoutSession } = await import('../api/_checkout-fulfillment.js');
const webhook = (await import('../api/stripe-webhook.js')).default;

const unix = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const list = (items) => ({ [Symbol.asyncIterator]: async function* () { for (const i of items) yield i; } });

function fakeStripe({ subs = {}, open = [], uncollectible = [] }) {
    return {
        subscriptions: { list: ({ status }) => list(subs[status] || []) },
        invoices: { list: ({ status }) => list(status === 'open' ? open : status === 'uncollectible' ? uncollectible : []) },
        customers: { retrieve: async () => ({ email: 'c@x.fr', name: 'Client' }) },
    };
}
const sub = (id, status, start, meta = {}) => ({ id, customer: 'cus_1', status, metadata: meta, items: { data: [{ current_period_start: unix(start), current_period_end: unix('2027-01-01'), plan: { interval: 'month' } }] } });
const inv = (id, status, created, extra = {}) => ({ id, customer: 'cus_1', status, created: unix(created), attempt_count: 2, amount_remaining: 2880, currency: 'eur', metadata: {}, ...extra });

describe('Impayés : seul l’impayé EN COURS compte', () => {
    it('une vieille facture irrécouvrable ne fait plus résilier tout de suite un nouvel impayé', async () => {
        const stripe = fakeStripe({
            subs: { past_due: [sub('sub_new', 'past_due', '2026-11-03')] },
            open: [inv('in_new', 'open', '2026-11-03')],
            uncollectible: [inv('in_old', 'uncollectible', '2025-10-02')],
        });
        const [failure] = await scanFailedPayments(stripe);
        expect(failure.failedAt).toBe('2026-11-03');
    });

    it('un ancien épisode « résilié » ne rend pas invisible un nouvel impayé (client réabonné)', async () => {
        const stripe = fakeStripe({
            subs: { past_due: [sub('sub_new', 'past_due', '2026-11-03')] },
            uncollectible: [inv('in_old', 'uncollectible', '2025-10-02', { metadata: { dpc_domicile_terminated: '1' } })],
        });
        const [failure] = await scanFailedPayments(stripe);
        expect(failure.alreadyTerminated).toBe(false);
    });

    it('sans abonnement en échec : la facture irrécouvrable définit encore la date et le statut résilié', async () => {
        const stripe = fakeStripe({ uncollectible: [inv('in_old', 'uncollectible', '2026-08-01', { metadata: { dpc_domicile_terminated: '1' } })] });
        const [failure] = await scanFailedPayments(stripe);
        expect(failure.failedAt).toBe('2026-08-01');
        expect(failure.alreadyTerminated).toBe(true);
    });
});

describe('Rappel annuel : pas pour une résiliation déjà demandée', () => {
    it('cancel_at_period_end → aucun email, aucune marque', async () => {
        vi.stubEnv('SMTP_HOST', 'smtp.test'); vi.stubEnv('SMTP_USER', 'u@test.fr'); vi.stubEnv('SMTP_PASS', 'p');
        const end = new Date('2027-01-06T00:00:00Z');
        const annual = { id: 'sub_y', customer: 'cus_1', cancel_at_period_end: true, metadata: {}, items: { data: [{ plan: { interval: 'year' }, current_period_end: Math.floor(end / 1000) }] } };
        const stripe = {
            subscriptions: { list: vi.fn(async () => ({ data: [annual], has_more: false })), update: vi.fn() },
            customers: { retrieve: vi.fn(async () => ({ email: 'a@b.fr' })) },
        };
        expect(await sendRenewalReminders(stripe, null, new Date('2026-11-06T08:00:00Z'))).toBe(0);
        expect(stripe.subscriptions.update).not.toHaveBeenCalled();
        vi.unstubAllEnvs();
    });
});

describe('Bienvenue : un envoi raté est retenté, jamais perdu', () => {
    const makeConn = (extra) => {
        const state = { status: 'en_attente_paiement', extra: JSON.stringify(extra) };
        const conn = { execute: vi.fn(async (sql, params) => {
            if (/^SELECT \* FROM demandes WHERE id/i.test(sql)) return { rows: [{ id: 'd1', email: 'a@b.fr', clientName: 'Ada', plan: 'Essentiel', status: state.status, extra_info: state.extra }] };
            if (/^SELECT status, extra_info FROM demandes/i.test(sql)) return { rows: [{ status: state.status, extra_info: state.extra }] };
            if (/^SELECT extra_info FROM demandes WHERE id/i.test(sql)) return { rows: [{ extra_info: state.extra }] };
            if (/^UPDATE demandes SET status = 'en_attente'/i.test(sql)) {
                if (state.status !== 'en_attente_paiement') return { rows: [], rowsAffected: 0 };
                state.status = 'en_attente'; state.extra = params[0];
                return { rows: [], rowsAffected: 1 };
            }
            if (/^UPDATE demandes SET extra_info/i.test(sql)) { state.extra = params[0]; return { rows: [], rowsAffected: 1 }; }
            return { rows: [], rowsAffected: 1 };
        }) };
        return { conn, current: () => JSON.parse(state.extra) };
    };
    const session = { id: 'cs_1', status: 'complete', payment_status: 'paid', customer: 'cus_1', metadata: { demande_id: 'd1', planId: 'essentiel', interval: 'month', email: 'a@b.fr' } };

    it('échec SMTP au premier passage → marqueur welcome_pending ; réussite au rejeu → marqueur retiré', async () => {
        const { conn, current } = makeConn({ frequence: 'mensuel' });
        const failingSend = vi.fn(async () => { throw new Error('smtp down'); });
        await fulfillCheckoutSession(session, { conn, baseUrl: 'https://s', sendEmail: failingSend });
        expect(current().welcome_pending).toBe(true);

        const okSend = vi.fn(async () => {});
        await fulfillCheckoutSession(session, { conn, baseUrl: 'https://s', sendEmail: okSend });
        expect(okSend).toHaveBeenCalledTimes(1);
        expect(current().welcome_pending).toBeUndefined();
    });
});

describe('Dossier créé par l’admin : le webhook rattrape un paiement dont le client n’est pas revenu', () => {
    it('enregistre payment_status = paid + alerte admin, une seule fois', async () => {
        const stored = { value: JSON.stringify({ payment_status: 'pending', payment_token: 'tok', stripe_customer_id: 'cus_1' }) };
        const conn = { execute: vi.fn(async (sql, params) => {
            if (/^SELECT id, name, email, extra_info FROM clients/i.test(sql)) return { rows: [{ id: 'c9', name: 'Ada', email: 'a@b.fr', extra_info: stored.value }] };
            if (/^UPDATE clients SET extra_info/i.test(sql)) { stored.value = params[0]; return { rows: [] }; }
            return { rows: [] };
        }) };
        const send = vi.fn(async () => {});
        const session = { id: 'cs_admin', status: 'complete', payment_status: 'paid', customer: 'cus_1', subscription: 'sub_9', metadata: { admin_client_id: 'c9' } };

        const first = await fulfillCheckoutSession(session, { conn, baseUrl: 'https://s', sendEmail: send });
        expect(first).toMatchObject({ kind: 'admin_payment', ok: true, firstTime: true });
        const saved = JSON.parse(stored.value);
        expect(saved).toMatchObject({ payment_status: 'paid', stripe_subscription_id: 'sub_9', stripe_session_id: 'cs_admin', payment_token: 'tok' });
        expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'admin_payment_received' }));

        const again = await fulfillCheckoutSession(session, { conn, baseUrl: 'https://s', sendEmail: send });
        expect(again.firstTime).toBe(false);
        expect(send).toHaveBeenCalledTimes(1);
    });
});

describe('Webhook : paiement encaissé mais dossier non activé → alerte admin', () => {
    beforeEach(() => {
        sendMail.mockClear();
        vi.stubEnv('SMTP_HOST', 'smtp.test'); vi.stubEnv('SMTP_USER', 'u@test.fr'); vi.stubEnv('SMTP_PASS', 'p');
    });
    afterEach(() => vi.unstubAllEnvs());

    it('source : result.ok === false déclenche admin_payment_problem', async () => {
        const fs = await import('node:fs');
        const src = fs.readFileSync('api/stripe-webhook.js', 'utf8');
        expect(src).toContain("result.ok === false && result.kind !== 'unpaid'");
        expect(src).toContain("type: 'admin_payment_problem'");
    });
});
