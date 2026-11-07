// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

const state = vi.hoisted(() => ({ conn: null }));
vi.mock('../api/_db.js', () => ({ getDbConn: () => state.conn }));

const { __setAuthVerifierForTests } = await import('../api/_auth.js');
const updateExtra = (await import('../api/update-client-extra.js')).default;
const { isSingleEmail, logEmail } = await import('../api/_email-kit.js');
const { buildTransactionalEmail } = await import('../api/_email-core.js');
const { lightenExtraInfo, isTrustedDocumentUrl, HEAVY_PLACEHOLDER } = await import('../api/_client-extra.js');
const { createDataService, mimeOfDocumentUrl } = await import('../api/_data-service.js');
const { processSouscriptionLeads } = await import('../api/_notifications.js');

describe('Emails : apostrophes autorisées, dangers toujours refusés', () => {
    it.each([["o'brien@gmail.com", true], ["d'amico@free.fr", true], ['jean@société.fr', true], ['a@x.fr,b@y.fr', false], ['v@x.fr>\r\nBcc: e@x.fr', false], ['a "b"@x.fr', false]])('%j → %s', (v, ok) => expect(isSingleEmail(v)).toBe(ok));

    it('le formulaire « conseiller » est journalisé avec l’adresse du visiteur (le plafond par adresse peut donc le compter)', () => {
        const mail = buildTransactionalEmail({ type: 'contact_advisor', email: 'visiteur@x.fr', nom: 'V', message: 'Bonjour' });
        expect(mail.clientEmail).toBe('visiteur@x.fr');
    });
});

describe('Alerte « paiement non activé » : objet sobre, client inconnu lisible', () => {
    it('pas d’émoji ni de majuscules criardes, pas d’adresse fictive affichée', () => {
        const mail = buildTransactionalEmail({ type: 'admin_payment_problem', email: 'inconnu@example.invalid', notes: 'client_not_found', documentName: 'cs_1' });
        expect(mail.subject).toBe('Paiement reçu, dossier non activé : client inconnu');
        expect(mail.html).toContain('la fiche du client est introuvable');
        expect(mail.html + mail.text).not.toContain('example.invalid');
        expect(mail.subject).not.toMatch(/[⚠]|NON/);
    });
});

describe('Journal des emails : repli si les nouvelles colonnes manquent', () => {
    it('le 1er INSERT échoue (colonne absente) → l’essentiel est quand même journalisé', async () => {
        const calls = [];
        const conn = { execute: vi.fn(async (sql, params) => {
            calls.push(sql);
            if (/body_text, source, message_id/.test(sql)) throw new Error("Unknown column 'body_text'");
            return { rows: [] };
        }) };
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await logEmail(conn, { to: 'a@b.fr', type: 'new_mail', subject: 'S', status: 'sent', bodyText: 'x' });
        const basic = calls.find((q) => /^INSERT INTO email_logs \(id, to_email, client_email, type, subject, status, error, sent_at\) VALUES/.test(q));
        expect(basic).toBeTruthy();
    });
});

describe('Pièces : type MIME exact et liens acceptés', () => {
    it.each([
        ['data:application/pdf;base64,AAAA', 'application/pdf'], ['https://res.cloudinary.com/x/a.jpg', 'image/jpeg'], ['https://res.cloudinary.com/x/a.PDF?v=1', 'application/pdf'],
        ['https://res.cloudinary.com/x/a.png', 'image/png'], ['https://res.cloudinary.com/x/a.webp', 'image/webp'],
    ])('%s → %s', (url, mime) => expect(mimeOfDocumentUrl(url)).toBe(mime));

    it('PDF « x-pdf » et images webp acceptés comme fichiers encodés', () => {
        expect(isTrustedDocumentUrl('data:application/x-pdf;base64,AAAA')).toBe(true);
        expect(isTrustedDocumentUrl('data:image/webp;base64,AAAA')).toBe(true);
        expect(isTrustedDocumentUrl('data:text/html;base64,AAAA')).toBe(false);
    });
});

describe('Liste admin allégée : jamais une signature', () => {
    it('un gros PDF est remplacé, une signature (même > 20 Ko) reste intacte', () => {
        const signature = `data:image/png;base64,${'B'.repeat(25_000)}`;
        const light = JSON.parse(lightenExtraInfo(JSON.stringify({ kbisUrl: `data:application/pdf;base64,${'A'.repeat(50_000)}`, contractSignatureUrl: signature })));
        expect(light.kbisUrl).toBe(HEAVY_PLACEHOLDER);
        expect(light.contractSignatureUrl).toBe(signature);
    });
});

describe('Réactivation : plus de clés périmées de l’ancien abonnement', () => {
    it('stripe_subscription_id / domicile_terminated_at / payment_issue_since de l’ancien épisode ne sont pas gardés ; la signature l’est', async () => {
        const updates = [];
        const demande = { id: 'd1', email: 'a@b.fr', clientName: 'Ada L', company: 'ACME', plan: 'Essentiel', amount: '19.20', extra_info: JSON.stringify({ prenom: 'Ada', nom: 'L', stripe_customer_id: 'cus_NEW', stripe_session_id: 'cs_NEW' }) };
        const existing = { id: 'c1', clerkId: 'user_x', clerkStatus: 'linked', extra_info: JSON.stringify({ stripe_subscription_id: 'sub_OLD', domicile_terminated_at: '2026-05-01', payment_issue_since: '2026-03-01', contractSigned: true, stripe_customer_id: 'cus_OLD' }) };
        const conn = { execute: vi.fn(async (sql, params) => {
            if (/^SELECT \* FROM demandes WHERE id/i.test(sql)) return { rows: [demande] };
            if (/^SELECT id, extra_info, clerkId, clerkStatus FROM clients/i.test(sql)) return { rows: [existing] };
            if (/^UPDATE clients SET name/i.test(sql)) updates.push(JSON.parse(params[5]));
            return { rows: [] };
        }) };
        await createDataService({ conn, sendEmail: async () => {} }).traiterDemande('d1');
        const merged = updates[0];
        expect(merged.stripe_subscription_id).toBeUndefined();
        expect(merged.domicile_terminated_at).toBeUndefined();
        expect(merged.payment_issue_since).toBeUndefined();
        expect(merged.contractSigned).toBe(true);
        expect(merged.stripe_customer_id).toBe('cus_NEW');
    });
});

describe('Suppression : une table absente (message Vitess) n’est pas un échec', () => {
    it('« table X not found (errno 1146) » ignoré ; une vraie panne est signalée', async () => {
        const execute = vi.fn(async (sql) => {
            if (/^SELECT \* FROM clients WHERE id/i.test(sql)) return { rows: [{ id: 'c1', email: 'a@b.fr', clerkId: '' }] };
            if (/FROM email_logs/.test(sql)) throw new Error('target: x vttablet: table email_logs not found (errno 1146)');
            if (/FROM souscription_leads/.test(sql)) throw new Error('timeout base');
            return { rows: [] };
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const report = await createDataService({ conn: { execute }, deleteClerkUser: vi.fn(), findClerkUserIdsByEmail: async () => [] }).deleteClient('c1');
        expect(report.errors).toEqual(['prospect']);
    });
});

describe('Relances d’inscription : l’âge maximum est dans la requête (plus de lecture des vieux prospects chaque heure)', () => {
    it('la requête reçoit une date limite', async () => {
        const now = new Date('2026-11-06T10:00:00Z');
        const conn = { execute: vi.fn(async () => ({ rows: [] })) };
        await processSouscriptionLeads({ conn, transporter: { sendMail: vi.fn() }, from: 'f', baseUrl: 'https://s', now });
        const call = conn.execute.mock.calls.find(([sql]) => /FROM souscription_leads WHERE completed_at IS NULL/.test(sql));
        expect(call[0]).toMatch(/created_at > \?/);
        expect(call[1][1]).toBe('2026-10-30T10:00:00.000Z');
    });
});

describe('Signature : une re-signature ignorée n’écrit rien de ce document', () => {
    it('procuration déjà signée : ni nouveau PDF ni nouvelles données de procuration', async () => {
        const stored = { extra: JSON.stringify({ procurationSigned: true, procurationSignedUrl: 'https://res.cloudinary.com/a/ancien.pdf', procurationData: { a: 1 } }) };
        const conn = { execute: vi.fn(async (sql, params = []) => {
            if (/^SELECT id, email, extra_info FROM clients/i.test(sql)) return { rows: [{ id: 'c1', email: 'ada@x.fr', extra_info: stored.extra }] };
            if (/^SELECT id, email, extra_info FROM demandes/i.test(sql)) return { rows: [] };
            if (/^SELECT extra_info FROM clients WHERE id/i.test(sql)) return { rows: [{ extra_info: stored.extra }] };
            if (/FROM signature_logs/i.test(sql)) return { rows: [{ id: 1 }] };
            if (/^UPDATE clients SET extra_info/i.test(sql)) stored.extra = params[0];
            return { rows: [] };
        }) };
        state.conn = conn;
        __setAuthVerifierForTests(async () => ({ userId: 'u1', email: 'ada@x.fr' }));
        const r = { code: 200, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
        await updateExtra({ method: 'POST', headers: { authorization: 'Bearer t' }, body: { clientId: 'c1', extraInfo: { procurationSigned: true, procurationSignedUrl: 'https://res.cloudinary.com/a/nouveau.pdf', procurationData: { a: 2 } } } }, r);
        const saved = JSON.parse(stored.extra);
        expect(saved.procurationSignedUrl).toBe('https://res.cloudinary.com/a/ancien.pdf');
        expect(saved.procurationData).toEqual({ a: 1 });
    });
});
