// @vitest-environment node
/**
 * AUDIT — paiements, abonnements, prix et cohérence des prix.
 * Vrais gestionnaires api/* sur base SQL réelle en mémoire (sql.js) ; Stripe, Clerk et SMTP simulés.
 * Tests qui PASSENT (comportement attendu vérifié). Les bugs reproduits sont dans payments.bugs.test.js.
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

// ═══════════════ 1. Calcul des prix (source unique) ═══════════════
describe('1. Montants : HT, TTC, annuel −20 %, arrondis au centime', () => {
    const EXPECTED = {
        essentiel: { month: 19.2, year: 184.32, annualHt: 153.6 },
        'scan-plus': { month: 28.8, year: 276.48, annualHt: 230.4 },
        physique: { month: 45.6, year: 437.76, annualHt: 364.8 },
    };
    it.each(Object.entries(EXPECTED))('grille actuelle %s : montants exacts et centimes entiers', (id, exp) => {
        const ht = plans.PLAN_CATALOG[id].ht;
        expect(plans.annualHt(ht)).toBe(exp.annualHt);
        expect(plans.annualHt(ht)).toBe(Math.round(12 * ht * 0.8 * 100) / 100);
        expect(plans.planAmountTtc(ht, 'month')).toBe(exp.month);
        expect(plans.planAmountTtc(ht, 'year')).toBe(exp.year);
        // Montant Stripe en centimes : entier, sans dérive flottante
        for (const v of [exp.month, exp.year]) expect(Number.isInteger(Math.round(v * 100))).toBe(true);
        expect(Math.round(plans.planAmountTtc(ht, 'year') * 100)).toBe(Math.round(exp.year * 100));
    });

    it('formatage des montants de demande : « 153.60 » jamais « 153.6 »', () => {
        expect(plans.annualHt(16).toFixed(2)).toBe('153.60');
        expect(plans.planAmountTtc(16, 'month').toFixed(2)).toBe('19.20');
    });

    it('clientPlanPricing : tous les noms de formule, ancienne et nouvelle grille', () => {
        const cur = { grille_tarifaire: plans.PRICING_GRID };
        for (const [name, id] of [['Scan+', 'scan-plus'], ['Confort', 'scan-plus'], ['Premium', 'physique'], ['Physique+', 'physique'], ['reexpedition', 'physique'], ['Essentiel', 'essentiel'], ['', 'essentiel']]) {
            expect(plans.clientPlanPricing(name, cur).id).toBe(id);
            expect(plans.clientPlanPricing(name, {}).id).toBe(id);
        }
        expect(plans.clientPlanPricing('Essentiel', {})).toMatchObject({ ht: 20, ttcMonth: 24, ttcYear: 240, legacy: true });
        expect(plans.clientPlanPricing('Scan+', {})).toMatchObject({ ht: 24, ttcMonth: 28.8, ttcYear: 288, legacy: true });
        expect(plans.clientPlanPricing('Physique+', {})).toMatchObject({ ht: 38, ttcMonth: 45.6, ttcYear: 456, legacy: true });
        expect(plans.clientPlanPricing(null, { ...cur, offre: 'reexpedition' })).toMatchObject({ id: 'physique', ttcYear: 437.76 });
        // Grille inconnue (future, faute de frappe) → ancienne grille, jamais un prix inventé
        expect(plans.clientPlanPricing('Essentiel', { grille_tarifaire: '2026-12' }).legacy).toBe(true);
    });

    it('ligne de prix des emails = clientPlanPricing (mensuel, annuel, ancien client)', () => {
        expect(planPriceLine('Confort', 'annuel')).toContain('230,40');
        expect(planPriceLine('Confort', 'annuel')).toContain('276,48');
        expect(planPriceLine('Essentiel', 'mensuel', {})).toContain('20,00');
        expect(planPriceLine('Essentiel', 'mensuel', {})).toContain('24,00');
        expect(planPriceLine('Premium', 'mensuel', { grille_tarifaire: '2026-11' })).toContain('45,60');
    });
});

// ═══════════════ 2. Dates : échéances et délai de grâce ═══════════════
describe('2. Échéances (fin de mois, bissextile, annuel) et délai de grâce', () => {
    it('nextRenewalIso : fin de mois ramenée au dernier jour, sans dérive', () => {
        expect(nextRenewalIso('2026-01-31', 'mensuel', '2026-02-01')).toBe('2026-02-28');
        expect(nextRenewalIso('2026-01-31', 'mensuel', '2026-02-28')).toBe('2026-03-31');
        expect(nextRenewalIso('2026-01-31', 'mensuel', '2026-04-30')).toBe('2026-05-31');
        expect(nextRenewalIso('2028-01-30', 'mensuel', '2028-02-01')).toBe('2028-02-29');
    });
    it('nextRenewalIso : annuel, 29 février, jour même', () => {
        expect(nextRenewalIso('2024-02-29', 'annuel', '2026-11-10')).toBe('2027-02-28');
        expect(nextRenewalIso('2024-02-29', 'annuel', '2027-03-01')).toBe('2028-02-29');
        expect(nextRenewalIso('2025-11-10', 'annuel', '2026-11-10')).toBe('2027-11-10');
        expect(nextRenewalIso('2026-11-10', 'mensuel', '2026-11-10')).toBe('2026-12-10');
        expect(nextRenewalIso('2026-11-10T15:52:00Z', 'mensuel', '2026-11-10')).toBe('2026-12-10');
        expect(nextRenewalIso('', 'mensuel')).toBeNull();
        expect(nextRenewalIso('10/11/2026', 'mensuel')).toBeNull();
    });
    it('délai de grâce : 2 mois calendaires, bornes exactes (UTC)', () => {
        expect(paymentGraceDeadline('2026-09-10')).toBe('2026-11-10');
        expect(isPaymentGraceExpired('2026-09-10', new Date('2026-11-09T23:59:59Z'))).toBe(false);
        expect(isPaymentGraceExpired('2026-09-10', new Date('2026-11-10T00:00:00Z'))).toBe(true);
        expect(paymentGraceDeadline('2026-08-31')).toBe('2026-10-31');
        // Comportement documenté (débordement, jamais raccourci) : 31/12 + 2 mois = 03/03
        expect(paymentGraceDeadline('2026-12-31')).toBe('2027-03-03');
        expect(paymentGraceDeadline('2027-12-30')).toBe('2028-03-01');
        expect(paymentGraceDeadline('2027-12-29')).toBe('2028-02-29');
        expect(isPaymentGraceExpired(null)).toBe(false);
        expect(addCalendarMonths('2026-12-31', 2, { clamp: true })).toBe('2027-02-28');
    });
});

// ═══════════════ 3. Création de demande et Checkout ═══════════════
describe('3. Demande publique et session Checkout : montant toujours recalculé côté serveur', () => {
    it.each([
        ['Essentiel', 'mensuel', '19.20'], ['Essentiel', 'annuel', '184.32'],
        ['Confort', 'mensuel', '28.80'], ['Confort', 'annuel', '276.48'],
        ['Premium', 'mensuel', '45.60'], ['Premium', 'annuel', '437.76'],
    ])('addDemande %s %s → montant %s, quoi qu’envoie le navigateur', async (plan, frequence, amount) => {
        const r = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan, amount: '0.01', extra_info: FUNNEL('j@test.fr', { frequence, grille_tarifaire: '1999', tarif: 1 }) });
        expect(r.code).toBe(200);
        const [d] = rows('SELECT amount, extra_info FROM demandes');
        expect(d.amount).toBe(amount);
        const extra = JSON.parse(d.extra_info);
        expect(extra.grille_tarifaire).toBe('2026-11');
        expect(extra.tarif).toBeUndefined();
    });

    it('checkout : forfait et fréquence lus dans la demande, pas dans la requête (montant falsifié ignoré)', async () => {
        const { result } = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan: 'Essentiel', extra_info: FUNNEL('j@test.fr') });
        const r = await api(checkout, { body: { planId: 'physique', interval: 'year', amount: 1, unit_amount: 1, productName: 'Gratuit', email: 'evil@x.fr', metadata: { demande_id: result.id, planId: 'physique', interval: 'year' } } });
        expect(r.code).toBe(200);
        const s = ext.created[0];
        expect(s.line_items[0].price_data).toMatchObject({ unit_amount: 1920, recurring: { interval: 'month' }, product_data: { name: 'Forfait Essentiel' } });
        expect(s.metadata).toMatchObject({ demande_id: result.id, planId: 'essentiel', interval: 'month', email: 'j@test.fr' });
        expect(s.allow_promotion_codes).toBe(true);
    });

    it('checkout annuel : 276,48 € TTC pour Confort, sans code promo', async () => {
        const { result } = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan: 'Confort', extra_info: FUNNEL('j@test.fr', { offre: 'scan', frequence: 'annuel' }) });
        await api(checkout, { body: { interval: 'month', metadata: { demande_id: result.id } } });
        expect(ext.created[0].line_items[0].price_data).toMatchObject({ unit_amount: 27648, recurring: { interval: 'year' } });
        expect(ext.created[0].allow_promotion_codes).toBe(false);
    });

    it('checkout refusé pour une demande déjà payée ou inexistante', async () => {
        const { result } = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan: 'Essentiel', extra_info: FUNNEL('j@test.fr') });
        await ext.conn.execute("UPDATE demandes SET status = 'en_attente'");
        expect((await api(checkout, { body: { metadata: { demande_id: result.id } } })).code).toBe(400);
        expect((await api(checkout, { body: { metadata: { demande_id: 'req_inexistant' } } })).code).toBe(400);
        expect((await api(checkout, { body: { planId: 'essentiel', interval: 'month' } })).code).toBe(400);
        expect(ext.created).toHaveLength(0);
    });
});

// ═══════════════ 4. Paiement : retour navigateur, webhook, rejeu ═══════════════
describe('4. Confirmation du paiement : course webhook / retour navigateur, rejeu, métadonnées incohérentes', () => {
    const paidSession = (id, demandeId, meta = {}) => ({ id, status: 'complete', payment_status: 'paid', customer: 'cus_J', metadata: { demande_id: demandeId, planId: 'essentiel', interval: 'month', email: 'j@test.fr', ...meta }, customer_details: { email: 'j@test.fr' } });

    it('webhook et retour navigateur EN MÊME TEMPS : un seul passage, un seul email de bienvenue', async () => {
        const { result } = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan: 'Essentiel', extra_info: FUNNEL('j@test.fr') });
        ext.sessions.cs_race = paidSession('cs_race', result.id);
        const [v, w] = await Promise.all([
            api(verifySession, { method: 'GET', query: { session_id: 'cs_race' } }),
            webhookCall(ext.sessions.cs_race),
        ]);
        expect(v.body.success).toBe(true);
        expect(w.code).toBe(200);
        expect(welcomeCount('j@test.fr')).toBe(1);
        expect(rows('SELECT status FROM demandes')[0].status).toBe('en_attente');
    });

    it('webhook rejoué 3 fois (même après validation admin) : aucun effet supplémentaire', async () => {
        const { result } = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan: 'Essentiel', extra_info: FUNNEL('j@test.fr') });
        const s = paidSession('cs_replay', result.id);
        await webhookCall(s);
        await webhookCall(s);
        expect(welcomeCount('j@test.fr')).toBe(1);
        expect((await data('admin', 'traiterDemande', result.id)).code).toBe(200);
        const before = ext.outbox.length;
        const again = await webhookCall(s);
        expect(again.code).toBe(200);
        expect(ext.outbox.length).toBe(before);
        expect(rows('SELECT COUNT(*) AS n FROM clients')[0].n).toBe(1);
        // Client Stripe : aucun paiement « Ajout Manuel » fictif
        expect(rows('SELECT COUNT(*) AS n FROM payments')[0].n).toBe(0);
    });

    it('session dont les métadonnées ne correspondent pas à la demande : pas d’activation, alerte admin', async () => {
        const { result } = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan: 'Essentiel', extra_info: FUNNEL('j@test.fr') });
        const w = await webhookCall(paidSession('cs_mismatch', result.id, { planId: 'physique', interval: 'year' }));
        expect(w.code).toBe(200);
        expect(rows('SELECT status FROM demandes')[0].status).toBe('en_attente_paiement');
        expect(welcomeCount('j@test.fr')).toBe(0);
        expect(ext.outbox.some((m) => /cs_mismatch|plan_mismatch/.test(`${m.subject} ${m.html} ${m.text}`))).toBe(true);
    });

    it('session non payée (ouverte / asynchrone en attente) : rien n’est activé', async () => {
        const { result } = await data(null, 'addDemande', { clientName: 'J', email: 'j@test.fr', plan: 'Essentiel', extra_info: FUNNEL('j@test.fr') });
        await webhookCall({ ...paidSession('cs_async', result.id), payment_status: 'unpaid' });
        await webhookCall({ ...paidSession('cs_open', result.id), status: 'open' });
        expect(rows('SELECT status FROM demandes')[0].status).toBe('en_attente_paiement');
    });

    it('demande créée AVANT le changement de grille (sans marqueur) puis payée : prix prélevé = prix affiché', async () => {
        await ext.conn.execute(
            "INSERT INTO demandes (id, clientName, email, plan, amount, date, status, extra_info) VALUES ('req_old1', 'Old', 'old@test.fr', 'Essentiel', '24.00', '2026-11-05T10:00:00Z', 'en_attente_paiement', ?)",
            [JSON.stringify({ prenom: 'O', nom: 'Ld', offre: 'notification', frequence: 'mensuel' })],
        );
        await api(checkout, { body: { metadata: { demande_id: 'req_old1' } } });
        const billedCents = ext.created[0].line_items[0].price_data.unit_amount;
        await fulfillCheckoutSession({ id: 'cs_old', status: 'complete', payment_status: 'paid', customer: 'cus_old', metadata: ext.created[0].metadata }, { conn: ext.conn, sendEmail: async () => {} });
        expect((await data('admin', 'traiterDemande', 'req_old1')).code).toBe(200);
        const [c] = rows('SELECT plan, extra_info FROM clients');
        const pricing = plans.clientPlanPricing(c.plan, JSON.parse(c.extra_info));
        expect(Math.round(pricing.ttcMonth * 100)).toBe(billedCents);
    });

    it('chaque formule × fréquence : montant Checkout = prix affiché du client validé', async () => {
        const combos = [['Essentiel', 'notification'], ['Confort', 'scan'], ['Premium', 'reexpedition']].flatMap(([p, o]) => [[p, o, 'mensuel'], [p, o, 'annuel']]);
        for (const [i, [plan, offre, frequence]] of combos.entries()) {
            const email = `c${i}@test.fr`;
            const { result } = await data(null, 'addDemande', { clientName: 'C', email, plan, extra_info: FUNNEL(email, { offre, frequence }) });
            await api(checkout, { body: { metadata: { demande_id: result.id } } });
            const sess = ext.created.at(-1);
            await fulfillCheckoutSession({ id: `cs_c${i}`, status: 'complete', payment_status: 'paid', customer: `cus_c${i}`, metadata: sess.metadata }, { conn: ext.conn, sendEmail: async () => {} });
            await data('admin', 'traiterDemande', result.id);
            const c = rows('SELECT plan, extra_info FROM clients WHERE email = ?', [email])[0];
            const extra = JSON.parse(c.extra_info);
            const pricing = plans.clientPlanPricing(c.plan, extra);
            const shown = extra.frequence === 'annuel' ? pricing.ttcYear : pricing.ttcMonth;
            expect(Math.round(shown * 100), `${plan} ${frequence}`).toBe(sess.line_items[0].price_data.unit_amount);
        }
    });
});

// ═══════════════ 5. Changement de formule ═══════════════
describe('5. /api/change-plan', () => {
    const sub = (interval, status = 'active') => ({ id: 'sub_1', status, metadata: {}, items: { data: [{ id: 'si_1', price: { recurring: { interval } } }] } });

    it('client annuel qui passe en Premium : prix annuel 437,76 € TTC (43776 centimes)', async () => {
        await insertClient('c1', 'alice@test.fr', 'Essentiel', { stripe_customer_id: 'cus_A', grille_tarifaire: '2026-11', frequence: 'annuel' });
        ext.subs.cus_A = [sub('year')];
        const r = await api(changePlan, { who: 'alice', body: { clientId: 'c1', planId: 'physique' } });
        expect(r.code).toBe(200);
        expect(ext.prices[0]).toMatchObject({ unit_amount: 43776, recurring: { interval: 'year' } });
        expect(ext.subUpdates[0][1].proration_behavior).toBe('always_invoice');
        expect(rows('SELECT plan FROM clients')[0].plan).toBe('Premium');
    });

    it('ancien client qui change de formule : passe sur la grille actuelle, et le contrôle quotidien ne voit aucun écart', async () => {
        await insertClient('c1', 'alice@test.fr', 'Scan+', { stripe_customer_id: 'cus_A', frequence: 'mensuel' });
        ext.subs.cus_A = [sub('month')];
        await api(changePlan, { who: 'alice', body: { clientId: 'c1', planId: 'essentiel' } });
        const extra = JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info);
        expect(extra).toMatchObject({ grille_tarifaire: '2026-11', offre: 'notification', stripe_customer_id: 'cus_A', frequence: 'mensuel' });
        expect(ext.prices[0].unit_amount).toBe(1920);
        const stripe = { subscriptions: { list: async () => ({ data: [{ items: { data: [{ price: { unit_amount: ext.prices[0].unit_amount, recurring: { interval: 'month' } } }] } }] }) } };
        expect(await collectHealthIssues({ conn: ext.conn, stripe })).toEqual([]);
    });

    it('alignGrid : refusé au client ; sans effet sur un client déjà au tarif actuel', async () => {
        await insertClient('c1', 'alice@test.fr', 'Essentiel', { stripe_customer_id: 'cus_A' });
        ext.subs.cus_A = [sub('month')];
        expect((await api(changePlan, { who: 'alice', body: { clientId: 'c1', planId: 'essentiel', alignGrid: true } })).code).toBe(403);
        expect((await api(changePlan, { who: 'bob', body: { clientId: 'c1', planId: 'essentiel', alignGrid: true } })).code).toBe(403);
        await ext.conn.execute('UPDATE clients SET extra_info = ?', [JSON.stringify({ stripe_customer_id: 'cus_A', grille_tarifaire: '2026-11' })]);
        const r = await api(changePlan, { who: 'admin', body: { clientId: 'c1', planId: 'essentiel', alignGrid: true } });
        expect(r.body).toMatchObject({ unchanged: true });
        expect(ext.prices).toHaveLength(0);
        expect(ext.subUpdates).toHaveLength(0);
    });

    it('alignGrid admin sur un ancien client annuel : 184,32 € TTC, sans prorata', async () => {
        await insertClient('c1', 'alice@test.fr', 'Essentiel', { stripe_customer_id: 'cus_A', frequence: 'annuel', contractSigned: true });
        ext.subs.cus_A = [sub('year')];
        const r = await api(changePlan, { who: 'admin', body: { clientId: 'c1', planId: 'essentiel', alignGrid: true } });
        expect(r.body).toMatchObject({ ok: true, stripeUpdated: true });
        expect(ext.prices[0]).toMatchObject({ unit_amount: 18432, recurring: { interval: 'year' } });
        expect(ext.subUpdates[0][1].proration_behavior).toBe('none');
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info)).toMatchObject({ grille_tarifaire: '2026-11', contractSigned: true, frequence: 'annuel' });
    });

    it('impayé (past_due / unpaid) : 409 et rien ne change, même pour l’admin en alignGrid', async () => {
        await insertClient('c1', 'alice@test.fr', 'Essentiel', { stripe_customer_id: 'cus_A' });
        for (const status of ['past_due', 'unpaid']) {
            ext.subs.cus_A = [sub('month', status)];
            expect((await api(changePlan, { who: 'alice', body: { clientId: 'c1', planId: 'physique' } })).code).toBe(409);
            expect((await api(changePlan, { who: 'admin', body: { clientId: 'c1', planId: 'essentiel', alignGrid: true } })).code).toBe(409);
        }
        expect(ext.subUpdates).toHaveLength(0);
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info).grille_tarifaire).toBeUndefined();
    });

    it('autre client (même avec son email) : 403', async () => {
        await insertClient('c1', 'alice@test.fr', 'Essentiel', { stripe_customer_id: 'cus_A' });
        expect((await api(changePlan, { who: 'bob', body: { clientId: 'c1', email: 'alice@test.fr', planId: 'physique' } })).code).toBe(403);
    });
});

// ═══════════════ 6. Lien de paiement admin ═══════════════
describe('6. /api/pay (dossier créé par l’admin)', () => {
    const TOKEN = 'ab'.repeat(16);
    it.each([
        ['ancien client Scan+ annuel', 'Scan+', {}, 'annuel', 28800, 'year'],
        ['nouveau client Confort annuel', 'Confort', { grille_tarifaire: '2026-11' }, 'annuel', 27648, 'year'],
        ['nouveau client Premium mensuel', 'Premium', { grille_tarifaire: '2026-11' }, 'mensuel', 4560, 'month'],
    ])('%s : montant = clientPlanPricing', async (_l, plan, grid, frequence, cents, interval) => {
        await insertClient('c1', 'p@test.fr', plan, { ...grid, frequence, payment_token: TOKEN, payment_status: 'pending' });
        const r = await api(payHandler, { method: 'GET', query: { token: TOKEN } });
        expect(r.code).toBe(303);
        expect(ext.created[0].line_items[0].price_data).toMatchObject({ unit_amount: cents, recurring: { interval } });
        expect(ext.created[0].metadata.admin_client_id).toBe('c1');
    });

    it('abonnement déjà actif : pas de 2e session (pas de double prélèvement), dossier marqué payé', async () => {
        await insertClient('c1', 'p@test.fr', 'Essentiel', { grille_tarifaire: '2026-11', payment_token: TOKEN, payment_status: 'pending' });
        ext.customers['p@test.fr'] = 'cus_P';
        ext.subs.cus_P = [{ id: 'sub_P', status: 'active' }];
        const r = await api(payHandler, { method: 'GET', query: { token: TOKEN } });
        expect(r.code).toBe(303);
        expect(ext.created).toHaveLength(0);
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info)).toMatchObject({ payment_status: 'paid', stripe_subscription_id: 'sub_P' });
    });

    it('retour avec la session d’un AUTRE client : rien n’est enregistré', async () => {
        await insertClient('c1', 'p@test.fr', 'Essentiel', { payment_token: TOKEN, payment_status: 'pending' });
        ext.sessions.cs_other = { id: 'cs_other', status: 'complete', payment_status: 'paid', customer: 'cus_X', subscription: 'sub_X', metadata: { admin_client_id: 'c2' } };
        const r = await api(payHandler, { method: 'GET', query: { token: TOKEN, session_id: 'cs_other' } });
        expect(r.code).toBe(303);
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info).payment_status).toBe('pending');
    });

    it('webhook seul (client parti avant le retour) puis retour : enregistré une fois, une seule alerte admin', async () => {
        await insertClient('c1', 'p@test.fr', 'Essentiel', { payment_token: TOKEN, payment_status: 'pending', contractSigned: true });
        const s = { id: 'cs_adm', status: 'complete', payment_status: 'paid', customer: 'cus_P', subscription: 'sub_P', metadata: { admin_client_id: 'c1' } };
        ext.sessions.cs_adm = s;
        await webhookCall(s);
        await webhookCall(s);
        await api(payHandler, { method: 'GET', query: { token: TOKEN, session_id: 'cs_adm' } });
        const extra = JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info);
        expect(extra).toMatchObject({ payment_status: 'paid', stripe_subscription_id: 'sub_P', contractSigned: true });
        expect(ext.outbox.filter((m) => /Abonnement démarré/i.test(m.subject))).toHaveLength(1);
    });
});

// ═══════════════ 7. Contrôle quotidien prix affiché / prix prélevé ═══════════════
describe('7. Contrôle de santé : pas de faux positif', () => {
    const fake = (map) => ({ subscriptions: { list: async ({ customer }) => ({ data: map[customer] ? [{ items: { data: [{ price: { unit_amount: map[customer][0], recurring: { interval: map[customer][1] } } }] } }] : [] }) } });
    it('sans abonnement, ancien annuel (240 €), nouveau annuel Premium (437,76 €), ancien Physique+ (45,60 €) : rien', async () => {
        await insertClient('a', 'a@t.fr', 'Essentiel', { stripe_customer_id: 'cus_none' });
        await insertClient('b', 'b@t.fr', 'Essentiel', { stripe_customer_id: 'cus_b', frequence: 'annuel', offre: 'notification' });
        await insertClient('c', 'c@t.fr', 'Premium', { stripe_customer_id: 'cus_c', grille_tarifaire: '2026-11', offre: 'reexpedition' });
        await insertClient('d', 'd@t.fr', 'Physique+', { stripe_customer_id: 'cus_d', offre: 'reexpedition' });
        const stripe = fake({ cus_b: [24000, 'year'], cus_c: [43776, 'year'], cus_d: [4560, 'month'] });
        expect(await collectHealthIssues({ conn: ext.conn, stripe })).toEqual([]);
    });
    it('écart réel (ancien Essentiel encore prélevé 24 € alors que le dossier est passé à 16 €) : signalé', async () => {
        await insertClient('a', 'a@t.fr', 'Essentiel', { stripe_customer_id: 'cus_a', grille_tarifaire: '2026-11', offre: 'notification' });
        const issues = await collectHealthIssues({ conn: ext.conn, stripe: fake({ cus_a: [2400, 'month'] }) });
        expect(issues.map((i) => i.kind)).toEqual(['price_mismatch']);
    });
});

// ═══════════════ 8. Historique de paiement : propriété ═══════════════
describe('8. /api/list-payments : un client ne voit que ses paiements', () => {
    beforeEach(async () => {
        await insertClient('ca', 'alice@test.fr', 'Essentiel', { stripe_customer_id: 'cus_A' });
        await insertClient('cb', 'bob@test.fr', 'Essentiel', { stripe_customer_id: 'cus_B' });
        ext.customers['alice@test.fr'] = 'cus_A';
        ext.customers['bob@test.fr'] = 'cus_B';
    });
    it('son propre customerId / email : 200 ; ceux d’un autre : 403 ; non connecté : 401', async () => {
        expect((await api(listPayments, { method: 'GET', who: 'alice', query: { customerId: 'cus_A' } })).code).toBe(200);
        expect((await api(listPayments, { method: 'GET', who: 'alice', query: { email: 'ALICE@test.fr ' } })).code).toBe(200);
        expect((await api(listPayments, { method: 'GET', who: 'alice', query: { customerId: 'cus_B' } })).code).toBe(403);
        expect((await api(listPayments, { method: 'GET', who: 'alice', query: { email: 'bob@test.fr' } })).code).toBe(403);
        expect((await api(listPayments, { method: 'GET', who: 'alice', query: { customerId: 'cus_A', email: 'bob@test.fr' } })).code).toBe(403);
        expect((await api(listPayments, { method: 'GET', query: { customerId: 'cus_A' } })).code).toBe(401);
        expect((await api(listPayments, { method: 'GET', who: 'admin', query: { customerId: 'cus_B' } })).code).toBe(200);
    });
    it('un cus_… d’un autre écrit dans un champ libre de sa fiche ne donne aucun accès', async () => {
        await ext.conn.execute("UPDATE clients SET extra_info = ? WHERE id = 'ca'", [JSON.stringify({ stripe_customer_id: 'cus_A', notes: 'cus_B', stripeCustomerId: 'cus_B' })]);
        expect((await api(listPayments, { method: 'GET', who: 'alice', query: { customerId: 'cus_B' } })).code).toBe(403);
    });
});
