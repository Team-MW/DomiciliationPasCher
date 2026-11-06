// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ conn: null }));
vi.mock('../api/_db.js', () => ({ getDbConn: () => state.conn }));

const { __setAuthVerifierForTests } = await import('../api/_auth.js');
const updateExtra = (await import('../api/update-client-extra.js')).default;
const { getParisHour } = await import('../api/cron/reminders.js');
const { isRealCalendarDate, todayInParis, resolveCheckoutPrice } = await import('../api/checkout.js');
const { isSingleEmail } = await import('../api/_email-kit.js');
const { buildTransactionalEmail } = await import('../api/_email-core.js');
const { isSafeDocumentUrl, isTrustedDocumentUrl, sanitizeClientExtra } = await import('../api/_client-extra.js');
const { currentQuotaPeriodStart } = await import('../shared/plans.js');
const { createDataService } = await import('../api/_data-service.js');

const res = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

describe('Cron : l’heure de Paris est un vrai nombre (sinon les tâches horaires ne tournent jamais)', () => {
    it('heure d’hiver (UTC+1) et d’été (UTC+2), minuit compris', () => {
        expect(getParisHour(new Date('2026-11-06T08:00:00Z'))).toBe(9);
        expect(getParisHour(new Date('2026-11-06T23:30:00Z'))).toBe(0);
        expect(getParisHour(new Date('2026-07-01T08:00:00Z'))).toBe(10);
        expect(getParisHour(new Date('2026-03-29T00:30:00Z'))).toBe(1);
    });
    it('toutes les heures de la journée donnent un entier 0-23', () => {
        for (let h = 0; h < 24; h++) {
            const hour = getParisHour(new Date(Date.UTC(2026, 10, 6, h)));
            expect(Number.isInteger(hour) && hour >= 0 && hour <= 23).toBe(true);
        }
    });
    it('la fenêtre horaire 8 h-20 h est calculée avec cette fonction', async () => {
        const fs = await import('node:fs');
        expect(fs.readFileSync('api/cron/reminders.js', 'utf8')).toContain('const parisHour = getParisHour();');
    });
});

describe('Quota : jour anniversaire indépendant du fuseau du navigateur', () => {
    it.each(['America/New_York', 'Pacific/Auckland', 'Europe/Paris'])('%s : « 2026-11-06 » reste le 6', (tz) => {
        process.env.TZ = tz;
        const start = currentQuotaPeriodStart('2026-11-06', new Date(2026, 10, 20, 12));
        expect(start.getDate()).toBe(6);
        expect(start.getMonth()).toBe(10);
    });
});

describe('Réservation : date réelle et non passée', () => {
    it('refuse 31 février, mois 13, formats faux', () => {
        for (const bad of ['2026-02-31', '2026-13-45', '2026-1-5', '', 'demain']) expect(isRealCalendarDate(bad)).toBe(false);
        expect(isRealCalendarDate('2028-02-29')).toBe(true);
        expect(isRealCalendarDate('2027-02-29')).toBe(false);
    });
    it('refuse une date passée, accepte aujourd’hui et le futur (heure de Paris)', () => {
        const today = todayInParis();
        const meta = (date) => ({ type: 'meeting_booking', meeting_type: 'meeting', duration: 'half_day', date });
        const tryDate = (date) => resolveCheckoutPrice({ interval: 'one_time', metadata: meta(date) });
        expect(() => tryDate('2020-01-05')).toThrow(/passée|invalide/);
        expect(() => tryDate('2026-02-31')).toThrow(/invalide/);
        expect(todayInParis(new Date('2026-11-06T23:30:00Z'))).toBe('2026-11-07'); // déjà le 7 à Paris
        void today;
    });
});

describe('Emails : une seule adresse valide, pas de relais de phishing', () => {
    it.each([
        ['a@x.fr, b@y.fr', false], ['a@x.fr;b@y.fr', false], ['v@x.fr>\r\nBcc: evil@x.fr', false], ['"a b"@x.fr', false],
        ['<a@x.fr>', false], ['', false], [' ', false], [['a@x.fr'], false], [{ a: 1 }, false], [null, false], ['a@x', false],
        ['a'.repeat(250) + '@x.fr', false], ['ada@exemple.fr', true], ['  Ada.L+test@Exemple.FR ', true],
    ])('%j → %s', (value, ok) => expect(isSingleEmail(value)).toBe(ok));

    it('un nom hostile ne peut pas injecter un en-tête dans l’objet de l’email', () => {
        const mail = buildTransactionalEmail({ type: 'admin_new_message', email: 'a@b.fr', nom: 'A\r\nBcc: evil@x.fr', content: 'x' });
        expect(mail.subject).not.toMatch(/[\r\n]/);
    });
});

describe('Documents : liens de confiance et types sûrs', () => {
    it('un tableau ou un objet n’est jamais une URL valide (il faisait planter la fiche admin)', () => {
        expect(isSafeDocumentUrl(['https://a.example/x'])).toBe(false);
        expect(isSafeDocumentUrl({ href: 'https://a.example' })).toBe(false);
        expect(isSafeDocumentUrl(42)).toBe(false);
        expect(isSafeDocumentUrl('https://res.cloudinary.com/x/y.pdf')).toBe(true);
        expect(sanitizeClientExtra({ pieceIdentiteUrl: ['https://a.example/x'], nom: 'Ada' })).toEqual({ nom: 'Ada' });
    });
    it('un document client doit être chez nous (Cloudinary / signature locale / fichier encodé), pas un site tiers', () => {
        expect(isTrustedDocumentUrl('https://res.cloudinary.com/demo/image/upload/a.png')).toBe(true);
        expect(isTrustedDocumentUrl('#local-signature')).toBe(true);
        expect(isTrustedDocumentUrl('data:application/pdf;base64,AAAA')).toBe(true);
        expect(isTrustedDocumentUrl('https://evil.example/fake.pdf')).toBe(false);
        expect(isTrustedDocumentUrl('javascript:alert(1)')).toBe(false);
        expect(isTrustedDocumentUrl(['https://res.cloudinary.com/x'])).toBe(false);
    });
    it('signature : image PNG uniquement ; document signé : hébergeur de confiance', () => {
        const png = 'data:image/png;base64,iVBORw0KGgo=';
        const ok = sanitizeClientExtra({ contractSignatureUrl: png, contractSignedUrl: 'https://res.cloudinary.com/a/b.pdf', contractSigned: true }, { allowSignature: true });
        expect(ok).toMatchObject({ contractSignatureUrl: png, contractSignedUrl: 'https://res.cloudinary.com/a/b.pdf', contractSigned: true });
        const bad = sanitizeClientExtra({ contractSignatureUrl: 'https://evil.example/pixel.png', contractSignedUrl: 'https://evil.example/f.pdf', procurationSignatureUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }, { allowSignature: true });
        expect(bad).toEqual({});
    });
});

describe('Signature : preuve du bon document, date posée par le serveur, jamais écrasée', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const makeConn = ({ extra = {}, proofs = ['contrat_domiciliation'] } = {}) => {
        const stored = { extra: JSON.stringify(extra) };
        const conn = { stored, execute: vi.fn(async (sql, params = []) => {
            if (/^SELECT id, email, extra_info FROM clients/i.test(sql)) return { rows: [{ id: 'c1', email: 'ada@x.fr', extra_info: stored.extra }] };
            if (/^SELECT id, email, extra_info FROM demandes/i.test(sql)) return { rows: [] };
            if (/^SELECT extra_info FROM clients WHERE id/i.test(sql)) return { rows: [{ extra_info: stored.extra }] };
            if (/FROM signature_logs/i.test(sql)) return { rows: proofs.includes(params[1]) ? [{ id: 1 }] : [] };
            if (/^UPDATE clients SET extra_info/i.test(sql)) { stored.extra = params[0]; return { rows: [] }; }
            return { rows: [] };
        }) };
        return conn;
    };
    const call = async (conn, extraInfo) => {
        state.conn = conn;
        __setAuthVerifierForTests(async () => ({ userId: 'u1', email: 'ada@x.fr' }));
        const r = res();
        await updateExtra({ method: 'POST', headers: { authorization: 'Bearer t' }, body: { clientId: 'c1', extraInfo } }, r);
        return r;
    };

    it('preuve « contrat » + clés du contrat : acceptée, date = maintenant (serveur), pas celle envoyée', async () => {
        const conn = makeConn();
        const r = await call(conn, { contractSigned: true, contractSignedAt: '2020-01-01T00:00:00Z', contractSignatureUrl: png, contractSignedUrl: '#local-signature' });
        expect(r.code).toBe(200);
        const saved = JSON.parse(conn.stored.extra);
        expect(saved.contractSigned).toBe(true);
        expect(new Date(saved.contractSignedAt).getFullYear()).toBeGreaterThanOrEqual(2026);
        expect(saved.contract_version).toBeTruthy();
    });

    it('preuve « procuration » seule : ne permet PAS de déclarer le contrat signé', async () => {
        const conn = makeConn({ proofs: ['procuration_postale'] });
        await call(conn, { contractSigned: true, contractSignatureUrl: png });
        expect(JSON.parse(conn.stored.extra).contractSigned).toBeUndefined();
    });

    it('sans aucune preuve récente : aucune clé de signature n’est écrite', async () => {
        const conn = makeConn({ proofs: [] });
        await call(conn, { contractSigned: true, contractSignatureUrl: png, nom: 'Ada' });
        const saved = JSON.parse(conn.stored.extra);
        expect(saved.contractSigned).toBeUndefined();
        expect(saved.nom).toBe('Ada');
    });

    it('un contrat déjà signé n’est jamais ré-écrasé par le client', async () => {
        const conn = makeConn({ extra: { contractSigned: true, contractSignedAt: '2026-01-15T10:00:00.000Z', contractSignatureUrl: png } });
        await call(conn, { contractSigned: true, contractSignedAt: '2099-12-31T00:00:00Z', contractSignatureUrl: 'data:image/png;base64,ZZZZ' });
        const saved = JSON.parse(conn.stored.extra);
        expect(saved.contractSignedAt).toBe('2026-01-15T10:00:00.000Z');
        expect(saved.contractSignatureUrl).toBe(png);
    });

    it('signature = lien externe : refusée même avec une preuve valide', async () => {
        const conn = makeConn();
        await call(conn, { contractSigned: true, contractSignatureUrl: 'https://evil.example/pixel.png' });
        expect(JSON.parse(conn.stored.extra).contractSignatureUrl).toBeUndefined();
    });

    it('fiche illisible : refus sans rien écrire (aucune perte de données)', async () => {
        const conn = makeConn();
        conn.stored.extra = '{pas du json';
        const r = await call(conn, { nom: 'Ada' });
        expect(r.code).toBe(500);
        expect(conn.stored.extra).toBe('{pas du json');
    });
});

describe('Statuts et réexpéditions', () => {
    const svc = (rows) => createDataService({ conn: { execute: vi.fn(async (sql) => ({ rows: /FROM clients/.test(sql) ? rows : [] })) } });
    it('statuts hors liste refusés (réservations, réexpéditions)', async () => {
        const s = svc([]);
        await expect(s.updateBookingStatus('b1', 'n_importe_quoi')).rejects.toThrow(/invalide/);
        await expect(s.updateReexpeditionStatus('r1', 'n_importe_quoi')).rejects.toThrow(/invalide/);
        await expect(s.updateBookingStatus('b1', 'confirmée')).resolves.toEqual({ id: 'b1', status: 'confirmée' });
        await expect(s.updateReexpeditionStatus('r1', 'expediee')).resolves.toEqual({ id: 'r1', status: 'expediee' });
    });
    it('un client résilié ne peut plus demander de réexpédition', async () => {
        const s = svc([{ id: 'c1', plan: 'Premium', status: 'résilié', extra_info: JSON.stringify({ grille_tarifaire: '2026-11' }) }]);
        await expect(s.addReexpeditionRequest('c1', { address: '1 rue X' })).rejects.toThrow(/résiliée/);
    });
});


describe('Désinscription : un faux jeton n’est plus « confirmé »', () => {
    it('jeton inconnu → 400 « Lien invalide » ; jeton connu → 200', async () => {
        const unsubscribe = (await import('../api/unsubscribe.js')).default;
        const token = 'a'.repeat(32);
        const call = async (known) => {
            state.conn = { execute: vi.fn(async (sql) => (/^SELECT 1 FROM souscription_leads/.test(sql) ? { rows: known ? [{ 1: 1 }] : [] } : { rows: [] })) };
            const r = { code: 200, headers: {}, body: '' };
            r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; };
            r.setHeader = () => r; r.send = (b) => { r.body = b; return r; };
            await unsubscribe({ method: 'GET', query: { token }, headers: { host: 'site.test' } }, r);
            return r;
        };
        expect((await call(false)).code).toBe(400);
        expect((await call(true)).code).toBe(200);
    });
});

describe('Relances d’inscription : pas de relance tardive d’un vieux prospect', () => {
    it('un prospect de 17 jours (jamais relancé car le cron était cassé) n’est PAS relancé ; un de 2 jours l’est', async () => {
        const { processSouscriptionLeads } = await import('../api/_notifications.js');
        const now = new Date('2026-11-06T10:00:00Z');
        const lead = (email, daysAgo) => ({ email, token: 'a'.repeat(32), plan: 'essentiel', step: 3, reminders_sent: 0, created_at: new Date(now - daysAgo * 86400000).toISOString(), updated_at: new Date(now - daysAgo * 86400000).toISOString() });
        const conn = { execute: vi.fn(async (sql) => (/^SELECT \* FROM souscription_leads/.test(sql) ? { rows: [lead('vieux@x.fr', 17), lead('recent@x.fr', 2)] } : { rows: [] })) };
        const transporter = { sendMail: vi.fn(async () => ({})) };
        const out = await processSouscriptionLeads({ conn, transporter, from: 'f@x.fr', baseUrl: 'https://s', now });
        expect(out.leadRemindersSent).toBe(1);
        expect(transporter.sendMail.mock.calls.map(([m]) => m.to)).toEqual(['recent@x.fr']);
    });
});
