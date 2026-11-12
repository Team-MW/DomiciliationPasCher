// Non-régression des correctifs de l'audit « zéro bug » du 12/11/2026 (paiement, connexion, admin).
import { describe, it, expect, vi } from 'vitest';
import { fetchStripeBilling } from '../api/_stripe-billing.js';
import { resolveClientStatusFromStripe } from '../src/utils/stripeClientStatus.js';
import { createDataService } from '../api/_data-service.js';
import { createSqlJsConn } from './helpers/sqlJsConn.js';
import { computeMissingDocuments, clientUploadsSince } from '../shared/documentRequest.js';

const stripeWith = (subs) => ({
    customers: { list: vi.fn(async () => ({ data: [{ id: 'cus_1' }] })) },
    subscriptions: { list: vi.fn(async () => ({ data: subs })) },
    paymentIntents: { list: vi.fn(async () => ({ data: [] })), search: vi.fn(async () => ({ data: [] })) },
    invoices: { list: vi.fn(async () => ({ data: [] })) },
});

describe('Statut client déduit de Stripe', () => {
    it('un abonnement sain l’emporte sur un vieil impayé ou un ancien abonnement annulé', async () => {
        const b = await fetchStripeBilling(stripeWith([{ status: 'past_due' }, { status: 'canceled' }, { status: 'active' }]), { email: 'a@x.fr' });
        expect(b.subscriptionStatus).toBe('active');
        expect(b.hasHealthySubscription).toBe(true);
        expect(resolveClientStatusFromStripe('echec_paiement', b.subscriptionStatus)).toBe('actif');
    });
    it('sans abonnement sain : l’impayé en cours reste visible, « canceled » ne résilie pas', async () => {
        const b = await fetchStripeBilling(stripeWith([{ status: 'canceled' }, { status: 'past_due' }]), { email: 'a@x.fr' });
        expect(b.subscriptionStatus).toBe('past_due');
        expect(resolveClientStatusFromStripe('actif', 'past_due')).toBe('echec_paiement');
        expect(resolveClientStatusFromStripe('actif', 'canceled')).toBe('actif');
    });
});

describe('Double paiement et validation du dossier', () => {
    it('hasPaidDossier : demande payée ou client non résilié → vrai ; résilié ou inconnu → faux', async () => {
        const conn = await createSqlJsConn();
        const service = createDataService({ conn });
        await service.init();
        await conn.execute("INSERT INTO demandes (id, clientName, email, company, city, plan, amount, date, status, extra_info) VALUES ('req_a', 'A', 'paid@x.fr', 'X', 'T', 'Essentiel', '19.20', '2026-11-01', 'en_attente', '{}')");
        await conn.execute("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES ('c1', 'B', 'client@x.fr', 'X', 'T', 'essentiel', 'actif', '2026-01-01', '2026-01-01', '', '', '{}')");
        await conn.execute("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES ('c2', 'C', 'old@x.fr', 'X', 'T', 'essentiel', 'résilié', '2025-01-01', '2025-01-01', '', '', '{}')");
        expect(await service.hasPaidDossier('PAID@x.fr ')).toBe(true);
        expect(await service.hasPaidDossier('client@x.fr')).toBe(true);
        expect(await service.hasPaidDossier('old@x.fr')).toBe(false);
        expect(await service.hasPaidDossier('nobody@x.fr')).toBe(false);
    });

    it('traiterDemande : since = date du paiement, email « dossier validé » sans « - 📞 », champs « lien de paiement » purgés', async () => {
        const conn = await createSqlJsConn();
        const sent = [];
        const service = createDataService({ conn, sendEmail: async (m) => { sent.push(m); } });
        await service.init();
        const extra = JSON.stringify({ prenom: 'Jean', nom: 'Test', frequence: 'mensuel', paid_at: '2026-11-03T10:00:00.000Z', stripe_session_id: 'cs_1', stripe_customer_id: 'cus_1', grille_tarifaire: '2026-11' });
        await conn.execute("INSERT INTO demandes (id, clientName, email, company, city, plan, amount, date, status, extra_info) VALUES ('req_b', 'Jean Test - 📞 0612345678', 'jean@x.fr', 'JT', 'Toulouse', 'Essentiel', '19.20', '2026-11-03', 'en_attente', ?)", [extra]);
        // Dossier créé par l'admin avant (lien de paiement en attente), jamais payé par ce lien : il a payé sur le site.
        await conn.execute("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES ('c9', 'Jean', 'jean@x.fr', 'JT', 'Toulouse', 'essentiel', 'en_attente_validation', '2026-10-01', '2026-10-01', '', '', ?)",
            [JSON.stringify({ payment_status: 'pending', payment_token: 'tok', payment_requested_at: '2026-10-01', payment_reminders_sent: [2] })]);
        await service.traiterDemande('req_b');
        const row = (await conn.execute("SELECT since, extra_info FROM clients WHERE id = 'c9'")).rows[0];
        const merged = JSON.parse(row.extra_info);
        expect(merged.payment_status).toBe('paid');
        expect(merged.payment_token).toBeUndefined();
        expect(merged.payment_reminders_sent).toBeUndefined();
        expect(sent.find((m) => m.type === 'approval')?.nom).toBe('Jean Test');

        // Nouveau client (pas de fiche existante) : since = jour du paiement, pas du clic admin.
        await conn.execute("INSERT INTO demandes (id, clientName, email, company, city, plan, amount, date, status, extra_info) VALUES ('req_c', 'Ada L', 'ada@x.fr', 'AL', 'Toulouse', 'Confort', '28.80', '2026-11-03', 'en_attente', ?)", [extra]);
        await service.traiterDemande('req_c');
        expect((await conn.execute("SELECT since FROM clients WHERE email = 'ada@x.fr'")).rows[0].since).toBe('2026-11-03');
    });
});

describe('Documents : règle « Statuts ou Kbis » et dépôts libres', () => {
    it('un Kbis déposé vaut aussi pour les statuts ; un dépôt libre après la demande est détecté', () => {
        expect(computeMissingDocuments(['statuts', 'kbis'], { extra: { kbisUrl: 'https://x/k.pdf' }, documents: [] })).toEqual([]);
        expect(computeMissingDocuments(['statuts', 'kbis'], { extra: {}, documents: [{ name: 'Statuts SAS.pdf' }] })).toEqual(['kbis']);
        const docs = [{ name: 'scan001.pdf', owner: 'client', uploadedAt: '2026-11-10' }, { name: 'ancien.pdf', owner: 'client', uploadedAt: '2026-10-01' }, { name: 'admin.pdf', owner: 'admin', uploadedAt: '2026-11-11' }];
        expect(clientUploadsSince(docs, '2026-11-05T08:00:00.000Z').map((d) => d.name)).toEqual(['scan001.pdf']);
    });
});
