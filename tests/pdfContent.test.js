import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { generateSignedProcurationBlob } from '../src/utils/pdfGenerator.js';
import { buildContractContent } from '../src/utils/contractBuilder.js';

const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('Procuration postale : contenu écrit dans le formulaire officiel', () => {
    let drawn;
    beforeEach(() => {
        drawn = [];
        const page = { drawText: vi.fn((text, opts) => drawn.push({ text: String(text), y: opts?.y })), drawImage: vi.fn() };
        vi.spyOn(PDFDocument, 'load').mockResolvedValue({
            getPages: () => [page], embedFont: vi.fn(), embedPng: vi.fn().mockResolvedValue({}), save: vi.fn().mockResolvedValue(new Uint8Array([1])),
        });
    });

    // drawInBoxes écrit une lettre par case : on regroupe les lettres d'une même ligne.
    const lineAt = (y) => drawn.filter((d) => Math.abs(d.y - y) < 0.01).map((d) => d.text).join('');

    it('prestataire CASSIN (pas CASIN), adresse complète avec bâtiment et lot, SIRET sur 14 chiffres', async () => {
        const client = { id: 'c1', name: 'Ada Lovelace', company: 'ACME', since: '2026-01-01', extra_info: JSON.stringify({ prenom: 'Ada', nom: 'Lovelace' }) };
        await generateSignedProcurationBlob(client, SIG, { lieuNaissance: 'Casablanca', siret: '' });
        expect(lineAt(287.8911 + 3.5)).toBe('LUDOVIC CASSIN');
        expect(lineAt(246.8991 + 3.5)).toBe('BATIMENT B LOT 308');
        expect(lineAt(226.8191 + 3.5)).toBe('150 RUE NICOLAS LOUIS VAUQUELIN');
        expect(lineAt(304 + 3.5)).toBe('10151253100019');
    });

    it('lieu de signature = Toulouse (jamais la ville de naissance) ; date = date de signature, pas celle du téléchargement', async () => {
        const client = { id: 'c1', name: 'Ada', company: 'ACME', since: '2026-01-01', extra_info: JSON.stringify({ prenom: 'Ada', nom: 'L', procurationSignedAt: '2026-03-09T10:00:00.000Z' }) };
        await generateSignedProcurationBlob(client, SIG, { lieuNaissance: 'Casablanca' });
        expect(drawn.some((d) => d.text === 'TOULOUSE' && Math.abs(d.y - 111.7) < 0.01)).toBe(true);
        expect(drawn.some((d) => d.text === 'CASABLANCA')).toBe(false);
        expect(drawn.some((d) => d.text === '09/03/2026' && Math.abs(d.y - 111.7) < 0.01)).toBe(true);
    });
});

describe('Contrat signé : la preuve de signature est imprimée', () => {
    function fakeDoc() {
        const texts = [];
        return new Proxy({ texts }, {
            get(t, prop) {
                if (prop === 'texts') return t.texts;
                if (prop === 'text') return (v) => { t.texts.push(Array.isArray(v) ? v.join(' ') : String(v)); };
                if (prop === 'splitTextToSize') return (v) => [String(v)];
                if (prop === 'getTextWidth') return () => 10;
                if (prop === 'getNumberOfPages') return () => 1;
                if (prop === 'internal') return { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
                return () => undefined;
            },
        });
    }
    it('generateSignedContratBlob transmet signProof au texte du contrat, et le contrat l’affiche', () => {
        const src = fs.readFileSync('src/utils/pdfGenerator.js', 'utf8');
        expect(src).toContain('generateSignedContratBlob = (clientData, signatureDataUrl, signProof = null)');
        expect(src).toContain('signedAtDate, logoImg, signProof)');
        const doc = fakeDoc();
        const extra = { prenom: 'Ada', nom: 'L', contractSigned: true, contractSignedAt: '2026-03-09T10:00:00.000Z', grille_tarifaire: '2026-11', contract_version: '2026-11' };
        const proof = { signedAt: '2026-03-09T10:00:00.000Z', ipAddress: '203.0.113.7', signeeName: 'Ada L', signatureHash: 'abc123' };
        buildContractContent(doc, { id: 'c1', name: 'Ada L', company: 'ACME', plan: 'Essentiel' }, extra, { name: 'Essentiel', ht: 16 }, true, SIG, '1 mars 2026', '9 mars 2026', null, proof);
        expect(doc.texts.join(' | ')).toMatch(/Signé électroniquement|203\.0\.113\.7/);
    });
});

describe('PDF : adresse complète partout (bâtiment + lot)', () => {
    it('attestation et facture : plus de « 3ème étage », adresse issue de shared/company.js', () => {
        const src = fs.readFileSync('src/utils/pdfGenerator.js', 'utf8');
        expect(src).not.toMatch(/3ème étage|3È ETAGE|CASIN\b/);
        expect(src).toContain('DOMICILIATION_ADDRESS.building');
        expect(src).not.toMatch(/Vauquelin/i);
    });
});
