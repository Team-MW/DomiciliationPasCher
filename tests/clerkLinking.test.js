import { describe, it, expect, vi, beforeEach } from 'vitest';

const clerk = vi.hoisted(() => ({ users: { getUserList: vi.fn(), getUser: vi.fn() } }));
vi.mock('@clerk/backend', () => ({ createClerkClient: () => clerk }));
vi.mock('../api/_stripe-client.js', () => ({ getStripe: () => ({}) }));
vi.mock('../api/_email-core.js', () => ({ deliverEmail: vi.fn() }));

import { createHandler } from '../api/data.js';

const user = (id, email, extra = {}) => ({ id, firstName: 'William', lastName: 'Rouzee', createdAt: 1, lastSignInAt: null, primaryEmailAddressId: 'e1', emailAddresses: [{ id: 'e1', emailAddress: email, verification: { status: 'verified' } }], ...extra });

function makeDb({ otherLinked = false } = {}) {
    const state = { clerkId: '' };
    const execute = vi.fn(async (sql, params = []) => {
        if (/^SELECT \* FROM clients WHERE id = \?/.test(sql)) return { rows: [{ id: 'c1', name: 'William Rouzee', email: 'william.rouzee@icloud.com', clerkId: state.clerkId, extra_info: '{"nom":"Rouzee","prenom":"William"}' }] };
        if (/^SELECT id, email, extra_info FROM clients WHERE \(email = \?/.test(sql)) return { rows: [] };
        if (/FROM demandes/.test(sql)) return { rows: [] };
        if (/^SELECT id FROM clients WHERE clerkId = \?/.test(sql)) return { rows: otherLinked ? [{ id: 'autre' }] : [] };
        if (/^UPDATE clients SET clerkId = \?/.test(sql)) { state.clerkId = params[0]; return { rows: [] }; }
        if (/^SELECT \* FROM clients WHERE clerkId = \?/.test(sql)) return { rows: state.clerkId && state.clerkId === params[0] ? [{ id: 'c1', name: 'William Rouzee', email: 'william.rouzee@icloud.com', clerkId: state.clerkId, extra_info: '{}' }] : [] };
        return { rows: [] };
    });
    return { execute, state };
}

const call = async (db, who, method, args) => {
    const handler = createHandler({ getConn: () => db, getAuth: async () => who });
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await handler({ method: 'POST', headers: { host: 'site.test' }, body: { method, args } }, res);
    return res;
};
const ADMIN = { userId: 'user_admin', email: 'mwcrea.agency@gmail.com', isAdmin: true };
const CLIENT = { userId: 'user_w', email: 'william.rouzee@icloud.com', isAdmin: false };

beforeEach(() => { vi.clearAllMocks(); process.env.CLERK_SECRET_KEY = 'sk_test_x'; });

describe('Admin : retrouver et relier le compte de connexion d’un client (cas « inscrit mais introuvable »)', () => {
    it('trouve un compte à adresse RELAIS iCloud par le nom, et l’indique comme « adresse différente »', async () => {
        clerk.users.getUserList.mockImplementation(async (q) => ({ data: q.query ? [user('user_relay', 'abc123@privaterelay.appleid.com')] : [] }));
        const r = await call(makeDb(), ADMIN, 'clerkAccountsForClient', ['c1']);
        expect(r.code).toBe(200);
        expect(r.body.result.accounts).toHaveLength(1);
        expect(r.body.result.accounts[0]).toMatchObject({ id: 'user_relay', sameEmail: false, linkedHere: false, linkedElsewhere: false, verified: true });
    });

    it('aucun compte nulle part → liste vide (le client ne s’est pas inscrit)', async () => {
        clerk.users.getUserList.mockResolvedValue({ data: [] });
        const r = await call(makeDb(), ADMIN, 'clerkAccountsForClient', ['c1']);
        expect(r.body.result.accounts).toEqual([]);
    });

    it('relier : enregistre le compte sur la fiche, quelle que soit son adresse', async () => {
        clerk.users.getUser.mockResolvedValue(user('user_relay', 'abc@privaterelay.appleid.com'));
        const db = makeDb();
        const r = await call(db, ADMIN, 'linkClerkAccount', ['c1', 'user_relay']);
        expect(r.body.result).toMatchObject({ linked: true });
        expect(db.state.clerkId).toBe('user_relay');
    });

    it('refuse un compte déjà relié à un autre dossier, un compte inexistant ou mal formé', async () => {
        clerk.users.getUser.mockResolvedValue(user('user_x', 'x@y.fr'));
        expect((await call(makeDb({ otherLinked: true }), ADMIN, 'linkClerkAccount', ['c1', 'user_x'])).code).toBe(409);
        clerk.users.getUser.mockRejectedValue(new Error('not found'));
        expect((await call(makeDb(), ADMIN, 'linkClerkAccount', ['c1', 'user_x'])).code).toBe(404);
        expect((await call(makeDb(), ADMIN, 'linkClerkAccount', ['c1', "user_x'; DROP"])).code).toBe(400);
    });

    it('réservé à l’administration : un client ne peut ni chercher ni relier des comptes', async () => {
        const db = makeDb();
        expect((await call(db, CLIENT, 'clerkAccountsForClient', ['c1'])).code).toBe(403);
        expect((await call(db, CLIENT, 'linkClerkAccount', ['c1', 'user_w'])).code).toBe(403);
        expect(db.state.clerkId).toBe('');
    });

    it('APRÈS liaison, le client inscrit avec une adresse relais retrouve son dossier ; avant, il ne le trouve pas', async () => {
        const relay = { userId: 'user_relay', email: 'abc123@privaterelay.appleid.com', isAdmin: false };
        const db = makeDb();
        expect((await call(db, relay, 'getMyAccount', [{}])).body.result).toBeNull(); // « Aucun dossier trouvé »
        clerk.users.getUser.mockResolvedValue(user('user_relay', relay.email));
        await call(db, ADMIN, 'linkClerkAccount', ['c1', 'user_relay']);
        const after = (await call(db, relay, 'getMyAccount', [{}])).body.result;
        expect(after).toMatchObject({ kind: 'client' });
        expect(after.record.id).toBe('c1');
    });
});

