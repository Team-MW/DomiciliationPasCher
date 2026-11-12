// @vitest-environment happy-dom
/**
 * AUDIT — bugs RÉELS reproduits (création de compte / vérification d'email / accès au dossier).
 * Chaque test décrit le comportement ATTENDU ; il échoue aujourd'hui, d'où le it.skip.
 * Retirer le .skip une fois le bug corrigé.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

const ext = vi.hoisted(() => ({ conn: null, outbox: [], clerk: {}, updates: [], sessions: {}, createdSessions: [], customers: {}, account: null }));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: async (mail) => { ext.outbox.push(mail); return { messageId: `<m${ext.outbox.length}>` }; } }) },
}));
vi.mock('../../api/_stripe-client.js', () => ({
    getStripe: () => ({
        checkout: { sessions: {
            retrieve: async (id) => { if (!ext.sessions[id]) throw new Error(`No such checkout.session: ${id}`); return ext.sessions[id]; },
            create: async (params) => { const s = { id: `cs_test_atk${ext.createdSessions.length}`, url: 'https://checkout.stripe.test/x', params }; ext.createdSessions.push(s); return s; },
        } },
        customers: {
            list: async ({ email }) => ({ data: Object.values(ext.customers).filter((c) => c.email === email) }),
            create: async (p) => { const c = { id: `cus_new${Object.keys(ext.customers).length}`, ...p }; ext.customers[c.id] = c; return c; },
            update: async () => ({}),
        },
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
    verifyToken: async (token) => { if (!String(token).startsWith('user_')) throw new Error('invalid'); return { sub: token }; },
}));
// --- Front (espace client) ---
vi.mock('@clerk/clerk-react', () => ({
    useUser: () => ({ isLoaded: true, user: { id: 'u1', firstName: 'Jean', primaryEmailAddress: { emailAddress: 'jean@x.fr' } } }),
    useClerk: () => ({ signOut: vi.fn() }),
    UserButton: () => null,
}));
vi.mock('../../src/i18n/detectLanguage', () => ({ detectLanguageFromIP: vi.fn().mockResolvedValue(null) }));
vi.mock('../../src/utils/emailService', () => ({ sendAdminDocumentUploadedEmail: vi.fn(), sendClientNewMessageEmail: vi.fn(), sendReexpeditionRequestEmail: vi.fn() }));
const svc = vi.hoisted(() => ({
    getMyAccount: vi.fn(async () => ext.account),
    getClientMail: vi.fn().mockResolvedValue([]),
    getDocuments: vi.fn().mockResolvedValue([]),
    getClientBookings: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    getClientReexpeditions: vi.fn().mockResolvedValue([]),
    markMessagesAsRead: vi.fn().mockResolvedValue(null),
    syncStripePayments: vi.fn(),
    updateClientStatus: vi.fn(),
}));
vi.mock('../../src/services/adminDataService', () => ({ adminDataService: svc, callDataApi: vi.fn() }));

const auth = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const checkoutHandler = (await import('../../api/checkout.js')).default;

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
const makeUser = (id, email, status = 'verified') => {
    ext.clerk[id] = { id, firstName: 'X', primaryEmailAddressId: `idn_${id}`, emailAddresses: [{ id: `idn_${id}`, emailAddress: email, verification: { status } }] };
};

beforeAll(() => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_PORT: '465', SMTP_USER: 's@test.fr', SMTP_PASS: 'abcdabcdabcdabcd', CLERK_SECRET_KEY: 'sk_test_x', VITE_ADMIN_EMAILS: 'mwcrea.agency@gmail.com' });
    for (const m of ['error', 'warn', 'log']) vi.spyOn(console, m).mockImplementation(() => {});
});
beforeEach(async () => {
    ext.conn = await createSqlJsConn();
    Object.assign(ext, { outbox: [], clerk: {}, updates: [], sessions: {}, createdSessions: [], customers: {}, account: null });
    auth.__setAuthVerifierForTests(null);
});
afterEach(() => cleanup());

describe('BUGS — vérification d’email / accès au dossier', () => {
    // BUG: la "preuve" par session Stripe payée (api/_email-verification.js verifyEmailWithProof) ne prouve pas la possession de la boîte mail : n'importe qui peut payer une session au nom de l'email d'un client (demande publique) et obtenir son dossier.
    it('payer une souscription avec l’email d’un client existant ne permet pas de valider un compte Clerk à son nom', async () => {
        // Victime : cliente active qui n'a jamais créé son accès (cas fréquent : « ne jamais supposer qu'un payeur a un compte »).
        await ext.conn.execute("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES ('1700000000009', 'Victime V', 'victime@x.fr', 'VICTIME SAS', 'Toulouse', 'essentiel', 'actif', '2026-01-01', '2026-01-01', '', 'invitation_sent', ?)",
            [JSON.stringify({ kbisUrl: 'https://res.cloudinary.com/demo/kbis-victime.pdf', stripe_customer_id: 'cus_V' })]);
        ext.customers.cus_V = { id: 'cus_V', email: 'victime@x.fr' };

        // 1. L'attaquant dépose une demande PUBLIQUE avec l'email de la victime…
        const dem = await call(null, 'addDemande', { clientName: 'Pirate', email: 'victime@x.fr', company: 'X', plan: 'Essentiel', extra_info: { offre: 'notification', frequence: 'mensuel', email: 'victime@x.fr' } });
        // Depuis le 12/11 : un dossier payé existe déjà pour cet email → la demande publique est refusée (409),
        // l'attaque s'arrête ici (et un vrai client ne peut plus payer deux fois).
        expect(dem.code).toBe(409);
        expect(ext.createdSessions).toHaveLength(0);
        if (dem.code === 409) return;
        // 2. … et ouvre un paiement : Stripe reçoit l'email de la victime (client Stripe de la victime réutilisé).
        const co = mockRes();
        await checkoutHandler({ method: 'POST', headers: { host: 'site.test', origin: 'https://site.test' }, body: { metadata: { demande_id: dem.result.id }, email: 'pirate@x.fr' } }, co);
        expect(co.code).toBe(200);
        const params = ext.createdSessions[0].params;
        expect(params.customer === 'cus_V' || params.customer_email === 'victime@x.fr').toBe(true);
        // 3. Il paie avec SA carte : Stripe renvoie l'email de la victime dans customer_details (jamais vérifié par Stripe).
        ext.sessions[co.body.id] = { id: co.body.id, status: 'complete', payment_status: 'paid', customer: 'cus_V', customer_details: { email: 'victime@x.fr' }, metadata: params.metadata };
        // 4. Il crée un compte Clerk avec l'email de la victime (non vérifié) et présente la session.
        makeUser('user_pirate', 'victime@x.fr', 'unverified');
        const proof = await call('user_pirate', 'verifyEmailWithProof', { sessionId: co.body.id });

        // Attendu : refus (il n'a jamais prouvé recevoir les emails de cette adresse).
        expect(proof.code).toBe(403);
        expect(ext.updates).toHaveLength(0);
        const acc = await call('user_pirate', 'getMyAccount', {});
        expect(acc.result?.record?.id).not.toBe('1700000000009');
    });

    // BUG: la limite de 5 essais du code de vérification (api/_email-verification.js confirmEmailVerificationCode) est contournable par des requêtes simultanées (lecture de `attempts` puis incrément non atomique).
    it('des essais envoyés en parallèle ne dépassent pas la limite de 5 codes testés', async () => {
        makeUser('user_brute', 'cible@x.fr', 'unverified');
        expect((await call('user_brute', 'sendEmailVerificationCode')).code).toBe(200);
        const good = /(\d{6})/.exec(ext.outbox.at(-1).subject)[1];
        const guesses = [];
        for (let i = 0; guesses.length < 40; i++) { const g = String(i).padStart(6, '0'); if (g !== good) guesses.push(g); }
        guesses.push(good); // 41e essai : le bon code
        const results = await Promise.all(guesses.map((g) => call('user_brute', 'confirmEmailVerificationCode', g)));

        // Attendu : au plus 5 codes réellement comparés ; le bon code arrivé après 40 faux est refusé.
        expect(results.filter((r) => r.error === 'Code incorrect.').length).toBeLessThanOrEqual(5);
        expect(results.at(-1).result).toBeUndefined();
        expect(ext.updates).toHaveLength(0);
    });

    // BUG: src/pages/EspaceClient/EspaceClient.jsx:133 lit localStorage hors try/catch dédié : si le stockage est bloqué (cookies/données de site bloqués), un client payeur voit une erreur serveur au lieu de son dossier.
    it('stockage navigateur bloqué : le client accède quand même à son dossier', async () => {
        const { LanguageProvider } = await import('../../src/i18n/LanguageContext');
        const { DialogProvider } = await import('../../src/components/AppDialog/DialogProvider');
        const EspaceClient = (await import('../../src/pages/EspaceClient/EspaceClient.jsx')).default;
        ext.account = { kind: 'client', record: { id: 'c1', name: 'Jean D', email: 'jean@x.fr', company: 'ACME', plan: 'essentiel', status: 'actif', since: '2026-01-01', extra_info: '{}' } };
        window.history.pushState({}, '', '/app/espace-client');
        // Données de site bloquées : le simple accès à window.localStorage lève une SecurityError (Chrome/Safari).
        const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Access is denied for this document.', 'SecurityError'); } });
        try {
            const h = React.createElement;
            render(h(MemoryRouter, null, h(LanguageProvider, null, h(DialogProvider, null, h(EspaceClient)))));
            await waitFor(() => expect(document.querySelector('.ec-sidebar')).toBeTruthy(), { timeout: 3000 });
        } finally {
            if (original) Object.defineProperty(window, 'localStorage', original);
        }
    });
});
