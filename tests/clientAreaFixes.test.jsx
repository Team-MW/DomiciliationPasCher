// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { installApiAuth } from '../src/utils/apiAuth.js';
import { buildContractContent } from '../src/utils/contractBuilder.js';

vi.mock('../src/i18n/LanguageContext', () => ({ useTranslation: () => ({ t: (k) => k }) }));

/** Faux document jsPDF : enregistre tous les textes écrits. */
function fakeDoc() {
    const texts = [];
    const target = { texts };
    return new Proxy(target, {
        get(t, prop) {
            if (prop === 'texts') return t.texts;
            if (prop === 'text') return (value) => { t.texts.push(Array.isArray(value) ? value.join(' ') : String(value)); };
            if (prop === 'splitTextToSize') return (value) => [String(value)];
            if (prop === 'getTextWidth') return () => 10;
            if (prop === 'getNumberOfPages') return () => 1;
            if (prop === 'internal') return { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
            return () => undefined;
        },
    });
}

describe('Contrat signé : la date est celle de la signature, pas celle du téléchargement', () => {
    const base = { id: 'c1', name: 'Ada Lovelace', company: 'ACME', plan: 'Essentiel' };

    it('contrat actuel signé le 15 janvier 2026, regénéré plus tard → « le 15 janvier 2026 »', () => {
        const doc = fakeDoc();
        const extra = { prenom: 'Ada', nom: 'Lovelace', contractSigned: true, contractSignedAt: '2026-01-15T10:00:00.000Z', grille_tarifaire: '2026-11', contract_version: '2026-11' };
        buildContractContent(doc, base, extra, { name: 'Essentiel', ht: 16 }, true, null, '1 novembre 2026', '6 novembre 2026', null);
        expect(doc.texts.some((t) => t.includes('Fait à Toulouse, le 15 janvier 2026'))).toBe(true);
        expect(doc.texts.some((t) => t.includes('6 novembre 2026'))).toBe(false);
    });

    it('contrat pas encore signé : date du jour de début', () => {
        const doc = fakeDoc();
        buildContractContent(doc, base, { prenom: 'Ada', nom: 'L', grille_tarifaire: '2026-11' }, { name: 'Essentiel', ht: 16 }, false, null, '1 novembre 2026', '1 novembre 2026', null);
        expect(doc.texts.some((t) => t.includes('Fait à Toulouse, le 1 novembre 2026'))).toBe(true);
    });

    it('ancien contrat signé : formule « Confort » reconnue, prix annuel correct, aucun « undefined »', () => {
        const doc = fakeDoc();
        const extra = { nom: 'Dupont', frequence: 'annuel', contractSigned: true, contractSignedAt: '2026-03-02T09:00:00.000Z' }; // sans prénom, sans grille = ancienne grille
        buildContractContent(doc, { ...base, plan: 'Confort' }, extra, { name: 'Essentiel', ht: 20 }, true, null, '2 mars 2026', '6 novembre 2026', null);
        const all = doc.texts.join(' | ');
        expect(all).toContain('Forfait souscrit : Scan+');
        expect(all).toContain('Tarif : 240.00 € HT / An');
        expect(all).not.toMatch(/undefined/);
        expect(all).toContain('Fait à Toulouse, le 2 mars 2026');
    });
});

describe('Aperçu : verrou d’écriture aussi pour fetch(new Request(…))', () => {
    it('un POST passé en objet Request est bloqué en aperçu', async () => {
        const calls = [];
        const target = {
            fetch: vi.fn(async (input) => { calls.push(input); return new Response('{}'); }),
            location: { origin: 'https://site.test' },
            __dpcPreviewMode: true,
        };
        installApiAuth({ getToken: async () => null, target });
        const res = await target.fetch(new Request('https://site.test/api/email', { method: 'POST', body: '{}' }));
        expect(res.status).toBe(403);
        expect(calls).toHaveLength(0);
    });
});

describe('Adresse : « copiée » seulement si la copie a vraiment réussi', () => {
    it('presse-papiers refusé → pas de message « copiée »', async () => {
        const { default: Adresse } = await import('../src/pages/EspaceClient/components/Adresse.jsx');
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
        document.execCommand = vi.fn(() => false);
        render(<Adresse clientData={{ company: 'ACME', city: 'Lyon', extra_info: '{}' }} />);
        expect(document.body.textContent).not.toMatch(/Lyon/); // le centre est à Toulouse, pas dans la ville du client
        const button = screen.getAllByRole('button').find((b) => /copy/i.test(b.textContent));
        fireEvent.click(button);
        await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
        expect(document.body.textContent).not.toMatch(/address\.copied/);
    });
});

describe('Documents : PDF trop lourd refusé avec une explication', () => {
  it('limite d’environ 1 Mo (le serveur refuse au-delà de 1,5 Mo en base64)', async () => {
    const { PDF_MAX_BYTES } = await import('../src/pages/EspaceClient/components/Docs.jsx');
    expect(PDF_MAX_BYTES * 4 / 3).toBeLessThan(1_500_000);
    const { readFileSync } = await import('node:fs');
    const fr = readFileSync('src/i18n/espaceClient/docs.js', 'utf8');
    expect((fr.match(/pdfTooLarge:/g) || []).length).toBe(3); // fr, en, ru
  });
});
