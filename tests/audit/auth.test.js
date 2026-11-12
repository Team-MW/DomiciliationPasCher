// @vitest-environment node
/**
 * AUDIT — création de compte, connexion, vérification d'email, propriété des dossiers.
 * Vrais gestionnaires api/* sur une base SQL réelle (sql.js), Clerk / Stripe / SMTP simulés.
 * L'authentification passe par le VRAI api/_auth.js (verifyToken simulé : jeton = identifiant Clerk),
 * pour tester aussi la normalisation de l'email, le refus des emails non vérifiés et le cache.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

const ext = vi.hoisted(() => ({ conn: null, outbox: [], clerk: {}, updates: [], sessions: {}, createdSessions: [], customers: {}, stripeCalls: 0 }));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: async (mail) => { ext.outbox.push(mail); return { messageId: `<m${ext.outbox.length}>` }; } }) },
}));
const listOf = (items) => { const p = Promise.resolve({ data: items, has_more: false }); p[Symbol.asyncIterator] = async function* () { for (const i of items) yield i; }; return p; };
vi.mock('../../api/_stripe-client.js', () => ({
    getStripe: () => ({
        checkout: { sessions: {
            retrieve: async (id) => { ext.stripeCalls++; if (!ext.sessions[id]) throw new Error(`No such checkout.session: ${id}`); return ext.sessions[id]; },
            create: async (params) => { const s = { id: `cs_test_new${ext.createdSessions.length}`, url: 'https://checkout.stripe.test/x', params }; ext.createdSessions.push(s); return s; },
        } },
        customers: {
            list: async ({ email }) => ({ data: Object.values(ext.customers).filter((c) => c.email === email) }),
            create: async (p) => { const c = { id: `cus_new${Object.keys(ext.customers).length}`, ...p }; ext.customers[c.id] = c; return c; },
            retrieve: async (id) => ext.customers[id] || { deleted: true },
            update: async () => ({}),
        },
        subscriptions: { list: () => listOf([]), update: async () => ({}) },
        invoices: { list: () => listOf([]) },
        paymentIntents: { list: async () => ({ data: [] }), search: async () => ({ data: [] }) },
    }),
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
    // Jeton = identifiant du compte Clerk ; « bad » = signature invalide.
    verifyToken: async (token) => { if (token === 'bad' || !token.startsWith('user_')) throw new Error('invalid signature'); return { sub: token }; },
}));

const auth = await import('../../api/_auth.js');
const front = await import('../../src/utils/adminEmail.js');
const { signupUrl } = await import('../../api/_email-templates.js');
const { signupProofToken, isValidSignupProof } = await import('../../api/_signup-proof.js');
const dataHandler = (await import('../../api/data.js')).default;
const payHandler = (await import('../../api/pay.js')).default;

const mockRes = () => {
    const r = { code: 200, body: null, headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.send = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; return r; };
    r.end = () => r;
    return r;
};
const call = async (who, method, ...args) => {
    const res = mockRes();
    await dataHandler({ method: 'POST', headers: { host: 'site.test', ...(who ? { authorization: `Bearer ${who}` } : {}) }, body: { method, args }, query: {} }, res);
    return { code: res.code, result: res.body?.result, error: res.body?.error };
};
const makeUser = (id, email, status = 'verified', over = {}) => {
    ext.clerk[id] = { id, firstName: 'Test', primaryEmailAddressId: `idn_${id}`, emailAddresses: [{ id: `idn_${id}`, emailAddress: email, verification: { status } }], ...over };
    return id;
};
const sql = (q, p = []) => ext.conn.execute(q, p);
const rows = (q, p) => ext.conn.all(q, p);

const A = '1700000000001';
const B = '1700000000002';
async function seed() {
    await sql("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES (?, 'Alice A', 'alice@x.fr', 'ALICE SAS', 'Toulouse', 'essentiel', 'actif', '2026-01-01', '2026-01-01', 'user_alice', 'linked', ?)",
        [A, JSON.stringify({ stripe_customer_id: 'cus_A', kbisUrl: 'https://res.cloudinary.com/demo/kbis-alice.pdf', stripe_session_id: 'cs_alice' })]);
    await sql("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES (?, 'Bob B', 'bob@x.fr', 'BOB SAS', 'Toulouse', 'essentiel', 'actif', '2026-01-01', '2026-01-01', '', 'invitation_sent', ?)",
        [B, JSON.stringify({ stripe_customer_id: 'cus_B' })]);
    await sql("INSERT INTO mail (id, clientId, company, type, \"from\", date, status, preview) VALUES ('mail_A', ?, 'ALICE SAS', 'lettre', 'URSSAF', '2026-11-01', 'nouveau', '')", [A]);
    await sql("INSERT INTO documents (id, clientId, name, size, type, uploadedAt, owner, folder, url) VALUES ('doc_A', ?, 'Kbis', '1', 'pdf', '2026-11-01', 'client', 'Documents', 'https://res.cloudinary.com/demo/a.pdf')", [A]);
    await sql("INSERT INTO messages (id, clientId, content, sender, createdAt, status) VALUES ('msg_A', ?, 'secret', 'admin', '2026-11-01', 'sent')", [A]);
    await sql("INSERT INTO payments (id, clientId, amount, status, method, date) VALUES ('pay_A', ?, '30', 'payé', 'Stripe', '2026-11-01')", [A]);
    ext.customers.cus_A = { id: 'cus_A', email: 'alice@x.fr' };
    ext.customers.cus_B = { id: 'cus_B', email: 'bob@x.fr' };
}

beforeAll(() => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_PORT: '465', SMTP_USER: 's@test.fr', SMTP_PASS: 'abcdabcdabcdabcd', CLERK_SECRET_KEY: 'sk_test_x', VITE_ADMIN_EMAILS: 'mwcrea.agency@gmail.com, Second.Admin@Example.com ' });
    for (const m of ['error', 'warn', 'log']) vi.spyOn(console, m).mockImplementation(() => {});
});
beforeEach(async () => {
    ext.conn = await createSqlJsConn();
    Object.assign(ext, { outbox: [], clerk: {}, updates: [], sessions: {}, createdSessions: [], customers: {}, stripeCalls: 0 });
    auth.__setAuthVerifierForTests(null); // vraie vérification (verifyToken simulé) + cache vidé
    makeUser('user_alice', 'alice@x.fr');
    makeUser('user_bob', 'bob@x.fr');
    makeUser('user_admin', 'mwcrea.agency@gmail.com');
    await seed();
});

// ───────────────────────── Détection admin ─────────────────────────
describe('Détection administrateur (serveur et écran identiques)', () => {
    it.each([
        ['mwcrea.agency@gmail.com', true], ['  MWCREA.Agency@Gmail.com ', true], ['cimacludovic@gmail.com', true],
        ['second.admin@example.com', true], ['SECOND.ADMIN@EXAMPLE.COM', true],
        ['mwcrea.agency@gmail.com.evil.fr', false], ['x.mwcrea.agency@gmail.com', false], ['mwcrea.agency+x@gmail.com', false],
        ['', false], [null, false], [undefined, false], ['mwcrea.agency@gmail.com,bob@x.fr', false],
    ])('%s → %s', (email, expected) => {
        expect(auth.isAdminEmail(email)).toBe(expected);
        expect(front.isAdminEmail(email, process.env.VITE_ADMIN_EMAILS)).toBe(expected);
    });

    it('un admin dont l’email n’est PAS vérifié n’a aucun droit admin (403 EMAIL_NOT_VERIFIED)', async () => {
        makeUser('user_fakeadmin', 'MWCREA.agency@gmail.com', 'unverified');
        for (const m of ['getClients', 'getClientById', 'traiterDemande', 'linkClerkAccount', 'verifyClerkEmail', 'getMyAccount']) {
            const r = await call('user_fakeadmin', m, A, 'user_fakeadmin');
            expect(r.code, m).toBe(403);
            expect(r.error).toBe('EMAIL_NOT_VERIFIED');
        }
        const u = await auth.getAuthUser({ headers: { authorization: 'Bearer user_fakeadmin' } });
        expect(u).toEqual({ userId: 'user_fakeadmin', email: '', isAdmin: false });
    });

    it('un admin vérifié dont Clerk renvoie l’email en majuscules/espaces est bien admin', async () => {
        makeUser('user_admin2', '  Second.Admin@EXAMPLE.com ');
        const r = await call('user_admin2', 'getClients');
        expect(r.code).toBe(200);
        expect(r.result.map((c) => c.id).sort()).toEqual([A, B]);
    });

    it('seul l’email PRINCIPAL compte : une adresse admin secondaire vérifiée ne donne rien', async () => {
        ext.clerk.user_mallory = { id: 'user_mallory', primaryEmailAddressId: 'idn_m1', emailAddresses: [
            { id: 'idn_m2', emailAddress: 'mwcrea.agency@gmail.com', verification: { status: 'verified' } },
            { id: 'idn_m1', emailAddress: 'mallory@x.fr', verification: { status: 'verified' } },
        ] };
        expect((await call('user_mallory', 'getClients')).code).toBe(403);
    });
});

// ───────────────────────── Jeton / identité ─────────────────────────
describe('Identité : jeton et email Clerk', () => {
    it('sans jeton, jeton invalide, en-tête mal formé → 401 (pas 500)', async () => {
        expect((await call(null, 'getMyAccount')).code).toBe(401);
        expect((await call('bad', 'getMyAccount')).code).toBe(401);
        const res = mockRes();
        await dataHandler({ method: 'POST', headers: { authorization: 'Basic user_alice' }, body: { method: 'getMyAccount', args: [] } }, res);
        expect(res.code).toBe(401);
        expect((await call('user_ghost', 'getMyAccount')).code).toBe(401); // compte supprimé chez Clerk
    });

    it('email Clerk avec majuscules / espaces : retrouve la fiche enregistrée en minuscules', async () => {
        makeUser('user_bob2', '  BOB@X.FR ');
        await sql("UPDATE clients SET clerkId = '' WHERE id = ?", [B]);
        const r = await call('user_bob2', 'getMyAccount', {});
        expect(r.result?.record?.id).toBe(B);
    });

    it('un email non vérifié n’est jamais mis en cache : vérifié ensuite → reconnu immédiatement', async () => {
        makeUser('user_new', 'new@x.fr', 'unverified');
        expect((await call('user_new', 'getMyAccount', {})).error).toBe('EMAIL_NOT_VERIFIED');
        ext.clerk.user_new.emailAddresses[0].verification.status = 'verified';
        expect((await call('user_new', 'getMyAccount', {})).code).toBe(200);
    });

    it('primaryEmailAddressId absent : l’unique adresse VÉRIFIÉE sert d’identité ; une adresse non vérifiée ne donne aucun accès', async () => {
        // Même règle que l'envoi du code (sinon : 403 d'un côté, « déjà vérifié » de l'autre → rechargement en boucle).
        makeUser('user_weird', 'alice@x.fr', 'verified', { primaryEmailAddressId: null });
        expect((await call('user_weird', 'getMyAccount', {})).code).toBe(200);
        makeUser('user_weird2', 'zed@x.fr', 'unverified', { primaryEmailAddressId: null });
        expect((await call('user_weird2', 'getMyAccount', {})).error).toBe('EMAIL_NOT_VERIFIED');
    });

    it('PUBLIC_METHODS restent accessibles sans compte, mais rien d’autre', async () => {
        expect((await call(null, 'checkPaymentStatus', 'ALICE@x.fr ')).result).toBe(true);
        expect((await call(null, 'checkPaymentStatus', 'nobody@x.fr')).result).toBe(false);
        expect((await call(null, 'checkPaymentStatus', null)).result).toBe(false);
        expect((await call(null, 'hasPendingDemandeForSession', "cs_x' OR 1=1 --")).result).toBe(false);
        expect((await call(null, 'getSouscriptionLeadByToken', '../../etc')).result).toBeNull();
    });
});

// ───────────────────────── IDOR : matrice ─────────────────────────
describe('Aucun accès au dossier d’un autre client (IDOR)', () => {
    const OWNED = ['getClientMail', 'getDocuments', 'getClientBookings', 'getMessages', 'getClientReexpeditions', 'getPayments',
        'getClientFolders', 'addReexpeditionRequest', 'updateClientAddress', 'addMessage', 'markMessagesAsRead', 'addDocument',
        'updateClientExtraInfo', 'updateClientStatus'];
    const ID_VARIANTS = [A, Number(A), ` ${A}`, `${A} `, [A], { id: A }];

    it.each(OWNED)('%s avec l’id d’Alice (et variantes de type) → 403 pour Bob', async (method) => {
        for (const id of ID_VARIANTS) {
            const r = await call('user_bob', method, id, { content: 'x', url: 'https://res.cloudinary.com/demo/x.pdf', address: 'x' });
            expect(r.code, `${method}(${JSON.stringify(id)})`).toBe(403);
        }
    });

    it('les données d’Alice ne bougent pas après la rafale de Bob', async () => {
        for (const m of OWNED) await call('user_bob', m, A, { content: 'pirate', url: 'https://res.cloudinary.com/demo/x.pdf' });
        expect(rows('SELECT COUNT(*) AS n FROM messages WHERE clientId = ?', [A])[0].n).toBe(1);
        expect(rows('SELECT COUNT(*) AS n FROM documents WHERE clientId = ?', [A])[0].n).toBe(1);
        expect(rows("SELECT status FROM messages WHERE id = 'msg_A'")[0].status).toBe('sent');
        expect(JSON.parse(rows('SELECT extra_info FROM clients WHERE id = ?', [A])[0].extra_info).stripe_customer_id).toBe('cus_A');
    });

    it('courrier / document d’Alice par leur propre id → 403 ; Alice, elle, peut', async () => {
        expect((await call('user_bob', 'markMailAsRead', 'mail_A')).code).toBe(403);
        expect((await call('user_bob', 'deleteDocument', 'doc_A')).code).toBe(403);
        expect((await call('user_bob', 'markMailAsRead', 'inexistant')).code).toBe(403);
        expect(rows("SELECT COUNT(*) AS n FROM documents WHERE id = 'doc_A'")[0].n).toBe(1);
        expect((await call('user_alice', 'markMailAsRead', 'mail_A')).code).toBe(200);
        expect((await call('user_alice', 'getDocuments', A)).result).toHaveLength(1);
    });

    it('Bob ne peut pas s’attribuer l’identifiant Stripe d’Alice (portail de facturation)', async () => {
        const r = await call('user_bob', 'updateClientExtraInfo', B, { stripe_customer_id: 'cus_A' });
        expect(r.code).toBe(403);
        expect(JSON.parse(rows('SELECT extra_info FROM clients WHERE id = ?', [B])[0].extra_info).stripe_customer_id).toBe('cus_B');
    });

    it('réservation : la session Stripe d’une salle réservée pour Alice ne s’enregistre pas pour Bob', async () => {
        ext.sessions.cs_meet = { id: 'cs_meet', status: 'complete', payment_status: 'paid', metadata: { type: 'meeting_booking', client_id: A, meeting_type: 'reunion', duration: '1h', date: '2030-01-01' } };
        expect((await call('user_bob', 'confirmMeetingBooking', 'cs_meet')).code).toBe(403);
        expect((await call('user_bob', 'confirmMeetingBooking', '../cs')).code).toBe(400);
    });

    it.each(['getClients', 'getClientById', 'getClientByEmail', 'getClientBySessionId', 'getMail', 'getDemandes', 'traiterDemande', 'deleteClient',
        'updateClientClerkId', 'updateDemandeClerkId', 'addClientMail', 'getEmailLogs', 'linkClerkAccount', 'verifyClerkEmail', 'clerkAccountsForClient',
        'addPayment', 'init', 'confirmDemandePayment', 'constructor', '__proto__', 'toString', 'hasOwnProperty', ''])(
        'méthode admin / interne « %s » refusée à un client', async (m) => {
            const r = await call('user_bob', m, A, 'user_bob');
            expect([403, 404]).toContain(r.code);
            expect(r.result).toBeUndefined();
        });

    it('même l’admin ne peut appeler les méthodes internes ni les méthodes héritées', async () => {
        for (const m of ['init', 'confirmDemandePayment', 'constructor', 'toString', '__proto__', 'valueOf']) {
            expect((await call('user_admin', m)).code, m).toBe(404);
        }
    });

    it('arguments absurdes : jamais de 500, jamais de données', async () => {
        for (const args of [[], [null], [undefined], [{}], [[]], ['%'], ["' OR '1'='1"], [true]]) {
            const res = mockRes();
            await dataHandler({ method: 'POST', headers: { authorization: 'Bearer user_bob' }, body: { method: 'getDocuments', args } }, res);
            expect(res.code).toBe(403);
        }
        const res = mockRes();
        await dataHandler({ method: 'POST', headers: { authorization: 'Bearer user_bob' }, body: '{pas du json' }, res);
        expect(res.code).toBe(403); // méthode vide → refus
    });
});

// ───────────────────────── Liaison du compte Clerk ─────────────────────────
describe('Liaison compte de connexion ↔ dossier (getMyAccount)', () => {
    it('premier passage : relie le compte au dossier au même email vérifié', async () => {
        const r = await call('user_bob', 'getMyAccount', {});
        expect(r.result).toMatchObject({ kind: 'client', record: { id: B, clerkId: 'user_bob' } });
        expect(rows('SELECT clerkId FROM clients WHERE id = ?', [B])[0].clerkId).toBe('user_bob');
    });

    it('client dont le compte a un AUTRE email que le dossier : accès par le clerkId déjà relié', async () => {
        makeUser('user_alice', 'alice.pro@autre.fr'); // a changé d'adresse chez Clerk
        const r = await call('user_alice', 'getMyAccount', {});
        expect(r.result?.record?.id).toBe(A);
        expect((await call('user_alice', 'getDocuments', A)).code).toBe(200);
    });

    it('session Stripe d’Alice dans l’URL : un autre compte ne récupère PAS son dossier', async () => {
        ext.sessions.cs_alice = { id: 'cs_alice', status: 'complete', payment_status: 'paid', customer_details: { email: 'alice@x.fr' }, metadata: { email: 'alice@x.fr' } };
        makeUser('user_eve', 'eve@x.fr');
        const r = await call('user_eve', 'getMyAccount', { sessionId: 'cs_alice' });
        expect(r.result).toBeNull();
        expect(rows('SELECT clerkId FROM clients WHERE id = ?', [A])[0].clerkId).toBe('user_alice');
    });

    it('session payée avec l’email du compte mais dossier déjà relié à un autre compte : pas de vol de liaison', async () => {
        await sql("UPDATE clients SET extra_info = ? WHERE id = ?", [JSON.stringify({ stripe_session_id: 'cs_shared' }), A]);
        await sql("UPDATE clients SET email = 'alice.dossier@x.fr' WHERE id = ?", [A]);
        ext.sessions.cs_shared = { id: 'cs_shared', status: 'complete', customer_details: { email: 'eve@x.fr' } };
        makeUser('user_eve', 'eve@x.fr');
        expect((await call('user_eve', 'getMyAccount', { sessionId: 'cs_shared' })).result).toBeNull();
        expect(rows('SELECT clerkId FROM clients WHERE id = ?', [A])[0].clerkId).toBe('user_alice');
    });

    it('session payée avec l’email du compte, dossier non relié et email différent : reliée (client qui a payé avec une autre adresse)', async () => {
        await sql("UPDATE clients SET extra_info = ?, clerkId = '' WHERE id = ?", [JSON.stringify({ stripe_session_id: 'cs_b' }), B]);
        await sql("UPDATE clients SET email = 'bob.paiement@x.fr' WHERE id = ?", [B]);
        ext.sessions.cs_b = { id: 'cs_b', status: 'complete', customer_details: { email: 'BOB@x.fr' } };
        const r = await call('user_bob', 'getMyAccount', { sessionId: 'cs_b' });
        expect(r.result?.record?.id).toBe(B);
    });

    it('sessionId mal formé : ignoré, aucun appel Stripe', async () => {
        makeUser('user_eve', 'eve@x.fr');
        for (const sessionId of ['cs_a/../b', "cs_' OR 1", 'pi_123', 123, null, { $ne: 1 }]) {
            expect((await call('user_eve', 'getMyAccount', { sessionId })).code).toBe(200);
        }
        expect(ext.stripeCalls).toBe(0);
    });

    it('admin : un compte déjà relié à un dossier ne peut pas être relié à un second (409)', async () => {
        const r = await call('user_admin', 'linkClerkAccount', B, 'user_alice');
        expect(r.code).toBe(409);
        expect((await call('user_admin', 'linkClerkAccount', B, 'user_inconnu')).code).toBe(404);
        expect((await call('user_admin', 'linkClerkAccount', B, 'user_bob')).result).toMatchObject({ linked: true });
    });
});

// ───────────────────────── Vérification de l’email ─────────────────────────
describe('Vérification de l’email : preuves et codes', () => {
    it('preuve ?v= : insensible à la casse/espaces de l’email, refusée pour toute autre adresse', () => {
        const t = signupProofToken('  Jean@X.fr ');
        expect(isValidSignupProof('jean@x.fr', t)).toBe(true);
        expect(isValidSignupProof('JEAN@x.fr', t)).toBe(true);
        expect(isValidSignupProof('jean@x.fr ', t)).toBe(true);
        expect(isValidSignupProof('jean2@x.fr', t)).toBe(false);
        expect(isValidSignupProof('', signupProofToken(''))).toBe(false);
        expect(isValidSignupProof('jean@x.fr', null)).toBe(false);
        expect(isValidSignupProof('jean@x.fr', { toString: () => t })).toBe(true); // String(token) — inoffensif
        expect(isValidSignupProof('jean@x.fr', t.slice(0, 31))).toBe(false);
        expect(isValidSignupProof('jean@x.fr', `${t}x`)).toBe(false);
    });

    it('lien signupUrl : email encodé (« + » conservé) et preuve valide', () => {
        const url = new URL(signupUrl('https://site.test', 'Jean+Dpc@Gmail.com'));
        expect(url.searchParams.get('email')).toBe('jean+dpc@gmail.com');
        expect(isValidSignupProof('jean+dpc@gmail.com', url.searchParams.get('v'))).toBe(true);
        expect(signupUrl('https://site.test', '')).toBe('https://site.test/inscription');
    });

    it('verifyEmailWithProof : arguments absurdes → 403 propre, jamais 500, aucune validation', async () => {
        makeUser('user_n', 'n@x.fr', 'unverified');
        for (const proof of [undefined, null, {}, [], 'abc', 42, { token: 123 }, { token: ['x'] }, { sessionId: 'cs_bad/../x' }, { sessionId: { a: 1 } }, { token: '', sessionId: '' }]) {
            const r = await call('user_n', 'verifyEmailWithProof', proof);
            expect(r.code, JSON.stringify(proof)).toBe(403);
        }
        expect(ext.updates).toHaveLength(0);
        expect(ext.stripeCalls).toBe(0);
    });

    it('verifyEmailWithProof : session impayée / ouverte / d’une autre adresse / inexistante → refus', async () => {
        makeUser('user_n', 'n@x.fr', 'unverified');
        ext.sessions.cs_open = { status: 'open', payment_status: 'unpaid', customer_details: { email: 'n@x.fr' } };
        ext.sessions.cs_exp = { status: 'expired', payment_status: 'unpaid', customer_email: 'n@x.fr' };
        ext.sessions.cs_other = { status: 'complete', payment_status: 'paid', customer_details: { email: 'm@x.fr' } };
        ext.sessions.cs_noemail = { status: 'complete', payment_status: 'paid' };
        for (const s of ['cs_open', 'cs_exp', 'cs_other', 'cs_noemail', 'cs_missing']) {
            expect((await call('user_n', 'verifyEmailWithProof', { sessionId: s })).code, s).toBe(403);
        }
        expect(ext.updates).toHaveLength(0);
    });

    it('verifyEmailWithProof : la preuve d’une adresse ne sert pas après changement d’adresse du compte', async () => {
        const token = signupProofToken('first@x.fr');
        makeUser('user_n', 'second@x.fr', 'unverified');
        expect((await call('user_n', 'verifyEmailWithProof', { token })).code).toBe(403);
    });

    it('confirmEmailVerificationCode : formats absurdes → 400, jamais 500', async () => {
        makeUser('user_n', 'n@x.fr', 'unverified');
        await call('user_n', 'sendEmailVerificationCode');
        for (const code of [undefined, null, {}, [], '12345', '1234567', 'abcdef', '12 34 5', -123456, 1e6]) {
            expect((await call('user_n', 'confirmEmailVerificationCode', code)).code, String(code)).toBe(400);
        }
        // espaces tolérés dans le bon code
        const good = /(\d{6})/.exec(ext.outbox.at(-1).subject)[1];
        expect((await call('user_n', 'confirmEmailVerificationCode', `${good.slice(0, 3)} ${good.slice(3)}`)).result).toEqual({ verified: true });
    });

    it('code demandé pour une adresse, compte passé à une autre adresse avant saisie → refusé', async () => {
        makeUser('user_n', 'n@x.fr', 'unverified');
        await call('user_n', 'sendEmailVerificationCode');
        const good = /(\d{6})/.exec(ext.outbox.at(-1).subject)[1];
        ext.clerk.user_n.emailAddresses[0].emailAddress = 'victime@x.fr';
        const r = await call('user_n', 'confirmEmailVerificationCode', good);
        expect(r.code).toBe(400);
        expect(ext.updates).toHaveLength(0);
    });

    it('un utilisateur non vérifié qui s’inscrit avec l’email d’Alice ne voit rien de son dossier', async () => {
        makeUser('user_squat', 'alice@x.fr', 'unverified');
        for (const m of ['getMyAccount', 'getDocuments', 'getClientMail', 'getMessages']) {
            expect((await call('user_squat', m, A)).error).toBe('EMAIL_NOT_VERIFIED');
        }
        // le code part à la boîte d'Alice, pas à l'imposteur
        await call('user_squat', 'sendEmailVerificationCode');
        expect(ext.outbox.at(-1).to).toBe('alice@x.fr');
    });
});

// ───────────────────────── Client payé via le lien de paiement admin ─────────────────────────
describe('Client payé via le lien de paiement admin (/api/pay)', () => {
    it('retour Stripe → /inscription avec une preuve valide pour l’email du dossier → compte validé et dossier accessible', async () => {
        const token = 'a'.repeat(40);
        await sql("UPDATE clients SET clerkId = '', extra_info = ? WHERE id = ?", [JSON.stringify({ payment_token: token, plan_id: 'essentiel' }), B]);
        ext.sessions.cs_pay = { id: 'cs_pay', status: 'complete', payment_status: 'paid', customer: 'cus_B', subscription: 'sub_1', metadata: { admin_client_id: B, email: 'bob@x.fr' }, customer_details: { email: 'bob@x.fr' } };
        const res = mockRes();
        await payHandler({ method: 'GET', headers: { host: 'site.test' }, query: { token, session_id: 'cs_pay' } }, res);
        expect(res.code).toBe(303);
        const loc = new URL(res.headers.Location);
        expect(loc.pathname).toBe('/inscription');
        expect(loc.searchParams.get('email')).toBe('bob@x.fr');
        // Il crée son compte (non vérifié) puis l'espace client présente la preuve
        delete ext.clerk.user_bob;
        makeUser('user_bobnew', 'bob@x.fr', 'unverified');
        expect((await call('user_bobnew', 'verifyEmailWithProof', { token: loc.searchParams.get('v') })).result).toMatchObject({ verified: true });
        expect((await call('user_bobnew', 'getMyAccount', {})).result?.record?.id).toBe(B);
    });

    it('lien de paiement d’un client avec une session d’un AUTRE dossier → pas de redirection vers l’inscription', async () => {
        const token = 'b'.repeat(40);
        await sql("UPDATE clients SET extra_info = ? WHERE id = ?", [JSON.stringify({ payment_token: token, plan_id: 'essentiel' }), B]);
        ext.sessions.cs_pay = { id: 'cs_pay', status: 'complete', metadata: { admin_client_id: A } };
        const res = mockRes();
        await payHandler({ method: 'GET', headers: { host: 'site.test' }, query: { token, session_id: 'cs_pay' } }, res);
        expect(res.headers.Location || '').not.toMatch(/inscription/);
    });
});
