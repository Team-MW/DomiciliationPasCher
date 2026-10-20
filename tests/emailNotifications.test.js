import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeMissingDocuments, dueDocumentReminder, kbisDeadline } from '../shared/documentRequest.js';
import { brandedFrom, wrapEmail, sendBrandedMail } from '../api/_email-kit.js';
import { buildMailDigestEmail, buildDocumentRequestEmail, buildLeadReminderEmail } from '../api/_email-templates.js';
import { processMailNotifications, processSouscriptionLeads, processDocumentRequests, processPendingPayments } from '../api/_notifications.js';

const DAY = 24 * 60 * 60 * 1000;

describe('kit email commun', () => {
    it('impose le nom d’expéditeur et le pied de page légal', () => {
        expect(brandedFrom('contact@domiciliation-pas-cher.com')).toBe('"Domiciliation Pas Cher" <contact@domiciliation-pas-cher.com>');
        expect(brandedFrom('Autre <x@y.fr>')).toBe('"Domiciliation Pas Cher" <x@y.fr>');
        const html = wrapEmail('<p>Salut</p>', { unsubscribeUrl: 'https://x/unsub' });
        expect(html).toContain('AG/DOM/2026/06');
        expect(html).toContain('150 rue Nicolas Louis Vauquelin');
        expect(html).toContain('name="viewport"');
        expect(html).toContain('https://x/unsub');
    });

    it('journalise chaque envoi dans email_logs', async () => {
        const conn = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
        const transporter = { sendMail: vi.fn().mockResolvedValue({}) };
        await sendBrandedMail(transporter, { conn, to: 'A@Test.fr', subject: 'S', html: '<p>x</p>', type: 'new_mail' });
        const insert = conn.execute.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO email_logs'));
        expect(insert[1]).toEqual(expect.arrayContaining(['a@test.fr', 'new_mail', 'S', 'sent']));
    });
});

describe('demande de statuts / Kbis', () => {
    it('détecte les pièces encore manquantes', () => {
        expect(computeMissingDocuments(['statuts', 'kbis'], { documents: [{ name: 'Projet Statut.pdf' }] })).toEqual(['kbis']);
        expect(computeMissingDocuments(['statuts', 'kbis'], { extra: { kbisUrl: 'u' }, documents: [{ name: 'Statuts.pdf' }] })).toEqual([]);
    });

    it('programme les relances J+7 / J+30 / J+60 / J+80 sans doublon', () => {
        const start = new Date('2026-01-01T08:00:00Z');
        const req = { requested_at: start.toISOString(), reminders_sent: [] };
        expect(dueDocumentReminder(req, new Date(start.getTime() + 6 * DAY))).toBeNull();
        expect(dueDocumentReminder(req, new Date(start.getTime() + 7 * DAY))).toMatchObject({ day: 7, isLast: false });
        expect(dueDocumentReminder({ ...req, reminders_sent: [7, 30, 60] }, new Date(start.getTime() + 80 * DAY))).toMatchObject({ day: 80, isLast: true });
        expect(dueDocumentReminder({ ...req, reminders_sent: [7, 30, 60, 80] }, new Date(start.getTime() + 200 * DAY))).toBeNull();
        expect(dueDocumentReminder({ ...req, completed_at: 'x' }, new Date(start.getTime() + 30 * DAY))).toBeNull();
    });

    it('rappelle le délai de 3 mois pour le Kbis d’une société en création', () => {
        expect(kbisDeadline('2026-01-15').getMonth()).toBe(3);
        const { subject, html } = buildDocumentRequestEmail({
            nom: 'Ada', missing: ['kbis'], isCreation: true, contractSignedAt: '2026-01-15', baseUrl: 'https://s',
        });
        expect(subject).toBe('Il manque un document pour finaliser votre domiciliation');
        expect(html).toContain('3 mois');
        expect(html).toContain('Déposer mon document');
        expect(html).toContain('https://s/app/espace-client?tab=docs');
    });

    it('le cron relance puis s’arrête dès que le document est déposé', async () => {
        const now = new Date('2026-03-01T08:00:00Z');
        const extra = { doc_request: { missing: ['kbis'], requested_at: new Date(now.getTime() - 8 * DAY).toISOString(), reminders_sent: [] } };
        const transporter = { sendMail: vi.fn().mockResolvedValue({}) };
        let docs = [];
        const conn = {
            execute: vi.fn(async (sql) => {
                if (sql.startsWith('SELECT id, email')) return { rows: [{ id: 'c1', email: 'c@test.fr', name: 'C', extra_info: JSON.stringify(extra) }] };
                if (sql.startsWith('SELECT name FROM documents')) return { rows: docs };
                return { rows: [] };
            }),
        };
        expect(await processDocumentRequests({ conn, transporter, baseUrl: 'https://s', now })).toEqual({ documentRemindersSent: 1 });
        expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'c@test.fr' }));

        docs = [{ name: 'Extrait KBIS.pdf' }];
        transporter.sendMail.mockClear();
        expect(await processDocumentRequests({ conn, transporter, baseUrl: 'https://s', now })).toEqual({ documentRemindersSent: 0 });
        expect(transporter.sendMail).not.toHaveBeenCalled();
        const update = conn.execute.mock.calls.filter(([sql]) => sql.startsWith('UPDATE clients SET extra_info')).pop();
        expect(JSON.parse(update[1][0]).doc_request.completed_at).toBe(now.toISOString());
    });
});

describe('enchaînement des emails', () => {
    it('à la validation, la demande de document part au passage suivant, pas avec « Dossier validé »', () => {
        const req = { requested_at: new Date().toISOString(), initial_pending: true, reminders_sent: [] };
        expect(dueDocumentReminder(req)).toMatchObject({ initial: true, day: 0 });
    });

    it('relance le lien de paiement à J+2 puis J+5, et plus rien une fois payé', async () => {
        const now = new Date('2026-10-20T08:00:00Z');
        let extra = {
            payment_status: 'pending', payment_token: 'c'.repeat(48), frequence: 'mensuel',
            payment_requested_at: new Date(now.getTime() - 2 * DAY).toISOString(),
        };
        const transporter = { sendMail: vi.fn().mockResolvedValue({}) };
        const conn = {
            execute: vi.fn(async (sql, params) => {
                if (sql.startsWith('SELECT id, email, name, plan')) {
                    return { rows: [{ id: 'c1', email: 'c@test.fr', name: 'C', plan: 'Essentiel', status: 'actif', extra_info: JSON.stringify(extra) }] };
                }
                if (sql.startsWith('UPDATE clients SET extra_info')) extra = JSON.parse(params[0]);
                return { rows: [] };
            }),
        };
        expect(await processPendingPayments({ conn, transporter, baseUrl: 'https://s', now })).toEqual({ paymentRemindersSent: 1 });
        expect(transporter.sendMail.mock.calls[0][0].subject).toMatch(/Rappel/);
        expect(await processPendingPayments({ conn, transporter, baseUrl: 'https://s', now })).toEqual({ paymentRemindersSent: 0 });

        extra = { ...extra, payment_status: 'paid' };
        const later = new Date(now.getTime() + 10 * DAY);
        expect(await processPendingPayments({ conn, transporter, baseUrl: 'https://s', now: later })).toEqual({ paymentRemindersSent: 0 });
    });
});

describe('nouveau courrier', () => {
    it('met en avant colis et recommandé dans l’objet', () => {
        expect(buildMailDigestEmail({ mails: [{ type: 'Colis' }], baseUrl: '' }).subject).toBe('📦 Un colis vous attend');
        expect(buildMailDigestEmail({ mails: [{ type: 'Lettre recommandée' }], baseUrl: '' }).subject).toMatch(/recommandé/);
        expect(buildMailDigestEmail({ mails: [{ type: 'Lettre simple' }], baseUrl: '' }).subject).toBe('Vous avez reçu un nouveau courrier');
        const colis = buildMailDigestEmail({ mails: [{ type: 'Colis', from: 'Amazon', date: '2026-10-19' }], baseUrl: 'https://s' });
        expect(colis.html).toContain('15 jours');
        expect(colis.html).toContain('Voir mon courrier');
        expect(colis.html).toContain('Amazon');
    });

    it('envoie un seul récapitulatif par client et marque les courriers', async () => {
        const transporter = { sendMail: vi.fn().mockResolvedValue({}) };
        const conn = {
            execute: vi.fn(async (sql) => {
                if (sql.includes('FROM mail m JOIN clients')) {
                    return {
                        rows: [
                            { id: 'm1', clientId: 'c1', type: 'Lettre simple', mailFrom: 'URSSAF', date: '2026-10-19', email: 'c1@test.fr', name: 'Un', plan: 'Essentiel', extra_info: '{}' },
                            { id: 'm2', clientId: 'c1', type: 'Colis', mailFrom: 'Amazon', date: '2026-10-19', email: 'c1@test.fr', name: 'Un', plan: 'Essentiel', extra_info: '{}' },
                            { id: 'm3', clientId: 'c2', type: 'Lettre simple', mailFrom: '', date: '2026-10-19', email: 'c2@test.fr', name: 'Deux', plan: 'Scan+', extra_info: JSON.stringify({ emailCourrier: 'courrier@deux.fr' }) },
                        ],
                    };
                }
                return { rows: [] };
            }),
        };
        const result = await processMailNotifications({ conn, transporter, baseUrl: 'https://s' });
        expect(result).toEqual({ mailDigestsSent: 2 });
        const recipients = transporter.sendMail.mock.calls.map(([m]) => m.to);
        expect(recipients).toEqual(['c1@test.fr', 'courrier@deux.fr']);
        expect(transporter.sendMail.mock.calls[0][0].subject).toMatch(/📦/);
        const marks = conn.execute.mock.calls.filter(([sql]) => sql.startsWith('UPDATE mail SET notified_at = ?'));
        expect(marks[0][1].slice(1)).toEqual(['m1', 'm2']);
    });
});

describe('inscription non terminée', () => {
    let conn;
    let transporter;
    const now = new Date('2026-10-19T12:00:00Z');
    const lead = (over = {}) => ({
        email: 'p@test.fr', token: 'a'.repeat(48), first_name: 'Paul', plan: 'scan-plus', step: 2,
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        reminders_sent: 0, ...over,
    });

    beforeEach(() => {
        transporter = { sendMail: vi.fn().mockResolvedValue({}) };
    });

    const makeConn = (leads, finished = false) => ({
        execute: vi.fn(async (sql) => {
            if (sql.startsWith('SELECT * FROM souscription_leads')) return { rows: leads };
            if (sql.startsWith('SELECT 1 FROM clients')) return { rows: finished ? [{ 1: 1 }] : [] };
            return { rows: [] };
        }),
    });

    it('relance après 1 h avec lien de reprise et désinscription', async () => {
        conn = makeConn([lead()]);
        expect(await processSouscriptionLeads({ conn, transporter, baseUrl: 'https://s', now })).toEqual({ leadRemindersSent: 1 });
        const mail = transporter.sendMail.mock.calls[0][0];
        expect(mail.subject).toBe('Votre domiciliation est presque prête');
        expect(mail.html).toContain(`https://s/souscription?plan=scan-plus&amp;reprise=${'a'.repeat(48)}`);
        expect(mail.html).toContain('Se désinscrire');
        expect(mail.headers['List-Unsubscribe']).toContain('/api/unsubscribe?token=');
    });

    it('ne relance pas une inscription terminée ni avant 1 h', async () => {
        conn = makeConn([lead()], true);
        expect(await processSouscriptionLeads({ conn, transporter, baseUrl: 'https://s', now })).toEqual({ leadRemindersSent: 0 });
        expect(conn.execute.mock.calls.some(([sql]) => sql.startsWith('UPDATE souscription_leads SET completed_at'))).toBe(true);

        conn = makeConn([lead({ created_at: new Date(now.getTime() - 40 * 60 * 1000).toISOString(), updated_at: null })]);
        expect(await processSouscriptionLeads({ conn, transporter, baseUrl: 'https://s', now })).toEqual({ leadRemindersSent: 0 });
        expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it('mentionne la formule, les étapes restantes et les avantages', () => {
        const { html } = buildLeadReminderEmail({ firstName: 'Paul', planId: 'essentiel', step: 6, resumeUrl: 'https://s/r', reminderIndex: 0 });
        expect(html).toContain('Essentiel');
        expect(html).toContain('Justificatifs → Paiement');
        expect(html).toContain('Sans frais d\'ouverture');
        expect(html).toContain('2 mois offerts');
        expect(html).toContain('sauvegardées');
    });
});
