import { describe, it, expect, vi } from 'vitest';
import { getOwnership, stripeCustomerIdOf } from '../api/_auth.js';
import { sanitizeClientExtra } from '../api/_client-extra.js';
import { tooManyRecentEmails, PUBLIC_DAILY_LIMIT } from '../api/email.js';
import { createDataService } from '../api/_data-service.js';

describe('Sécurité : un client ne peut pas s’attribuer le client Stripe d’un autre', () => {
    it('seule la clé stripe_customer_id compte, pas un « cus_… » écrit dans un champ libre', async () => {
        const rows = [{ id: 'c1', email: 'alice@x.fr', extra_info: JSON.stringify({ note: 'cus_VICTIME123', stripe_customer_id: 'cus_ALICE1' }) }];
        const conn = { execute: vi.fn(async () => ({ rows })) };
        const owned = await getOwnership(conn, { email: 'alice@x.fr', userId: 'user_a' });
        expect([...owned.stripeCustomerIds]).toEqual(['cus_ALICE1']);
    });

    it('valeur invalide ou JSON illisible : aucun identifiant', () => {
        expect(stripeCustomerIdOf('pas du json')).toBeNull();
        expect(stripeCustomerIdOf(JSON.stringify({ stripe_customer_id: 'cus_a; DROP' }))).toBeNull();
        expect(stripeCustomerIdOf(JSON.stringify(JSON.stringify({ stripe_customer_id: 'cus_ok1' })))).toBe('cus_ok1'); // double encodage
    });
});

describe('Sécurité : demande publique (visiteur anonyme)', () => {
    it('ne peut pas fabriquer un contrat signé, une version de contrat, un tarif ou un compte lié', () => {
        const clean = sanitizeClientExtra({
            contractSignatureUrl: 'data:image/png;base64,AAAA', contract_version: '2026-11', tarif_special: 1,
            clerkId: 'user_admin', since: '2000-01-01', nom: 'Dupont', siren: '123',
        });
        expect(clean).toEqual({ nom: 'Dupont', siren: '123' });
    });
});

describe('Anti-abus : formulaires publics', () => {
    it(`au plus ${PUBLIC_DAILY_LIMIT} emails par adresse et par type en 24 h`, async () => {
        const conn = { execute: vi.fn(async () => ({ rows: [{ n: PUBLIC_DAILY_LIMIT }] })) };
        expect(await tooManyRecentEmails(conn, 'Victime@X.fr', 'consultation_creation')).toBe(true);
        expect(conn.execute.mock.calls[0][1][0]).toBe('victime@x.fr');
        const ok = { execute: vi.fn(async () => ({ rows: [{ n: PUBLIC_DAILY_LIMIT - 1 }] })) };
        expect(await tooManyRecentEmails(ok, 'a@b.fr', 'contact_advisor')).toBe(false);
    });

    it('base indisponible ou table absente : l’envoi n’est pas bloqué', async () => {
        expect(await tooManyRecentEmails({ execute: async () => { throw new Error('no table'); } }, 'a@b.fr', 'x')).toBe(false);
        expect(await tooManyRecentEmails(null, 'a@b.fr', 'x')).toBe(false);
    });
});

describe('Réactivation d’un client existant (traiterDemande)', () => {
    it('fusionne la fiche existante (Stripe, signature) et garde son compte de connexion lié', async () => {
        const updates = [];
        const demande = { id: 'd1', email: 'a@b.fr', clientName: 'Ada', company: 'ACME', plan: 'Essentiel', amount: '19.20', extra_info: JSON.stringify({ prenom: 'Ada', nom: 'L', frequence: 'mensuel' }) };
        const existing = { id: 'c1', extra_info: JSON.stringify({ stripe_customer_id: 'cus_KEEP1', contractSignedAt: '2026-10-01' }), clerkId: 'user_keep', clerkStatus: 'linked' };
        const conn = { execute: vi.fn(async (sql, params) => {
            if (/^SELECT \* FROM demandes WHERE id/i.test(sql)) return { rows: [demande] };
            if (/^SELECT id, extra_info, clerkId, clerkStatus FROM clients/i.test(sql)) return { rows: [existing] };
            if (/^UPDATE clients SET name/i.test(sql)) updates.push(params);
            return { rows: [] };
        }) };
        await createDataService({ conn, sendEmail: async () => {} }).traiterDemande('d1');
        const params = updates[0];
        const merged = JSON.parse(params[6]);
        expect(merged.stripe_customer_id).toBe('cus_KEEP1');
        expect(merged.contractSignedAt).toBe('2026-10-01');
        expect(params[7]).toBe('user_keep');
        expect(params[8]).toBe('linked');
    });
});

describe('Liste admin : légère (les Kbis en base64 ne sont plus renvoyés à chaque affichage)', () => {
    it('remplace un fichier de plus de 20 Ko par un marqueur, garde signatures et petits champs', async () => {
        const { lightenExtraInfo, HEAVY_PLACEHOLDER } = await import('../api/_client-extra.js');
        const kbis = `data:application/pdf;base64,${'A'.repeat(700_000)}`;
        const signature = `data:image/png;base64,${'B'.repeat(12_000)}`;
        const raw = JSON.stringify({ nom: 'Dupont', kbisUrl: kbis, contractSignatureUrl: signature });
        const light = JSON.parse(lightenExtraInfo(raw));
        expect(light.kbisUrl).toBe(HEAVY_PLACEHOLDER);
        expect(light.contractSignatureUrl).toBe(signature);
        expect(light.nom).toBe('Dupont');
        expect(lightenExtraInfo(raw).length).toBeLessThan(40_000);
    });

    it('JSON illisible, vide ou déjà léger : renvoyé tel quel (aucune perte)', async () => {
        const { lightenExtraInfo } = await import('../api/_client-extra.js');
        expect(lightenExtraInfo('pas du json'.repeat(5000))).toBe('pas du json'.repeat(5000));
        expect(lightenExtraInfo(null)).toBeNull();
        expect(lightenExtraInfo('{"a":1}')).toBe('{"a":1}');
    });

    it('getClients renvoie la version légère ; la fiche complète reste lisible via getClientById', async () => {
        const kbis = `data:application/pdf;base64,${'A'.repeat(300_000)}`;
        const row = { id: 'c1', email: 'a@b.fr', extra_info: JSON.stringify({ kbisUrl: kbis }) };
        const conn = { execute: vi.fn(async (sql) => ({ rows: /FROM clients c/.test(sql) ? [row] : [row] })) };
        const service = createDataService({ conn });
        const list = await service.getClients();
        expect(JSON.parse(list[0].extra_info).kbisUrl).toBe('#stored-in-dossier');
        const full = await service.getClientById('c1');
        expect(JSON.parse(full.extra_info).kbisUrl).toBe(kbis);
    });
});
