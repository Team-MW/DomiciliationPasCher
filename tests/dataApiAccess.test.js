import { describe, it, expect, vi, beforeEach } from 'vitest';

const { retrieveSession, deliverEmail } = vi.hoisted(() => ({
    retrieveSession: vi.fn(),
    deliverEmail: vi.fn().mockResolvedValue({}),
}));

vi.mock('../api/_stripe-client.js', () => ({
    getStripe: () => ({
        checkout: { sessions: { retrieve: retrieveSession } },
        customers: { retrieve: vi.fn().mockResolvedValue({ email: 'pirate@test.fr' }), list: vi.fn().mockResolvedValue({ data: [] }) },
        subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
        paymentIntents: { list: vi.fn().mockResolvedValue({ data: [] }), search: vi.fn().mockResolvedValue({ data: [] }) },
        invoices: { list: vi.fn().mockResolvedValue({ data: [] }) },
    }),
}));
vi.mock('../api/_email-core.js', () => ({ deliverEmail }));
vi.mock('@clerk/backend', () => ({ createClerkClient: vi.fn() }));

import { createHandler, sanitizeClientExtra } from '../api/data.js';

/**
 * Base en mémoire minimale : deux clients, Alice (cli_alice) et Bob (cli_bob).
 * Chaque requête SQL est journalisée pour vérifier qu'aucune écriture n'a lieu quand l'accès est refusé.
 */
function makeDb() {
    const clients = {
        cli_alice: { id: 'cli_alice', email: 'alice@test.fr', clerkId: '', status: 'echec_paiement', plan: 'Essentiel', extra_info: '{"stripe_customer_id":"cus_alice"}' },
        cli_bob: { id: 'cli_bob', email: 'bob@test.fr', clerkId: 'user_bob', status: 'actif', plan: 'Scan+', extra_info: '{}' },
    };
    const documents = { doc_bob: { id: 'doc_bob', clientId: 'cli_bob', owner: 'client' }, doc_admin: { id: 'doc_admin', clientId: 'cli_alice', owner: 'admin' } };
    const bookings = {};
    const log = [];
    const execute = vi.fn(async (sql, params = []) => {
        log.push(sql);
        if (/^SELECT id, email, extra_info FROM clients WHERE \(email = \?/.test(sql)) {
            const [email, clerkId] = params;
            return { rows: Object.values(clients).filter((c) => (c.email && c.email === email) || (c.clerkId && c.clerkId === clerkId)) };
        }
        if (/FROM demandes WHERE \(email = \?/.test(sql) || /FROM demandes WHERE status = 'en_attente' AND/.test(sql)) return { rows: [] };
        if (/^SELECT \* FROM clients WHERE email = \?/.test(sql)) return { rows: Object.values(clients).filter((c) => c.email === params[0]) };
        if (/^SELECT \* FROM clients WHERE clerkId = \?/.test(sql)) return { rows: Object.values(clients).filter((c) => c.clerkId === params[0]) };
        if (/^SELECT \* FROM clients WHERE id = \?/.test(sql)) return { rows: clients[params[0]] ? [clients[params[0]]] : [] };
        if (/^SELECT extra_info FROM clients WHERE id = \?/.test(sql)) return { rows: clients[params[0]] ? [clients[params[0]]] : [] };
        if (/^UPDATE clients SET extra_info = \? WHERE id = \?/.test(sql)) { clients[params[1]].extra_info = params[0]; return { rows: [] }; }
        if (/^UPDATE clients SET status = \? WHERE id = \?/.test(sql)) { clients[params[1]].status = params[0]; return { rows: [] }; }
        if (/^UPDATE clients SET clerkId = \?/.test(sql)) { clients[params[2]].clerkId = params[0]; return { rows: [] }; }
        if (/^SELECT \* FROM documents WHERE id = \?/.test(sql)) return { rows: documents[params[0]] ? [documents[params[0]]] : [] };
        if (/^DELETE FROM documents WHERE id = \?/.test(sql)) { delete documents[params[0]]; return { rows: [] }; }
        if (/^SELECT \* FROM bookings WHERE id = \?/.test(sql)) return { rows: bookings[params[0]] ? [bookings[params[0]]] : [] };
        if (/^INSERT (IGNORE )?INTO bookings/.test(sql)) {
            if (!bookings[params[0]]) bookings[params[0]] = { id: params[0], clientId: params[1] };
            return { rows: [] };
        }
        if (/^SELECT \* FROM mail WHERE id = \?/.test(sql)) return { rows: params[0] === 'mail_bob' ? [{ id: 'mail_bob', clientId: 'cli_bob' }] : [] };
        if (/^UPDATE mail SET status/.test(sql)) return { rows: [] };
        if (/^INSERT INTO messages/.test(sql)) return { rows: [] };
        return { rows: [] };
    });
    return { execute, clients, documents, bookings, log };
}

const USERS = {
    alice: { userId: 'user_alice', email: 'alice@test.fr', isAdmin: false },
    bob: { userId: 'user_bob', email: 'bob@test.fr', isAdmin: false },
    admin: { userId: 'user_admin', email: 'mwcrea.agency@gmail.com', isAdmin: true },
};

function call(db, who, method, args = []) {
    const handler = createHandler({ getConn: () => db, getAuth: async () => (who ? USERS[who] : null) });
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    return handler({ method: 'POST', headers: {}, body: { method, args } }, res).then(() => ({
        status: res.status.mock.calls[0]?.[0],
        body: res.json.mock.calls[0]?.[0],
    }));
}

describe('/api/data — contrôle d’accès', () => {
    let db;
    beforeEach(() => {
        vi.clearAllMocks();
        db = makeDb();
    });

    it('anonyme : aucune lecture de données client', async () => {
        for (const method of ['getClients', 'getDocuments', 'getMessages', 'getMyAccount', 'deleteClient']) {
            const { status } = await call(db, null, method, ['cli_alice']);
            expect(status, method).toBe(401);
        }
    });

    it('client : méthodes d’administration interdites', async () => {
        for (const method of ['getClients', 'getMail', 'deleteClient', 'traiterDemande', 'addPayment', 'deletePayment', 'updateClientProfile', 'getEmailLogs']) {
            const { status } = await call(db, 'alice', method, ['cli_alice']);
            expect(status, method).toBe(403);
        }
        expect(db.log.some((sql) => /^DELETE/.test(sql))).toBe(false);
    });

    it('client : ne lit pas les données d’un autre client (IDOR)', async () => {
        for (const method of ['getDocuments', 'getMessages', 'getClientMail', 'getPayments', 'getClientBookings']) {
            const { status } = await call(db, 'alice', method, ['cli_bob']);
            expect(status, method).toBe(403);
        }
        expect((await call(db, 'alice', 'getDocuments', ['cli_alice'])).status).toBe(200);
    });

    it('client : ne supprime ni le document d’un autre, ni un document déposé par le centre', async () => {
        expect((await call(db, 'alice', 'deleteDocument', ['doc_bob'])).status).toBe(403);
        expect((await call(db, 'alice', 'deleteDocument', ['doc_admin'])).status).toBe(403);
        expect(db.documents.doc_bob).toBeDefined();
        expect(db.documents.doc_admin).toBeDefined();
        expect((await call(db, 'bob', 'deleteDocument', ['doc_bob'])).status).toBe(200);
        expect(db.documents.doc_bob).toBeUndefined();
    });

    it('client : ne peut pas écrire les champs de paiement / offre de son dossier', async () => {
        const { status } = await call(db, 'alice', 'updateClientExtraInfo', ['cli_alice', {
            offre: 'reexpedition', payment_status: 'paid', doc_request: null, emailCourrier: 'pirate@x.fr', adresseReexp: '1 rue Neuve',
        }]);
        expect(status).toBe(200);
        const extra = JSON.parse(db.clients.cli_alice.extra_info);
        expect(extra.offre).toBeUndefined();
        expect(extra.payment_status).toBeUndefined();
        expect(extra.emailCourrier).toBeUndefined();
        expect(extra.adresseReexp).toBe('1 rue Neuve');
        expect(extra.stripe_customer_id).toBe('cus_alice');
    });

    it('client : ne peut pas rattacher le client Stripe de quelqu’un d’autre', async () => {
        const { status } = await call(db, 'alice', 'updateClientExtraInfo', ['cli_alice', { stripe_customer_id: 'cus_bob' }]);
        expect(status).toBe(403);
        expect(JSON.parse(db.clients.cli_alice.extra_info).stripe_customer_id).toBe('cus_alice');
    });

    it('client : ne choisit pas son statut (un impayé ne peut pas se repasser « actif »)', async () => {
        const { status, body } = await call(db, 'alice', 'updateClientStatus', ['cli_alice', 'actif']);
        expect(status).toBe(200);
        expect(body.result.status).toBe('echec_paiement'); // recalculé depuis Stripe (aucun abonnement sain)
        expect(db.clients.cli_alice.status).toBe('echec_paiement');
    });

    it('client : un message est toujours enregistré comme venant du client', async () => {
        await call(db, 'alice', 'addMessage', ['cli_alice', { content: 'Bonjour', sender: 'admin' }]);
        const insert = db.execute.mock.calls.find(([sql]) => /^INSERT INTO messages/.test(sql));
        expect(insert[1][3]).toBe('client');
    });

    it('getMyAccount : retrouve la fiche par l’email vérifié et lie le compte Clerk', async () => {
        const { status, body } = await call(db, 'alice', 'getMyAccount', [{}]);
        expect(status).toBe(200);
        expect(body.result.kind).toBe('client');
        expect(body.result.record.id).toBe('cli_alice');
        expect(db.clients.cli_alice.clerkId).toBe('user_alice');
    });

    it('confirmMeetingBooking : refuse la session de réservation d’un autre client', async () => {
        retrieveSession.mockResolvedValue({
            id: 'cs_bob', status: 'complete', payment_status: 'paid', amount_total: 7500,
            metadata: { type: 'meeting_booking', client_id: 'cli_bob', meeting_type: 'Salle de réunion (6-8 pers)', duration: 'Matinée (9h-12h)', date: '2026-12-01' },
        });
        expect((await call(db, 'alice', 'confirmMeetingBooking', ['cs_bob'])).status).toBe(403);
        expect(Object.keys(db.bookings)).toHaveLength(0);
    });

    it('confirmMeetingBooking : idempotent, et refuse un montant inférieur au tarif', async () => {
        const session = {
            id: 'cs_ok', status: 'complete', payment_status: 'paid', amount_total: 7500,
            metadata: { type: 'meeting_booking', client_id: 'cli_bob', meeting_type: 'Salle de réunion (6-8 pers)', duration: 'Matinée (9h-12h)', date: '2026-12-01' },
        };
        retrieveSession.mockResolvedValue(session);
        expect((await call(db, 'bob', 'confirmMeetingBooking', ['cs_ok'])).status).toBe(200);
        expect((await call(db, 'bob', 'confirmMeetingBooking', ['cs_ok'])).status).toBe(200);
        expect(Object.keys(db.bookings)).toEqual(['book_cs_ok']);

        retrieveSession.mockResolvedValue({ ...session, id: 'cs_cheap', amount_total: 50 });
        expect((await call(db, 'bob', 'confirmMeetingBooking', ['cs_cheap'])).status).toBe(402);
        expect(Object.keys(db.bookings)).toEqual(['book_cs_ok']);
    });

    it('client : marque comme lu son propre courrier, pas celui d’un autre', async () => {
        expect((await call(db, 'bob', 'markMailAsRead', ['mail_bob'])).status).toBe(200);
        expect((await call(db, 'alice', 'markMailAsRead', ['mail_bob'])).status).toBe(403);
    });

    it('client : document avec repli local (#local-signature) accepté, lien javascript: refusé', async () => {
        expect((await call(db, 'alice', 'addDocument', ['cli_alice', { name: 'Contrat', url: '#local-signature' }])).status).toBe(200);
        expect((await call(db, 'alice', 'addDocument', ['cli_alice', { name: 'x', url: 'javascript:alert(1)' }])).status).toBe(400);
    });

    it('public : addDemande retire les liens dangereux (XSS contre l’admin)', async () => {
        await call(db, null, 'addDemande', [{
            email: 'new@test.fr', plan: 'Essentiel',
            extra_info: { pieceIdentiteUrl: 'javascript:fetch("//evil")', justificatifDomicileUrl: 'https://res.cloudinary.com/x.png', contractSigned: true },
        }]);
        const insert = db.execute.mock.calls.find(([sql]) => /^INSERT INTO demandes/.test(sql));
        const extra = JSON.parse(insert[1][9]);
        expect(extra.pieceIdentiteUrl).toBeUndefined();
        expect(extra.contractSigned).toBeUndefined();
        expect(extra.justificatifDomicileUrl).toBe('https://res.cloudinary.com/x.png');
        expect(extra.offre).toBe('notification');
    });

    it('getMyAccount : un session_id payé avec un autre email ne rattache pas la fiche', async () => {
        retrieveSession.mockResolvedValue({ id: 'cs_x', customer_details: { email: 'victime@test.fr' }, metadata: {} });
        db.execute.mockImplementationOnce(async () => ({ rows: [] })); // getClientByEmail
        const spy = db.execute;
        const { body } = await call(db, 'admin', 'getMyAccount', [{ sessionId: 'cs_x' }]);
        expect(body.result).toBeNull();
        expect(spy.mock.calls.some(([sql]) => /stripe_session_id/.test(sql))).toBe(false);
    });

    it('admin : accès complet', async () => {
        expect((await call(db, 'admin', 'getDocuments', ['cli_bob'])).status).toBe(200);
        expect((await call(db, 'admin', 'updateClientStatus', ['cli_alice', 'actif'])).status).toBe(200);
        expect(db.clients.cli_alice.status).toBe('actif');
    });

    it('méthodes internes jamais exposées, même à l’admin', async () => {
        expect((await call(db, 'admin', 'confirmDemandePayment', ['req_1'])).status).toBe(404);
        expect((await call(db, 'admin', 'constructor', [])).status).toBe(404);
    });

    it('public : addDemande recalcule le montant et ignore les champs de paiement', async () => {
        await call(db, null, 'addDemande', [{
            email: 'new@test.fr', plan: 'Physique+', amount: '0.01',
            extra_info: { frequence: 'annuel', payment_status: 'paid', stripe_customer_id: 'cus_x', prenom: 'Ada' },
        }]);
        const insert = db.execute.mock.calls.find(([sql]) => /^INSERT INTO demandes/.test(sql));
        expect(insert[1][6]).toBe('437.76'); // Premium annuel : 38 € × 12 × 0,8 = 364,80 € HT × 1,2
        expect(JSON.stringify(insert[1])).toContain('2026-11'); // souscrit avec la grille actuelle
        const extra = JSON.parse(insert[1][9]);
        expect(extra.payment_status).toBeUndefined();
        expect(extra.stripe_customer_id).toBeUndefined();
        expect(extra.prenom).toBe('Ada');
    });
});

describe('sanitizeClientExtra', () => {
    it('retire les clés sensibles et garde les champs du dossier', () => {
        expect(sanitizeClientExtra({
            stripe_customer_id: 'cus', stripeCustomerId: 'cus', payment_token: 't', dpc_x: 1, offre: 'scan', plan: 'x', status: 'actif',
            prenom: 'Jean', adressePerso: '1 rue', contractSignedAt: '2026-01-01', kbisUrl: 'https://x',
        })).toEqual({ prenom: 'Jean', adressePerso: '1 rue', kbisUrl: 'https://x' });
    });

    it('bloque les liens dangereux et les clés de signature (sauf preuve de signature)', () => {
        expect(sanitizeClientExtra({
            kbisUrl: 'javascript:fetch("//evil")', pieceIdentiteUrl: 'data:text/html;base64,PHNjcmlwdD4=',
            contractSignedUrl: '#local-signature', contractSigned: true,
        })).toEqual({});
        expect(sanitizeClientExtra({ contractSigned: true, contractSignedUrl: '#local-signature' }, { allowSignature: true }))
            .toEqual({ contractSigned: true, contractSignedUrl: '#local-signature' });
    });
});
