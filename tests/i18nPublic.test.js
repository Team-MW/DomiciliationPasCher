import { describe, it, expect } from 'vitest';
import fr from '../src/i18n/fr.js';
import en from '../src/i18n/en.js';
import ru from '../src/i18n/ru.js';

function keyPaths(value, prefix = '') {
    if (Array.isArray(value)) {
        return value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
    }
    return [prefix];
}

function withoutEspaceClient(bundle) {
    const { espaceClient, ...publicSite } = bundle;
    expect(espaceClient).toBeTypeOf('object');
    return publicSite;
}

describe('traductions du site public', () => {
    const langs = { fr: withoutEspaceClient(fr), en: withoutEspaceClient(en), ru: withoutEspaceClient(ru) };
    const reference = keyPaths(langs.fr).sort();

    it.each(['en', 'ru'])('a les mêmes clés que le français en %s', (lang) => {
        const actual = keyPaths(langs[lang]).sort();
        const missing = reference.filter((k) => !actual.includes(k));
        const extra = actual.filter((k) => !reference.includes(k));
        expect(missing, `${lang} : clés manquantes`).toEqual([]);
        expect(extra, `${lang} : clés en trop`).toEqual([]);
    });

    it('ne contient ni type inattendu ni chaîne vide hors préfixe/suffixe', () => {
        for (const [lang, bundle] of Object.entries(langs)) {
            for (const path of keyPaths(bundle)) {
                const segments = path.split('.');
                const leafKey = segments[segments.length - 1].replace(/\[\d+\]/g, '');
                let value = bundle;
                for (const part of path.replace(/\[(\d+)\]/g, '.$1').split('.')) {
                    value = value[part];
                }
                const kind = typeof value;
                expect(['string', 'number', 'boolean'], `${lang}.${path} : type ${kind}`).toContain(kind);
                if (kind === 'string' && leafKey !== 'prefix' && leafKey !== 'suffix') {
                    expect(value.trim(), `${lang}.${path} : valeur vide`).not.toBe('');
                }
            }
        }
    });
});
