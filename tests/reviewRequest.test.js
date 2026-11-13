// Email automatique « laissez-nous un avis Google », une semaine après la souscription.
import { describe, it, expect, vi } from 'vitest';
import { processReviewRequests, resolveReviewUrl, REVIEW_REQUEST_MIN_DAYS, REVIEW_REQUEST_MAX_DAYS } from '../api/_notifications.js';
import { buildReviewRequestEmail } from '../api/_email-templates.js';
import { createDataService } from '../api/_data-service.js';
import { createSqlJsConn } from './helpers/sqlJsConn.js';

const NOW = new Date('2026-11-13T08:00:00.000Z');
const URL = 'https://g.page/r/AbCdEf/review';
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString().slice(0, 10);

async function setup(rows) {
    const conn = await createSqlJsConn();
    await createDataService({ conn }).init();
    for (const [id, email, status, since, extra] of rows) {
        await conn.execute("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES (?, ?, ?, 'X', 'Toulouse', 'essentiel', ?, ?, ?, '', '', ?)",
            [id, `Client ${id}`, email, status, since, since, JSON.stringify(extra || {})]);
    }
    return conn;
}

describe('Demande d’avis Google à J+7', () => {
    it('gabarit : bouton vers le lien d’avis, invitation à répondre en cas de souci, rien de cassé', () => {
        const m = buildReviewRequestEmail({ nom: 'Jean Test - 📞 06', reviewUrl: URL, baseUrl: 'https://s' });
        expect(m.subject).toMatch(/avis/i);
        expect(m.html).toContain(`href="${URL}"`);
        expect(m.text).toContain(URL);
        expect(`${m.text}${m.html}`).not.toMatch(/undefined|NaN/);
        expect(m.text).toMatch(/Répondez simplement à cet email/);
    });

    it('envoyé une seule fois, entre J+7 et J+30, aux clients actifs dont la carte est enregistrée', async () => {
        const conn = await setup([
            ['c7', 'sept@x.fr', 'actif', daysAgo(8), { contractSigned: true }],
            ['c3', 'trois@x.fr', 'actif', daysAgo(3), {}],
            ['c45', 'ancien@x.fr', 'actif', daysAgo(45), {}],
            ['cp', 'pending@x.fr', 'actif', daysAgo(10), { payment_status: 'pending' }],
            ['cr', 'resilie@x.fr', 'résilié', daysAgo(10), {}],
            ['ci', 'impaye@x.fr', 'echec_paiement', daysAgo(10), {}],
            ['cd', 'deja@x.fr', 'actif', daysAgo(12), { review_request_sent_at: '2026-11-10T08:00:00.000Z' }],
        ]);
        const transporter = { sendMail: vi.fn(async () => ({ messageId: 'm' })) };
        const first = await processReviewRequests({ conn, transporter, from: 's@x.fr', baseUrl: 'https://s', now: NOW, reviewUrl: URL });
        expect(first.reviewRequestsSent).toBe(1);
        expect(transporter.sendMail).toHaveBeenCalledTimes(1);
        expect(transporter.sendMail.mock.calls[0][0].to).toBe('sept@x.fr');
        const extra = JSON.parse((await conn.execute("SELECT extra_info FROM clients WHERE id = 'c7'")).rows[0].extra_info);
        expect(extra.review_request_sent_at).toBe(NOW.toISOString());
        expect(extra.contractSigned).toBe(true); // rien d'écrasé
        // Journal des emails : type dédié, visible dans l'historique de la fiche.
        const logs = (await conn.execute("SELECT type FROM email_logs WHERE to_email = 'sept@x.fr'")).rows;
        expect(logs.map((l) => l.type)).toEqual(['review_request']);

        const second = await processReviewRequests({ conn, transporter, from: 's@x.fr', baseUrl: 'https://s', now: NOW, reviewUrl: URL });
        expect(second.reviewRequestsSent).toBe(0);
        expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('sans lien configuré : rien ne part, et la tâche le dit', async () => {
        const conn = await setup([['c7', 'sept@x.fr', 'actif', daysAgo(8), {}]]);
        const transporter = { sendMail: vi.fn() };
        const r = await processReviewRequests({ conn, transporter, from: 's@x.fr', baseUrl: 'https://s', now: NOW, reviewUrl: '' });
        expect(r.reviewRequestsSent).toBe(0);
        expect(r.reviewRequestsSkipped).toMatch(/non configuré/);
        expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it('resolveReviewUrl : accepte seulement une URL https propre', () => {
        vi.stubEnv('GOOGLE_REVIEW_URL', ' https://search.google.com/local/writereview?placeid=ChIJ123 ');
        expect(resolveReviewUrl()).toBe('https://search.google.com/local/writereview?placeid=ChIJ123');
        vi.stubEnv('GOOGLE_REVIEW_URL', 'javascript:alert(1)');
        expect(resolveReviewUrl()).toBe('');
        vi.unstubAllEnvs();
        expect(REVIEW_REQUEST_MIN_DAYS).toBe(7);
        expect(REVIEW_REQUEST_MAX_DAYS).toBe(30);
    });
});
