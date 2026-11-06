import { describe, it, expect, vi } from 'vitest';

vi.mock('@clerk/backend', () => ({ createClerkClient: () => ({}) }));
vi.mock('../api/_stripe-client.js', () => ({ getStripe: () => ({}) }));
vi.mock('../api/_email-core.js', () => ({ deliverEmail: vi.fn() }));

import { createHandler } from '../api/data.js';

/** Champs réellement envoyés par le formulaire de souscription (Souscription.jsx : données + liens des pièces). */
const FUNNEL_EXTRA = {
    typeProjet: 'domiciliation', formeJuridique: 'SCI', nom: 'Rouzee', prenom: 'William', email: 'William.Rouzee@icloud.com', telephone: '0762378524',
    dateNaissance: '2002-12-06', lieuNaissance: 'TOULOUSE, France', nomSociete: 'RW PATRIMOINE', siren: '', activite: "l'acquisition, par voie d'achat…",
    nationalite: 'Française', qualite: 'Gérant', ville: 'Toulouse (31)', offre: 'scan', frequence: 'annuel',
    justificatifDomicile: 'edf.pdf', pieceIdentiteRecto: 'cni.pdf', pieceIdentiteVerso: 'cni.pdf', cgv: true,
    adresse: '109 Avenue de Lespinet', complement: 'ASSOCIATION ESPOIR - ETS', codePostal: '31400', villePerso: 'Toulouse', pays: 'France',
    pieceIdentiteUrl: 'https://res.cloudinary.com/demo/image/upload/recto.png',
    pieceIdentiteVersoUrl: 'https://res.cloudinary.com/demo/image/upload/verso.png',
    justificatifDomicileUrl: 'https://res.cloudinary.com/demo/image/upload/domicile.png',
    adressePerso: '109 Avenue de Lespinet, ASSOCIATION ESPOIR - ETS, 31400 Toulouse - France', adresseComplete: '109 Avenue de Lespinet, ASSOCIATION ESPOIR - ETS, 31400 Toulouse - France',
    date: '06/11/2026',
};

describe('Souscription : l’API conserve TOUTES les données légitimes du formulaire (le filtre de sécurité ne perd rien)', () => {
    it('toutes les clés du formulaire sont enregistrées, sauf celles que le serveur recalcule (offre, grille)', async () => {
        let stored = null;
        const conn = { execute: vi.fn(async (sql, params = []) => {
            if (/^INSERT INTO demandes/i.test(sql)) stored = { clientName: params[1], email: params[2], plan: params[5], amount: params[6], extra: JSON.parse(params[9]) };
            return { rows: [] };
        }) };
        const handler = createHandler({ getConn: () => conn, getAuth: async () => null });
        const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
        await handler({ method: 'POST', headers: { host: 'site.test' }, body: { method: 'addDemande', args: [{
            clientName: 'William Rouzee - 📞 0762378524', email: 'William.Rouzee@icloud.com', company: 'RW PATRIMOINE', city: 'Toulouse (31)', plan: 'Confort', amount: '1.00', extra_info: FUNNEL_EXTRA,
        }] } }, res);

        expect(res.code).toBe(200);
        expect(stored).not.toBeNull();
        const lost = Object.keys(FUNNEL_EXTRA).filter((key) => !(key in stored.extra) && !['offre', 'email'].includes(key));
        expect(lost).toEqual([]);
        expect(stored.extra.pieceIdentiteUrl).toBe(FUNNEL_EXTRA.pieceIdentiteUrl);
        expect(stored.extra.email).toBe('william.rouzee@icloud.com');
        expect(stored.extra.offre).toBe('scan');           // recalculé par le serveur d'après le forfait
        expect(stored.extra.grille_tarifaire).toBe('2026-11');
        expect(stored.email).toBe('william.rouzee@icloud.com');
        expect(stored.amount).toBe('276.48');              // Confort annuel : 24 € HT × 12 mois, remise de 20 %, TVA 20 % (calculé par le serveur)
    });
});
