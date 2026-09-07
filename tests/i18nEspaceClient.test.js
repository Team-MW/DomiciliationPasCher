import { describe, it, expect } from 'vitest';
import { sections } from '../src/i18n/espaceClient/index.js';

const LANGS = ['fr', 'en', 'ru'];

/** Chemins pointés de toutes les feuilles d'un objet de traduction. */
function keyPaths(value, prefix = '') {
    if (Array.isArray(value)) {
        return value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
    }
    return [prefix];
}

function leafValues(value) {
    if (Array.isArray(value)) return value.flatMap(leafValues);
    if (value && typeof value === 'object') return Object.values(value).flatMap(leafValues);
    return [value];
}

describe('traductions de l\'espace client', () => {
    const names = Object.keys(sections);

    it('déclare toutes les sections attendues', () => {
        expect(names.length).toBeGreaterThan(0);
    });

    describe.each(names)('section %s', (name) => {
        const section = sections[name];

        it('expose les trois langues', () => {
            for (const lang of LANGS) {
                expect(section[lang], `${name}.${lang} manquant`).toBeTypeOf('object');
            }
        });

        it('a exactement les mêmes clés en anglais et en russe qu\'en français', () => {
            const reference = keyPaths(section.fr).sort();
            for (const lang of ['en', 'ru']) {
                const actual = keyPaths(section[lang]).sort();
                const missing = reference.filter(k => !actual.includes(k));
                const extra = actual.filter(k => !reference.includes(k));
                expect(missing, `${name}.${lang} : clés manquantes`).toEqual([]);
                expect(extra, `${name}.${lang} : clés en trop`).toEqual([]);
            }
        });

        it('ne contient ni valeur vide ni valeur non textuelle', () => {
            for (const lang of LANGS) {
                for (const value of leafValues(section[lang])) {
                    expect(typeof value, `${name}.${lang} : valeur non textuelle`).toBe('string');
                    expect(value.trim(), `${name}.${lang} : valeur vide`).not.toBe('');
                }
            }
        });
    });
});
