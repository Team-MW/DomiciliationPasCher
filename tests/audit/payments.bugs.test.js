// @vitest-environment node
/**
 * AUDIT — paiements, abonnements, prix et cohérence des prix.
 * Vrais gestionnaires api/* sur base SQL réelle en mémoire (sql.js) ; Stripe, Clerk et SMTP simulés.
 * BUGS REPRODUITS : chaque test est en it.skip (la suite reste verte). Retirer « .skip » pour voir l’échec.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

const ext = vi.hoisted(() => ({
    conn: null, outbox: [], sessions: {}, created: [], subs: {}, customers: {}, prices: [], subUpdates: [],
}));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: async (mail) => { ext.outbox.push(mail); return { messageId: `<m${ext.outbox.length}@t>` }; } }) },
}));
vi.mock('../../api/_stripe-client.js', () => ({
    getStripe: () => ({
        checkout: { sessions: {
            retrieve: async (id) => { if (!ext.sessions[id]) throw new Error(`No such checkout.session: ${id}`); return ext.sessions[id]; },
            create: async (params) => { const id = `cs_test_${ext.created.length + 1}`; ext.created.push(params); return { id, url: `https://checkout.stripe.test/${id}` }; },
        } },
        webhooks: { constructEvent: (raw) => JSON.parse(Buffer.from(raw).toString()) },
        customers: {
            list: async ({ email }) => ({ data: ext.customers[email] ? [{ id: ext.customers[email], email, name: 'x' }] : [] }),
            create: async ({ email }) => { const id = `cus_new${Object.keys(ext.customers).length}`; ext.customers[email] = id; return { id }; },
            update: async () => ({}),
            retrieve: async (id) => {
                const email = Object.keys(ext.customers).find((e) => ext.customers[e] === id);
                if (!email) throw Object.assign(new Error('No such customer'), { code: 'resource_missing' });
                return { id, email };
            },
        },
        subscriptions: {
            list: async ({ customer, status }) => ({ data: (ext.subs[customer] || []).filter((s) => !status || status === 'all' || s.status === status), has_more: false }),
            update: async (id, params) => { ext.subUpdates.push([id, params]); return { id }; },
        },
        prices: { create: async (p) => { ext.prices.push(p); return { id: `price_${ext.prices.length}` }; } },
        invoices: { list: async () => ({ data: [] }), update: async () => ({}) },
        paymentIntents: { list: async () => ({ data: [] }), search: async () => ({ data: [] }) },
    }),
}));
vi.mock('@clerk/backend', () => ({
    createClerkClient: () => ({ users: { getUserList: async () => ({ data: [] }), getUser: async () => ({}), deleteUser: async () => ({}) } }),
    verifyToken: async () => ({}),
}));

const { __setAuthVerifierForTests } = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const checkout = (await import('../../api/checkout.js')).default;
const verifySession = (await import('../../api/verify-session.js')).default;
const webhook = (await import('../../api/stripe-webhook.js')).default;
const changePlan = (await import('../../api/change-plan.js')).default;
const payHandler = (await import('../../api/pay.js')).default;
const listPayments = (await import('../../api/list-payments.js')).default;
const { collectHealthIssues } = await import('../../api/_health-check.js');
const { fulfillCheckoutSession } = await import('../../api/_checkout-fulfillment.js');
const plans = await import('../../shared/plans.js');
const { nextRenewalIso } = await import('../../shared/renewal.js');
const { paymentGraceDeadline, isPaymentGraceExpired, addCalendarMonths } = await import('../../shared/paymentGrace.js');
const { planPriceLine } = await import('../../api/_email-templates.js');

const ADMIN = { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' };
const USERS = {
    admin: ADMIN,
    alice: { userId: 'user_alice', email: 'alice@test.fr' },
    bob: { userId: 'user_bob', email: 'bob@test.fr' },
};
const mockRes = () => {
    const r = { code: 200, body: null, headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.send = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; return r; };
    r.end = () => r;
    return r;
};
const api = async (handler, { method = 'POST', who, body, query, headers = {} } = {}) => {
    const res = mockRes();
    await handler({ method, headers: { host: 'site.test', origin: 'https://site.test', ...(who ? { authorization: `Bearer ${who}` } : {}), ...headers }, body, query: query || {} }, res);
    return res;
};
const data = async (who, method, ...args) => {
    const res = await api(dataHandler, { who, body: { method, args } });
    return { code: res.code, result: res.body?.result, error: res.body?.error };
};
const rows = (sql, p) => ext.conn.all(sql, p);
const insertClient = (id, email, plan, extra, { status = 'actif', since = '2026-11-01' } = {}) => ext.conn.execute(
    'INSERT INTO clients (id, name, email, plan, status, since, renewal, clerkId, extra_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, `Client ${id}`, email, plan, status, since, since, '', typeof extra === 'string' ? extra : JSON.stringify(extra)],
);
const webhookCall = (session, type = 'checkout.session.completed') => api(webhook, {
    headers: { 'stripe-signature': 'sig' }, body: Buffer.from(JSON.stringify({ type, data: { object: session } })),
});
const welcomeCount = (email) => ext.outbox.filter((m) => String(m.to).includes(email) && /Bienvenue/.test(m.subject)).length;
const FUNNEL = (email, extra = {}) => ({ prenom: 'Jean', nom: 'Test', email, offre: 'notification', frequence: 'mensuel', cgv: true, ...extra });

beforeAll(() => {
    process.env.SMTP_HOST = 'smtp.test'; process.env.SMTP_PORT = '465'; process.env.SMTP_USER = 'site@test.fr'; process.env.SMTP_PASS = 'abcdabcdabcdabcd';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'; process.env.CLERK_SECRET_KEY = 'sk_test_x'; process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.VITE_ADMIN_EMAILS = ADMIN.email;
    __setAuthVerifierForTests(async (token) => USERS[token] || null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
});
beforeEach(async () => {
    ext.conn = await createSqlJsConn();
    Object.assign(ext, { outbox: [], sessions: {}, created: [], subs: {}, customers: {}, prices: [], subUpdates: [] });
});

const activeSub = (interval = 'month') => ({ id: 'sub_1', status: 'active', metadata: {}, items: { data: [{ id: 'si_1', price: { recurring: { interval } } }] } });
const healthStripe = (map) => ({ subscriptions: { list: async ({ customer }) => ({ data: map[customer] ? [{ items: { data: [{ price: { unit_amount: map[customer][0], recurring: { interval: map[customer][1] || 'month' } } }] } }] : [] }) } });

describe('BUGS — paiements et cohérence des prix', () => {
    // BUG: api/_health-check.js:38 — la requête ne lit pas la colonne `plan` (SELECT id, name, email, status, clerkId, since, extra_info),
    // puis clientPlanPricing(client.plan, extra) reçoit `undefined` et retombe sur extra.offre (ou « essentiel »). Un client Premium
    // sans `offre` (ancien dossier) ou avec une `offre` différente du plan affiché est signalé à tort « prix affiché ≠ prix prélevé »
    // (et l'email conseille « Passer au tarif actuel »), ou un vrai écart n'est pas vu.
    it('contrôle quotidien : un client Premium correctement prélevé (45,60 €) n’est pas signalé', async () => {
        await insertClient('p1', 'premium@t.fr', 'Premium', { stripe_customer_id: 'cus_p', grille_tarifaire: '2026-11' });
        await insertClient('p2', 'physique@t.fr', 'Physique+', { stripe_customer_id: 'cus_q' });
        const issues = await collectHealthIssues({ conn: ext.conn, stripe: healthStripe({ cus_p: [4560], cus_q: [4560] }) });
        expect(issues).toEqual([]);
    });

    // BUG: api/_health-check.js:38 — même cause, cas inverse : un client affiché « Essentiel » (plan) mais dont l'offre est restée
    // « reexpedition » et qui est prélevé au prix Premium n'est PAS signalé (faux négatif).
    it('contrôle quotidien : Essentiel affiché mais Premium prélevé → signalé', async () => {
        await insertClient('e1', 'ess@t.fr', 'Essentiel', { stripe_customer_id: 'cus_e', grille_tarifaire: '2026-11', offre: 'reexpedition' });
        const issues = await collectHealthIssues({ conn: ext.conn, stripe: healthStripe({ cus_e: [4560] }) });
        expect(plans.clientPlanPricing('Essentiel', { grille_tarifaire: '2026-11', offre: 'reexpedition' }).ttcMonth).toBe(19.2); // ce qu'affiche le site
        expect(issues.map((i) => i.kind)).toEqual(['price_mismatch']);
    });

    // BUG: api/_client-extra.js:11 — `frequence` n'est pas dans CLIENT_FORBIDDEN_EXTRA. Un client connecté peut passer son dossier
    // de « mensuel » à « annuel » (data.updateClientExtraInfo ou /api/update-client-extra) alors que Stripe prélève toujours 19,20 €/mois :
    // contrat (tarif annuel), montant de facture proposé à l'admin (DossierClient defaultInvoiceAmount = ttcYear), échéance
    // (nextRenewalIso annuel) et lien /api/pay (dossier admin non payé : interval lu dans extra.frequence) divergent du prix réel.
    it('un client ne peut pas changer sa fréquence de facturation (prix affiché ≠ prix prélevé)', async () => {
        await insertClient('ca', 'alice@test.fr', 'Essentiel', { stripe_customer_id: 'cus_A', grille_tarifaire: '2026-11', offre: 'notification', frequence: 'mensuel' });
        const r = await data('alice', 'updateClientExtraInfo', 'ca', { frequence: 'annuel' });
        expect(r.code).toBe(200);
        const extra = JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info);
        expect(extra.frequence).toBe('mensuel');
    });

    // BUG: api/_client-extra.js:11 — même cause, sur un dossier admin pas encore payé : le client change « annuel » en « mensuel »
    // et /api/pay (api/pay.js:105) ouvre une session au tarif mensuel au lieu de l'annuel convenu avec l'admin et annoncé dans l'email.
    it('lien de paiement admin : la fréquence choisie par l’admin ne peut pas être changée par le client', async () => {
        const TOKEN = 'cd'.repeat(16);
        await insertClient('ca', 'alice@test.fr', 'Confort', { grille_tarifaire: '2026-11', offre: 'scan', frequence: 'annuel', payment_token: TOKEN, payment_status: 'pending' });
        await data('alice', 'updateClientExtraInfo', 'ca', { frequence: 'mensuel' });
        await api(payHandler, { method: 'GET', query: { token: TOKEN } });
        expect(ext.created[0].line_items[0].price_data).toMatchObject({ unit_amount: 27648, recurring: { interval: 'year' } });
    });

    // BUG: api/change-plan.js:46-51 — extra_info est lu avec un JSON.parse simple. Un extra_info double-encodé (cas connu, cf.
    // parseExtraInfo) donne une CHAÎNE : stripe_customer_id est ignoré, puis saveGrid fait `{ ...extra }` sur une chaîne et
    // réécrit le dossier en { "0": "{", "1": "\"", … } : signature, fréquence, identifiants Stripe… perdus. Correctif : parseExtraInfo.
    it('change-plan : extra_info double-encodé conservé (pas de dossier détruit)', async () => {
        const inner = { stripe_customer_id: 'cus_A', frequence: 'mensuel', contractSigned: true, offre: 'notification', grille_tarifaire: '2026-11' };
        await insertClient('ca', 'alice@test.fr', 'Essentiel', JSON.stringify(JSON.stringify(inner)));
        ext.customers['alice@test.fr'] = 'cus_A';
        ext.subs.cus_A = [activeSub()];
        const r = await api(changePlan, { who: 'alice', body: { clientId: 'ca', planId: 'physique' } });
        expect(r.code).toBe(200);
        const saved = JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info);
        expect(saved).toMatchObject({ contractSigned: true, frequence: 'mensuel', stripe_customer_id: 'cus_A', offre: 'reexpedition' });
        expect(saved['0']).toBeUndefined();
    });

    // BUG: api/change-plan.js:46-51 — extra_info illisible → `extra = {}` puis UPDATE avec { offre, grille_tarifaire, stripe_customer_id }
    // seulement : tout le dossier est effacé. Règle AI_INSTRUCTIONS (2026-11-06) : JSON illisible → REFUSER (500), jamais repartir de {}.
    it('change-plan : extra_info illisible → refus, dossier intact', async () => {
        const broken = '{"stripe_customer_id":"cus_A","contractSigned":true,"frequence":"mensuel"';
        await insertClient('ca', 'alice@test.fr', 'Essentiel', broken);
        ext.customers['alice@test.fr'] = 'cus_A';
        ext.subs.cus_A = [activeSub()];
        const r = await api(changePlan, { who: 'admin', body: { clientId: 'ca', planId: 'essentiel', alignGrid: true } });
        expect(r.code).toBe(500);
        expect(rows('SELECT extra_info FROM clients')[0].extra_info).toBe(broken);
        expect(ext.subUpdates).toHaveLength(0);
    });

    // BUG: api/_data-service.js:438-441 — réactivation d'un ancien client (traiterDemande sur un email déjà en base) : l'UPDATE
    // remet renewal = aujourd'hui mais PAS `since`. Or l'échéance affichée (nextRenewalIso(since), Abonnement.jsx:28) et la période
    // de quota (currentQuotaPeriodStart(since)) partent de `since` : le client voit l'anniversaire de son ANCIEN abonnement
    // (ex. le 15) alors que le nouvel abonnement Stripe se renouvelle à la date du nouveau paiement.
    it('réactivation : la date de souscription repart du nouvel abonnement', async () => {
        await insertClient('old', 'reac@test.fr', 'Essentiel', { frequence: 'mensuel', domicile_terminated_at: '2025-09-01' }, { status: 'résilié', since: '2025-03-15' });
        const { result } = await data(null, 'addDemande', { clientName: 'R', email: 'reac@test.fr', plan: 'Essentiel', extra_info: FUNNEL('reac@test.fr') });
        await fulfillCheckoutSession({ id: 'cs_reac', status: 'complete', payment_status: 'paid', customer: 'cus_R', metadata: { demande_id: result.id, planId: 'essentiel', interval: 'month' } }, { conn: ext.conn, sendEmail: async () => {} });
        expect((await data('admin', 'traiterDemande', result.id)).code).toBe(200);
        const today = new Date().toISOString().slice(0, 10);
        const [c] = rows('SELECT since, status FROM clients');
        expect(c.status).toBe('actif');
        expect(c.since).toBe(today);
        expect(nextRenewalIso(c.since, 'mensuel', today)).toBe(addCalendarMonths(today, 1, { clamp: true }));
    });
});
