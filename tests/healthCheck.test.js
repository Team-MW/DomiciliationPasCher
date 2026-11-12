// @vitest-environment node
/** Contrôle de santé quotidien : repère les clients bloqués avant qu'ils n'appellent. */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSqlJsConn } from './helpers/sqlJsConn.js';
import { collectHealthIssues, buildHealthReportEmail } from '../api/_health-check.js';

const NOW = Date.parse('2026-11-10T08:00:00Z');
const user = (id, email, verified, extra = {}) => ({
    id, primaryEmailAddressId: `e_${id}`,
    emailAddresses: [{ id: `e_${id}`, emailAddress: email, verification: { status: verified ? 'verified' : 'unverified' } }],
    ...extra,
});

let conn;
const addClient = (id, email, { clerkId = '', since = '2026-11-01', status = 'actif', extra = {} } = {}) => conn.execute(
    'INSERT INTO clients (id, name, email, status, since, clerkId, extra_info) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, `Client ${id}`, email, status, since, clerkId, JSON.stringify(extra)],
);
const fakeClerk = (users) => ({
    users: {
        getUserList: async ({ userId } = {}) => ({ data: userId ? users.filter((u) => userId.includes(u.id)) : users }),
    },
});
const fakeStripe = (known, prices = {}) => ({
    subscriptions: { list: async ({ customer }) => {
        if (!known.includes(customer)) throw Object.assign(new Error('No such customer'), { code: 'resource_missing' });
        const p = prices[customer];
        return { data: p ? [{ items: { data: [{ price: { unit_amount: p[0], recurring: { interval: p[1] || 'month' } } }] } }] : [] };
    } },
});

beforeEach(async () => { conn = await createSqlJsConn(); });

describe('collectHealthIssues', () => {
    it('signale un compte relié dont l’adresse n’est pas vérifiée (cas Sherine Amri)', async () => {
        await addClient('c1', 'sherine@test.fr', { clerkId: 'user_1' });
        const issues = await collectHealthIssues({ conn, clerk: fakeClerk([user('user_1', 'sherine@test.fr', false)]), now: NOW });
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({ kind: 'unverified', email: 'sherine@test.fr' });
    });

    it('signale aussi un compte non relié mais à l’adresse d’un client', async () => {
        await addClient('c1', 'Sherine@Test.fr');
        const issues = await collectHealthIssues({ conn, clerk: fakeClerk([user('user_9', 'sherine@test.fr', false)]), now: NOW });
        expect(issues.map((i) => i.kind)).toEqual(['unverified']);
    });

    it('ne dit rien quand tout va bien', async () => {
        await addClient('c1', 'ok@test.fr', { clerkId: 'user_1', extra: { stripe_customer_id: 'cus_ok' } });
        await addClient('c2', 'archive@test.fr', { status: 'archive' });
        const issues = await collectHealthIssues({ conn, clerk: fakeClerk([user('user_1', 'ok@test.fr', true)]), stripe: fakeStripe(['cus_ok']), now: NOW });
        expect(issues).toEqual([]);
    });

    it('client actif depuis plus de 3 jours sans compte de connexion ; pas avant', async () => {
        await addClient('old', 'old@test.fr', { since: '2026-11-01' });
        await addClient('new', 'new@test.fr', { since: '2026-11-09' });
        const issues = await collectHealthIssues({ conn, clerk: fakeClerk([]), now: NOW });
        expect(issues.map((i) => [i.kind, i.email])).toEqual([['no_account', 'old@test.fr']]);
    });

    it('identifiant Stripe introuvable ; une panne Stripe n’est pas une anomalie', async () => {
        await addClient('c1', 'a@test.fr', { extra: { stripe_customer_id: 'cus_VBwFU7PKuc5SjE' } });
        const issues = await collectHealthIssues({ conn, stripe: fakeStripe([]), now: NOW });
        expect(issues).toMatchObject([{ kind: 'stripe_missing', email: 'a@test.fr' }]);
        const down = { subscriptions: { list: async () => { throw Object.assign(new Error('timeout'), { type: 'StripeConnectionError' }); } } };
        expect(await collectHealthIssues({ conn, stripe: down, now: NOW })).toEqual([]);
    });

    it('emails en échec des dernières 24 h seulement', async () => {
        const log = (id, at) => conn.execute("INSERT INTO email_logs (id, to_email, type, status, error, sent_at) VALUES (?, 'x@test.fr', 'welcome', 'failed', 'Connection timeout', ?)", [id, at]);
        await log('l1', '2026-11-10T02:00:00.000Z');
        await log('l2', '2026-11-08T02:00:00.000Z');
        const issues = await collectHealthIssues({ conn, now: NOW });
        expect(issues).toMatchObject([{ kind: 'email_failed', email: 'x@test.fr' }]);
    });

    it('Clerk en panne : signalé, sans faire échouer les autres contrôles', async () => {
        await addClient('c1', 'a@test.fr', { extra: { stripe_customer_id: 'cus_x' } });
        const broken = { users: { getUserList: async () => { throw new Error('Clerk 503'); } } };
        const issues = await collectHealthIssues({ conn, clerk: broken, stripe: fakeStripe([]), now: NOW });
        expect(issues.map((i) => i.kind)).toEqual(['check_failed', 'stripe_missing']);
    });
});

describe('prix affiché = prix prélevé', () => {
    it('Essentiel souscrit sur la nouvelle grille (16 € HT = 19,20 TTC) mais prélevé 24 € TTC : signalé', async () => {
        await addClient('c1', 'casin@test.fr', { clerkId: '', extra: { stripe_customer_id: 'cus_a', grille_tarifaire: '2026-11' } });
        await conn.execute("UPDATE clients SET plan = 'Essentiel' WHERE id = 'c1'");
        const issues = await collectHealthIssues({ conn, stripe: fakeStripe(['cus_a'], { cus_a: [2400] }), now: NOW });
        expect(issues).toMatchObject([{ kind: 'price_mismatch', email: 'casin@test.fr' }]);
        expect(issues[0].detail).toContain('Stripe prélève 24,00');
    });

    it('ancien client à 20 € HT prélevé 24 € TTC, nouveau client annuel au bon prix : rien à signaler', async () => {
        await addClient('old', 'old@test.fr', { extra: { stripe_customer_id: 'cus_old' } });
        await addClient('new', 'new@test.fr', { extra: { stripe_customer_id: 'cus_new', grille_tarifaire: '2026-11', frequence: 'annuel' } });
        await conn.execute("UPDATE clients SET plan = 'Essentiel'");
        const stripe = fakeStripe(['cus_old', 'cus_new'], { cus_old: [2400], cus_new: [18432, 'year'] });
        expect(await collectHealthIssues({ conn, stripe, now: NOW })).toEqual([]);
    });
});

describe('buildHealthReportEmail', () => {
    it('regroupe par type et échappe le HTML', () => {
        const mail = buildHealthReportEmail([
            { kind: 'unverified', client: '<b>Amri</b>', email: 's@test.fr', detail: 'bloqué' },
            { kind: 'email_failed', email: 'x@test.fr', detail: 'échec' },
        ], { baseUrl: 'https://site.test/' });
        expect(mail.subject).toBe('Contrôle du site : 2 points à traiter');
        expect(mail.html).toContain('&lt;b&gt;Amri&lt;/b&gt;');
        expect(mail.html).toContain('https://site.test/admin');
        expect(mail.text).toContain('Clients bloqués par « email non vérifié » (1)');
    });
});

describe('lien « Activer mon accès » envoyé automatiquement aux clients bloqués', () => {
    it('envoie le lien signé une fois, puis pas avant 3 jours ; le rapport admin le dit', async () => {
        const { sendActivationLinks } = await import('../api/_health-check.js');
        const { isValidSignupProof } = await import('../api/_signup-proof.js');
        await addClient('c1', 'william@icloud.com', { clerkId: 'user_w' });
        const outbox = [];
        const transporter = { sendMail: async (m) => { outbox.push(m); return { messageId: 'x' }; } };
        const run = async (now) => {
            const issues = await collectHealthIssues({ conn, clerk: fakeClerk([user('user_w', 'william@icloud.com', false)]), now });
            await sendActivationLinks({ conn, transporter, from: 's@test.fr', baseUrl: 'https://site.test', issues, now });
            return issues;
        };
        const issues = await run(NOW);
        expect(outbox).toHaveLength(1);
        expect(outbox[0].to).toBe('william@icloud.com');
        const link = new URL(/https:\/\/site\.test\/connexion\?[^"\s]+/.exec(outbox[0].html)[0].replace(/&amp;/g, '&'));
        expect(link.searchParams.get('email')).toBe('william@icloud.com');
        expect(isValidSignupProof('william@icloud.com', link.searchParams.get('v'))).toBe(true);
        expect(issues[0].detail).toMatch(/envoyé automatiquement/);

        await run(NOW + 24 * 3600 * 1000);
        expect(outbox).toHaveLength(1); // pas de relance le lendemain
        await run(NOW + 4 * 24 * 3600 * 1000);
        expect(outbox).toHaveLength(2); // relance après 3 jours
    });
});
