import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeMissingDocuments, dueDocumentReminder, kbisDeadline } from '../shared/documentRequest.js';
import { brandedFrom, wrapEmail, sendBrandedMail } from '../api/_email-kit.js';
import { buildMailDigestEmail, buildDocumentRequestEmail, buildLeadReminderEmail } from '../api/_email-templates.js';
import { processMailNotifications, processSouscriptionLeads, processDocumentRequests, processPendingPayments } from '../api/_notifications.js';

const DAY = 24 * 60 * 60 * 1000;

describe('kit email commun', () => {
    it('impose le nom d’expéditeur et le pied de page légal', () => {
        expect(brandedFrom('contact@domiciliation-pas-cher.com')).toBe('"domiciliation-pas-cher.com" <contact@domiciliation-pas-cher.com>');
        expect(brandedFrom('Autre <x@y.fr>')).toBe('"domiciliation-pas-cher.com" <x@y.fr>');
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
                if (sql.startsWith('SELECT name')) return { rows: docs };
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
        expect(buildMailDigestEmail({ mails: [{ type: 'Colis' }], baseUrl: '' }).subject).toBe('Un colis vous attend');
        expect(buildMailDigestEmail({ mails: [{ type: 'Lettre recommandée' }], baseUrl: '' }).subject).toMatch(/recommandé/);
        expect(buildMailDigestEmail({ mails: [{ type: 'Lettre simple' }], baseUrl: '' }).subject).toBe('Vous avez reçu un nouveau courrier');
        const colis = buildMailDigestEmail({ mails: [{ type: 'Colis', from: 'Amazon', date: '2026-10-19' }], baseUrl: 'https://s' });
        expect(colis.html).toContain('15 jours');
        expect(colis.html).toContain('Voir mon courrier');
        expect(colis.html).toContain('Amazon');
    });

    it('envoie un seul récapitulatif par client et marque les courriers', async () => {
        const transporter = { sendMail: vi.fn().mockResolvedValue({}) };
        const claims = {};
        const conn = {
            execute: vi.fn(async (sql, params = []) => {
                // Réservation avant envoi : chaque client récupère ses propres courriers.
                if (sql.startsWith('UPDATE mail SET notified_at = ? WHERE notified_at IS NULL')) { claims[params[0]] = params.slice(1); return {}; }
                if (sql.startsWith('SELECT id FROM mail WHERE notified_at = ?')) return { rows: (claims[params[0]] || []).map((id) => ({ id })) };
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
        expect(transporter.sendMail.mock.calls[0][0].subject).toBe('Un colis et 1 autre courrier vous attendent');
        const claimsSql = conn.execute.mock.calls.filter(([sql]) => sql.startsWith('UPDATE mail SET notified_at = ? WHERE notified_at IS NULL'));
        expect(claimsSql[0][1].slice(1)).toEqual(['m1', 'm2']);
        const marks = conn.execute.mock.calls.filter(([sql]) => sql === 'UPDATE mail SET notified_at = ? WHERE notified_at = ?');
        expect(marks[0][1][0]).toMatch(/^20\d\d-/);
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
        const { html, text } = buildLeadReminderEmail({ firstName: 'Paul', planId: 'essentiel', step: 6, resumeUrl: 'https://s/r', reminderIndex: 0 });
        expect(html).toContain('Essentiel — 16,00 € HT/mois (19,20 € TTC)');
        expect(html).toContain('Justificatifs → Paiement');
        expect(html).toContain('Sans frais d&#39;ouverture');
        expect(text).toContain('Sans frais d\'ouverture');
        expect(text).toContain('Attestation de domiciliation sous 24 h');
        expect(html).toContain('20 % de remise en paiement annuel');
        expect(html).toContain('sauvegardées');
    });
});

/* ------------------------------------------------------------------------------------------
 * Qualité de tous les emails automatiques : faits, liens, données manquantes, échappement.
 * ---------------------------------------------------------------------------------------- */
import { buildTransactionalEmail } from '../api/_email-core.js';
import {
    buildAccountCreatedEmail, buildPaymentFailedEmail, buildTerminationEmail, buildRenewalReminderEmail, mailStatusLabel,
} from '../api/_email-templates.js';
import { displayName, greetingText, formatEuro, textFooter, SIGNATURE } from '../api/_email-kit.js';

const BASE = 'https://www.domiciliation-pas-cher.com';
const ALL_TYPES = [
    'payment_failed', 'payment_reminder', 'post_signature', 'new_message', 'admin_new_message', 'new_mail',
    'consultation_creation', 'procuration_postale', 'admin_reexpedition', 'reexpedition_sent', 'reexpedition_refused',
    'souscription_lead', 'contact_advisor', 'request_documents', 'account_created', 'admin_document_uploaded',
    'approval', undefined,
];
const CLIENT_TYPES = ALL_TYPES.filter((t) => !['admin_new_message', 'admin_reexpedition', 'admin_document_uploaded', 'souscription_lead', 'contact_advisor'].includes(t));

describe('tous les emails transactionnels', () => {
    it.each(ALL_TYPES.map((t) => [t || 'welcome', t]))('%s : aucun trou si les données optionnelles manquent', (_label, type) => {
        const mail = buildTransactionalEmail({ type, email: 'jean@test.fr', nom: 'Client' }, { baseUrl: BASE });
        const all = [mail.subject, mail.text, mail.html, mail.adminCopy?.subject, mail.adminCopy?.html].join('\n');
        expect(all).not.toMatch(/undefined|null|NaN|\[object/);
        expect(all).not.toMatch(/Bonjour Client|Bonjour ,/);
        expect(all).not.toContain('domiciliation-pas-cher.fr');
        expect(all).not.toMatch(/Scan\+|Physique\+|BIENVENUE|immédiat/);
        expect(mail.subject).not.toMatch(/[!\u{1F300}-\u{1FAFF}☀-➿]/u);
        expect(mail.subject).not.toMatch(/^[^a-z]*$/); // pas tout en majuscules
        expect(mail.html).not.toMatch(/href="(?!https:|mailto:|tel:)/); // liens absolus uniquement
        expect(mail.text).toBeTruthy();
    });

    it.each(CLIENT_TYPES.map((t) => [t || 'welcome', t]))('%s : vouvoiement, signature commune, « Bonjour, » sans nom', (_label, type) => {
        const mail = buildTransactionalEmail({ type, email: 'jean@test.fr' }, { baseUrl: BASE });
        expect(mail.text).toMatch(/^Bonjour,/);
        expect(mail.html).toContain('Bonjour,');
        expect(mail.text).toContain(SIGNATURE);
        expect(mail.html).toContain(SIGNATURE);
        expect(`${mail.text}${mail.html}`).not.toMatch(/\b(tu|ton|ta|tes)\b /);
    });

    it.each(ALL_TYPES.map((t) => [t || 'welcome', t]))('%s : toute donnée saisie est échappée', (_label, type) => {
        const evil = '<img src=x onerror=alert(1)>';
        const body = { type, email: 'jean@test.fr' };
        for (const k of ['nom', 'content', 'address', 'notes', 'company', 'telephone', 'projetType', 'dateDispo', 'message', 'documentName', 'mailFrom', 'mailType', 'amount']) body[k] = evil;
        const mail = buildTransactionalEmail(body, { baseUrl: BASE });
        expect(mail.html).not.toContain('<img src=x');
        expect(mail.adminCopy?.html || '').not.toContain('<img src=x');
    });

    it('routage inchangé : interne vers la boîte admin, prospect en reply-to', () => {
        expect(buildTransactionalEmail({ type: 'contact_advisor', email: 'p@test.fr' }).to).toBe('contact@domiciliation-pas-cher.com');
        expect(buildTransactionalEmail({ type: 'contact_advisor', email: 'p@test.fr' }).replyTo).toBe('p@test.fr');
        expect(buildTransactionalEmail({ type: 'approval', email: 'c@test.fr' }).to).toBe('c@test.fr');
        expect(buildTransactionalEmail({ type: 'approval', email: 'c@test.fr' }).replyTo).toBe('contact@domiciliation-pas-cher.com');
        expect(buildTransactionalEmail({ email: 'c@test.fr' }).adminCopy.type).toBe('admin_new_client');
    });

    it('validation : adresse de domiciliation complète (bâtiment et lot)', () => {
        const { text, html } = buildTransactionalEmail({ type: 'approval', email: 'c@test.fr', nom: 'Ada' }, { baseUrl: BASE });
        expect(text).toContain('Bâtiment B, Lot 308');
        expect(html).toContain('Bâtiment B, Lot 308');
        expect(html).toContain(`${BASE}/app/espace-client`);
    });

    it('message de l’équipe : retours à la ligne conservés, lien vers la messagerie', () => {
        const { html } = buildTransactionalEmail({ type: 'new_message', email: 'c@test.fr', content: 'Ligne 1\nLigne 2' }, { baseUrl: BASE });
        expect(html).toContain('Ligne 1<br>Ligne 2');
        expect(html).toContain(`${BASE}/app/espace-client?tab=messages`);
    });

    it('lien de paiement manuel non http(s) : repli sur l’espace client', () => {
        const { html } = buildTransactionalEmail({ type: 'payment_reminder', email: 'c@test.fr', paymentLink: 'javascript:alert(1)' }, { baseUrl: BASE });
        expect(html).not.toContain('javascript:');
        expect(html).toContain(`${BASE}/app/espace-client?tab=factures`);
    });
});

describe('faits affichés dans les emails', () => {
    it('pied de page : adresse complète, agrément, téléphone, contact et site .com', () => {
        const html = wrapEmail('<p>x</p>');
        const text = textFooter();
        for (const out of [html, text]) {
            expect(out).toContain('150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse');
            expect(out).toContain('AG/DOM/2026/06');
            expect(out).toContain('09 60 39 69 07');
            expect(out).toContain('contact@domiciliation-pas-cher.com');
            expect(out).toContain('https://www.domiciliation-pas-cher.com');
        }
    });

    it('formule d’appel et montants au format français', () => {
        expect(greetingText(undefined)).toBe('Bonjour,');
        expect(greetingText('  Client ')).toBe('Bonjour,');
        expect(greetingText('Ada')).toBe('Bonjour Ada,');
        expect(displayName('null')).toBe('');
        expect(formatEuro(28.8)).toBe('28,80 €');
        expect(formatEuro(1234.5)).toBe('1 234,50 €');
        expect(formatEuro(undefined)).toBe('');
    });

    it('dossier créé par l’admin : prix réel du client (clientPlanPricing) et noms actuels', () => {
        const current = buildAccountCreatedEmail({ nom: 'A', email: 'a@t.fr', planName: 'scan-plus', frequence: 'mensuel', payUrl: 'https://s/p', baseUrl: 'https://s' });
        expect(current.text).toContain('Confort — 24,00 € HT par mois (28,80 € TTC)');
        expect(current.text).toContain('Engagement minimum de 3 mois');
        // Ancien client (sans marqueur de grille) : il garde son prix (Essentiel 20 €, annuel = 10 mois).
        const legacy = buildAccountCreatedEmail({ nom: 'A', email: 'a@t.fr', planName: 'Essentiel', frequence: 'annuel', payUrl: 'https://s/p', baseUrl: 'https://s', extra: {}, isReminder: true });
        expect(legacy.text).toContain('Essentiel — 200,00 € HT par an (240,00 € TTC)');
        const legacyScan = buildAccountCreatedEmail({ nom: 'A', email: 'a@t.fr', planName: 'Scan+', frequence: 'mensuel', payUrl: 'https://s/p', baseUrl: 'https://s', extra: {} });
        expect(legacyScan.text).toContain('Confort — 24,00 € HT par mois');
        expect(legacyScan.text).not.toContain('Scan+');
    });

    it('relance de paiement en attente : prix de l’ancienne grille pour un ancien client', async () => {
        const now = new Date('2026-10-20T08:00:00Z');
        const extra = { payment_status: 'pending', payment_token: 'c'.repeat(48), frequence: 'mensuel', payment_requested_at: new Date(now.getTime() - 2 * DAY).toISOString() };
        const transporter = { sendMail: vi.fn().mockResolvedValue({}) };
        const conn = { execute: vi.fn(async (sql) => (sql.startsWith('SELECT id, email, name, plan') ? { rows: [{ id: 'c1', email: 'c@test.fr', name: 'C', plan: 'Essentiel', status: 'actif', extra_info: JSON.stringify(extra) }] } : { rows: [] })) };
        await processPendingPayments({ conn, transporter, baseUrl: 'https://s', now });
        expect(transporter.sendMail.mock.calls[0][0].text).toContain('Essentiel — 20,00 € HT par mois (24,00 € TTC)');
    });

    it('impayé : annonce le délai de grâce réel (2 mois), jamais 15 ou 30 jours', () => {
        const auto = buildPaymentFailedEmail({ nom: 'Jean', amount: '24,00 €', payUrl: 'https://pay', deadlineIso: '2026-10-01', nextAttemptIso: '2026-08-05' });
        expect(auto.text).toContain('avant le 1er octobre 2026 (2 mois après l\'incident)');
        expect(auto.text).toContain('5 août 2026');
        const manual = buildTransactionalEmail({ type: 'payment_failed', email: 'c@test.fr' }, { baseUrl: BASE });
        expect(manual.text).toContain('délai de 2 mois');
        expect(manual.html).toContain(`${BASE}/app/espace-client?tab=paiement`);
        for (const m of [auto, manual, buildTerminationEmail({ nom: 'J', amount: null })]) {
            expect(`${m.text}${m.html}`).not.toMatch(/15 jours|30 jours|montant inconnu/);
        }
    });

    it('échéance annuelle : date d’échéance et date limite de préavis', () => {
        const { text, html } = buildRenewalReminderEmail({ nom: 'Jean', periodEndIso: '2027-01-31', baseUrl: BASE });
        expect(text).toContain('le 31 janvier 2027');
        expect(text).toContain('au plus tard le 31 décembre 2026');
        expect(html).toContain(`${BASE}/app/espace-client?tab=messages`);
    });

    it('échéance annuelle : le montant du renouvellement est indiqué (obligatoire)', () => {
        const { text, html } = buildRenewalReminderEmail({ nom: 'Jean', periodEndIso: '2027-01-31', amountCents: 18432, baseUrl: BASE });
        expect(text).toContain('pour un montant de 184,32 € TTC');
        expect(html).toContain('184,32 € TTC');
        expect(buildRenewalReminderEmail({ nom: 'J', periodEndIso: '2027-01-31', baseUrl: BASE }).text).not.toMatch(/montant de|NaN|null/);
    });

    it('courrier : ne prétend jamais qu’un pli est numérisé sans aperçu, Essentiel = retrait/réexpédition', () => {
        const current = { grille_tarifaire: '2026-11' };
        expect(mailStatusLabel('Lettre simple', 'essentiel', 'non lu', current)).toBe('Original à retirer sur rendez-vous ou à faire réexpédier');
        expect(mailStatusLabel('Lettre simple', 'scan-plus', 'non lu', current)).toMatch(/sous 24 h ouvrées/);
        expect(mailStatusLabel('Lettre simple', 'scan-plus', 'non lu', current, { preview: 'https://x' })).toMatch(/^Numérisé/);
        // Ancien Essentiel : pas de numérisation ni de réexpédition dans son contrat.
        expect(mailStatusLabel('Lettre simple', 'Essentiel', 'non lu', {})).toBe('Original à retirer sur rendez-vous');
        const digest = buildMailDigestEmail({ plan: 'essentiel', extra: current, baseUrl: BASE, mails: [{ type: '', from: '', date: '' }, { type: 'Colis', from: 'Amazon', date: '2026-11-01' }] });
        expect(digest.text).toMatch(/^Bonjour,/);
        expect(digest.text).toContain('Non précisé');
        expect(digest.text).toContain('2,00 € HT par jour');
        expect(digest.text).toContain('sur rendez-vous');
        expect(`${digest.text}${digest.html}`).not.toMatch(/undefined|Numérisé/);
        expect(digest.subject).toBe('Un colis et 1 autre courrier vous attendent');
    });

    it('demande de plusieurs documents : accords au pluriel', () => {
        const { subject, text } = buildDocumentRequestEmail({ missing: ['statuts', 'kbis'], baseUrl: BASE });
        expect(subject).toBe('Des documents manquent pour finaliser votre domiciliation');
        expect(text).toContain('il nous manque : statuts et extrait Kbis.');
        expect(text).toContain('Déposez-les');
    });
});
