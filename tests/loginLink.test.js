import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_login_link');
const { sendLoginLink, loginLinkUrl, normalizeLoginEmail } = await import('../api/_login-link.js');
const { isValidSignupProof } = await import('../api/_signup-proof.js');
const { sendActivationLinks } = await import('../api/_health-check.js');

const makeClerk = (users = []) => ({
    users: { getUserList: vi.fn(async () => ({ data: users })) },
    signInTokens: { createSignInToken: vi.fn(async ({ userId }) => ({ token: `tok_${userId}` })) },
});
const makeTransporter = () => ({ sendMail: vi.fn(async () => ({ messageId: 'm1' })) });
const makeConn = (rows = {}) => ({ execute: vi.fn(async (sql) => {
    if (/FROM clients WHERE LOWER\(email\)/.test(sql)) return { rows: rows.client ? [rows.client] : [] };
    if (/FROM demandes WHERE LOWER\(email\)/.test(sql)) return { rows: rows.demande ? [rows.demande] : [] };
    return { rows: [] };
}) });
const base = { from: 'site@gmail.com', baseUrl: 'https://site.test' };

describe('Lien de connexion par email (ne dépend pas des emails de Clerk)', () => {
    it('compte existant : lien qui connecte (jeton Clerk 1 h) + preuve de l’adresse', async () => {
        const clerk = makeClerk([{ id: 'user_1', firstName: 'Ada' }]);
        const transporter = makeTransporter();
        const r = await sendLoginLink({ ...base, conn: makeConn(), clerk, transporter, email: ' Ada@X.fr ' });
        expect(r).toMatchObject({ ok: true, sent: true, kind: 'login' });
        expect(clerk.signInTokens.createSignInToken).toHaveBeenCalledWith({ userId: 'user_1', expiresInSeconds: 3600 });
        const mail = transporter.sendMail.mock.calls[0][0];
        expect(mail.to).toBe('ada@x.fr');
        const url = new URL(mail.text.match(/https:\/\/site\.test\/connexion\?\S+/)[0]);
        expect(url.searchParams.get('ticket')).toBe('tok_user_1');
        expect(url.searchParams.get('email')).toBe('ada@x.fr');
        expect(isValidSignupProof('ada@x.fr', url.searchParams.get('v'))).toBe(true);
        expect(mail.html).toContain('Ouvrir mon espace client');
    });

    it('pas de compte mais client connu : lien « Créer mon accès » (adresse déjà prouvée)', async () => {
        const transporter = makeTransporter();
        const r = await sendLoginLink({ ...base, conn: makeConn({ client: { name: 'Bob' } }), clerk: makeClerk([]), transporter, email: 'bob@x.fr' });
        expect(r).toMatchObject({ ok: true, sent: true, kind: 'signup' });
        expect(transporter.sendMail.mock.calls[0][0].text).toMatch(/https:\/\/site\.test\/inscription\?email=bob%40x\.fr&v=/);
    });

    it('adresse inconnue : rien n’est envoyé, réponse identique (on ne révèle pas qui est client)', async () => {
        const transporter = makeTransporter();
        const r = await sendLoginLink({ ...base, conn: makeConn(), clerk: makeClerk([]), transporter, email: 'inconnu@x.fr' });
        expect(r.ok).toBe(true);
        expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it('limite anti-abus : au-delà, plus d’envoi (réponse toujours ok)', async () => {
        const transporter = makeTransporter();
        const r = await sendLoginLink({ ...base, conn: makeConn(), clerk: makeClerk([{ id: 'u' }]), transporter, email: 'a@x.fr', isRateLimited: async () => true });
        expect(r).toMatchObject({ ok: true, sent: false });
        expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it('compte bloqué par Clerk : pas de lien', async () => {
        const transporter = makeTransporter();
        await sendLoginLink({ ...base, conn: makeConn(), clerk: makeClerk([{ id: 'u', banned: true }]), transporter, email: 'a@x.fr' });
        expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it('adresse invalide refusée', async () => {
        expect(normalizeLoginEmail('pas-une-adresse')).toBe('');
        expect((await sendLoginLink({ ...base, conn: makeConn(), clerk: makeClerk(), transporter: makeTransporter(), email: 'x' })).ok).toBe(false);
    });

    it('URL bien formée', () => {
        expect(loginLinkUrl('https://s.fr/', 'a@b.fr', 'tok')).toMatch(/^https:\/\/s\.fr\/connexion\?ticket=tok&email=a%40b\.fr&v=/);
    });
});

describe('Contrôle du matin : le lien d’activation connecte directement (sans mot de passe)', () => {
    it('jeton Clerk 7 jours dans le bouton quand le compte est connu', async () => {
        const conn = { execute: vi.fn(async (sql) => (/^SELECT name, extra_info FROM clients/.test(sql) ? { rows: [{ name: 'Ada', extra_info: '{}' }] } : { rows: [] })) };
        const transporter = makeTransporter();
        const clerk = makeClerk();
        await sendActivationLinks({ conn, transporter, from: 's@x.fr', baseUrl: 'https://site.test', clerk, issues: [{ kind: 'unverified', clientId: 'c1', clerkUserId: 'user_9', email: 'ada@x.fr', detail: '' }] });
        expect(clerk.signInTokens.createSignInToken).toHaveBeenCalledWith({ userId: 'user_9', expiresInSeconds: 7 * 24 * 3600 });
        const mail = transporter.sendMail.mock.calls[0][0];
        expect(mail.text).toContain('/connexion?ticket=tok_user_9');
        expect(mail.text).toMatch(/sans mot de passe ni code/);
    });

    it('jeton impossible : repli sur le lien d’activation simple (l’email part quand même)', async () => {
        const conn = { execute: vi.fn(async (sql) => (/^SELECT name, extra_info FROM clients/.test(sql) ? { rows: [{ name: 'Ada', extra_info: '{}' }] } : { rows: [] })) };
        const transporter = makeTransporter();
        const clerk = { signInTokens: { createSignInToken: vi.fn(async () => { throw new Error('clerk down'); }) } };
        await sendActivationLinks({ conn, transporter, from: 's@x.fr', baseUrl: 'https://site.test', clerk, issues: [{ kind: 'unverified', clientId: 'c1', clerkUserId: 'user_9', email: 'ada@x.fr', detail: '' }] });
        expect(transporter.sendMail.mock.calls[0][0].text).toMatch(/\/connexion\?email=ada%40x\.fr&v=/);
    });
});
