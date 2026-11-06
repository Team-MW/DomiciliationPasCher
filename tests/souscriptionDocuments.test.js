import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { NO_DOCUMENT_FILES, missingDocumentErrors } from '../src/pages/Souscription/souscriptionDocuments.js';

const file = { name: 'cni.pdf' };

describe('Souscription : les 3 justificatifs sont obligatoires et arrivent vraiment chez l’admin', () => {
    it('exige les 3 fichiers', () => {
        expect(missingDocumentErrors({})).toEqual({ pieceIdentiteRecto: 'Requis', pieceIdentiteVerso: 'Requis', justificatifDomicile: 'Requis' });
        expect(missingDocumentErrors({ pieceIdentiteFile: file, pieceIdentiteVersoFile: file, justificatifDomicileFile: file })).toEqual({});
    });

    it('un NOM de fichier restauré sans le fichier ne suffit pas (rechargement / lien de reprise)', () => {
        const restored = { pieceIdentiteRecto: 'cni.pdf', pieceIdentiteVerso: 'cni-verso.pdf', justificatifDomicile: 'edf.pdf' };
        expect(missingDocumentErrors(restored)).toEqual({
            pieceIdentiteRecto: 'Fichier à joindre à nouveau',
            pieceIdentiteVerso: 'Fichier à joindre à nouveau',
            justificatifDomicile: 'Fichier à joindre à nouveau',
        });
    });

    it('la restauration du brouillon efface fichiers ET noms', () => {
        expect(Object.values(NO_DOCUMENT_FILES).every((v) => v === null || v === '')).toBe(true);
        const src = fs.readFileSync('src/pages/Souscription/Souscription.jsx', 'utf8');
        expect(src).toContain('...lead.draft, ...NO_DOCUMENT_FILES');
        expect(src.match(/\.\.\.NO_DOCUMENT_FILES/g).length).toBeGreaterThanOrEqual(2);
    });

    it('paiement : documents vérifiés avant, échec de téléversement bloquant (aucun dossier sans pièces)', () => {
        const src = fs.readFileSync('src/pages/Souscription/Souscription.jsx', 'utf8');
        const pay = src.slice(src.indexOf("setPayError('');"), src.indexOf('adminDataService.addDemande('));
        expect(pay).toContain('missingDocumentErrors(data)');
        expect(pay).toContain('setPayError(uploadErr.message);');
        expect(pay).not.toMatch(/catch\s*\(e\)\s*\{\s*console\.error\('Upload/);
    });
});

describe('Souscription : le paiement ne meurt jamais en silence', () => {
    it('une erreur serveur est affichée au client (catch + message), et Stripe.js n’est plus un prérequis', () => {
        const src = fs.readFileSync('src/pages/Souscription/Souscription.jsx', 'utf8');
        const pay = src.slice(src.indexOf("setPayError('');"), src.indexOf("{loading ? 'Envoi de vos documents"));
        expect(pay).toMatch(/catch \(err\) \{[\s\S]*setPayError\(/);
        const stripe = fs.readFileSync('src/utils/stripe.js', 'utf8');
        expect(stripe).not.toContain('loadStripe');
        expect(stripe).not.toMatch(/await getStripe\(\)/);
    });
});
