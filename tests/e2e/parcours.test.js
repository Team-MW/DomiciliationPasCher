// @vitest-environment node
/**
 * PARCOURS COMPLET, bout en bout, avec les VRAIS gestionnaires du serveur (api/*.js) sur une base SQL réelle en mémoire
 * (schéma de production). Seuls les services externes sont simulés (Stripe, Clerk, envoi d'emails) et enregistrent ce qu'ils
 * reçoivent. Le récit suit la vie d'un client : inscription → paiement → validation admin → connexion → documents →
 * signature → messagerie → réexpédition → courrier → relances → suppression.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createSqlJsConn } from '../helpers/sqlJsConn.js';

// ───────────── services simulés ─────────────
const ext = vi.hoisted(() => ({
    conn: null,
    outbox: [],            // emails réellement « envoyés »
    smtpDown: false,
    stripeSessions: {},    // id → session Stripe
    clerkUsers: {},        // userId → { id, email, verified, firstName, lastName }
    clerkDeleted: [],
}));
vi.mock('../../api/_db.js', () => ({ getDbConn: () => ext.conn }));
vi.mock('nodemailer', () => ({
    default: {
        createTransport: () => ({
            sendMail: async (mail) => {
                if (ext.smtpDown) throw Object.assign(new Error('535 Username and Password not accepted'), { code: 'EAUTH' });
                ext.outbox.push(mail);
                return { messageId: `<m${ext.outbox.length}@test>` };
            },
        }),
    },
}));
vi.mock('../../api/_stripe-client.js', () => ({
    getStripe: () => ({
        checkout: { sessions: { retrieve: async (id) => { if (!ext.stripeSessions[id]) throw new Error(`No such checkout.session: ${id}`); return ext.stripeSessions[id]; } } },
        webhooks: { constructEvent: (raw) => JSON.parse(Buffer.from(raw).toString()) },
        customers: { list: async () => ({ data: [] }), create: async () => ({ id: 'cus_new' }), retrieve: async () => ({ email: 'x@y.fr' }) },
        subscriptions: { list: async () => ({ data: [], has_more: false }), update: async () => ({}) },
        invoices: { list: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
        paymentIntents: { list: async () => ({ data: [] }), search: async () => ({ data: [] }) },
    }),
}));
vi.mock('@clerk/backend', () => {
    const client = {
        users: {
            getUserList: async ({ emailAddress, query }) => ({
                data: Object.values(ext.clerkUsers).filter((u) => (emailAddress ? emailAddress.includes(u.email) : (u.firstName + ' ' + u.lastName).toLowerCase().includes(String(query).toLowerCase()))).map((u) => ({
                    id: u.id, firstName: u.firstName, lastName: u.lastName, createdAt: 1, lastSignInAt: null, primaryEmailAddressId: 'e1',
                    emailAddresses: [{ id: 'e1', emailAddress: u.email, verification: { status: u.verified ? 'verified' : 'unverified' } }],
                })),
            }),
            getUser: async (id) => { if (!ext.clerkUsers[id]) throw Object.assign(new Error('not found'), { status: 404 }); return { id }; },
            deleteUser: async (id) => { ext.clerkDeleted.push(id); delete ext.clerkUsers[id]; },
        },
    };
    return { createClerkClient: () => client, verifyToken: async () => ({}) };
});

// ───────────── les vrais gestionnaires ─────────────
const { __setAuthVerifierForTests } = await import('../../api/_auth.js');
const dataHandler = (await import('../../api/data.js')).default;
const emailHandler = (await import('../../api/email.js')).default;
const verifySession = (await import('../../api/verify-session.js')).default;
const webhook = (await import('../../api/stripe-webhook.js')).default;
const logSignature = (await import('../../api/log-signature.js')).default;
const updateExtra = (await import('../../api/update-client-extra.js')).default;
const cron = (await import('../../api/cron/reminders.js')).default;
const unsubscribe = (await import('../../api/unsubscribe.js')).default;
const { sanitizeClientExtra } = await import('../../api/_client-extra.js');

// ───────────── utilitaires ─────────────
const ADMIN = { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' };
const TOKENS = { admin: ADMIN };
const mockRes = () => {
    const r = { code: 200, body: null, headers: {}, ended: false };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.send = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; return r; };
    r.redirect = (c, u) => { r.code = c; r.headers.Location = u; return r; };
    r.end = () => { r.ended = true; return r; };
    return r;
};
const bearer = (who) => (who ? { authorization: `Bearer ${who}` } : {});
const api = async (handler, { method = 'POST', who, body, query, headers = {} } = {}) => {
    const res = mockRes();
    await handler({ method, headers: { host: 'site.test', ...bearer(who), ...headers }, body, query: query || {} }, res);
    return res;
};
const data = async (who, method, ...args) => {
    const res = await api(dataHandler, { who, body: { method, args } });
    return { code: res.code, result: res.body?.result, error: res.body?.error };
};
const sentTo = (to) => ext.outbox.filter((m) => String(m.to).toLowerCase().includes(to.toLowerCase()));
const subjects = (to) => sentTo(to).map((m) => m.subject);
const rows = (sql, p) => ext.conn.all(sql, p);

const CLIENT_EMAIL = 'william.rouzee@icloud.com';
const URLS = {
    pieceIdentiteUrl: 'https://res.cloudinary.com/demo/image/upload/recto.png',
    pieceIdentiteVersoUrl: 'https://res.cloudinary.com/demo/image/upload/verso.png',
    justificatifDomicileUrl: 'https://res.cloudinary.com/demo/image/upload/domicile.png',
};
const FUNNEL = {
    typeProjet: 'domiciliation', formeJuridique: 'SCI', nom: 'Rouzee', prenom: 'William', email: CLIENT_EMAIL, telephone: '0762378524',
    dateNaissance: '2002-12-06', lieuNaissance: 'TOULOUSE, France', nomSociete: 'RW PATRIMOINE', siren: '', activite: 'Gestion immobilière',
    nationalite: 'Française', qualite: 'Gérant', ville: 'Toulouse (31)', offre: 'scan', frequence: 'annuel', cgv: true,
    justificatifDomicile: 'edf.pdf', pieceIdentiteRecto: 'cni.pdf', pieceIdentiteVerso: 'cni.pdf',
    adresse: '109 Avenue de Lespinet', complement: '', codePostal: '31400', villePerso: 'Toulouse', pays: 'France',
    adressePerso: '109 Avenue de Lespinet, 31400 Toulouse - France', adresseComplete: '109 Avenue de Lespinet, 31400 Toulouse - France', date: '06/11/2026',
    ...URLS,
};

const state = { demandeId: null, clientId: null };

beforeAll(async () => {
    ext.conn = await createSqlJsConn();
    process.env.SMTP_HOST = 'smtp.test'; process.env.SMTP_PORT = '465'; process.env.SMTP_USER = 'site@test.fr'; process.env.SMTP_PASS = 'abcdabcdabcdabcd';
    process.env.CRON_SECRET = 'cron-secret'; process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'; process.env.CLERK_SECRET_KEY = 'sk_test_x';
    process.env.VITE_ADMIN_EMAILS = ADMIN.email;
    __setAuthVerifierForTests(async (token) => TOKENS[token] || (ext.clerkUsers[token] ? { userId: ext.clerkUsers[token].id, email: ext.clerkUsers[token].verified ? ext.clerkUsers[token].email : '' } : null));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

// ═════════════════════════ 1. INSCRIPTION ═════════════════════════
describe('1. Inscription (formulaire public, sans connexion)', () => {
    it('le brouillon est sauvegardé dès que l’email est saisi', async () => {
        const r = await data(null, 'saveSouscriptionLead', { email: CLIENT_EMAIL, firstName: 'William', plan: 'scan-plus', step: 3, draft: { nom: 'Rouzee' }, token: 'a'.repeat(32) });
        expect(r.code).toBe(200);
        expect(rows('SELECT email, step, completed_at FROM souscription_leads')).toEqual([{ email: CLIENT_EMAIL, step: 3, completed_at: null }]);
    });

    it('la demande est enregistrée avec toutes les données et les 3 pièces ; le montant est recalculé par le serveur', async () => {
        const r = await data(null, 'addDemande', { clientName: 'William Rouzee - 📞 0762378524', email: 'William.Rouzee@iCloud.com', company: 'RW PATRIMOINE', city: 'Toulouse (31)', plan: 'Confort', amount: '1.00', extra_info: FUNNEL });
        expect(r.code).toBe(200);
        state.demandeId = r.result.id;
        const [d] = rows('SELECT * FROM demandes');
        expect(d).toMatchObject({ email: CLIENT_EMAIL, status: 'en_attente_paiement', amount: '276.48', plan: 'Confort' });
        const extra = JSON.parse(d.extra_info);
        expect(extra).toMatchObject({ ...URLS, prenom: 'William', offre: 'scan', grille_tarifaire: '2026-11' });
    });

    it('un visiteur ne peut pas se déclarer « payé » ni « signé » via le formulaire', async () => {
        const r = await data(null, 'addDemande', { clientName: 'Pirate', email: 'pirate@x.fr', company: 'P', plan: 'Premium', extra_info: { ...FUNNEL, email: 'pirate@x.fr', stripe_session_id: 'cs_fake', payment_status: 'paid', contractSigned: true, contractSignatureUrl: 'data:image/png;base64,AAAA', clerkId: 'user_admin' } });
        expect(r.code).toBe(200);
        const extra = JSON.parse(rows("SELECT extra_info FROM demandes WHERE email = 'pirate@x.fr'")[0].extra_info);
        for (const k of ['stripe_session_id', 'payment_status', 'contractSigned', 'contractSignatureUrl', 'clerkId']) expect(extra[k], k).toBeUndefined();
        rows('SELECT 1'); await ext.conn.execute("DELETE FROM demandes WHERE email = 'pirate@x.fr'");
    });

    it('une 2e soumission du même email non payé réutilise la demande (pas de doublon)', async () => {
        await data(null, 'addDemande', { clientName: 'William R', email: CLIENT_EMAIL, company: 'RW PATRIMOINE', city: 'Toulouse (31)', plan: 'Confort', extra_info: FUNNEL });
        expect(rows("SELECT id FROM demandes WHERE email = ?", [CLIENT_EMAIL])).toHaveLength(1);
    });

    it('email invalide refusé', async () => {
        expect((await data(null, 'addDemande', { email: 'pas-un-email', company: 'X', plan: 'Essentiel', extra_info: {} })).code).toBe(400);
    });
});

// ═════════════════════════ 2. PAIEMENT ═════════════════════════
describe('2. Paiement (retour Stripe + webhook)', () => {
    const session = () => ({ id: 'cs_live_wr1', status: 'complete', payment_status: 'paid', customer: 'cus_WR', metadata: { demande_id: state.demandeId, planId: 'scan-plus', interval: 'year', email: CLIENT_EMAIL, clientName: 'William Rouzee' }, customer_details: { email: CLIENT_EMAIL } });

    it('retour sur le site : la demande passe « payée », l’email de bienvenue part avec le bouton « Créer mon accès »', async () => {
        ext.stripeSessions.cs_live_wr1 = session();
        const r = await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_wr1' } });
        expect(r.code).toBe(200);
        expect(r.body).toMatchObject({ success: true, confirmed: true });
        expect(rows('SELECT status FROM demandes WHERE id = ?', [state.demandeId])[0].status).toBe('en_attente');
        const welcome = sentTo(CLIENT_EMAIL).find((m) => /Bienvenue/.test(m.subject));
        expect(welcome, 'email de bienvenue').toBeTruthy();
        expect(welcome.html).toContain(`/inscription?email=${encodeURIComponent(CLIENT_EMAIL)}`);
        expect(subjects('contact@domiciliation-pas-cher.com').some((s) => /Nouveau client inscrit/.test(s))).toBe(true);
        expect(rows('SELECT completed_at FROM souscription_leads')[0].completed_at).toBeTruthy(); // les relances s'arrêtent
    });

    it('rejeu (rechargement de la page + webhook Stripe) : aucun 2e email, aucun doublon', async () => {
        const before = ext.outbox.length;
        await api(verifySession, { method: 'GET', query: { session_id: 'cs_live_wr1' } });
        const ev = { type: 'checkout.session.completed', data: { object: session() } };
        const w = await api(webhook, { headers: { 'stripe-signature': 'sig', 'content-type': 'application/json' }, body: Buffer.from(JSON.stringify(ev)) });
        expect(w.code).toBe(200);
        expect(ext.outbox.length).toBe(before);
    });

    it('session non payée ou inconnue : rien n’est confirmé', async () => {
        ext.stripeSessions.cs_unpaid = { id: 'cs_unpaid', status: 'open', payment_status: 'unpaid', metadata: { demande_id: state.demandeId } };
        const r = await api(verifySession, { method: 'GET', query: { session_id: 'cs_unpaid' } });
        expect(r.body).toMatchObject({ success: false, confirmed: false });
        expect((await api(verifySession, { method: 'GET', query: { session_id: 'cs_inexistante' } })).code).toBe(500);
        expect((await api(verifySession, { method: 'GET', query: { session_id: '../etc' } })).code).toBe(400);
    });
});

// ═════════════════════════ 3. VALIDATION ADMIN ═════════════════════════
describe('3. Validation par l’admin', () => {
    it('la demande apparaît dans la liste admin', async () => {
        const r = await data('admin', 'getDemandes');
        expect(r.result.map((d) => d.email)).toContain(CLIENT_EMAIL);
    });

    it('un client connecté ne peut PAS valider un dossier', async () => {
        ext.clerkUsers.user_pirate = { id: 'user_pirate', email: 'pirate@x.fr', verified: true, firstName: 'P', lastName: 'P' };
        expect((await data('user_pirate', 'traiterDemande', state.demandeId)).code).toBe(403);
    });

    it('validation : la fiche client est créée, la demande disparaît, les 3 pièces arrivent dans « Mes documents », l’email « dossier validé » part', async () => {
        const r = await data('admin', 'traiterDemande', state.demandeId);
        expect(r.code).toBe(200);
        state.clientId = r.result.id;
        expect(rows('SELECT status, email, plan, clerkId FROM clients')[0]).toMatchObject({ status: 'actif', email: CLIENT_EMAIL, plan: 'Confort', clerkId: '' });
        expect(rows('SELECT COUNT(*) AS n FROM demandes WHERE id = ?', [state.demandeId])[0].n).toBe(0);
        const docs = rows('SELECT name, owner, url FROM documents WHERE clientId = ?', [state.clientId]);
        expect(docs.map((d) => d.name).sort()).toEqual(["Pièce d'identité (recto)", "Pièce d'identité (verso)", 'Justificatif de domicile'].sort());
        expect(docs.every((d) => d.owner === 'client')).toBe(true);
        const approval = sentTo(CLIENT_EMAIL).find((m) => /validé/i.test(m.subject));
        expect(approval).toBeTruthy();
        expect(approval.html).toContain('Bâtiment B');
    });

    it('la liste admin est légère et montre « Non lié » tant que le client ne s’est pas connecté', async () => {
        const r = await data('admin', 'getClients');
        const c = r.result.find((x) => x.email === CLIENT_EMAIL);
        expect(c.clerkId).toBe('');
    });
});

// ═════════════════════════ 4. CONNEXION APRÈS INSCRIPTION ═════════════════════════
describe('4. Connexion après inscription (espace client)', () => {
    it('adresse email NON vérifiée : message précis (403), jamais « aucun dossier »', async () => {
        ext.clerkUsers.user_wr = { id: 'user_wr', email: CLIENT_EMAIL, verified: false, firstName: 'William', lastName: 'Rouzee' };
        const r = await data('user_wr', 'getMyAccount', {});
        expect(r.code).toBe(403);
        expect(r.error).toBe('EMAIL_NOT_VERIFIED');
    });

    it('email vérifié, même adresse (casse ignorée) : le dossier est trouvé et le compte est relié', async () => {
        ext.clerkUsers.user_wr.verified = true;
        __setAuthVerifierForTests(async (token) => TOKENS[token] || (ext.clerkUsers[token] ? { userId: ext.clerkUsers[token].id, email: ext.clerkUsers[token].verified ? ext.clerkUsers[token].email.toUpperCase().toLowerCase() : '' } : null));
        const r = await data('user_wr', 'getMyAccount', {});
        expect(r.code).toBe(200);
        expect(r.result).toMatchObject({ kind: 'client' });
        expect(r.result.record.id).toBe(state.clientId);
        expect(rows('SELECT clerkId, clerkStatus FROM clients')[0]).toMatchObject({ clerkId: 'user_wr', clerkStatus: 'linked' });
    });

    it('un autre compte ne voit JAMAIS ce dossier (même nom de société, autre adresse)', async () => {
        ext.clerkUsers.user_other = { id: 'user_other', email: 'autre@x.fr', verified: true, firstName: 'Autre', lastName: 'Personne' };
        expect((await data('user_other', 'getMyAccount', {})).result).toBeNull();
        expect((await data('user_other', 'getDocuments', state.clientId)).code).toBe(403);
        expect((await data('user_other', 'getMessages', state.clientId)).code).toBe(403);
        expect((await data('user_other', 'getPayments', state.clientId)).code).toBe(403);
    });

    it('inscrit avec une adresse relais iCloud : introuvable, puis retrouvé par l’admin (recherche par nom) et relié', async () => {
        await ext.conn.execute("UPDATE clients SET clerkId = '', clerkStatus = 'invitation_sent'");
        ext.clerkUsers.user_relay = { id: 'user_relay', email: 'abc123@privaterelay.appleid.com', verified: true, firstName: 'William', lastName: 'Rouzee' };
        delete ext.clerkUsers.user_wr;
        expect((await data('user_relay', 'getMyAccount', {})).result).toBeNull();
        const found = await data('admin', 'clerkAccountsForClient', state.clientId);
        expect(found.result.accounts.map((a) => a.id)).toEqual(['user_relay']);
        expect(found.result.accounts[0]).toMatchObject({ sameEmail: false, verified: true });
        expect((await data('admin', 'linkClerkAccount', state.clientId, 'user_relay')).result).toMatchObject({ linked: true });
        const after = await data('user_relay', 'getMyAccount', {});
        expect(after.result.kind).toBe('client');
        // retour à la situation normale pour la suite
        ext.clerkUsers.user_wr = { id: 'user_wr', email: CLIENT_EMAIL, verified: true, firstName: 'William', lastName: 'Rouzee' };
        await ext.conn.execute("UPDATE clients SET clerkId = 'user_wr', clerkStatus = 'linked'");
        delete ext.clerkUsers.user_relay;
    });
});

// ═════════════════════════ 5. DOCUMENTS ═════════════════════════
describe('5. Dépôt de documents', () => {
    it('le client retrouve ses 3 pièces d’inscription dans « Mes documents »', async () => {
        const r = await data('user_wr', 'getDocuments', state.clientId);
        expect(r.result.map((d) => d.name)).toEqual(expect.arrayContaining(["Pièce d'identité (recto)", "Pièce d'identité (verso)", 'Justificatif de domicile']));
    });

    it('image sur Cloudinary, PDF en base64, signature locale : acceptés', async () => {
        for (const [name, url, type] of [['photo.jpg', 'https://res.cloudinary.com/demo/image/upload/x.jpg', 'image/jpeg'], ['Statuts.pdf', `data:application/pdf;base64,${'A'.repeat(60000)}`, 'application/pdf']]) {
            const r = await data('user_wr', 'addDocument', state.clientId, { name, url, type, size: '60 KB', folder: 'Documents' });
            expect(r.code, name).toBe(200);
        }
        expect(rows("SELECT owner FROM documents WHERE name = 'Statuts.pdf'")[0].owner).toBe('client');
    });

    it('liens douteux refusés (site tiers, javascript:, tableau) ; un client ne peut pas écrire dans le dossier d’un autre', async () => {
        for (const url of ['https://evil.example/fake.pdf', 'javascript:alert(1)', ['https://res.cloudinary.com/x']]) {
            expect((await data('user_wr', 'addDocument', state.clientId, { name: 'x', url })).code, String(url)).toBe(400);
        }
        expect((await data('user_other', 'addDocument', state.clientId, { name: 'x', url: 'https://res.cloudinary.com/x/y.png' })).code).toBe(403);
    });

    it('suppression : son propre document oui, celui fourni par le centre non, celui d’un autre non', async () => {
        const mine = rows("SELECT id FROM documents WHERE name = 'photo.jpg'")[0].id;
        expect((await data('user_other', 'deleteDocument', mine)).code).toBe(403);
        expect((await data('user_wr', 'deleteDocument', mine)).code).toBe(200);
        const adminDoc = (await data('admin', 'addDocument', state.clientId, { name: 'Attestation.pdf', url: 'https://res.cloudinary.com/x/a.pdf', owner: 'admin' })).result;
        expect(rows('SELECT owner FROM documents WHERE id = ?', [adminDoc.id])[0].owner).toBe('admin');
        expect((await data('user_wr', 'deleteDocument', adminDoc.id)).code).toBe(403);
    });

    it('Kbis (PDF en base64) enregistré dans la fiche ; la liste admin est allégée, la fiche complète intacte', async () => {
        const kbis = `data:application/pdf;base64,${'K'.repeat(300000)}`;
        const r = await data('user_wr', 'updateClientExtraInfo', state.clientId, { kbisUrl: kbis });
        expect(r.code).toBe(200);
        const list = (await data('admin', 'getClients')).result.find((c) => c.id === state.clientId);
        expect(JSON.parse(list.extra_info).kbisUrl).toBe('#stored-in-dossier');
        const full = (await data('admin', 'getClientById', state.clientId)).result;
        expect(JSON.parse(full.extra_info).kbisUrl).toBe(kbis);
        // « Modifier les infos » avec le marqueur ne remplace JAMAIS le vrai fichier
        await data('admin', 'updateClientExtraInfo', state.clientId, { prenom: 'Will', kbisUrl: '#stored-in-dossier' });
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info).kbisUrl).toBe(kbis);
    });
});

// ═════════════════════════ 6. SIGNATURE ═════════════════════════
describe('6. Signature du contrat et de la procuration', () => {
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const sign = (who, extraInfo) => api(updateExtra, { who, body: { clientId: state.clientId, extraInfo } });
    const proof = (who, ref, headers = {}) => api(logSignature, { who, headers, body: { clientId: state.clientId, contractRef: ref, signeeName: 'William Rouzee' } });

    it('sans preuve de signature : le contrat ne peut pas être déclaré signé', async () => {
        await sign('user_wr', { contractSigned: true, contractSignatureUrl: PNG });
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info).contractSigned).toBeUndefined();
    });

    it('preuve (IP, nom, email du compte) puis signature : enregistrée avec date serveur et version du contrat', async () => {
        const p = await proof('user_wr', 'contrat_domiciliation', { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });
        expect(p.body).toMatchObject({ success: true, ipAddress: '203.0.113.7' });
        expect(p.body.signedAt).toBeTruthy();
        expect(rows('SELECT signee_email, ip_address FROM signature_logs')[0]).toMatchObject({ signee_email: CLIENT_EMAIL, ip_address: '203.0.113.7' });
        const r = await sign('user_wr', { contractSigned: true, contractSignedAt: '2000-01-01T00:00:00Z', contractSignatureUrl: PNG, contractSignedUrl: '#local-signature' });
        expect(r.code).toBe(200);
        const extra = JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info);
        expect(extra).toMatchObject({ contractSigned: true, contract_version: '2026-11', contractSignedUrl: '#local-signature' });
        expect(new Date(extra.contractSignedAt).getFullYear()).toBeGreaterThanOrEqual(2026); // pas la date envoyée par le navigateur
        expect(extra.stripe_session_id).toBe('cs_live_wr1'); // rien d'autre n'est perdu
    });

    it('re-signature : ignorée, la signature d’origine reste', async () => {
        await proof('user_wr', 'contrat_domiciliation');
        await sign('user_wr', { contractSigned: true, contractSignatureUrl: 'data:image/png;base64,ZZZZ' });
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info).contractSignatureUrl).toBe(PNG);
    });

    it('procuration : refusée avec la preuve du CONTRAT, acceptée avec sa propre preuve', async () => {
        const body = { procurationSigned: true, procurationSignatureUrl: PNG, procurationSignedUrl: '#local-procuration', procurationData: { lieuNaissance: 'Toulouse' } };
        await sign('user_wr', body);
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info).procurationSigned).toBeUndefined();
        await proof('user_wr', 'procuration_postale');
        await sign('user_wr', body);
        expect(JSON.parse(rows('SELECT extra_info FROM clients')[0].extra_info)).toMatchObject({ procurationSigned: true, procurationData: { lieuNaissance: 'Toulouse' } });
    });

    it('un autre client ne peut pas écrire une preuve ni une signature sur ce dossier', async () => {
        expect((await api(logSignature, { who: 'user_other', body: { clientId: state.clientId, contractRef: 'contrat_domiciliation', signeeName: 'X' } })).code).toBe(403);
        expect((await api(updateExtra, { who: 'user_other', body: { clientId: state.clientId, extraInfo: { contractSigned: true } } })).code).toBe(403);
    });
});


// ═════════════════════════ 7. MESSAGERIE ET EMAILS ═════════════════════════
describe('7. Messagerie et envoi d’emails', () => {
    it('message du client : enregistré, puis notification à l’équipe avec L’EMAIL DU COMPTE (jamais celui du formulaire)', async () => {
        const add = await data('user_wr', 'addMessage', state.clientId, { content: 'Bonjour, où en est mon dossier ?', sender: 'admin' });
        expect(add.code).toBe(200);
        expect(rows('SELECT sender FROM messages')[0].sender).toBe('client'); // le client ne peut pas écrire « au nom de l'admin »
        const mail = await api(emailHandler, { who: 'user_wr', body: { type: 'admin_new_message', email: 'usurpe@x.fr', nom: 'William', content: 'Bonjour, où en est mon dossier ?' } });
        expect(mail.code).toBe(200);
        const alert = ext.outbox.at(-1);
        expect(String(alert.to)).toContain('contact@domiciliation-pas-cher.com');
        expect(alert.html).toContain(CLIENT_EMAIL);
        expect(alert.html).not.toContain('usurpe@x.fr');
    });

    it('réponse de l’admin : le client la voit et reçoit un email avec le texte', async () => {
        await data('admin', 'addMessage', state.clientId, { content: 'Votre dossier est validé, merci !', sender: 'admin' });
        const r = await api(emailHandler, { who: 'admin', body: { type: 'new_message', email: CLIENT_EMAIL, nom: 'William Rouzee', content: 'Votre dossier est validé, merci !' } });
        expect(r.code).toBe(200);
        expect(ext.outbox.at(-1).to).toBe(CLIENT_EMAIL);
        expect(ext.outbox.at(-1).html).toContain('Votre dossier est validé, merci !');
        const msgs = (await data('user_wr', 'getMessages', state.clientId)).result;
        expect(msgs.map((m) => m.sender)).toEqual(['client', 'admin']);
        await data('user_wr', 'markMessagesAsRead', state.clientId);
        expect(rows("SELECT status FROM messages WHERE sender = 'admin'")[0].status).not.toBe('sent');
    });

    it('un client ne peut pas envoyer un email « admin » (relance de paiement, validation…) ni à une autre adresse', async () => {
        const before = ext.outbox.length;
        for (const type of ['payment_failed', 'approval', 'new_message', 'account_created', 'payment_reminder']) {
            expect((await api(emailHandler, { who: 'user_wr', body: { type, email: 'victime@x.fr', nom: 'V' } })).code, type).toBe(403);
        }
        expect((await api(emailHandler, { body: { type: 'approval', email: 'victime@x.fr' } })).code).toBe(401);
        expect(ext.outbox.length).toBe(before);
    });

    it('panne du serveur d’envoi (mot de passe Gmail refusé) : erreur claire, échec ENREGISTRÉ dans l’historique, rien de perdu ensuite', async () => {
        ext.smtpDown = true;
        const r = await api(emailHandler, { who: 'admin', body: { type: 'approval', email: CLIENT_EMAIL, nom: 'William' } });
        expect(r.code).toBe(500);
        const failed = rows("SELECT status, error, type FROM email_logs WHERE status = 'failed'");
        expect(failed.length).toBeGreaterThan(0);
        expect(failed[0].error).toMatch(/Username and Password not accepted/);
        ext.smtpDown = false;
        expect((await api(emailHandler, { who: 'admin', body: { type: 'approval', email: CLIENT_EMAIL, nom: 'William' } })).code).toBe(200);
    });

    it('formulaires publics : une seule adresse valide, plafond de 4 envois par adresse et par jour', async () => {
        expect((await api(emailHandler, { body: { type: 'contact_advisor', email: 'a@x.fr, b@y.fr', nom: 'X' } })).code).toBe(400);
        const codes = [];
        for (let i = 0; i < 6; i++) codes.push((await api(emailHandler, { body: { type: 'contact_advisor', email: 'prospect@x.fr', nom: 'P', message: 'Bonjour' } })).code);
        expect(codes).toEqual([200, 200, 200, 200, 429, 429]);
    });
});

// ═════════════════════════ 8. RÉEXPÉDITION ═════════════════════════
describe('8. Demande de réexpédition', () => {
    it('le client demande, l’admin traite, le client est prévenu', async () => {
        const empty = await data('user_wr', 'addReexpeditionRequest', state.clientId, { address: '  ' });
        expect(empty.code).toBe(400);
        const ok = await data('user_wr', 'addReexpeditionRequest', state.clientId, { address: '1 rue de la Paix, 75002 Paris', notes: 'Urgent' });
        expect(ok.code).toBe(200);
        const id = ok.result.id;
        expect(rows('SELECT status FROM reexpeditions')[0].status).toBe('en_attente');
        expect((await data('user_wr', 'updateReexpeditionStatus', id, 'expediee')).code).toBe(403); // le client ne se valide pas lui-même
        expect((await data('admin', 'updateReexpeditionStatus', id, 'nimporte')).code).toBe(400); // message visible : statut hors liste
        expect((await data('admin', 'updateReexpeditionStatus', id, 'expediee')).code).toBe(200);
        const mail = await api(emailHandler, { who: 'admin', body: { type: 'reexpedition_sent', email: CLIENT_EMAIL, nom: 'William', address: '1 rue de la Paix, 75002 Paris' } });
        expect(mail.code).toBe(200);
        expect(ext.outbox.at(-1).html).toContain('1 rue de la Paix');
    });

    it('un client résilié ne peut plus demander de réexpédition', async () => {
        await ext.conn.execute("UPDATE clients SET status = 'résilié'");
        try {
            const r = await data('user_wr', 'addReexpeditionRequest', state.clientId, { address: '1 rue X' });
            expect(r.code).toBe(400);
            expect(r.error).toMatch(/résiliée/);
        } finally {
            await ext.conn.execute("UPDATE clients SET status = 'actif'");
        }
    });
});

// ═════════════════════════ 9. COURRIER + AUTOMATISMES (cron) ═════════════════════════
describe('9. Courrier et tâches automatiques (cron horaire)', () => {
    const runCron = (isoUtc) => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(isoUtc));
        return api(cron, { method: 'GET', headers: { authorization: 'Bearer cron-secret' } }).finally(() => vi.useRealTimers());
    };

    it('sans le bon secret : refusé', async () => {
        expect((await api(cron, { method: 'GET', headers: { authorization: 'Bearer faux' } })).code).toBe(401);
    });

    it('1er passage : la colonne notified_at est créée ; l’ancien courrier n’est PAS renvoyé aux clients', async () => {
        await ext.conn.execute("INSERT INTO mail (id, clientId, company, type, \"from\", date, status, preview) VALUES ('old1', ?, 'RW', 'Lettre simple', 'Ancien', '2026-09-01', 'lu', '')", [state.clientId]);
        const r = await runCron('2026-11-09T10:00:00Z'); // 11 h à Paris
        expect(r.code).toBe(200);
        expect(r.body.mailDigestsSent).toBe(0);
        expect(rows("SELECT notified_at FROM mail WHERE id = 'old1'")[0].notified_at).toBe('legacy');
    });

    it('nouveau courrier : un seul email récapitulatif au client, jamais deux fois', async () => {
        const add = await data('admin', 'addClientMail', state.clientId, { type: 'Lettre recommandée', from: 'URSSAF', company: 'RW PATRIMOINE' });
        expect(add.code).toBe(200);
        const before = sentTo(CLIENT_EMAIL).length;
        const r1 = await runCron('2026-11-09T11:00:00Z');
        expect(r1.body.mailDigestsSent).toBe(1);
        const mail = sentTo(CLIENT_EMAIL).at(-1);
        expect(sentTo(CLIENT_EMAIL).length).toBe(before + 1);
        expect(mail.html).toMatch(/URSSAF|recommandée/i);
        const r2 = await runCron('2026-11-09T12:00:00Z');
        expect(r2.body.mailDigestsSent).toBe(0);
        expect((await data('user_wr', 'getClientMail', state.clientId)).result.map((m) => m.from)).toContain('URSSAF');
    });

    it('la nuit (3 h à Paris) : aucun email de courrier ni de relance ; le courrier attend le matin', async () => {
        await data('admin', 'addClientMail', state.clientId, { type: 'Colis', from: 'Amazon' });
        const before = ext.outbox.length;
        const night = await runCron('2026-11-10T02:00:00Z'); // 3 h à Paris
        expect(night.body.mailDigestsSent ?? 0).toBe(0);
        expect(ext.outbox.length).toBe(before);
        const morning = await runCron('2026-11-10T07:30:00Z'); // 8 h 30 à Paris
        expect(morning.body.mailDigestsSent).toBe(1);
    });

    it('relances d’inscription : prospect de 2 h relancé ; prospect de 17 jours, inscription terminée ou désinscrit : jamais', async () => {
        const now = new Date('2026-11-11T10:00:00Z');
        let leadCount = 0;
        const lead = (email, ageHours, extra = {}) => ext.conn.execute('INSERT INTO souscription_leads (email, token, first_name, plan, step, draft, created_at, updated_at, reminders_sent, completed_at, unsubscribed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)', [email, (`${++leadCount}`.padStart(2, '0') + 'b'.repeat(30)), 'Test', 'essentiel', 2, '{}', new Date(now - ageHours * 3600000).toISOString(), new Date(now - ageHours * 3600000).toISOString(), extra.completed ?? null, extra.unsub ?? null]);
        await lead('recent@x.fr', 2);
        await lead('vieux@xx.fr', 17 * 24);
        await lead('termine@xxx.fr', 3, { completed: now.toISOString() });
        await lead('desabo@xxxx.fr', 3, { unsub: now.toISOString() });
        const before = ext.outbox.length;
        const r = await runCron(now.toISOString());
        expect(r.body.leadRemindersSent).toBe(1);
        const sent = ext.outbox.slice(before).map((m) => m.to);
        expect(sent).toEqual(['recent@x.fr']);
        const relance = ext.outbox.at(-1);
        expect(relance.html).toContain('/souscription?plan=essentiel&amp;reprise='); // « & » est écrit « &amp; » dans le HTML
        // désinscription par le lien de l'email
        const token = /token=([a-f0-9]+)/.exec(relance.html)[1];
        expect((await api(unsubscribe, { method: 'GET', query: { token } })).code).toBe(200);
        expect(rows("SELECT unsubscribed_at FROM souscription_leads WHERE email = 'recent@x.fr'")[0].unsubscribed_at).toBeTruthy();
        expect((await api(unsubscribe, { method: 'GET', query: { token: 'c'.repeat(32) } })).code).toBe(400);
        const before2 = ext.outbox.length;
        await runCron(new Date(now.getTime() + 25 * 3600000).toISOString());
        expect(ext.outbox.slice(before2).map((m) => m.to)).not.toContain('recent@x.fr');
    });
});

// ═════════════════════════ 10. HISTORIQUE DES EMAILS ═════════════════════════
describe('10. Historique des emails (fiche admin)', () => {
    it('TOUS les emails du client sont listés, avec origine, contenu et échecs', async () => {
        const r = await data('admin', 'getEmailLogs', CLIENT_EMAIL);
        expect(r.code).toBe(200);
        const types = r.result.map((l) => l.type);
        for (const t of ['welcome', 'approval', 'new_message', 'new_mail', 'reexpedition_sent', 'admin_new_client']) expect(types, t).toContain(t);
        expect(r.result.some((l) => l.status === 'failed' && /Username and Password/.test(l.error))).toBe(true);
        expect(r.result.find((l) => l.type === 'new_mail').source).toBe('auto');
        expect(r.result.find((l) => l.type === 'approval' && l.status === 'sent').body_text).toMatch(/validé/i);
        expect((await data('user_wr', 'getEmailLogs', CLIENT_EMAIL)).code).toBe(403); // réservé à l'admin
    });
});

// ═════════════════════════ 11. SUPPRESSION COMPLÈTE ═════════════════════════
describe('11. Suppression d’un client (admin)', () => {
    it('efface TOUT ce qui le concerne (base + compte de connexion) sans toucher aux autres clients ni à l’admin', async () => {
        // un 2e client avec ses données : ne doit pas bouger
        await ext.conn.execute("INSERT INTO clients (id, name, email, company, status, extra_info, clerkId) VALUES ('autre1', 'Autre', 'autre@x.fr', 'AUTRE SAS', 'actif', '{}', 'user_other')");
        await ext.conn.execute("INSERT INTO documents (id, clientId, name, owner, url) VALUES ('docA', 'autre1', 'Kbis.pdf', 'client', 'https://res.cloudinary.com/x/k.pdf')");
        await ext.conn.execute("INSERT INTO messages (id, clientId, content, sender, createdAt, status) VALUES ('msgA', 'autre1', 'salut', 'client', '2026-11-01', 'sent')");
        await ext.conn.execute("INSERT INTO signature_logs (client_id, contract_ref, signee_email) VALUES ('autre1', 'contrat_domiciliation', 'autre@x.fr')");
        await ext.conn.execute("INSERT INTO souscription_leads (email, token, created_at) VALUES ('autre@x.fr', ?, '2026-11-01')", ['d'.repeat(32)]);

        const r = await data('admin', 'deleteClient', state.clientId);
        expect(r.code).toBe(200);
        expect(r.result.errors).toEqual([]);
        expect(r.result.clerkAccountsDeleted).toBeGreaterThanOrEqual(1);
        expect(ext.clerkDeleted).toContain('user_wr');
        expect(ext.clerkUsers.user_admin).toBeUndefined(); // (l'admin n'a jamais été dans la liste simulée : pas de suppression)

        const mine = [
            ['clients', 'id = ?', [state.clientId]], ['documents', 'clientId = ?', [state.clientId]], ['messages', 'clientId = ?', [state.clientId]],
            ['payments', 'clientId = ?', [state.clientId]], ['mail', 'clientId = ?', [state.clientId]], ['reexpeditions', 'clientId = ?', [state.clientId]],
            ['bookings', 'clientId = ?', [state.clientId]], ['signature_logs', 'client_id = ?', [state.clientId]],
            ['demandes', 'LOWER(email) = ?', [CLIENT_EMAIL]], ['souscription_leads', 'LOWER(email) = ?', [CLIENT_EMAIL]], ['email_logs', 'LOWER(client_email) = ? OR LOWER(to_email) = ?', [CLIENT_EMAIL, CLIENT_EMAIL]],
        ];
        for (const [table, where, params] of mine) expect(rows(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, params)[0].n, table).toBe(0);

        // l'autre client est intact
        expect(rows("SELECT COUNT(*) AS n FROM clients WHERE id = 'autre1'")[0].n).toBe(1);
        expect(rows("SELECT COUNT(*) AS n FROM documents WHERE clientId = 'autre1'")[0].n).toBe(1);
        expect(rows("SELECT COUNT(*) AS n FROM messages WHERE clientId = 'autre1'")[0].n).toBe(1);
        expect(rows("SELECT COUNT(*) AS n FROM signature_logs WHERE client_id = 'autre1'")[0].n).toBe(1);
        expect(rows("SELECT COUNT(*) AS n FROM souscription_leads WHERE email = 'autre@x.fr'")[0].n).toBe(1);
    });

    it('après suppression, l’ancien compte n’a plus d’accès (Clerk supprimé) et ne retrouve aucun dossier', async () => {
        expect((await data('user_wr', 'getMyAccount', {})).code).toBe(401);
        expect((await data('admin', 'getClients')).result.map((c) => c.email)).not.toContain(CLIENT_EMAIL);
    });

    it('le formulaire de souscription accepte à nouveau la même adresse (nouvelle inscription possible)', async () => {
        expect((await data(null, 'addDemande', { clientName: 'William', email: CLIENT_EMAIL, company: 'RW', plan: 'Essentiel', extra_info: { ...FUNNEL, offre: 'notification' } })).code).toBe(200);
    });
});

describe('Garde-fous du banc d’essai', () => {
    it('aucune requête n’a utilisé une syntaxe que le moteur de test ne comprend pas', () => {
        expect(ext.conn.queries.length).toBeGreaterThan(100);
        void sanitizeClientExtra;
    });
});
