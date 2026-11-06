// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DOMICILIATION_ADDRESS_ONE_LINE, DOMICILIATION_ADDRESS_LINES, postalAddressFor } from '../shared/company.js';

const root = path.resolve(__dirname, '..');

function listFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === '__tests__' ? [] : listFiles(full);
        return /\.(jsx?|mjs)$/.test(e.name) ? [full] : [];
    });
}

describe('Adresse de domiciliation : source unique et toujours complète', () => {
    it('contient le bâtiment et le lot (CGV art. 12 : sinon le courrier peut ne pas être distribué)', () => {
        expect(DOMICILIATION_ADDRESS_ONE_LINE).toBe('150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse');
        expect(postalAddressFor('ACME')).toBe('ACME\n150 rue Nicolas Louis Vauquelin\nBâtiment B, Lot 308\n31100 Toulouse\nFRANCE');
        expect(DOMICILIATION_ADDRESS_LINES).toContain('Bâtiment B, Lot 308');
    });

    it('aucun composant ni module serveur ne réécrit l’adresse à la main', () => {
        // Textes juridiques figés (CGV, mentions, confidentialité, contrats) et traductions.
        const allowed = [
            'shared/company.js', 'src/pages/CGV/CGV.jsx', 'src/pages/MentionsLegales/MentionsLegales.jsx',
            'src/pages/Confidentialite/Confidentialite.jsx', 'src/utils/contractBuilder.js',
            'src/utils/contractBuilderCurrent.js', 'src/constants/contact.js',
        ];
        const offenders = [...listFiles(path.join(root, 'src')), ...listFiles(path.join(root, 'api'))]
            .map((f) => path.relative(root, f))
            .filter((f) => !allowed.includes(f) && !f.startsWith('src/i18n/'))
            .filter((f) => /Vauquelin/.test(fs.readFileSync(path.join(root, f), 'utf-8')));
        expect(offenders).toEqual([]);
    });

    it('aucune adresse en domiciliation-pas-cher.fr (domaine mort : emails sans réponse, liens cassés)', () => {
        const files = [...listFiles(path.join(root, 'src')), ...listFiles(path.join(root, 'api')), ...listFiles(path.join(root, 'shared'))];
        const offenders = files.filter((f) => /domiciliation-pas-cher\.fr/.test(fs.readFileSync(f, 'utf-8'))).map((f) => path.relative(root, f));
        expect(offenders).toEqual([]);
    });

    it('les traductions donnent la même adresse (pas de « 3ème étage »)', () => {
        for (const lang of ['fr', 'en', 'ru']) {
            const src = fs.readFileSync(path.join(root, `src/i18n/${lang}.js`), 'utf-8');
            expect(src, lang).not.toMatch(/3(ème|rd) (étage|floor)/);
        }
    });
});
