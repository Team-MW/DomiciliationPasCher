// @vitest-environment node
/** Client bloqué par « email non vérifié » : il se débloque seul avec un code envoyé par NOTRE serveur d'emails. */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

const ext = vi.hoisted(() => ({ conn: null, outbox: [], smtpDown: false, clerk: {}, updates: [] }));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: async (mail) => {
        if (ext.smtpDown) throw new Error('Connection timeout');
        ext.outbox.push(mail);
        return { messageId: `<m${ext.outbox.length}>` };
    } }) },
}));
vi.mock('@clerk/backend', () => ({
    createClerkClient: () => ({
        users: {
            getUserList: async () => ({ data: [] }),
            getUser: async (id) => { if (!ext.clerk[id]) throw Object.assign(new Error('not found'), { status: 404 }); return ext.clerk[id]; },
            deleteUser: async () => {},
        },
        emailAddresses: { updateEmailAddress: async (id, params) => {
            ext.updates.push({ id, params });
            for (const u of Object.values(ext.clerk)) for (const e of u.emailAddresses) if (e.id === id && params.verified) e.verification = { status: 'verified' };
            return {};
        } },
    }),
    verifyToken: async () => ({}),
}));

const { __setAuthVerifierForTests } = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const emailHandler = (await import('../../api/email.js')).default;

const mockRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.setHeader = () => r; r.end = () => r; return r; };
const call = async (who, method, ...args) => {
    const res = mockRes();
    await dataHandler({ method: 'POST', headers: { host: 'site.test', ...(who ? { authorization: `Bearer ${who}` } : {}) }, body: { method, args }, query: {} }, res);
    return { code: res.code, result: res.body?.result, error: res.body?.error };
};
const codeFromMail = () => /(\d{6})/.exec(ext.outbox.at(-1).subject)[1];
const makeUser = (id, email, status = 'unverified') => { ext.clerk[id] = { id, firstName: 'Ipm', primaryEmailAddressId: `idn_${id}`, emailAddresses: [{ id: `idn_${id}`, emailAddress: email, verification: { status } }] }; };

beforeAll(() => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_PORT: '465', SMTP_USER: 's@test.fr', SMTP_PASS: 'abcdabcdabcdabcd', CLERK_SECRET_KEY: 'sk_test_x', VITE_ADMIN_EMAILS: 'mwcrea.agency@gmail.com' });
    for (const m of ['error', 'warn', 'log']) vi.spyOn(console, m).mockImplementation(() => {});
});
beforeEach(async () => {
    ext.conn = await createSqlJsConn();
    Object.assign(ext, { outbox: [], smtpDown: false, clerk: {}, updates: [] });
    // Même règle que la vraie vérification : un compte sans email vérifié → email vide.
    __setAuthVerifierForTests(async (token) => {
        const u = ext.clerk[token];
        if (!u) return token === 'admin' ? { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' } : null;
        const e = u.emailAddresses[0];
        return { userId: u.id, email: e.verification.status === 'verified' ? e.emailAddress : '' };
    });
});

describe('Déblocage « email non vérifié » par code', () => {
    it('parcours complet : bloqué → code par email → saisie → débloqué', async () => {
        makeUser('user_ipm', 'ipmauto31@gmail.com');
        expect((await call('user_ipm', 'getMyAccount', {})).error).toBe('EMAIL_NOT_VERIFIED');

        const sent = await call('user_ipm', 'sendEmailVerificationCode');
        expect(sent.result).toMatchObject({ sent: true, email: 'ip•••@gmail.com' });
        expect(ext.outbox).toHaveLength(1);
        expect(ext.outbox[0].to).toBe('ipmauto31@gmail.com');
        expect(ext.outbox[0].subject).toMatch(/^Votre code de vérification : \d{6}$/);
        expect(ext.outbox[0].html).toContain(codeFromMail());
        expect(ext.conn.all("SELECT type, status FROM email_logs")[0]).toMatchObject({ type: 'email_verification', status: 'sent' });

        const wrong = codeFromMail() === '000000' ? '111111' : '000000';
        expect((await call('user_ipm', 'confirmEmailVerificationCode', wrong)).code).toBe(400);
        expect(ext.updates).toHaveLength(0);

        expect((await call('user_ipm', 'confirmEmailVerificationCode', codeFromMail())).result).toEqual({ verified: true });
        expect(ext.updates).toEqual([{ id: 'idn_user_ipm', params: { verified: true } }]);
        // il est maintenant reconnu par le serveur
        expect((await call('user_ipm', 'getMyAccount', {})).error).toBeUndefined();
        // le code ne sert qu'une fois
        expect((await call('user_ipm', 'confirmEmailVerificationCode', codeFromMail())).code).toBe(400);
        expect(ext.updates).toHaveLength(1);
    });

    it('le bouton « Rafraîchir » ne reste pas bloqué : un compte vérifié est reconnu tout de suite (pas de cache d’échec)', async () => {
        makeUser('user_a', 'a@x.fr');
        expect((await call('user_a', 'getMyAccount', {})).code).toBe(403);
        ext.clerk.user_a.emailAddresses[0].verification.status = 'verified';
        expect((await call('user_a', 'getMyAccount', {})).code).toBe(200);
    });

    it('limites : 1 envoi / 45 s, 5 essais, expiration 10 min, 5 envois / heure', async () => {
        makeUser('user_l', 'l@x.fr');
        vi.useFakeTimers({ toFake: ['Date'] });
        try {
            vi.setSystemTime(new Date('2026-11-10T10:00:00Z'));
            expect((await call('user_l', 'sendEmailVerificationCode')).code).toBe(200);
            expect((await call('user_l', 'sendEmailVerificationCode')).code).toBe(429); // trop tôt
            const good = codeFromMail();
            const bad = good === '123456' ? '654321' : '123456';
            for (let i = 0; i < 5; i++) expect((await call('user_l', 'confirmEmailVerificationCode', bad)).code).toBe(400);
            expect((await call('user_l', 'confirmEmailVerificationCode', good)).code).toBe(429); // verrouillé même avec le bon code
            expect(ext.updates).toHaveLength(0);
            // nouvel envoi : remet les essais à zéro
            vi.setSystemTime(new Date('2026-11-10T10:01:00Z'));
            expect((await call('user_l', 'sendEmailVerificationCode')).code).toBe(200);
            // expiré
            vi.setSystemTime(new Date('2026-11-10T10:12:00Z'));
            expect((await call('user_l', 'confirmEmailVerificationCode', codeFromMail())).error).toMatch(/expiré/);
            // plafond horaire : 5 envois (2 déjà faits) puis refus
            let last;
            for (let i = 0; i < 4; i++) { vi.setSystemTime(new Date(Date.parse('2026-11-10T10:13:00Z') + i * 60_000)); last = await call('user_l', 'sendEmailVerificationCode'); }
            expect(last.code).toBe(429);
        } finally { vi.useRealTimers(); }
    });

    it('sécurité : le code d’un compte ne valide pas un autre ; email déjà vérifié = rien à faire ; non connecté refusé', async () => {
        makeUser('user_v', 'victime@x.fr');
        makeUser('user_p', 'pirate@x.fr');
        await call('user_v', 'sendEmailVerificationCode');
        const victimCode = codeFromMail();
        await call('user_p', 'sendEmailVerificationCode');
        // le pirate a son propre code (envoyé À SON adresse) ; celui de la victime ne marche pas pour lui
        const pirateCode = codeFromMail();
        if (pirateCode !== victimCode) expect((await call('user_p', 'confirmEmailVerificationCode', victimCode)).code).toBe(400);
        expect(ext.outbox.map((m) => m.to)).toEqual(['victime@x.fr', 'pirate@x.fr']); // chaque code part à SON adresse uniquement
        makeUser('user_ok', 'ok@x.fr', 'verified');
        expect((await call('user_ok', 'sendEmailVerificationCode')).result).toMatchObject({ alreadyVerified: true });
        expect(ext.outbox).toHaveLength(2);
        expect((await call(null, 'sendEmailVerificationCode')).code).toBe(401);
        // un compte non vérifié ne peut rien d'autre
        expect((await call('user_v', 'getClients')).code).toBe(403);
    });

    it('panne SMTP : message clair, aucun code enregistré, nouvel essai possible tout de suite', async () => {
        makeUser('user_s', 's@x.fr');
        ext.smtpDown = true;
        const r = await call('user_s', 'sendEmailVerificationCode');
        expect(r.code).toBe(502);
        expect(r.error).toMatch(/pas pu être envoyé/);
        expect(ext.conn.all('SELECT COUNT(*) AS n FROM email_verifications')[0].n).toBe(0);
        ext.smtpDown = false;
        expect((await call('user_s', 'sendEmailVerificationCode')).code).toBe(200);
    });

    it('le type « email_verification » n’est pas utilisable via /api/email (admin seulement)', async () => {
        makeUser('user_x', 'x@x.fr', 'verified');
        const res = mockRes();
        await emailHandler({ method: 'POST', headers: { host: 'site.test', authorization: 'Bearer user_x' }, body: { type: 'email_verification', email: 'cible@x.fr', code: '123456' } }, res);
        expect(res.code).toBe(403);
        expect(ext.outbox).toHaveLength(0);
    });

    it('admin : peut marquer l’email d’un compte comme vérifié ; un client non', async () => {
        makeUser('user_b', 'bloque@x.fr');
        expect((await call('user_b', 'verifyClerkEmail', 'user_b')).code).toBe(403);
        expect((await call('admin', 'verifyClerkEmail', 'user_b')).result).toMatchObject({ verified: true });
        expect(ext.updates).toHaveLength(1);
        expect((await call('admin', 'verifyClerkEmail', 'pas-un-id')).code).toBe(400);
        expect((await call('admin', 'verifyClerkEmail', 'user_inconnu')).code).toBe(404);
    });
});
