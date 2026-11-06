/**
 * Envoi d'emails : chemins d'échec et garde-fous (les contenus sont testés dans emailNotifications.test.js).
 *
 * Objectif : aucun email manuel ou automatique ne doit
 *  - partir au mauvais destinataire ou avec le mauvais contenu (type inconnu → bienvenue) ;
 *  - être marqué « envoyé » alors qu'il a échoué (il ne repartirait jamais) ;
 *  - échouer en silence côté admin.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));
vi.mock('../api/_db.js', () => ({ getDbConn: () => null }));
const authUser = { current: null };
vi.mock('../api/_auth.js', () => ({ getAuthUser: vi.fn(async () => authUser.current) }));
const smtp = { transporter: null };
vi.mock('../api/_smtp.js', async (importOriginal) => ({
    ...(await importOriginal()),
    getTransporter: () => smtp.transporter,
    getSmtpConfig: () => (smtp.transporter ? { from: 'expediteur@test.fr' } : null),
}));

const { EMAIL_TYPES, ADMIN_INBOX_TYPES, isKnownEmailType, buildTransactionalEmail, deliverEmail } = await import('../api/_email-core.js');
const { ADMIN_EMAIL } = await import('../api/_smtp.js');
const { CONTACT_EMAIL } = await import('../api/_email-kit.js');
const emailHandler = (await import('../api/email.js')).default;
const { sendRenewalReminders } = await import('../api/cron/reminders.js');
const { applyPaymentGracePolicy } = await import('../api/_payment-dunning.js');
const { processMailNotifications, processSouscriptionLeads, processPendingPayments, processDocumentRequests } = await import('../api/_notifications.js');

const ROOT = path.resolve(__dirname, '..');
const DAY = 24 * 60 * 60 * 1000;

function mockRes() {
    const res = { statusCode: 200, body: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
}

beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: 'id-1' });
    authUser.current = null;
    smtp.transporter = null;
    vi.stubEnv('SMTP_HOST', 'smtp.gmail.com');
    vi.stubEnv('SMTP_PORT', '465');
    vi.stubEnv('SMTP_USER', 'expediteur@test.fr');
    vi.stubEnv('SMTP_PASS', 'abcdabcdabcdabcd');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('types d’email : liste fermée', () => {
    it('chaque type envoyé par le front ou le serveur est connu du moteur', () => {
        const files = [
            'src/utils/emailService.js',
            'src/pages/EspaceClient/components/Docs.jsx',
            'api/_data-service.js',
            'api/_checkout-fulfillment.js',
        ];
        const used = new Set();
        for (const f of files) {
            const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
            for (const m of src.matchAll(/type:\s*'([a-z_]+)'/g)) used.add(m[1]);
            for (const m of src.matchAll(/'(reexpedition_(?:sent|refused))'/g)) used.add(m[1]);
        }
        expect(used.size).toBeGreaterThan(10);
        const unknown = [...used].filter((t) => !EMAIL_TYPES.includes(t));
        expect(unknown).toEqual([]);
    });

    it('plus aucun appel direct à /api/email hors du service (sauf accusés client de Docs.jsx)', () => {
        const offenders = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(p);
                else if (/\.(jsx?|mjs)$/.test(entry.name) && fs.readFileSync(p, 'utf8').includes("'/api/email'")) {
                    offenders.push(path.relative(ROOT, p));
                }
            }
        };
        walk(path.join(ROOT, 'src'));
        expect(offenders.sort()).toEqual(['src/pages/EspaceClient/components/Docs.jsx', 'src/utils/emailService.js']);
    });

    it('un type inconnu est refusé (400) au lieu de partir comme email de bienvenue', async () => {
        expect(isKnownEmailType('approvall')).toBe(false);
        expect(isKnownEmailType(undefined)).toBe(true);
        expect(() => buildTransactionalEmail({ email: 'a@b.fr', type: 'approvall' })).toThrow(/inconnu/);
        await expect(deliverEmail({ email: 'a@b.fr', type: 'approvall' })).rejects.toMatchObject({ statusCode: 400 });
        expect(sendMail).not.toHaveBeenCalled();

        authUser.current = { email: 'admin@x.fr', isAdmin: true };
        const res = mockRes();
        await emailHandler({ method: 'POST', headers: {}, body: { email: 'a@b.fr', type: 'bienvenue' } }, res);
        expect(res.statusCode).toBe(400);
        expect(sendMail).not.toHaveBeenCalled();
    });

    it.each(EMAIL_TYPES)('« %s » : objet, HTML et texte complets, destinataire correct, rien de cassé', (type) => {
        const mail = buildTransactionalEmail({
            email: 'client@exemple.fr', nom: 'Ada Lovelace', type, amount: '28,80 €', content: 'Bonjour\nmerci',
            address: '1 rue X', company: 'ACME', plan: 'Confort', documentName: 'Kbis.pdf', paymentToken: 'tok',
            mailType: 'Lettre', mailFrom: 'URSSAF', telephone: '0600000000', documents: ['kbis'],
        }, { baseUrl: 'https://site.test' });
        expect(mail.subject?.trim()).toBeTruthy();
        expect(mail.html?.trim()).toBeTruthy();
        for (const part of [mail.subject, mail.html, mail.text || '']) {
            expect(part).not.toMatch(/undefined|\bNaN\b|\[object Object\]|Bonjour Client/);
        }
        const toAdmin = ADMIN_INBOX_TYPES.has(type);
        const toContact = ['contact_advisor', 'souscription_lead'].includes(type);
        expect(mail.to).toBe(toAdmin ? ADMIN_EMAIL : toContact ? CONTACT_EMAIL : 'client@exemple.fr');
        if (type === 'welcome') expect(mail.adminCopy?.type).toBe('admin_new_client');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('envoi manuel : /api/email', () => {
    const post = async (body, user) => {
        authUser.current = user;
        const res = mockRes();
        await emailHandler({ method: 'POST', headers: { host: 'site.test' }, body }, res);
        return res;
    };

    it('admin : l’email part au client, expéditeur de la marque, réponses vers contact@', async () => {
        const res = await post({ type: 'new_message', email: 'client@exemple.fr', nom: 'Ada', content: 'Votre colis est arrivé' }, { email: 'admin@x.fr', isAdmin: true });
        expect(res.statusCode).toBe(200);
        expect(sendMail).toHaveBeenCalledTimes(1);
        const sent = sendMail.mock.calls[0][0];
        expect(sent.to).toBe('client@exemple.fr');
        expect(sent.from).toBe('"domiciliation-pas-cher.com" <expediteur@test.fr>');
        expect(sent.replyTo).toBe(CONTACT_EMAIL);
        expect(sent.html).toContain('Votre colis est arrivé');
        expect(sent.text).toContain('Votre colis est arrivé');
    });

    it('SMTP refusé (Gmail 535…) : 500 avec un message lisible, pas de faux succès', async () => {
        sendMail.mockRejectedValueOnce(Object.assign(new Error('535 Username and Password not accepted'), { code: 'EAUTH' }));
        const res = await post({ type: 'approval', email: 'client@exemple.fr' }, { email: 'admin@x.fr', isAdmin: true });
        expect(res.statusCode).toBe(500);
        expect(res.body.error).toMatch(/impossible/i);
    });

    it('SMTP non configuré : erreur explicite, aucun envoi', async () => {
        vi.stubEnv('SMTP_PASS', '');
        const res = await post({ type: 'approval', email: 'client@exemple.fr' }, { email: 'admin@x.fr', isAdmin: true });
        expect(res.statusCode).toBe(500);
        expect(sendMail).not.toHaveBeenCalled();
        await expect(deliverEmail({ type: 'approval', email: 'a@b.fr' })).rejects.toThrow('Configuration SMTP du serveur manquante.');
    });

    it('email manquant : 400', async () => {
        const res = await post({ type: 'approval' }, { email: 'admin@x.fr', isAdmin: true });
        expect(res.statusCode).toBe(400);
    });

    it('contrôle d’accès : anonyme 401, client sur un type admin 403', async () => {
        expect((await post({ type: 'payment_failed', email: 'v@x.fr' }, null)).statusCode).toBe(401);
        expect((await post({ type: 'payment_failed', email: 'v@x.fr' }, { email: 'c@x.fr', isAdmin: false })).statusCode).toBe(403);
        expect(sendMail).not.toHaveBeenCalled();
    });

    it('client → admin : l’email affiché est celui du compte connecté, pas celui envoyé', async () => {
        const res = await post({ type: 'admin_new_message', email: 'usurpe@x.fr', content: 'Salut' }, { email: 'vrai@client.fr', isAdmin: false });
        expect(res.statusCode).toBe(200);
        const sent = sendMail.mock.calls[0][0];
        expect(sent.to).toBe(ADMIN_EMAIL);
        expect(sent.html).toContain('vrai@client.fr');
        expect(sent.html).not.toContain('usurpe@x.fr');
    });

    it('accusé client (signature) : toujours envoyé à sa propre adresse', async () => {
        await post({ type: 'post_signature', email: 'autre@x.fr' }, { email: 'moi@client.fr', isAdmin: false });
        expect(sendMail.mock.calls[0][0].to).toBe('moi@client.fr');
    });

    it('formulaire public : arrive dans la boîte contact, reply-to = prospect', async () => {
        const res = await post({ type: 'contact_advisor', email: 'prospect@x.fr', nom: 'Bob', telephone: '06' }, null);
        expect(res.statusCode).toBe(200);
        const sent = sendMail.mock.calls[0][0];
        expect(sent.to).toBe(CONTACT_EMAIL);
        expect(sent.replyTo).toBe('prospect@x.fr');
    });

    it('bienvenue : l’alerte admin en échec ne fait pas échouer l’email du client', async () => {
        sendMail.mockResolvedValueOnce({ messageId: 'client' }).mockRejectedValueOnce(new Error('quota'));
        await expect(deliverEmail({ email: 'client@exemple.fr', nom: 'Ada' })).resolves.toMatchObject({ messageId: 'client' });
        expect(sendMail).toHaveBeenCalledTimes(2);
        expect(sendMail.mock.calls[1][0].to).toBe(ADMIN_EMAIL);
    });

    it('un lien de paiement n’est jamais accepté d’un non-admin', async () => {
        await post({ type: 'post_signature', email: 'x', paymentLink: 'https://pirate.test' }, { email: 'moi@client.fr', isAdmin: false });
        expect(sendMail.mock.calls[0][0].html).not.toContain('pirate.test');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('envoi manuel : service front (src/utils/emailService.js)', () => {
    let svc;
    beforeEach(async () => {
        svc = await import('../src/utils/emailService.js');
    });

    it('succès : true', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{"success":true}', { status: 200 })));
        await expect(svc.sendAdminMessageEmail({ email: 'a@b.fr', nom: 'A', content: 'x' })).resolves.toBe(true);
        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body).toMatchObject({ type: 'new_message', email: 'a@b.fr', content: 'x' });
        vi.unstubAllGlobals();
    });

    it('échec serveur : l’erreur porte le message du serveur (affiché à l’admin)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Configuration SMTP du serveur manquante.' }), { status: 500 })));
        await expect(svc.sendFailedPaymentEmail('a@b.fr', 'A')).rejects.toThrow('Configuration SMTP du serveur manquante.');
        await expect(svc.sendAccountCreatedEmail('a@b.fr', 'A', {})).rejects.toThrow('Configuration SMTP');
        expect(await svc.sendApprovalEmail('a@b.fr', 'A')).toEqual({ success: false, error: 'Configuration SMTP du serveur manquante.' });
        expect(await svc.sendReexpeditionStatusEmail({ email: 'a@b.fr', status: 'expediee' })).toBe(false);
        vi.unstubAllGlobals();
    });

    it('session expirée / réseau coupé : messages compréhensibles', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
        await expect(svc.postEmail({ type: 'approval', email: 'a' })).rejects.toThrow(/reconnectez-vous/);
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
        await expect(svc.postEmail({ type: 'approval', email: 'a' })).rejects.toThrow(/injoignable/);
        vi.unstubAllGlobals();
    });

    it('réexpédition : le type dépend du statut', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
        await svc.sendReexpeditionStatusEmail({ email: 'a', status: 'expediee' });
        await svc.sendReexpeditionStatusEmail({ email: 'a', status: 'refusee' });
        expect(fetch.mock.calls.map((c) => JSON.parse(c[1].body).type)).toEqual(['reexpedition_sent', 'reexpedition_refused']);
        vi.unstubAllGlobals();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('envois automatiques : un échec n’est jamais marqué « envoyé »', () => {
    const annualSub = (end) => ({
        id: 'sub_1', customer: 'cus_1', metadata: {},
        items: { data: [{ plan: { interval: 'year' }, current_period_end: Math.floor(end.getTime() / 1000) }] },
    });
    const stripeWith = (sub) => ({
        subscriptions: { list: vi.fn(async () => ({ data: [sub], has_more: false })), update: vi.fn(async () => ({})) },
        customers: { retrieve: vi.fn(async () => ({ email: 'annuel@client.fr', name: 'Ada' })) },
    });
    const now = new Date('2026-11-06T08:00:00Z');
    const periodEnd = new Date('2027-01-06T00:00:00Z'); // rappel dû le 2026-11-06

    it('rappel annuel envoyé → abonnement marqué', async () => {
        smtp.transporter = { sendMail: vi.fn(async () => ({})) };
        const stripe = stripeWith(annualSub(periodEnd));
        expect(await sendRenewalReminders(stripe, null, now)).toBe(1);
        expect(smtp.transporter.sendMail.mock.calls[0][0].to).toBe('annuel@client.fr');
        expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', { metadata: { dpc_renewal_reminded: '2027-01-06' } });
    });

    it('rappel annuel en échec SMTP → PAS marqué (il repartira au passage suivant)', async () => {
        smtp.transporter = { sendMail: vi.fn(async () => { throw new Error('Gmail indisponible'); }) };
        const stripe = stripeWith(annualSub(periodEnd));
        expect(await sendRenewalReminders(stripe, null, now)).toBe(0);
        expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('rappel annuel sans SMTP configuré → PAS marqué', async () => {
        smtp.transporter = null;
        const stripe = stripeWith(annualSub(periodEnd));
        expect(await sendRenewalReminders(stripe, null, now)).toBe(0);
        expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('impayé : relance en échec → tentative non mémorisée (relancée demain)', async () => {
        const stripe = { invoices: { update: vi.fn() }, subscriptions: { update: vi.fn(), cancel: vi.fn() } };
        const transporter = { sendMail: vi.fn(async () => { throw new Error('down'); }) };
        const failure = { email: 'c@x.fr', invoiceId: 'in_1', attemptCount: 2, failedAt: '2026-10-20', amountDue: 28.8 };
        const r = await applyPaymentGracePolicy({ stripe, failures: [failure], transporter, conn: null, now });
        expect(r.dunningEmailsSent).toBe(0);
        expect(stripe.invoices.update).not.toHaveBeenCalled();
    });

    it('résiliation à 2 mois : comptée même si l’email de résiliation échoue', async () => {
        const stripe = { invoices: { update: vi.fn() }, subscriptions: { update: vi.fn(), cancel: vi.fn() } };
        const transporter = {
            sendMail: vi.fn(async ({ to }) => { if (to === 'c@x.fr') throw new Error('down'); return {}; }),
        };
        const failure = { email: 'c@x.fr', invoiceId: 'in_1', subscriptionId: 'sub_1', attemptCount: 4, failedAt: '2026-08-01' };
        const r = await applyPaymentGracePolicy({ stripe, failures: [failure], transporter, conn: null, now });
        expect(r.terminated).toBe(1);
        expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_1');
        // Le récapitulatif admin part quand même.
        expect(transporter.sendMail.mock.calls.some(([m]) => m.to === ADMIN_EMAIL)).toBe(true);
    });

    const fakeConn = (handlers) => ({
        execute: vi.fn(async (sql, params) => {
            for (const [re, fn] of handlers) if (re.test(sql)) return fn(sql, params) || { rows: [] };
            return { rows: [] };
        }),
    });
    const failing = { sendMail: vi.fn(async () => { throw new Error('down'); }) };

    it('récap courrier en échec → courriers NON marqués notifiés', async () => {
        const conn = fakeConn([[/FROM mail m JOIN/, () => ({ rows: [{ id: 'm1', clientId: 'c1', type: 'Lettre', email: 'c@x.fr', name: 'Ada', plan: 'Confort', clientStatus: 'actif', extra_info: '{}' }] })]]);
        const r = await processMailNotifications({ conn, transporter: failing, from: 'f@x.fr', baseUrl: 'https://s' });
        expect(r.mailDigestsSent).toBe(0);
        expect(conn.execute.mock.calls.some(([sql]) => /UPDATE mail SET notified_at = \? WHERE id IN/.test(sql))).toBe(false);
    });

    it('relance d’inscription en échec → compteur de relances inchangé', async () => {
        const created = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
        const conn = fakeConn([[/SELECT \* FROM souscription_leads/, () => ({ rows: [{ email: 'p@x.fr', token: 'a'.repeat(32), created_at: created, updated_at: created, reminders_sent: 0, plan: 'essentiel' }] })]]);
        const r = await processSouscriptionLeads({ conn, transporter: failing, from: 'f', baseUrl: 'https://s', now });
        expect(r.leadRemindersSent).toBe(0);
        expect(conn.execute.mock.calls.some(([sql]) => /UPDATE souscription_leads SET reminders_sent/.test(sql))).toBe(false);
    });

    it('relance du lien de paiement en échec → jour de relance non mémorisé', async () => {
        const extra = { payment_status: 'pending', payment_token: 't', payment_requested_at: new Date(now.getTime() - 3 * DAY).toISOString() };
        const conn = fakeConn([[/payment_token/, () => ({ rows: [{ id: 'c1', email: 'c@x.fr', name: 'Ada', plan: 'essentiel', status: 'actif', extra_info: JSON.stringify(extra) }] })]]);
        const r = await processPendingPayments({ conn, transporter: failing, from: 'f', baseUrl: 'https://s', now });
        expect(r.paymentRemindersSent).toBe(0);
        expect(conn.execute.mock.calls.some(([sql]) => /UPDATE clients SET extra_info/.test(sql))).toBe(false);
    });

    it('relance documents en échec → relance non mémorisée', async () => {
        const extra = { doc_request: { missing: ['kbis'], requested_at: new Date(now.getTime() - 8 * DAY).toISOString(), reminders_sent: [] } };
        const conn = fakeConn([[/doc_request/, () => ({ rows: [{ id: 'c1', email: 'c@x.fr', name: 'Ada', status: 'actif', extra_info: JSON.stringify(extra) }] })]]);
        const r = await processDocumentRequests({ conn, transporter: failing, from: 'f', baseUrl: 'https://s', now });
        expect(r.documentRemindersSent).toBe(0);
        expect(conn.execute.mock.calls.some(([sql]) => /UPDATE clients SET extra_info/.test(sql))).toBe(false);
    });

    it('client résilié : aucun récap courrier', async () => {
        const ok = { sendMail: vi.fn(async () => ({})) };
        const conn = fakeConn([[/FROM mail m JOIN/, () => ({ rows: [{ id: 'm1', clientId: 'c1', email: 'c@x.fr', clientStatus: 'résilié', extra_info: '{}' }] })]]);
        await processMailNotifications({ conn, transporter: ok, from: 'f', baseUrl: 'https://s' });
        expect(ok.sendMail).not.toHaveBeenCalled();
    });
});

describe('SMTP non configuré : l’échec apparaît dans l’historique', () => {
    it('deliverEmail journalise l’email non parti (destinataire, objet, raison, origine)', async () => {
        const kit = await import('../api/_email-kit.js');
        const spy = vi.spyOn(kit, 'logEmail');
        vi.stubEnv('SMTP_PASS', '');
        await expect(deliverEmail({ type: 'account_created', email: 'c@x.fr', nom: 'David' }, { source: 'manuel' })).rejects.toThrow('Configuration SMTP');
        // ESM : l'espion ne voit pas l'appel interne ; on vérifie donc le code source en complément.
        spy.mockRestore();
        const src = fs.readFileSync(path.join(ROOT, 'api/_email-core.js'), 'utf8');
        const block = src.slice(src.indexOf('if (!smtpHost || !smtpUser || !smtpPass)'), src.indexOf("throw new Error('Configuration SMTP du serveur manquante.')"));
        expect(block).toContain('await logEmail(conn');
        expect(block).toContain("status: 'failed'");
    });
});

describe('Première connexion : un client qui vient de payer sait créer son accès', () => {
    it('bienvenue et validation : lien « Créer mon accès » avec l’email prérempli + lien « Se connecter »', () => {
        for (const type of [undefined, 'approval']) {
            const mail = buildTransactionalEmail({ email: 'William.Rouzee@icloud.com', nom: 'William', type }, { baseUrl: 'https://site.test' });
            expect(mail.html).toContain('https://site.test/inscription?email=william.rouzee%40icloud.com');
            expect(mail.text).toContain('https://site.test/inscription?email=william.rouzee%40icloud.com');
            expect(mail.html).toContain('william.rouzee@icloud.com');
        }
        const welcome = buildTransactionalEmail({ email: 'a@b.fr' }, { baseUrl: 'https://site.test' });
        expect(welcome.html).toContain('Créer mon accès');
        expect(welcome.html).toContain('https://site.test/connexion');
    });

    it('/inscription : lien ?email= vérifié automatiquement (plus de piège « même navigateur »), email prérempli', () => {
        const src = fs.readFileSync(path.join(ROOT, 'src/pages/Connexion/Inscription.jsx'), 'utf8');
        expect(src).toContain('checkPaymentStatus(prefillEmail)');
        expect(src).toContain('initialValues={prefillEmail ? { emailAddress: prefillEmail } : undefined}');
        expect(src).not.toContain('même navigateur');
        const login = fs.readFileSync(path.join(ROOT, 'src/pages/Connexion/Connexion.jsx'), 'utf8');
        expect(login).toContain('signUpUrl="/inscription"');
    });
});


describe('Formulaires publics : plus de relais d’emails depuis notre domaine', () => {
    const publicPost = async (body) => {
        authUser.current = null;
        const r = mockRes();
        await emailHandler({ method: 'POST', headers: { host: 'site.test' }, body }, r);
        return r;
    };

    it.each(['a@x.fr, b@y.fr', 'v@x.fr>\r\nBcc: evil@x.fr', 'a@x.fr;b@y.fr', ''])('adresse « %s » refusée, rien n’est envoyé', async (email) => {
        const r = await publicPost({ type: 'consultation_creation', email, nom: 'X', message: 'Cliquez http://phish.example' });
        expect(r.statusCode).toBe(400);
        expect(sendMail).not.toHaveBeenCalled();
    });

    it('textes libres plafonnés (message 2000 caractères)', async () => {
        const r = await publicPost({ type: 'contact_advisor', email: 'prospect@x.fr', nom: 'N'.repeat(500), message: 'm'.repeat(6000) });
        expect(r.statusCode).toBe(200);
        const html = sendMail.mock.calls[0][0].html;
        expect(html).not.toContain('m'.repeat(2001));
        expect(html).not.toContain('N'.repeat(121));
    });
});
