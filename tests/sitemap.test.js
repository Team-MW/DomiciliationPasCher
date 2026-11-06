import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    buildSitemap, SITEMAP_PATH, SITE_URL, PUBLIC_ROUTES, EXCLUDED_ROUTES,
} from '../scripts/generate-sitemap.mjs';
import { fichesData } from '../src/data/fichesData';
import { SITE_URL as HELPER_SITE_URL } from '../src/components/Seo/usePageMeta';

const root = resolve(__dirname, '..');

describe('sitemap.xml', () => {
    it('est à jour (sinon : node scripts/generate-sitemap.mjs)', () => {
        expect(readFileSync(SITEMAP_PATH, 'utf8')).toBe(buildSitemap());
    });

    it('contient chaque fiche pratique et aucune page privée', () => {
        const xml = buildSitemap();
        for (const slug of Object.keys(fichesData)) {
            expect(xml).toContain(`<loc>${SITE_URL}/fiches-pratiques/${slug}</loc>`);
        }
        for (const p of ['/connexion', '/inscription', '/souscription', '/app/', '/about<', '/offre']) {
            expect(xml).not.toContain(`${SITE_URL}${p}`);
        }
    });

    it('couvre toutes les routes de src/App.jsx (incluses ou explicitement exclues)', () => {
        const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
        const paths = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
        const known = new Set([...PUBLIC_ROUTES.map((r) => r.path), ...EXCLUDED_ROUTES]);
        const unknown = paths.filter((p) => !p.startsWith('/app/') && !known.has(p));
        expect(unknown, 'route publique à ajouter au sitemap ou à EXCLUDED_ROUTES').toEqual([]);
    });

    it('robots.txt référence le sitemap et bloque les zones privées', () => {
        const robots = readFileSync(resolve(root, 'public/robots.txt'), 'utf8');
        expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
        for (const p of ['/app/', '/api/']) {
            expect(robots).toContain(`Disallow: ${p}`);
        }
        // Pages noindex : non bloquées, sinon Google ne lirait jamais leur balise noindex.
        for (const p of ['/connexion', '/inscription', '/souscription']) {
            expect(robots).not.toContain(`Disallow: ${p}`);
        }
        expect(HELPER_SITE_URL).toBe(SITE_URL);
    });
});
