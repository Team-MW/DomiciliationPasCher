// @vitest-environment node
/**
 * CAS LIMITES du parcours client, avec les vrais gestionnaires du serveur sur une base SQL réelle (voir parcours.test.js).
 * Chaque describe repart d'une base vide : les scénarios sont indépendants.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';
import { MEETING_TYPES, MEETING_DURATIONS, meetingPriceTtc } from '../../src/utils/meetingPrices.js';
import { createDataService } from '../../api/_data-service.js';

const ext = vi.hoisted(() => ({
    conn: null, outbox: [], smtpDown: false, stripeSessions: {}, activeSubs: {}, createdSessions: [], clerkUsers: {},
}));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: async (mail) => {
        if (ext.smtpDown) throw Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' });
        ext.outbox.push(mail);
        return { messageId: `<m${ext.outbox.length}@test>` };
    } }) },
}));
const listOf = (items) => { const p = Promise.resolve({ data: items, has_more: false }); p[Symbol.asyncIterator] = async function* () { for (const i of items) yield i; }; return p; };
vi.mock('../../api/_stripe-client.js', () => ({
    getStripe: () => ({
        checkout: { sessions: {
            retrieve: async (id) => { if (!ext.stripeSessions[id]) throw new Error(`No such checkout.session: ${id}`); return ext.stripeSessions[id]; },
            create: async (params) => { const s = { id: `cs_live_new${ext.createdSessions.length}`, url: `https://checkout.stripe.test/c/${ext.createdSessions.length}`, params }; ext.createdSessions.push(s); return s; },
        } },
        webhooks: { constructEvent: (raw) => JSON.parse(Buffer.from(raw).toString()) },
        customers: { list: async () => ({ data: [] }), create: async () => ({ id: 'cus_created' }), retrieve: async () => ({ email: 'x@y.fr' }) },
        subscriptions: { list: (p) => listOf(p?.customer ? (ext.activeSubs[p.customer] ? [ext.activeSubs[p.customer]] : []) : []), update: async () => ({}), cancel: async () => ({}) },
        invoices: { list: () => listOf([]), update: async () => ({}) },
        paymentIntents: { list: async () => ({ data: [] }), search: async () => ({ data: [] }) },
    }),
}));
vi.mock('@clerk/backend', () => ({
    createClerkClient: () => ({ users: { getUserList: async () => ({ data: [] }), getUser: async () => ({}), deleteUser: async () => {} } }),
    verifyToken: async () => ({}),
}));

const { __setAuthVerifierForTests } = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const emailHandler = (await import('../../api/email.js')).default;
const verifySession = (await import('../../api/verify-session.js')).default;
const webhook = (await import('../../api/stripe-webhook.js')).default;
const payHandler = (await import('../../api/pay.js')).default;
const cron = (await import('../../api/cron/reminders.js')).default;

const ADMIN = { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' };
const mockRes = () => {
    const r = { code: 200, body: null, headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.send = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; return r; };
    r.redirect = (c, u) => { r.code = c; r.headers.Location = u; return r; };
    r.end = () => r;
    return r;
};
const api = async (handler, { method = 'POST', who, body, query, headers = {} } = {}) => {
    const res = mockRes();
    await handler({ method, headers: { host: 'site.test', ...(who ? { authorization: `Bearer ${who}` } : {}), ...headers }, body, query: query || {} }, res);
    return res;
};
const data = async (who, method, ...args) => {
    const res = await api(dataHandler, { who, body: { method, args } });
    return { code: res.code, result: res.body?.result, error: res.body?.error };
};
const rows = (sql, p) => ext.conn.all(sql, p);
const sentTo = (to) => ext.outbox.filter((m) => String(m.to).toLowerCase().includes(to.toLowerCase()));
const runCron = async (isoUtc, query = {}) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(isoUtc));
    try { return await api(cron, { method: 'GET', headers: { authorization: 'Bearer cron-secret' }, query }); } finally { vi.useRealTimers(); }
};
const FUNNEL = (email, over = {}) => ({
    typeProjet: 'domiciliation', formeJuridique: 'SASU', nom: 'Dupont', prenom: 'Jean', email, telephone: '0612345678', dateNaissance: '1990-01-01',
    lieuNaissance: 'Paris', nomSociete: 'DUPONT SAS', siren: '', activite: 'Conseil', nationalite: 'Française', qualite: 'Président', ville: 'Toulouse (31)',
    offre: 'notification', frequence: 'mensuel', cgv: true, adresse: '1 rue A', codePostal: '31000', villePerso: 'Toulouse', pays: 'France',
    pieceIdentiteUrl: 'https://res.cloudinary.com/demo/image/upload/r.png', pieceIdentiteVersoUrl: 'https://res.cloudinary.com/demo/image/upload/v.png', justificatifDomicileUrl: 'https://res.cloudinary.com/demo/image/upload/d.png', ...over,
});
const newDemande = async (email, planName = 'Essentiel', over = {}) => (await data(null, 'addDemande', { clientName: `Jean Dupont - 📞 0612345678`, email, company: 'DUPONT SAS', city: 'Toulouse (31)', plan: planName, extra_info: FUNNEL(email, over) })).result.id;
const paidSession = (id, demandeId, email, { planId = 'essentiel', interval = 'month' } = {}) => {
    ext.stripeSessions[id] = { id, status: 'complete', payment_status: 'paid', customer: 'cus_X', metadata: { demande_id: demandeId, planId, interval, email, clientName: 'Jean Dupont' }, customer_details: { email } };
    return ext.stripeSessions[id];
};

beforeAll(() => {
    process.env.SMTP_HOST = 'smtp.test'; process.env.SMTP_PORT = '465'; process.env.SMTP_USER = 'site@test.fr'; process.env.SMTP_PASS = 'abcdabcdabcdabcd';
    process.env.CRON_SECRET = 'cron-secret'; process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'; process.env.CLERK_SECRET_KEY = 'sk_test_x'; process.env.VITE_ADMIN_EMAILS = ADMIN.email;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
});
beforeEach(async () => {
    ext.conn = await createSqlJsConn();
    Object.assign(ext, { outbox: [], smtpDown: false, stripeSessions: {}, activeSubs: {}, createdSessions: [], clerkUsers: {} });
    __setAuthVerifierForTests(async (token) => (token === 'admin' ? ADMIN : ext.clerkUsers[token] ? { userId: ext.clerkUsers[token].id, email: ext.clerkUsers[token].verified === false ? '' : ext.clerkUsers[token].email } : null));
});
const user = (id, email, extra = {}) => { ext.clerkUsers[id] = { id, email, verified: true, firstName: 'Jean', lastName: 'Dupont', ...extra }; return id; };

// ═════════════ A. Paiement : le client ferme l'onglet (webhook seul) ═════════════
describe('A. Paiement sans retour sur le site (le client ferme l’onglet)', () => {
    it('le webhook Stripe confirme tout seul, l’email de bienvenue part UNE fois, le rechargement tardif ne le double pas', async () => {
        const id = await newDemande('webonly@x.fr');
        const session = paidSession('cs_live_w1', id, 'webonly@x.fr');
        const ev = { type: 'checkout.session.completed', data: { object: session } };
        expect((await api(webhook, { headers: { 'stripe-signature': 's' }, body: Buffer.from(JSON.stringify(ev)) })).code).toBe(200);
        expect(rows('SELECT status FROM demandes')[0].status).toBe('en_attente');
        const welcomes = () => sentTo('webonly@x.fr').filter((m) => /Bienvenue/.test(m.subject)).length;
        expect(welcomes()).toBe(1);
        await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_w1' } });
        await api(webhook, { headers: { 'stripe-signature': 's' }, body: Buffer.from(JSON.stringify(ev)) });
        expect(welcomes()).toBe(1);
    });

    it('signature de webhook invalide : refusé, rien n’est confirmé', async () => {
        const id = await newDemande('x@x.fr');
        const res = mockRes();
        // constructEvent simulé lève si le corps n'est pas du JSON : on simule une signature fausse
        await webhook({ method: 'POST', headers: { 'stripe-signature': 'faux' }, body: Buffer.from('pas du json') }, res);
        expect(res.code).toBe(400);
        expect(rows('SELECT status FROM demandes WHERE id = ?', [id])[0].status).toBe('en_attente_paiement');
    });
});

// ═════════════ B. Panne d'envoi d'emails au pire moment ═════════════
describe('B. Panne du serveur d’emails', () => {
    it('panne au moment du paiement : le client est quand même confirmé ; la bienvenue est RETENTÉE au rechargement', async () => {
        const id = await newDemande('panne@x.fr');
        paidSession('cs_live_p1', id, 'panne@x.fr');
        ext.smtpDown = true;
        const r1 = await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_p1' } });
        expect(r1.body.confirmed).toBe(true); // le client voit le succès
        expect(rows('SELECT status, extra_info FROM demandes')[0].status).toBe('en_attente');
        expect(JSON.parse(rows('SELECT extra_info FROM demandes')[0].extra_info).welcome_pending).toBe(true);
        expect(sentTo('panne@x.fr')).toHaveLength(0);
        
        expect(rows("SELECT COUNT(*) AS n FROM email_logs WHERE status = 'failed'")[0].n).toBeGreaterThan(0);
        ext.smtpDown = false;
        await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_p1' } });
        expect(sentTo('panne@x.fr').filter((m) => /Bienvenue/.test(m.subject))).toHaveLength(1);
        expect(JSON.parse(rows('SELECT extra_info FROM demandes')[0].extra_info).welcome_pending).toBeUndefined();
    });

    it('panne pendant la validation par l’admin : la fiche est créée quand même, pas d’erreur, historique des échecs', async () => {
        const id = await newDemande('valid@x.fr');
        paidSession('cs_live_v1', id, 'valid@x.fr');
        await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_v1' } });
        ext.smtpDown = true;
        const r = await data('admin', 'traiterDemande', id);
        expect(r.code).toBe(200);
        expect(r.result.emailSent).toBe(false);
        expect(rows('SELECT status FROM clients')[0].status).toBe('actif');
        expect(rows("SELECT COUNT(*) AS n FROM documents")[0].n).toBe(3); // les pièces sont dans « Mes documents » malgré la panne
    });
});

// ═════════════ C. Paiement incohérent ═════════════
describe('C. Paiement qui ne correspond plus à la demande', () => {
    it('formule modifiée pendant le paiement : la demande n’est PAS activée et l’admin reçoit une alerte précise', async () => {
        const id = await newDemande('mismatch@x.fr', 'Essentiel');
        const session = paidSession('cs_live_m1', id, 'mismatch@x.fr', { planId: 'physique', interval: 'year' });
        const ev = { type: 'checkout.session.completed', data: { object: session } };
        expect((await api(webhook, { headers: { 'stripe-signature': 's' }, body: Buffer.from(JSON.stringify(ev)) })).code).toBe(200);
        expect(rows('SELECT status FROM demandes')[0].status).toBe('en_attente_paiement');
        const alert = ext.outbox.find((m) => /dossier non activé/.test(m.subject));
        expect(alert).toBeTruthy();
        expect(alert.html).toContain('Jean Dupont');
        expect(alert.html).toContain('cs_live_m1');
        expect(sentTo('mismatch@x.fr').filter((m) => /Bienvenue/.test(m.subject))).toHaveLength(0);
    });
});

// ═════════════ D. Ancien client qui se réinscrit ═════════════
describe('D. Réinscription d’un ancien client résilié', () => {
    it('la fiche est réactivée : compte de connexion et signature conservés, ancien abonnement et impayés effacés, pièces sans doublon', async () => {
        const old = { stripe_customer_id: 'cus_OLD', stripe_subscription_id: 'sub_OLD', domicile_terminated_at: '2026-05-01', payment_issue_since: '2026-03-01', contractSigned: true, contractSignedAt: '2026-01-10T10:00:00.000Z', pieceIdentiteUrl: FUNNEL('x').pieceIdentiteUrl };
        await ext.conn.execute("INSERT INTO clients (id, name, email, company, plan, status, since, clerkId, clerkStatus, extra_info) VALUES ('old1', 'Jean Dupont', 'ancien@x.fr', 'DUPONT SAS', 'Essentiel', 'résilié', '2026-01-10', 'user_old', 'linked', ?)", [JSON.stringify(old)]);
        await ext.conn.execute("INSERT INTO documents (id, clientId, name, owner, url) VALUES ('d0', 'old1', 'Pièce d''identité (recto)', 'client', ?)", [FUNNEL('x').pieceIdentiteUrl]);
        const id = await newDemande('ancien@x.fr', 'Confort', { offre: 'scan' });
        paidSession('cs_live_o1', id, 'ancien@x.fr', { planId: 'scan-plus' });
        await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_o1' } });
        const r = await data('admin', 'traiterDemande', id);
        expect(r.code).toBe(200);
        const [c] = rows("SELECT * FROM clients WHERE email = 'ancien@x.fr'");
        expect(rows("SELECT COUNT(*) AS n FROM clients WHERE email = 'ancien@x.fr'")[0].n).toBe(1);
        expect(c).toMatchObject({ status: 'actif', plan: 'Confort', clerkId: 'user_old', clerkStatus: 'linked' });
        const extra = JSON.parse(c.extra_info);
        expect(extra).toMatchObject({ contractSigned: true, stripe_customer_id: 'cus_X' });
        for (const stale of ['stripe_subscription_id', 'domicile_terminated_at', 'payment_issue_since']) expect(extra[stale], stale).toBeUndefined();
        expect(rows("SELECT COUNT(*) AS n FROM documents WHERE name LIKE 'Pièce d%recto%'")[0].n).toBe(1); // pas de doublon
        expect(rows('SELECT COUNT(*) AS n FROM documents')[0].n).toBe(3); // recto (déjà là) + verso + justificatif
    });
});

// ═════════════ E. Dossier créé par l'admin + lien de paiement ═════════════
describe('E. Dossier créé par l’admin et lien de paiement', () => {
    const create = async (email) => {
        const token = 'ab'.repeat(16);
        const r = await data('admin', 'addClient', { name: 'Marie Martin', email, company: 'MARTIN SARL', plan: 'Essentiel', city: 'Toulouse (31)', extra_info: { prenom: 'Marie', nom: 'Martin', frequence: 'mensuel', payment_token: token, payment_status: 'pending', payment_requested_at: new Date('2026-11-01T10:00:00Z').toISOString() } });
        expect(r.code).toBe(200);
        return { id: r.result.id, token };
    };

    it('email « dossier créé » avec lien de paiement ; le lien ouvre Stripe au PRIX ACTUEL (19,20 € TTC), une seule session', async () => {
        const { id, token } = await create('marie@x.fr');
        const mail = await api(emailHandler, { who: 'admin', body: { type: 'account_created', email: 'marie@x.fr', nom: 'Marie Martin', plan: 'Essentiel', frequence: 'mensuel', paymentToken: token } });
        expect(mail.code).toBe(200);
        expect(ext.outbox.at(-1).html).toContain(`/api/pay?token=${token}`);
        const r = await api(payHandler, { method: 'GET', query: { token } });
        expect(r.code).toBe(303);
        expect(r.headers.Location).toMatch(/^https:\/\/checkout\.stripe\.test/);
        expect(ext.createdSessions).toHaveLength(1);
        expect(ext.createdSessions[0].params.line_items[0].price_data.unit_amount).toBe(1920);
        expect(ext.createdSessions[0].params.metadata.admin_client_id).toBe(id);
        expect((await api(payHandler, { method: 'GET', query: { token: 'f'.repeat(32) } })).code).toBe(404);
        expect((await api(payHandler, { method: 'GET', query: { token: 'pas-hex' } })).code).toBe(400);
    });

    it('le client paie puis ferme l’onglet : le webhook enregistre le paiement, le lien n’ouvre PLUS de 2e paiement, plus aucune relance', async () => {
        const { id, token } = await create('marie2@x.fr');
        const session = { id: 'cs_live_a1', status: 'complete', payment_status: 'paid', customer: 'cus_MARIE', subscription: 'sub_MARIE', metadata: { admin_client_id: id } };
        ext.stripeSessions.cs_live_a1 = session;
        const ev = { type: 'checkout.session.completed', data: { object: session } };
        await api(webhook, { headers: { 'stripe-signature': 's' }, body: Buffer.from(JSON.stringify(ev)) });
        const extra = JSON.parse(rows('SELECT extra_info FROM clients WHERE id = ?', [id])[0].extra_info);
        expect(extra).toMatchObject({ payment_status: 'paid', stripe_subscription_id: 'sub_MARIE', stripe_customer_id: 'cus_MARIE' });
        expect(ext.outbox.some((m) => /Abonnement démarré/.test(m.subject))).toBe(true);
        // le client clique encore sur le lien : abonnement actif détecté → pas de nouvelle session
        ext.activeSubs.cus_MARIE = { id: 'sub_MARIE' };
        const again = await api(payHandler, { method: 'GET', query: { token } });
        expect(again.code).toBe(303);
        expect(again.headers.Location).toMatch(/\/(connexion|inscription)/);
        expect(ext.createdSessions).toHaveLength(0);
        // relances de paiement (J+2 / J+5) : aucune pour un client qui a payé
        const before = ext.outbox.length;
        await runCron('2026-11-09T08:00:00Z', { daily: '1' });
        expect(ext.outbox.slice(before).filter((m) => m.to === 'marie2@x.fr')).toHaveLength(0);
    });

    it('client qui n’a pas payé : relance à J+2 puis J+5, jamais deux fois la même', async () => {
        await create('relance@x.fr');
        const sentToRelance = () => ext.outbox.filter((m) => m.to === 'relance@x.fr').length;
        await runCron('2026-11-02T08:00:00Z', { daily: '1' }); // J+1 : rien
        expect(sentToRelance()).toBe(0);
        await runCron('2026-11-03T12:00:00Z', { daily: '1' }); // J+2 (demande à 10h le 1er)
        expect(sentToRelance()).toBe(1);
        await runCron('2026-11-03T13:00:00Z', { daily: '1' }); // même jour : pas de doublon
        expect(sentToRelance()).toBe(1);
        await runCron('2026-11-06T12:00:00Z', { daily: '1' }); // J+5
        expect(sentToRelance()).toBe(2);
        await runCron('2026-11-09T08:00:00Z', { daily: '1' }); // plus aucune
        expect(sentToRelance()).toBe(2);
    });
});

// ═════════════ F. Pièces manquantes (statuts / Kbis) ═════════════
describe('F. Demande de pièces (statuts, Kbis) et relances', () => {
    it('demande initiale, relance à J+7, puis arrêt dès que les documents sont déposés', async () => {
        await ext.conn.execute("INSERT INTO clients (id, name, email, company, plan, status, since, clerkId, extra_info) VALUES ('c9', 'Jean Dupont', 'docs@x.fr', 'DUPONT SAS', 'Essentiel', 'actif', '2026-10-01', 'user_docs', ?)", [JSON.stringify({ grille_tarifaire: '2026-11', typeProjet: 'domiciliation' })]);
        user('user_docs', 'docs@x.fr');
        const client = { id: 'c9', email: 'docs@x.fr', name: 'Jean Dupont', extra_info: JSON.stringify({ typeProjet: 'domiciliation' }) };
        expect((await data('admin', 'startDocumentRequest', client, ['statuts', 'kbis'], { sendNow: true })).code).toBe(200);
        expect(ext.outbox.some((m) => m.to === 'docs@x.fr' && /document/i.test(m.subject))).toBe(true);
        // 8 jours plus tard
        const extra = JSON.parse(rows("SELECT extra_info FROM clients WHERE id = 'c9'")[0].extra_info);
        extra.doc_request.requested_at = new Date('2026-10-30T08:00:00Z').toISOString();
        await ext.conn.execute("UPDATE clients SET extra_info = ? WHERE id = 'c9'", [JSON.stringify(extra)]);
        const before = ext.outbox.length;
        await runCron('2026-11-07T08:00:00Z', { daily: '1' });
        expect(ext.outbox.slice(before).filter((m) => m.to === 'docs@x.fr')).toHaveLength(1);
        // le client dépose les deux pièces
        for (const name of ['Statuts de la société.pdf', 'Extrait KBIS.pdf']) {
            expect((await data('user_docs', 'addDocument', 'c9', { name, url: `data:application/pdf;base64,${'A'.repeat(1000)}`, type: 'application/pdf' })).code).toBe(200);
        }
        const before2 = ext.outbox.length;
        await runCron('2026-12-05T08:00:00Z', { daily: '1' });
        expect(ext.outbox.slice(before2).filter((m) => m.to === 'docs@x.fr')).toHaveLength(0);
        expect(JSON.parse(rows("SELECT extra_info FROM clients WHERE id = 'c9'")[0].extra_info).doc_request.completed_at).toBeTruthy();
    });
});

// ═════════════ G. Réservation de salle ═════════════
describe('G. Réservation de salle payée', () => {
    const type = Object.values(MEETING_TYPES)[0];
    const duration = Object.values(MEETING_DURATIONS)[0];
    const setup = async () => {
        await ext.conn.execute("INSERT INTO clients (id, name, email, company, plan, status, since, clerkId, extra_info) VALUES ('c5', 'Jean', 'salle@x.fr', 'S SAS', 'Essentiel', 'actif', '2026-10-01', 'user_salle', '{}')");
        user('user_salle', 'salle@x.fr');
        const price = Math.round(meetingPriceTtc(type, duration) * 100);
        ext.stripeSessions.cs_live_b1 = { id: 'cs_live_b1', status: 'complete', payment_status: 'paid', amount_total: price, metadata: { type: 'meeting_booking', client_id: 'c5', meeting_type: type, duration, date: '2026-12-15', city: 'Toulouse', email: 'salle@x.fr' } };
    };

    it('paiement confirmé : UNE réservation, même si on confirme deux fois ; un autre client ne peut pas la confirmer', async () => {
        await setup();
        user('user_autre', 'autre@x.fr');
        expect((await data('user_autre', 'confirmMeetingBooking', 'cs_live_b1')).code).toBe(403);
        const r1 = await data('user_salle', 'confirmMeetingBooking', 'cs_live_b1');
        const r2 = await data('user_salle', 'confirmMeetingBooking', 'cs_live_b1');
        expect(r1.code).toBe(200);
        expect(r2.code).toBe(200);
        expect(rows('SELECT COUNT(*) AS n FROM bookings')[0].n).toBe(1);
        expect(rows('SELECT status, clientId FROM bookings')[0]).toMatchObject({ status: 'en_attente', clientId: 'c5' });
    });

    it('montant encaissé inférieur au tarif : refusé (402), aucune réservation', async () => {
        await setup();
        ext.stripeSessions.cs_live_b1.amount_total = 100;
        expect((await data('user_salle', 'confirmMeetingBooking', 'cs_live_b1')).code).toBe(402);
        expect(rows('SELECT COUNT(*) AS n FROM bookings')[0].n).toBe(0);
    });
});

// ═════════════ H. Client payé mais pas encore validé : peut-il se connecter ? ═════════════
describe('H. Connexion d’un client payé, dossier pas encore validé', () => {
    it('il voit sa demande (kind « demande »), ses pièces, ses messages ; jamais ceux d’un autre', async () => {
        const id = await newDemande('attente@x.fr');
        paidSession('cs_live_t1', id, 'attente@x.fr');
        await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_t1' } });
        user('user_att', 'attente@x.fr');
        const me = await data('user_att', 'getMyAccount', {});
        expect(me.result).toMatchObject({ kind: 'demande' });
        expect(me.result.record.id).toBe(id);
        expect(rows('SELECT clerkId FROM demandes')[0].clerkId).toBe('user_att'); // compte relié à la demande
        expect((await data('user_att', 'addMessage', id, { content: 'Bonjour' })).code).toBe(200);
        expect((await data('user_att', 'getMessages', id)).result).toHaveLength(1);
        user('user_zzz', 'zzz@x.fr');
        expect((await data('user_zzz', 'getMessages', id)).code).toBe(403);
        // après validation par l'admin, il retrouve son dossier avec les messages et les pièces
        await data('admin', 'traiterDemande', id);
        const after = await data('user_att', 'getMyAccount', {});
        expect(after.result.kind).toBe('client');
        expect((await data('user_att', 'getMessages', after.result.record.id)).result).toHaveLength(1);
        expect((await data('user_att', 'getDocuments', after.result.record.id)).result.length).toBe(3);
    });
});

// ═════════════ I. Batterie : aucune méthode du serveur ne fuit vers un autre client ═════════════
describe('I. Aucune méthode du serveur ne donne ou ne modifie les données d’un autre client', () => {
    it('chaque méthode, appelée par un client « intrus » sur la fiche d’une victime, ne révèle rien et ne change rien', async () => {
        const VICTIM_EMAIL = 'victime.secrete@x.fr';
        await ext.conn.execute("INSERT INTO clients (id, name, email, company, plan, status, since, clerkId, extra_info, address, phone) VALUES ('vic1', 'Victime Secrete', ?, 'SOCIETE SECRETE SARL', 'Premium', 'actif', '2026-10-01', 'user_vic', ?, '12 rue du Secret', '0699999999')", [VICTIM_EMAIL, JSON.stringify({ stripe_customer_id: 'cus_VICTIME', prenom: 'Victime' })]);
        await ext.conn.execute("INSERT INTO documents (id, clientId, name, owner, url) VALUES ('dv', 'vic1', 'PIECE SECRETE.pdf', 'client', 'https://res.cloudinary.com/x/secret.pdf')");
        await ext.conn.execute("INSERT INTO messages (id, clientId, content, sender, createdAt, status) VALUES ('mv', 'vic1', 'MESSAGE SECRET', 'client', '2026-11-01', 'sent')");
        await ext.conn.execute("INSERT INTO payments (id, clientId, amount, status, method, date, invoice_ref) VALUES ('pv', 'vic1', '45.60', 'payé', 'Stripe', '2026-11-01', 'FACTURE-SECRETE')");
        await ext.conn.execute("INSERT INTO mail (id, clientId, type, \"from\", date, status) VALUES ('mailv', 'vic1', 'Lettre', 'EXPEDITEUR SECRET', '2026-11-01', 'non lu')");
        user('user_intrus', 'intrus@x.fr');
        const snapshot = () => JSON.stringify([rows("SELECT * FROM clients WHERE id = 'vic1'"), rows("SELECT * FROM documents WHERE clientId = 'vic1'"), rows("SELECT * FROM messages WHERE clientId = 'vic1'"), rows("SELECT * FROM payments WHERE clientId = 'vic1'"), rows("SELECT * FROM mail WHERE clientId = 'vic1'"), rows("SELECT * FROM reexpeditions WHERE clientId = 'vic1'"), rows("SELECT * FROM bookings WHERE clientId = 'vic1'")]);
        const before = snapshot();
        const methods = Object.keys(createDataService({ conn: ext.conn })).filter((m) => !['init', 'initBookings'].includes(m));
        const secrets = ['SOCIETE SECRETE', 'PIECE SECRETE', 'MESSAGE SECRET', 'FACTURE-SECRETE', 'EXPEDITEUR SECRET', 'Victime Secrete', VICTIM_EMAIL, '12 rue du Secret', '0699999999', 'cus_VICTIME'];
        const leaks = [];
        const unexpectedOk = [];
        for (const method of methods) {
            for (const args of [['vic1'], ['vic1', { name: 'x', url: 'https://res.cloudinary.com/x/y.png', content: 'PWN', address: 'PWN', status: 'résilié', sender: 'admin', amount: 1 }], [VICTIM_EMAIL, 'vic1'], [{ id: 'vic1', email: VICTIM_EMAIL }, ['kbis']], ['dv'], ['mv'], ['pv'], ['mailv']]) {
                const res = await api(dataHandler, { who: 'user_intrus', body: { method, args } });
                const text = JSON.stringify(res.body);
                for (const s of secrets) if (text.includes(s)) leaks.push(`${method}(${JSON.stringify(args).slice(0, 40)}) → ${s}`);
                if (res.code === 200 && !['getMyAccount', 'saveSouscriptionLead', 'getSouscriptionLeadByToken', 'addDemande', 'checkPaymentStatus', 'hasPendingDemandeForSession'].includes(method)) {
                    // une méthode a réussi pour un intrus : acceptable seulement si elle n'a rien changé (vérifié plus bas) et ne renvoie rien de la victime
                    unexpectedOk.push(method);
                }
            }
        }
        expect(leaks).toEqual([]);
        expect(snapshot()).toBe(before);
        // la victime existe toujours
        expect(rows("SELECT COUNT(*) AS n FROM clients WHERE id = 'vic1'")[0].n).toBe(1);
        expect([...new Set(unexpectedOk)]).toEqual([]);
    });

    it('un client ne peut appeler AUCUNE méthode d’administration (liste, suppression, validation, statut, création)', async () => {
        user('user_c', 'c@x.fr');
        for (const [method, args] of [['getClients', []], ['getDemandes', []], ['deleteClient', ['x']], ['traiterDemande', ['x']], ['addClient', [{ email: 'a@b.fr' }]], ['updateClientStatus', ['x', 'actif']], ['getPayments', ['x']], ['getEmailLogs', ['a@b.fr']], ['deleteDemande', ['x']], ['getGlobalStats', []], ['getBookings', []], ['getReexpeditions', []]]) {
            const r = await data('user_c', method, ...args);
            expect([401, 403, 404], `${method} → ${r.code}`).toContain(r.code);
        }
        // et sans connexion du tout
        for (const method of ['getClients', 'getMyAccount', 'getDocuments']) expect((await data(null, method, 'x')).code, method).toBe(401);
    });
});
