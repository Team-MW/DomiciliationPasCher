// @vitest-environment node
/** Dépôt d'un courrier par l'admin : le client est prévenu tout de suite (8 h-20 h Paris), sans doublon ni envoi la nuit. */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

const ext = vi.hoisted(() => ({ conn: null, outbox: [] }));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: async (m) => { ext.outbox.push(m); return { messageId: `<${ext.outbox.length}>` }; } }) } }));
vi.mock('@clerk/backend', () => ({ createClerkClient: () => ({ users: {} }), verifyToken: async () => ({}) }));

const { __setAuthVerifierForTests, isAdminEmail } = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const cron = (await import('../../api/cron/reminders.js')).default;

const mockRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.setHeader = () => r; r.end = () => r; return r; };
const addMail = async (clientId, from = 'Impots') => {
    const res = mockRes();
    await dataHandler({ method: 'POST', headers: { host: 'site.test', authorization: 'Bearer admin' }, body: { method: 'addClientMail', args: [clientId, { company: 'S SAS', type: 'Lettre simple', from, preview: '' }] }, query: {} }, res);
    return res;
};
const at = (iso) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };
const toClient = () => ext.outbox.filter((m) => m.to === 'client@x.fr');

beforeAll(() => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_PORT: '465', SMTP_USER: 's@test.fr', SMTP_PASS: 'abcdabcdabcdabcd', CLERK_SECRET_KEY: 'sk_test_x', VITE_ADMIN_EMAILS: 'autre.admin@x.fr', CRON_SECRET: 'cron-secret' });
    for (const m of ['error', 'warn', 'log']) vi.spyOn(console, m).mockImplementation(() => {});
});
beforeEach(async () => {
    vi.useRealTimers();
    ext.conn = await createSqlJsConn();
    ext.outbox = [];
    __setAuthVerifierForTests(async (t) => (t === 'admin' ? { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' } : null));
    // En production la colonne notified_at existe déjà (sa création marque les anciens courriers « legacy ») : on la crée avant les dépôts.
    at('2026-11-10T09:00:00Z');
    await cron({ method: 'GET', headers: { authorization: 'Bearer cron-secret' }, query: {} }, mockRes());
    vi.useRealTimers();
    await ext.conn.execute("INSERT INTO clients (id, name, email, company, plan, status, since, extra_info) VALUES ('c1', 'Jean Dupont', 'client@x.fr', 'S SAS', 'Essentiel', 'actif', '2026-10-01', '{}')");
    await ext.conn.execute("INSERT INTO clients (id, name, email, company, plan, status, since, extra_info) VALUES ('c2', 'Ancien', 'client@x.fr.old', 'S SAS', 'Essentiel', 'résilié', '2026-01-01', '{}')");
});

describe('Notification du courrier déposé', () => {
    it('en journée : le client reçoit son email immédiatement, une seule fois, le cron ne le renvoie pas', async () => {
        at('2026-11-10T10:00:00Z'); // 11 h Paris
        expect((await addMail('c1')).code).toBe(200);
        expect(toClient()).toHaveLength(1);
        expect(toClient()[0].subject).toMatch(/courrier/i);
        const res = mockRes();
        at('2026-11-10T11:00:00Z');
        await cron({ method: 'GET', headers: { authorization: 'Bearer cron-secret' }, query: {} }, res);
        expect(toClient()).toHaveLength(1);
    });

    it('plusieurs dépôts à la suite : un email tout de suite, le reste regroupé dans un seul récapitulatif au passage horaire', async () => {
        at('2026-11-10T10:00:00Z');
        await addMail('c1', 'A'); await addMail('c1', 'B'); await addMail('c1', 'C');
        expect(toClient()).toHaveLength(1);
        at('2026-11-10T11:00:00Z');
        await cron({ method: 'GET', headers: { authorization: 'Bearer cron-secret' }, query: {} }, mockRes());
        expect(toClient()).toHaveLength(2);
        expect(toClient()[1].html + toClient()[1].text).toMatch(/B/);
    });

    it('la nuit : rien ne part (récap au premier passage du matin) ; client résilié : jamais prévenu', async () => {
        at('2026-11-10T23:30:00Z'); // 0 h 30 Paris
        await addMail('c1');
        expect(toClient()).toHaveLength(0);
        at('2026-11-11T07:00:00Z'); // 8 h Paris
        await cron({ method: 'GET', headers: { authorization: 'Bearer cron-secret' }, query: {} }, mockRes());
        expect(toClient()).toHaveLength(1);
        at('2026-11-11T10:00:00Z');
        await addMail('c2');
        expect(ext.outbox.some((m) => m.to === 'client@x.fr.old')).toBe(false);
    });

    it('une panne d’envoi n’empêche pas l’enregistrement du courrier (le récap horaire réessaiera)', async () => {
        at('2026-11-10T10:00:00Z');
        const original = ext.outbox.push.bind(ext.outbox);
        ext.outbox.push = () => { throw new Error('SMTP down'); };
        const res = await addMail('c1');
        ext.outbox.push = original;
        expect(res.code).toBe(200);
        expect(ext.conn.all("SELECT COUNT(*) AS n FROM mail WHERE clientId = 'c1'")[0].n).toBe(1);
    });
});

describe('Administrateurs inscrits dans le code', () => {
    it('cimacludovic@gmail.com est admin même si la variable Vercel ne le contient pas ; un inconnu non', () => {
        expect(isAdminEmail('cimacludovic@gmail.com')).toBe(true);
        expect(isAdminEmail('  CimacLudovic@Gmail.com ')).toBe(true);
        expect(isAdminEmail('mwcrea.agency@gmail.com')).toBe(true);
        expect(isAdminEmail('autre.admin@x.fr')).toBe(true); // ceux de la variable restent admins
        expect(isAdminEmail('intrus@gmail.com')).toBe(false);
        expect(isAdminEmail('')).toBe(false);
    });
});
