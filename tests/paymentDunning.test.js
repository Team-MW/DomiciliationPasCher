import { describe, it, expect, vi, beforeEach } from 'vitest';

// Transporteur factice pour le rappel d'échéance (cron) : aucun vrai envoi.
const { cronTransport } = vi.hoisted(() => ({ cronTransport: { sendMail: vi.fn().mockResolvedValue({}) } }));
vi.mock('../api/_smtp.js', async (importOriginal) => ({
    ...(await importOriginal()),
    getTransporter: () => cronTransport,
    getSmtpConfig: () => ({ from: 'contact@domiciliation-pas-cher.com' }),
}));

import { applyPaymentGracePolicy } from '../api/_payment-dunning.js';
import { sendRenewalReminders } from '../api/cron/reminders.js';

function failure(overrides = {}) {
    return {
        customerId: 'cus_1',
        email: 'client@test.fr',
        name: 'Jean',
        invoiceId: 'in_1',
        subscriptionId: 'sub_1',
        amountDue: 24,
        currency: 'eur',
        attemptCount: 2,
        invoiceUrl: 'https://invoice.test',
        failedAt: '2026-08-01',
        lastDunningAttempt: null,
        alreadyTerminated: false,
        ...overrides,
    };
}

describe('politique impayé 2 mois', () => {
    let stripe;
    let transporter;
    let conn;

    beforeEach(() => {
        stripe = {
            invoices: { update: vi.fn().mockResolvedValue({}) },
            subscriptions: {
                update: vi.fn().mockResolvedValue({}),
                cancel: vi.fn().mockResolvedValue({}),
            },
        };
        transporter = { sendMail: vi.fn().mockResolvedValue({}) };
        conn = {
            execute: vi.fn().mockResolvedValue({
                rows: [{ id: 'cli_1', email: 'client@test.fr', status: 'actif', extra_info: '{}' }],
            }),
        };
    });

    it('relance et bloque le client (echec_paiement) avant 2 mois', async () => {
        const result = await applyPaymentGracePolicy({
            stripe,
            failures: [failure()],
            transporter,
            conn,
            now: new Date('2026-08-20T10:00:00Z'),
        });

        expect(result).toMatchObject({ failedPayments: 1, dunningEmailsSent: 1, terminated: 0 });
        expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
        expect(conn.execute).toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE clients SET status/),
            expect.arrayContaining(['echec_paiement'])
        );
        expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'client@test.fr',
            subject: expect.stringMatching(/Action requise|régulariser votre paiement/i),
        }));
        const dunningMail = transporter.sendMail.mock.calls.find((c) => c[0].to === 'client@test.fr');
        expect(dunningMail[0].text).toMatch(/ne serez plus domicilié/);
        // Délai réellement appliqué (2 mois), montant au format français, lien Stripe, prochaine tentative.
        expect(dunningMail[0].text).toContain('avant le 1er octobre 2026 (2 mois après l\'incident)');
        expect(dunningMail[0].text).toContain('24,00 €');
        expect(dunningMail[0].html).toContain('href="https://invoice.test"');
        expect(dunningMail[0].text).toMatch(/^Bonjour Jean,/);
        expect(dunningMail[0].text).toContain("L'équipe Domiciliation Pas Cher");
    });

    it('relance : nom échappé, lien non https remplacé par l’espace client, montant inconnu non affiché', async () => {
        await applyPaymentGracePolicy({
            stripe,
            failures: [failure({ name: '<b>x</b>', invoiceUrl: 'javascript:alert(1)', amountDue: undefined })],
            transporter,
            conn,
            now: new Date('2026-08-20T10:00:00Z'),
        });
        const mail = transporter.sendMail.mock.calls.find((c) => c[0].to === 'client@test.fr')[0];
        expect(mail.html).not.toContain('<b>x</b>');
        expect(mail.html).not.toContain('javascript:');
        expect(mail.html).toContain('/app/espace-client?tab=paiement');
        expect(`${mail.text}${mail.html}`).not.toMatch(/montant inconnu|undefined/);
    });

    it('ne relance pas deux fois la même tentative', async () => {
        const result = await applyPaymentGracePolicy({
            stripe,
            failures: [failure({ lastDunningAttempt: '2', attemptCount: 2 })],
            transporter,
            conn,
            now: new Date('2026-08-20T10:00:00Z'),
        });

        expect(result.dunningEmailsSent).toBe(0);
        expect(stripe.invoices.update).not.toHaveBeenCalled();
    });

    it('résilie la domiciliation après 2 mois', async () => {
        const result = await applyPaymentGracePolicy({
            stripe,
            failures: [failure({ failedAt: '2026-06-07' })],
            transporter,
            conn,
            now: new Date('2026-09-07T10:00:00Z'),
        });

        expect(result.terminated).toBe(1);
        expect(result.dunningEmailsSent).toBe(0);
        expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_1');
        expect(conn.execute).toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE clients SET status/),
            expect.arrayContaining(['résilié'])
        );
        const clientMails = transporter.sendMail.mock.calls.filter((c) => c[0].to === 'client@test.fr');
        expect(clientMails.some((c) => /résiliée/i.test(c[0].subject))).toBe(true);
        const termination = clientMails.find((c) => /résiliée/i.test(c[0].subject))[0];
        expect(termination.text).toContain('délai de 2 mois');
        expect(termination.text).toContain('24,00 €');
    });

    it('ignore un dossier déjà résilié par le cron', async () => {
        const result = await applyPaymentGracePolicy({
            stripe,
            failures: [failure({ alreadyTerminated: true, failedAt: '2026-01-01' })],
            transporter,
            conn,
            now: new Date('2026-09-07T10:00:00Z'),
        });

        expect(result).toEqual({ failedPayments: 0, dunningEmailsSent: 0, terminated: 0 });
        expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
        expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it('ne résilie pas un client qui paie, à cause d’une vieille facture sans abonnement en échec', async () => {
        const result = await applyPaymentGracePolicy({
            stripe,
            failures: [failure({ subscriptionId: undefined, hasHealthySubscription: true, failedAt: '2024-01-10' })],
            transporter,
            conn,
            now: new Date('2026-11-05T10:00:00Z'),
        });
        expect(result.terminated).toBe(0);
        expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
        expect(conn.execute).not.toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE clients SET status/),
            expect.arrayContaining(['résilié'])
        );
        expect(conn.execute).not.toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE clients SET status/),
            expect.arrayContaining(['echec_paiement'])
        );
    });

    it('si l’annulation Stripe échoue, le dossier n’est pas marqué « résilié » (réessai au prochain passage)', async () => {
        stripe.subscriptions.cancel.mockRejectedValue(new Error('network down'));
        await applyPaymentGracePolicy({
            stripe,
            failures: [failure({ failedAt: '2026-01-01' })],
            transporter,
            conn,
            now: new Date('2026-11-05T10:00:00Z'),
        });
        const markedTerminated = [...stripe.invoices.update.mock.calls, ...stripe.subscriptions.update.mock.calls]
            .some(([, params]) => params?.metadata?.dpc_domicile_terminated === '1');
        expect(markedTerminated).toBe(false);
    });

    it('résilie aussi quand Stripe a déjà annulé l’abonnement (facture impayée seule, aucun abonnement sain)', async () => {
        const result = await applyPaymentGracePolicy({
            stripe,
            failures: [failure({ subscriptionId: undefined, hasHealthySubscription: false, failedAt: '2026-01-01' })],
            transporter,
            conn,
            now: new Date('2026-11-05T10:00:00Z'),
        });
        expect(result.terminated).toBe(1);
        expect(conn.execute).toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE clients SET status/),
            expect.arrayContaining(['résilié'])
        );
    });
});


describe('rappel d’échéance des abonnements annuels', () => {
    it('envoie la date d’échéance et la date limite de préavis, avec la signature commune', async () => {
        cronTransport.sendMail.mockClear();
        const periodEnd = Math.floor(Date.parse('2027-01-06T00:00:00Z') / 1000);
        const stripe = {
            subscriptions: {
                list: vi.fn().mockResolvedValue({ data: [{ id: 'sub_y', customer: 'cus_y', metadata: {}, items: { data: [{ plan: { interval: 'year' }, current_period_end: periodEnd }] } }], has_more: false }),
                update: vi.fn().mockResolvedValue({}),
            },
            customers: { retrieve: vi.fn().mockResolvedValue({ email: 'annuel@test.fr', name: null }) },
        };
        const sent = await sendRenewalReminders(stripe, null, new Date('2026-11-06T09:00:00Z'));
        expect(sent).toBe(1);
        const mail = cronTransport.sendMail.mock.calls[0][0];
        expect(mail.to).toBe('annuel@test.fr');
        expect(mail.text).toMatch(/^Bonjour,/);
        expect(mail.text).toContain('le 6 janvier 2027');
        expect(mail.text).toContain('au plus tard le 6 décembre 2026');
        expect(mail.text).toContain("L'équipe Domiciliation Pas Cher");
        expect(mail.html).toContain('https://www.domiciliation-pas-cher.com/app/espace-client?tab=messages');
        expect(`${mail.text}${mail.html}`).not.toMatch(/Bonjour Client|Domiciliation-Pas-Cher\.com/);
    });
});
