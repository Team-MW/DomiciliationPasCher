import { describe, it, expect, vi } from 'vitest';
import { createDataService } from '../api/_data-service.js';

const URLS = {
    pieceIdentiteUrl: 'https://res.cloudinary.com/demo/image/upload/recto.png',
    pieceIdentiteVersoUrl: 'https://res.cloudinary.com/demo/image/upload/verso.png',
    justificatifDomicileUrl: 'https://res.cloudinary.com/demo/image/upload/domicile.png',
};

function makeConn({ extra, existingDocUrls = [], clientExists = false }) {
    const inserted = [];
    const execute = vi.fn(async (sql, params = []) => {
        if (/^SELECT \* FROM demandes WHERE id/i.test(sql)) return { rows: [{ id: 'd1', email: 'a@b.fr', clientName: 'Ada L', company: 'ACME', plan: 'Essentiel', amount: '19.20', city: 'Toulouse', extra_info: JSON.stringify(extra) }] };
        if (/^SELECT id, extra_info, clerkId, clerkStatus FROM clients/i.test(sql)) return { rows: clientExists ? [{ id: 'c1', extra_info: '{}', clerkId: '', clerkStatus: 'manual' }] : [] };
        if (/^SELECT id FROM documents WHERE clientId = \? AND url = \?/i.test(sql)) return { rows: existingDocUrls.includes(params[1]) ? [{ id: 'doc_x' }] : [] };
        if (/^INSERT INTO documents/i.test(sql)) inserted.push({ clientId: params[1], name: params[2], size: params[3], type: params[4], owner: params[6], folder: params[7], url: params[8] });
        return { rows: [] };
    });
    return { conn: { execute }, inserted };
}

describe('Inscription : les pièces déposées apparaissent dans « Mes documents »', () => {
    it('à la validation du dossier, identité recto/verso et justificatif de domicile sont ajoutés (propriétaire = client)', async () => {
        const { conn, inserted } = makeConn({ extra: { prenom: 'Ada', nom: 'L', ...URLS } });
        await createDataService({ conn, sendEmail: async () => {} }).traiterDemande('d1');
        expect(inserted.map((d) => d.name)).toEqual(["Pièce d'identité (recto)", "Pièce d'identité (verso)", 'Justificatif de domicile']);
        expect(inserted.every((d) => d.owner === 'client' && d.folder === 'Documents' && d.type === 'image/png')).toBe(true);
        expect(inserted.map((d) => d.url)).toEqual(Object.values(URLS));
        expect(new Set(inserted.map((d) => d.clientId)).size).toBe(1);
    });

    it('les noms sont reconnus par la liste de vérification de l’espace client (identité / domicile)', () => {
        expect(/identit|séjour|passeport|cni/i.test("Pièce d'identité (recto)")).toBe(true);
        expect(/domicile|justificatif/i.test('Justificatif de domicile')).toBe(true);
    });

    it('validation rejouée : aucun doublon pour une pièce déjà présente', async () => {
        const { conn, inserted } = makeConn({ extra: { prenom: 'Ada', nom: 'L', ...URLS }, existingDocUrls: [URLS.pieceIdentiteUrl, URLS.pieceIdentiteVersoUrl], clientExists: true });
        await createDataService({ conn, sendEmail: async () => {} }).traiterDemande('d1');
        expect(inserted.map((d) => d.name)).toEqual(['Justificatif de domicile']);
    });

    it('lien douteux, vide ou absent : ignoré (seuls les fichiers hébergés chez nous sont ajoutés)', async () => {
        const { conn, inserted } = makeConn({ extra: { prenom: 'Ada', nom: 'L', pieceIdentiteUrl: 'https://evil.example/x.png', pieceIdentiteVersoUrl: '', justificatifDomicileUrl: '#local' } });
        await createDataService({ conn, sendEmail: async () => {} }).traiterDemande('d1');
        expect(inserted).toEqual([]);
    });

    it('un échec d’ajout ne bloque pas la validation du dossier', async () => {
        const { conn } = makeConn({ extra: { prenom: 'Ada', nom: 'L', ...URLS } });
        const original = conn.execute;
        conn.execute = vi.fn(async (sql, params) => { if (/^INSERT INTO documents/i.test(sql)) throw new Error('base en panne'); return original(sql, params); });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const created = await createDataService({ conn, sendEmail: async () => {} }).traiterDemande('d1');
        expect(created?.id).toBeTruthy();
    });
});
