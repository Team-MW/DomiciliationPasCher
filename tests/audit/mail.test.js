// @vitest-environment node
/**
 * AUDIT — courrier, documents, notifications, emails transactionnels, cron.
 * Tests adverses qui PASSENT (comportement correct vérifié). Les bugs reproduits sont dans mail.bugs.test.js.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

const ext = vi.hoisted(() => ({ conn: null, outbox: [], smtpDown: false, users: {} }));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: async (m) => {
        if (ext.smtpDown) throw Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' });
        ext.outbox.push(m);
        return { messageId: `<m${ext.outbox.length}@test>` };
    } }) },
}));
vi.mock('@clerk/backend', () => ({ createClerkClient: () => ({ users: { getUserList: async () => ({ data: [] }) } }), verifyToken: async () => ({}) }));
vi.mock('../../api/_stripe-client.js', () => ({ getStripe: () => { throw new Error('stripe off in audit'); } }));

const { __setAuthVerifierForTests } = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const emailHandler = (await import('../../api/email.js')).default;
const cronModule = await import('../../api/cron/reminders.js');
const cron = cronModule.default;
const { getParisHour } = cronModule;
const notif = await import('../../api/_notifications.js');
const { sanitizeClientExtra, isSafeDocumentUrl } = await import('../../api/_client-extra.js');
const { buildTransactionalEmail, EMAIL_TYPES } = await import('../../api/_email-core.js');
const { dueDocumentReminder, computeMissingDocuments } = await import('../../shared/documentRequest.js');
const { ADMIN_EMAIL } = await import('../../api/_smtp.js');

const ADMIN = { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' };
const mockRes = () => {
    const r = { code: 200, body: null, headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.send = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; return r; };
    r.end = () => r;
    return r;
};
const at = (iso) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };
const call = async (handler, { who, body, query, method = 'POST', headers = {} } = {}) => {
    const res = mockRes();
    await handler({ method, headers: { host: 'site.test', ...(who ? { authorization: `Bearer ${who}` } : {}), ...headers }, body, query: query || {} }, res);
    return res;
};
const data = async (who, method, ...args) => {
    const res = await call(dataHandler, { who, body: { method, args } });
    return { code: res.code, result: res.body?.result, error: res.body?.error };
};
const addMail = (clientId, over = {}) => data('admin', 'addClientMail', clientId, { company: 'S SAS', type: 'Lettre simple', from: 'Impots', preview: '', ...over });
const runCron = (query = {}) => call(cron, { method: 'GET', headers: { authorization: 'Bearer cron-secret' }, query });
const sentTo = (to) => ext.outbox.filter((m) => String(m.to).toLowerCase() === to.toLowerCase());
const rows = (sql, p) => ext.conn.all(sql, p);
const transporter = { sendMail: async (m) => {
    if (ext.smtpDown) throw new Error('SMTP down');
    ext.outbox.push(m);
    return { messageId: `<t${ext.outbox.length}@test>` };
} };
const insertClient = (id, email, { name = 'Jean Dupont', plan = 'Essentiel', status = 'actif', extra = {} } = {}) => ext.conn.execute(
    'INSERT INTO clients (id, name, email, company, plan, status, since, extra_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, email, 'S SAS', plan, status, '2026-10-01', JSON.stringify(extra)],
);

beforeAll(() => {
    Object.assign(process.env, {
        SMTP_HOST: 'smtp.test', SMTP_PORT: '465', SMTP_USER: 's@test.fr', SMTP_PASS: 'abcdabcdabcdabcd',
        CLERK_SECRET_KEY: 'sk_test_x', VITE_ADMIN_EMAILS: ADMIN.email, CRON_SECRET: 'cron-secret',
    });
    for (const m of ['error', 'warn', 'log']) vi.spyOn(console, m).mockImplementation(() => {});
});
beforeEach(async () => {
    vi.useRealTimers();
    ext.conn = await createSqlJsConn();
    ext.outbox = [];
    ext.smtpDown = false;
    ext.users = {};
    __setAuthVerifierForTests(async (t) => (t === 'admin' ? ADMIN : ext.users[t] || null));
    // Colonne mail.notified_at créée comme en production (avant tout dépôt).
    await notif.processMailNotifications({ conn: ext.conn, transporter, from: 's@test.fr', baseUrl: 'https://site.test' });
    await insertClient('c1', 'client@x.fr');
});
afterEach(() => vi.useRealTimers());

// ═══════════════════ 1. Heure de Paris et changements d'heure ═══════════════════
describe('getParisHour : changements d’heure (dernier dimanche de mars / octobre)', () => {
    it.each([
        ['2026-03-29T00:59:00Z', 1], // dernière minute de l'heure d'hiver
        ['2026-03-29T01:00:00Z', 3], // 2 h → 3 h
        ['2026-03-29T06:00:00Z', 8],
        ['2026-10-25T00:30:00Z', 2], // 2 h 30 (été)
        ['2026-10-25T01:30:00Z', 2], // 2 h 30 (hiver, l'heure est rejouée)
        ['2026-10-25T07:00:00Z', 8],
        ['2026-07-14T05:59:00Z', 7],
        ['2026-07-14T18:00:00Z', 20],
        ['2026-12-31T23:00:00Z', 0],
    ])('%s → %i h', (iso, hour) => {
        expect(getParisHour(new Date(iso))).toBe(hour);
    });
});

describe('Cron horaire : fenêtre 8 h – 20 h (Paris) en hiver, en été et le jour du changement', () => {
    const cases = [
        ['2026-11-10T06:59:00Z', false], // 7 h 59 hiver
        ['2026-11-10T07:00:00Z', true], // 8 h hiver
        ['2026-11-10T19:00:00Z', true], // 20 h hiver
        ['2026-11-10T20:00:00Z', false], // 21 h hiver
        ['2026-07-14T05:00:00Z', false], // 7 h été
        ['2026-07-14T06:00:00Z', true], // 8 h été
        ['2026-07-14T18:00:00Z', true], // 20 h été
        ['2026-07-14T19:00:00Z', false], // 21 h été
        ['2026-03-29T06:00:00Z', true], // jour du passage à l'heure d'été, 8 h
        ['2026-03-29T05:00:00Z', false], // 7 h
        ['2026-10-25T07:00:00Z', true], // jour du passage à l'heure d'hiver, 8 h
        ['2026-10-25T06:00:00Z', false], // 7 h
    ];
    it.each(cases)('%s → récap envoyé : %s', async (iso, expected) => {
        await ext.conn.execute("INSERT INTO mail (id, clientId, company, type, \"from\", date, status, preview) VALUES ('m1', 'c1', 'S', 'Lettre simple', 'URSSAF', '2026-11-10', 'non lu', '')");
        at(iso);
        await runCron();
        expect(sentTo('client@x.fr').length).toBe(expected ? 1 : 0);
    });
});

// ═══════════════════ 2. Notification immédiate au dépôt ═══════════════════
describe('Dépôt par l’admin : notification immédiate aux bornes de 8 h et 20 h', () => {
    it.each([
        ['2026-11-10T06:59:59Z', 0], // 7 h 59 Paris
        ['2026-11-10T07:00:00Z', 1], // 8 h 00
        ['2026-11-10T18:59:00Z', 1], // 19 h 59
        ['2026-11-10T19:00:00Z', 1], // 20 h 00
        ['2026-11-10T19:01:00Z', 1], // 20 h 01 (la plage 20 h inclut 20 h 59 comme le cron)
        ['2026-11-10T20:00:00Z', 0], // 21 h 00
        ['2026-03-29T01:30:00Z', 0], // 3 h 30, nuit du changement d'heure
    ])('%s → %i email', async (iso, n) => {
        at(iso);
        expect((await addMail('c1')).code).toBe(200);
        expect(sentTo('client@x.fr')).toHaveLength(n);
    });

    it('dépôt de nuit : un seul email au passage de 8 h, rien au passage de 9 h', async () => {
        at('2026-11-10T22:00:00Z'); // 23 h
        await addMail('c1', { from: 'A' });
        at('2026-11-11T02:00:00Z'); // 3 h
        await addMail('c1', { from: 'B' });
        await runCron();
        expect(sentTo('client@x.fr')).toHaveLength(0);
        at('2026-11-11T07:00:00Z');
        await runCron();
        at('2026-11-11T08:00:00Z');
        await runCron();
        const mails = sentTo('client@x.fr');
        expect(mails).toHaveLength(1);
        expect(mails[0].subject).toMatch(/2 nouveaux courriers/);
    });

    it('SMTP en panne au dépôt et au premier cron : rien n’est marqué notifié, l’échec est journalisé, le cron suivant envoie UNE fois', async () => {
        at('2026-11-10T10:00:00Z');
        ext.smtpDown = true;
        expect((await addMail('c1')).code).toBe(200);
        at('2026-11-10T11:00:00Z');
        await runCron();
        expect(rows("SELECT notified_at FROM mail WHERE clientId = 'c1'")[0].notified_at).toBeNull();
        const failed = rows("SELECT * FROM email_logs WHERE status = 'failed' AND type = 'new_mail'");
        expect(failed.length).toBe(2);
        expect(failed[0].to_email).toBe('client@x.fr');
        ext.smtpDown = false;
        at('2026-11-10T12:00:00Z');
        await runCron();
        at('2026-11-10T13:00:00Z');
        await runCron();
        expect(sentTo('client@x.fr')).toHaveLength(1);
        expect(rows("SELECT notified_at FROM mail WHERE clientId = 'c1'")[0].notified_at).toMatch(/^2026-11-10T12/);
        const sent = rows("SELECT * FROM email_logs WHERE status = 'sent' AND type = 'new_mail'");
        expect(sent).toHaveLength(1);
        expect(sent[0].source).toBe('auto');
        expect(sent[0].message_id).toBeTruthy();
    });

    it('écart de 10 min : 2e dépôt à +9 min retenu, regroupé au cron ; 3e dépôt à +11 min après le cron : retenu (le cron vient de prévenir)', async () => {
        at('2026-11-10T10:00:00Z');
        await addMail('c1', { from: 'A' });
        at('2026-11-10T10:09:00Z');
        await addMail('c1', { from: 'B' });
        expect(sentTo('client@x.fr')).toHaveLength(1);
        at('2026-11-10T10:11:00Z');
        await addMail('c1', { from: 'C' });
        // +11 min depuis le premier email : nouvel email immédiat avec B et C regroupés
        expect(sentTo('client@x.fr')).toHaveLength(2);
        expect(sentTo('client@x.fr')[1].text).toMatch(/B[\s\S]*C|C[\s\S]*B/);
        at('2026-11-10T11:00:00Z');
        await runCron();
        expect(sentTo('client@x.fr')).toHaveLength(2);
    });

    it('client résilié : marqué « skipped », jamais prévenu, même s’il est réactivé ensuite', async () => {
        await insertClient('c2', 'old@x.fr', { status: 'résilié' });
        at('2026-11-10T10:00:00Z');
        await addMail('c2');
        expect(sentTo('old@x.fr')).toHaveLength(0);
        expect(rows("SELECT notified_at FROM mail WHERE clientId = 'c2'")[0].notified_at).toBe('skipped');
    });

    it('adresse dédiée au courrier (emailCourrier) : l’email part à cette adresse, pas à l’adresse du compte', async () => {
        await insertClient('c3', 'compte@x.fr', { extra: { emailCourrier: '  courrier@x.fr ' } });
        at('2026-11-10T10:00:00Z');
        await addMail('c3');
        expect(sentTo('courrier@x.fr')).toHaveLength(1);
        expect(sentTo('compte@x.fr')).toHaveLength(0);
    });

    it('un dépôt pour le client A ne déclenche jamais d’email pour le courrier en attente du client B', async () => {
        await insertClient('c4', 'b@x.fr');
        await ext.conn.execute("INSERT INTO mail (id, clientId, company, type, \"from\", date, status, preview) VALUES ('mb', 'c4', 'S', 'Lettre simple', 'X', '2026-11-10', 'non lu', '')");
        at('2026-11-10T10:00:00Z');
        await addMail('c1');
        expect(sentTo('b@x.fr')).toHaveLength(0);
        expect(sentTo('client@x.fr')).toHaveLength(1);
    });

    it('injection HTML dans le nom du client et l’expéditeur : échappée dans le HTML, pas d’en-tête injecté', async () => {
        await insertClient('c5', 'xss@x.fr', { name: '<img src=x onerror=alert(1)>\r\nBcc: evil@x.fr' });
        at('2026-11-10T10:00:00Z');
        await addMail('c5', { from: '<script>alert(1)</script>', type: '<b>Colis</b>' });
        const [m] = sentTo('xss@x.fr');
        expect(m).toBeTruthy();
        expect(m.html).not.toMatch(/<script>|<img src=x/);
        expect(m.html).toContain('&lt;script&gt;');
        expect(m.subject).not.toMatch(/[\r\n]/);
        expect(m.bcc).toBeUndefined();
    });
});

// ═══════════════════ 3. /api/email : contrôle d'accès par type ═══════════════════
describe('/api/email : types inconnus, destinataires forcés', () => {
    beforeEach(() => { ext.users.client = { userId: 'user_c', email: 'client@x.fr' }; });

    it('type inconnu : anonyme 401, client 403, admin 400 — aucun envoi', async () => {
        const body = { type: 'pwned', email: 'victim@x.fr', nom: 'x' };
        expect((await call(emailHandler, { body })).code).toBe(401);
        expect((await call(emailHandler, { who: 'client', body })).code).toBe(403);
        expect((await call(emailHandler, { who: 'admin', body })).code).toBe(400);
        for (const type of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
            expect((await call(emailHandler, { who: 'admin', body: { ...body, type } })).code).toBe(400);
        }
        expect(ext.outbox).toHaveLength(0);
    });

    it('un client ne peut envoyer aucun email « admin » (bienvenue, lien de paiement, nouveau courrier…)', async () => {
        for (const type of [undefined, 'welcome', 'approval', 'account_created', 'payment_failed', 'new_mail', 'request_documents', 'reexpedition_sent', 'email_verification']) {
            const res = await call(emailHandler, { who: 'client', body: { type, email: 'victim@x.fr', paymentLink: 'https://evil.test' } });
            expect(res.code).toBe(403);
        }
        expect(ext.outbox).toHaveLength(0);
    });

    it('client → admin : destinataire forcé à la boîte interne, email du body remplacé par celui du compte', async () => {
        const res = await call(emailHandler, { who: 'client', body: { type: 'admin_reexpedition', email: 'victim@x.fr', nom: 'Jean', address: '1 rue', notes: '<b>x</b>' } });
        expect(res.code).toBe(200);
        expect(ext.outbox).toHaveLength(1);
        expect(ext.outbox[0].to).toBe(ADMIN_EMAIL);
        expect(ext.outbox[0].text).toContain('client@x.fr');
        expect(ext.outbox[0].text).not.toContain('victim@x.fr');
        expect(ext.outbox[0].html).not.toContain('<b>x</b>');
    });

    it('accusé client (post_signature) : toujours envoyé à l’adresse du compte, jamais à une adresse tierce', async () => {
        await call(emailHandler, { who: 'client', body: { type: 'post_signature', email: 'victim@x.fr' } });
        expect(ext.outbox.map((m) => m.to)).toEqual(['client@x.fr']);
    });

    it('formulaire public : liste d’adresses / CRLF refusés ; objet admin sans saut de ligne', async () => {
        for (const email of ['a@x.fr, b@y.fr', 'a@x.fr\r\nBcc: b@y.fr', 'a@x.fr;b@y.fr', '"a"@x.fr', ['a@x.fr']]) {
            expect((await call(emailHandler, { body: { type: 'contact_advisor', email } })).code).toBe(400);
        }
        expect(ext.outbox).toHaveLength(0);
        const built = buildTransactionalEmail({ type: 'contact_advisor', email: 'p@x.fr', nom: 'Jean\r\nBcc: evil@x.fr' });
        expect(built.subject).not.toMatch(/[\r\n]/);
        expect(built.to).not.toContain('p@x.fr');
    });

    it('chaque type connu produit un objet et un HTML qui échappent un nom piégé', () => {
        const nom = '<svg onload=alert(1)>';
        for (const type of EMAIL_TYPES) {
            const built = buildTransactionalEmail({ type, email: 'p@x.fr', nom, content: nom, address: nom, notes: nom, company: nom, documentName: nom, mailFrom: nom, mailType: nom, projetType: nom, message: nom });
            expect(built.html, type).not.toContain('<svg');
            expect(built.subject, type).not.toMatch(/[\r\n]/);
        }
    });

    it('lien de paiement admin : javascript: rejeté (repli sur l’espace client)', () => {
        const built = buildTransactionalEmail({ type: 'payment_failed', email: 'p@x.fr', paymentLink: 'javascript:alert(1)' });
        expect(built.html).not.toMatch(/javascript:/i);
    });
});

// ═══════════════════ 4. Relances de documents ═══════════════════
describe('Relances documents (statuts / Kbis)', () => {
    const DAY = 86400000;
    const startAt = async (iso, extra = {}) => {
        await ext.conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify({
            ...extra,
            doc_request: { missing: ['statuts', 'kbis'], is_creation: false, requested_at: iso, initial_pending: true, reminders_sent: [], completed_at: null },
        }), 'c1']);
    };
    const run = (iso) => notif.processDocumentRequests({ conn: ext.conn, transporter, from: 's@test.fr', baseUrl: 'https://site.test', now: new Date(iso) });
    const docReq = () => JSON.parse(rows("SELECT extra_info FROM clients WHERE id = 'c1'")[0].extra_info).doc_request;

    it('cadence complète : initial, J+7, J+30, J+60, J+80 (dernier rappel), puis plus rien ; rejouer le même jour ne double pas', async () => {
        await startAt('2026-11-01T08:00:00.000Z');
        await run('2026-11-01T08:00:00.000Z');
        expect(sentTo('client@x.fr')).toHaveLength(1);
        const t0 = Date.parse(docReq().requested_at);
        for (const day of [1, 6]) await run(new Date(t0 + day * DAY).toISOString());
        expect(sentTo('client@x.fr')).toHaveLength(1);
        for (const [day, n] of [[7, 2], [7, 2], [30, 3], [60, 4], [80, 5], [81, 5], [200, 5]]) {
            await run(new Date(t0 + day * DAY).toISOString());
            expect(sentTo('client@x.fr').length, `J+${day}`).toBe(n);
        }
        expect(sentTo('client@x.fr')[4].subject).toMatch(/^Dernier rappel/);
        expect(docReq().reminders_sent).toEqual([7, 30, 60, 80]);
        const types = rows("SELECT type FROM email_logs WHERE to_email = 'client@x.fr' ORDER BY sent_at").map((r) => r.type);
        expect(types[0]).toBe('request_documents');
        expect(types.slice(1).every((t) => t === 'request_documents_reminder')).toBe(true);
    });

    it('cron manqué pendant 5 semaines : UNE relance couvrant J+7 et J+30', async () => {
        await startAt('2026-11-01T08:00:00.000Z');
        await run('2026-11-01T08:00:00.000Z');
        await run('2026-12-06T08:00:00.000Z');
        expect(sentTo('client@x.fr')).toHaveLength(2);
        expect(docReq().reminders_sent).toEqual([7, 30]);
    });

    it('un Kbis déjà déposé vaut aussi pour les statuts (carte « Statuts ou Kbis ») : aucune relance, demande clôturée', async () => {
        await startAt('2026-11-01T08:00:00.000Z', { kbisUrl: 'https://res.cloudinary.com/d/kbis.pdf' });
        await run('2026-11-01T08:00:00.000Z');
        expect(sentTo('client@x.fr')).toHaveLength(0);
        expect(docReq().completed_at).toBeTruthy();
    });

    it('documents déposés (statuts puis Kbis) : demande clôturée, plus aucune relance', async () => {
        await startAt('2026-11-01T08:00:00.000Z');
        await run('2026-11-01T08:00:00.000Z');
        expect(sentTo('client@x.fr')[0].text).toMatch(/statuts/i);
        await ext.conn.execute("INSERT INTO documents (id, clientId, name, url) VALUES ('d1', 'c1', 'Statuts SAS.pdf', '#')");
        await ext.conn.execute("INSERT INTO documents (id, clientId, name, url) VALUES ('d2', 'c1', 'Extrait Kbis.pdf', '#')");
        await run('2026-11-08T08:00:00.000Z');
        expect(sentTo('client@x.fr')).toHaveLength(1);
        expect(docReq().completed_at).toBeTruthy();
    });

    it('client résilié ou SMTP en panne : pas de relance, rien n’est marqué (retenté)', async () => {
        await startAt('2026-11-01T08:00:00.000Z');
        ext.smtpDown = true;
        await run('2026-11-01T08:00:00.000Z');
        expect(docReq().initial_pending).toBe(true);
        expect(rows("SELECT status FROM email_logs WHERE type = 'request_documents'")[0].status).toBe('failed');
        ext.smtpDown = false;
        await ext.conn.execute("UPDATE clients SET status = 'résilié' WHERE id = 'c1'");
        await run('2026-11-02T08:00:00.000Z');
        expect(sentTo('client@x.fr')).toHaveLength(0);
    });

    it('dueDocumentReminder / computeMissingDocuments : valeurs limites', () => {
        expect(dueDocumentReminder(null)).toBeNull();
        expect(dueDocumentReminder({ requested_at: '2026-11-01T00:00:00Z', completed_at: '2026-11-02' })).toBeNull();
        expect(dueDocumentReminder({ requested_at: 'pas une date' }, new Date('2026-12-01'))).toBeNull();
        expect(computeMissingDocuments(['kbis', 'inconnu'], { extra: {}, documents: [null, { name: 'KBIS 2026.pdf' }] })).toEqual([]);
    });
});

// ═══════════════════ 5. Relances d'inscription / de paiement ═══════════════════
describe('Relances prospects et liens de paiement', () => {
    const lead = (email, created, over = {}) => ext.conn.execute(
        'INSERT INTO souscription_leads (email, token, first_name, plan, step, draft, created_at, updated_at, reminders_sent, completed_at, unsubscribed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [email, `tok${email.length}${Math.random().toString(16).slice(2, 10)}`, '<b>Léa</b>', 'essentiel', 2, '{}', created, created, 0, over.completed_at || null, over.unsubscribed_at || null],
    );
    const runLeads = (iso) => notif.processSouscriptionLeads({ conn: ext.conn, transporter, from: 's@test.fr', baseUrl: 'https://site.test', now: new Date(iso) });

    it('relances 1 h, J+1, J+3 puis arrêt ; prénom échappé ; lien de désinscription', async () => {
        await lead('p@x.fr', '2026-11-01T10:00:00.000Z');
        for (const iso of ['2026-11-01T10:30:00.000Z', '2026-11-01T11:00:00.000Z', '2026-11-01T12:00:00.000Z', '2026-11-02T10:00:00.000Z', '2026-11-04T10:00:00.000Z', '2026-11-05T10:00:00.000Z']) await runLeads(iso);
        const mails = sentTo('p@x.fr');
        expect(mails).toHaveLength(3);
        expect(mails[0].html).not.toContain('<b>Léa</b>');
        expect(mails[0].headers['List-Unsubscribe']).toMatch(/unsubscribe\?token=/);
    });

    it('arrêt dès que le prospect a payé (demande en_attente) ou est client ; désinscrit ou prospect > 7 j : rien', async () => {
        await lead('paid@x.fr', '2026-11-01T10:00:00.000Z');
        await lead('cli@x.fr', '2026-11-01T10:00:00.000Z');
        await lead('unsub@x.fr', '2026-11-01T10:00:00.000Z', { unsubscribed_at: '2026-11-01T10:10:00.000Z' });
        await lead('old@x.fr', '2026-10-20T10:00:00.000Z');
        await ext.conn.execute("INSERT INTO demandes (id, email, status) VALUES ('d1', 'paid@x.fr', 'en_attente')");
        await insertClient('cx', 'cli@x.fr');
        await runLeads('2026-11-02T12:00:00.000Z');
        expect(ext.outbox).toHaveLength(0);
        expect(rows("SELECT completed_at FROM souscription_leads WHERE email IN ('paid@x.fr', 'cli@x.fr')").every((r) => r.completed_at)).toBe(true);
    });

    it('lien de paiement admin : relances J+2/J+5, arrêt dès l’abonnement Stripe créé', async () => {
        await insertClient('cp', 'pay@x.fr', { extra: { payment_status: 'pending', payment_token: 'tok_abc', payment_requested_at: '2026-11-01T08:00:00.000Z' } });
        const runPay = (iso) => notif.processPendingPayments({ conn: ext.conn, transporter, from: 's@test.fr', baseUrl: 'https://site.test', now: new Date(iso) });
        await runPay('2026-11-03T08:00:00.000Z');
        await runPay('2026-11-03T09:00:00.000Z');
        expect(sentTo('pay@x.fr')).toHaveLength(1);
        await ext.conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify({ payment_status: 'active', payment_token: 'tok_abc', payment_requested_at: '2026-11-01T08:00:00.000Z', stripe_subscription_id: 'sub_1', payment_reminders_sent: [2] }), 'cp']);
        await runPay('2026-11-06T08:00:00.000Z');
        expect(sentTo('pay@x.fr')).toHaveLength(1);
    });
});

// ═══════════════════ 6. Cron : authentification ═══════════════════
describe('Cron : CRON_SECRET', () => {
    it('sans jeton, mauvais jeton, jeton de longueur différente : 401 et aucun envoi', async () => {
        await ext.conn.execute("INSERT INTO mail (id, clientId, company, type, \"from\", date, status, preview) VALUES ('m1', 'c1', 'S', 'Lettre simple', 'X', '2026-11-10', 'non lu', '')");
        at('2026-11-10T10:00:00Z');
        for (const authorization of [undefined, 'Bearer nope', 'Bearer cron-secret ', 'cron-secret']) {
            const res = await call(cron, { method: 'GET', headers: authorization ? { authorization } : {} });
            expect(res.code).toBe(401);
        }
        expect(ext.outbox).toHaveLength(0);
    });
});

// ═══════════════════ 7. extra_info : URLs et clés interdites ═══════════════════
describe('sanitizeClientExtra : URLs dangereuses et clés réservées', () => {
    it.each([
        'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', '\njavascript:alert(1)',
        'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'http://evil.test/x.pdf', '//evil.test/x', 'file:///etc/passwd',
    ])('%j refusée', (url) => {
        expect(isSafeDocumentUrl(url)).toBe(false);
        expect(sanitizeClientExtra({ kbisUrl: url, statutsURL: url, logourl: url })).toEqual({});
    });

    it('clés réservées refusées (même en casse différente), valeurs non textuelles refusées pour les URLs', () => {
        const clean = sanitizeClientExtra({
            EmailCourrier: 'evil@x.fr', emailCourrier: 'evil@x.fr', doc_request: { completed_at: 'x' }, Payment_status: 'paid',
            grille_tarifaire: 'old', tarifHt: 1, kbisUrl: ['https://ok.test'], pieceIdentiteUrl: { toString: () => 'https://x' },
            contractSigned: true, nomSociete: 'OK',
        });
        expect(clean).toEqual({ nomSociete: 'OK' });
    });

    it('via /api/data : un client ne peut pas rediriger ses notifications de courrier ni clore sa demande de documents', async () => {
        ext.users.client = { userId: 'user_c', email: 'client@x.fr' };
        const res = await data('client', 'updateClientExtraInfo', 'c1', { emailCourrier: 'evil@x.fr', doc_request: { completed_at: 'now' }, kbisUrl: 'javascript:alert(1)' });
        expect(res.code).toBe(200);
        const extra = JSON.parse(rows("SELECT extra_info FROM clients WHERE id = 'c1'")[0].extra_info);
        expect(extra.emailCourrier).toBeUndefined();
        expect(extra.doc_request).toBeUndefined();
        expect(extra.kbisUrl).toBeUndefined();
    });
});

// ═══════════════════ 8. Réexpéditions ═══════════════════
describe('Réexpéditions demandées par le client', () => {
    beforeEach(() => { ext.users.client = { userId: 'user_c', email: 'client@x.fr' }; });

    it('formule sans réexpédition, client résilié, adresse vide : refus 400 sans écriture', async () => {
        expect((await data('client', 'addReexpeditionRequest', 'c1', { address: '1 rue' })).code).toBe(400); // Essentiel
        await ext.conn.execute("UPDATE clients SET plan = 'Premium', status = 'résilié' WHERE id = 'c1'");
        expect((await data('client', 'addReexpeditionRequest', 'c1', { address: '1 rue' })).code).toBe(400);
        await ext.conn.execute("UPDATE clients SET status = 'actif' WHERE id = 'c1'");
        expect((await data('client', 'addReexpeditionRequest', 'c1', { address: '   ' })).code).toBe(400);
        expect(rows('SELECT COUNT(*) AS n FROM reexpeditions')[0].n).toBe(0);
    });

    it('un client ne peut ni demander une réexpédition, ni lire le courrier d’une autre fiche', async () => {
        await insertClient('c9', 'autre@x.fr', { plan: 'Premium' });
        expect((await data('client', 'addReexpeditionRequest', 'c9', { address: '1 rue' })).code).toBe(403);
        expect((await data('client', 'getClientMail', 'c9')).code).toBe(403);
        expect((await data('client', 'addClientMail', 'c1', { from: 'x' })).code).toBe(403);
    });

    it('statut de réexpédition hors liste refusé', async () => {
        const res = await data('admin', 'updateReexpeditionStatus', 'r1', "'; DROP TABLE mail; --");
        expect(res.code).toBe(400);
    });
});
