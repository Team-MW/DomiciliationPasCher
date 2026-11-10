// @vitest-environment node
/**
 * AUDIT — bugs RÉELS reproduits (courrier, documents, notifications). Chaque test est en `it.skip` pour garder la suite verte :
 * retirer le `.skip` pour voir le bug, le test doit passer une fois le code corrigé.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

const ext = vi.hoisted(() => ({ conn: null, outbox: [] }));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: async (m) => {
        await new Promise((r) => setImmediate(r)); // un envoi SMTP prend du temps (aller-retour réseau)
        ext.outbox.push(m);
        return { messageId: `<m${ext.outbox.length}@test>` };
    } }) },
}));
vi.mock('@clerk/backend', () => ({ createClerkClient: () => ({ users: { getUserList: async () => ({ data: [] }) } }), verifyToken: async () => ({}) }));
vi.mock('../../api/_stripe-client.js', () => ({ getStripe: () => { throw new Error('stripe off in audit'); } }));

const { __setAuthVerifierForTests } = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const cron = (await import('../../api/cron/reminders.js')).default;
const notif = await import('../../api/_notifications.js');

const ADMIN = { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' };
const mockRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.setHeader = () => r; r.end = () => r; return r; };
const at = (iso) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };
const addMail = async (clientId, from = 'Impots') => {
    const res = mockRes();
    await dataHandler({ method: 'POST', headers: { host: 'site.test', authorization: 'Bearer admin' }, body: { method: 'addClientMail', args: [clientId, { company: 'S SAS', type: 'Lettre simple', from, preview: '' }] }, query: {} }, res);
    return res;
};
const runCron = async () => { const res = mockRes(); await cron({ method: 'GET', headers: { authorization: 'Bearer cron-secret' }, query: {} }, res); return res; };
const toClient = () => ext.outbox.filter((m) => m.to === 'client@x.fr');
const transporter = { sendMail: async (m) => { ext.outbox.push(m); return { messageId: '<t>' }; } };

beforeAll(() => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_PORT: '465', SMTP_USER: 's@test.fr', SMTP_PASS: 'abcdabcdabcdabcd', CLERK_SECRET_KEY: 'sk_test_x', VITE_ADMIN_EMAILS: ADMIN.email, CRON_SECRET: 'cron-secret' });
    for (const m of ['error', 'warn', 'log']) vi.spyOn(console, m).mockImplementation(() => {});
});
beforeEach(async () => {
    vi.useRealTimers();
    ext.conn = await createSqlJsConn();
    ext.outbox = [];
    __setAuthVerifierForTests(async (t) => (t === 'admin' ? ADMIN : null));
    await notif.processMailNotifications({ conn: ext.conn, transporter, from: 's@test.fr', baseUrl: 'https://site.test' });
    await ext.conn.execute("INSERT INTO clients (id, name, email, company, plan, status, since, extra_info) VALUES ('c1', 'Jean Dupont', 'client@x.fr', 'S SAS', 'Essentiel', 'actif', '2026-10-01', '{}')");
});
afterEach(() => vi.useRealTimers());

describe('Notifications de courrier en double (lecture puis envoi puis marquage, sans verrou)', () => {
    // BUG: api/_notifications.js:56-91 — deux dépôts simultanés (double clic sur « Ajouter », deux admins) : chaque requête
    // passe le contrôle des 10 min (aucun courrier encore marqué), lit les courriers non notifiés, envoie, puis marque.
    // Le client reçoit 2 emails (le 2e reprend le même courrier). Correctif : « réserver » les lignes avant l'envoi
    // (UPDATE mail SET notified_at = 'sending:<id>' WHERE id IN (...) AND notified_at IS NULL, n'envoyer que si rowsAffected > 0).
    it('deux dépôts simultanés pour le même client → un seul email', async () => {
        at('2026-11-10T10:00:00Z');
        await Promise.all([addMail('c1', 'A'), addMail('c1', 'B')]);
        expect(toClient()).toHaveLength(1);
    });

    // BUG: api/_notifications.js:62-91 + api/data.js:346 — même course entre le cron horaire (Vercel « 0 * * * * ») et un dépôt
    // fait à la même seconde : les deux lisent le courrier « notified_at IS NULL » et l'envoient chacun.
    it('cron horaire et dépôt immédiat simultanés → un seul email', async () => {
        await ext.conn.execute("INSERT INTO mail (id, clientId, company, type, \"from\", date, status, preview) VALUES ('m0', 'c1', 'S', 'Lettre simple', 'Nuit', '2026-11-10', 'non lu', '')");
        at('2026-11-10T10:00:00Z');
        await Promise.all([runCron(), addMail('c1', 'A')]);
        expect(toClient()).toHaveLength(1);
    });
});

describe('Date du courrier enregistrée en UTC', () => {
    // BUG: api/_data-service.js:633 — `new Date().toISOString().split('T')[0]` = date UTC. Un courrier saisi entre 0 h et 1 h
    // (hiver) / 2 h (été) heure de Paris est daté de la VEILLE : faux dans l'espace client, l'admin et l'email
    // (« Lettre simple du 10 novembre » pour un courrier du 11). Même motif pour documents.uploadedAt (l.709) et clients.since.
    // Correctif : date du jour à Paris (Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })).
    it('courrier saisi le 11 novembre à 0 h 30 (Paris) → daté du 11 novembre', async () => {
        at('2026-11-10T23:30:00Z');
        const res = await addMail('c1');
        expect(res.body.result.date).toBe('2026-11-11');
    });

    it('en été : saisi le 15 juillet à 1 h 30 (Paris) → daté du 15 juillet', async () => {
        at('2026-07-14T23:30:00Z');
        const res = await addMail('c1');
        expect(res.body.result.date).toBe('2026-07-15');
    });
});

describe('Relances de documents décalées d’un jour', () => {
    // BUG (mineur): shared/documentRequest.js:49 — `Math.floor(elapsed / 24 h)` avec un cron quotidien à 8 h UTC. Une demande
    // faite par l'admin à 15 h (sendNow) n'atteint 7 × 24 h qu'après le passage du J+7 : la relance « J+7 » part à J+8
    // (puis J+31, J+61, J+81). Même motif pour les relances de lien de paiement J+2/J+5 (api/_notifications.js:230 → J+3/J+6).
    // Correctif : compter en jours calendaires (Paris) plutôt qu'en tranches de 24 h.
    it('demande créée le 1er nov. à 15 h UTC → relance au passage du 8 nov. à 8 h UTC', async () => {
        await ext.conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify({
            doc_request: { missing: ['statuts'], is_creation: false, requested_at: '2026-11-01T15:00:00.000Z', initial_pending: false, reminders_sent: [], completed_at: null },
        }), 'c1']);
        await notif.processDocumentRequests({ conn: ext.conn, transporter, from: 's@test.fr', baseUrl: 'https://site.test', now: new Date('2026-11-08T08:00:00.000Z') });
        expect(toClient()).toHaveLength(1);
    });
});
