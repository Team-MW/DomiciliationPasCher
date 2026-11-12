import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import fr from '../src/i18n/fr.js';
import en from '../src/i18n/en.js';
import ru from '../src/i18n/ru.js';
import docs from '../src/i18n/espaceClient/docs.js';

const root = path.resolve(__dirname, '..');

describe('Documents contractuels fournis par le Domiciliataire', () => {
    it('CGV et contrat type publiés (servis par le site) et identiques aux fichiers fournis', () => {
        for (const name of ['CGV_domiciliation.pdf', 'Contrat_domiciliation_modele.pdf']) {
            const published = fs.readFileSync(path.join(root, 'public/documents', name));
            expect(published.subarray(0, 5).toString()).toBe('%PDF-');
            expect(published.equals(fs.readFileSync(path.join(root, name)))).toBe(true);
        }
    });

    it('espace client : liens vers les CGV et le contrat type (onglet Documents + menu)', () => {
        const docsSrc = fs.readFileSync(path.join(root, 'src/pages/EspaceClient/components/Docs.jsx'), 'utf8');
        const sidebarSrc = fs.readFileSync(path.join(root, 'src/pages/EspaceClient/components/Sidebar.jsx'), 'utf8');
        expect(docsSrc).toContain('/documents/CGV_domiciliation.pdf');
        expect(docsSrc).toContain('/documents/Contrat_domiciliation_modele.pdf');
        expect(sidebarSrc).toContain('href="/cgv"');
        expect(sidebarSrc).toContain('/documents/Contrat_domiciliation_modele.pdf');
        for (const lang of ['fr', 'en', 'ru']) {
            for (const key of ['refDocsTitle', 'refCgv', 'refContract', 'refPdf', 'refSidebarCgv', 'refSidebarContract']) {
                expect(docs[lang][key], `${lang}.${key}`).toBeTruthy();
            }
        }
    });

    it('accueil : « dès 12,80 € HT/mois » précisé « en paiement annuel », dans les 3 langues', () => {
        expect(fr.home.hero.titleHighlight).toMatch(/12,80/);
        expect(fr.home.hero.priceNote.replace(/\u00a0/g, ' ')).toMatch(/paiement annuel.*16 € HT\/mois en mensuel/);
        expect(en.home.hero.titleHighlight).toMatch(/12\.80/);
        expect(ru.home.hero.titleHighlight).toMatch(/12,80/);
        for (const t of [fr, en, ru]) expect(t.home.hero.priceNote).toBeTruthy();
    });
});
