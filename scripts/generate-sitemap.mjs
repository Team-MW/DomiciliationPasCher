#!/usr/bin/env node
/**
 * Génère public/sitemap.xml à partir des routes publiques et des slugs de fiches pratiques.
 *
 * Usage : node scripts/generate-sitemap.mjs           → écrit public/sitemap.xml
 *         node scripts/generate-sitemap.mjs --check   → code 1 si le fichier n'est pas à jour
 *
 * Sortie déterministe (pas de date de génération) : tests/sitemap.test.js vérifie que le
 * fichier versionné correspond à buildSitemap(). Mettre à jour LASTMOD lors d'une évolution
 * significative du contenu, puis relancer le script.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fichesData } from '../src/data/fichesData.js';

export const SITE_URL = 'https://www.domiciliation-pas-cher.com';
export const LASTMOD = '2026-11-05';

/** Routes indexables (ordre = ordre de sortie). */
export const PUBLIC_ROUTES = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/tarifs', changefreq: 'monthly', priority: '0.9' },
    { path: '/services', changefreq: 'monthly', priority: '0.8' },
    { path: '/villes', changefreq: 'monthly', priority: '0.7' },
    { path: '/rendez-vous', changefreq: 'monthly', priority: '0.6' },
    { path: '/fiches-pratiques', changefreq: 'weekly', priority: '0.6' },
    { path: '/a-propos', changefreq: 'monthly', priority: '0.5' },
    { path: '/mentions-legales', changefreq: 'yearly', priority: '0.2' },
    { path: '/cgv', changefreq: 'yearly', priority: '0.2' },
    { path: '/confidentialite', changefreq: 'yearly', priority: '0.2' },
];

/**
 * Routes de src/App.jsx volontairement absentes du sitemap (espace connecté, tunnels,
 * doublons, redirections, landing publicitaire).
 */
export const EXCLUDED_ROUTES = [
    '/about', // doublon de /a-propos
    '/offre', // landing Ads
    '/connexion',
    '/inscription',
    '/souscription',
    '/espace-client',
    '/admin',
    '/fiches-pratiques/:slug', // développé via fichesData
    '*',
];

export function ficheRoutes() {
    return Object.keys(fichesData).map((slug) => ({
        path: `/fiches-pratiques/${slug}`,
        changefreq: 'monthly',
        priority: '0.5',
    }));
}

function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildSitemap() {
    const urls = [...PUBLIC_ROUTES, ...ficheRoutes()].map(({ path, changefreq, priority }) => [
        '  <url>',
        `    <loc>${escapeXml(SITE_URL + path)}</loc>`,
        `    <lastmod>${LASTMOD}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
    ].join('\n'));
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
    ].join('\n');
}

export const SITEMAP_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../public/sitemap.xml');

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const xml = buildSitemap();
    if (process.argv.includes('--check')) {
        let current = '';
        try { current = readFileSync(SITEMAP_PATH, 'utf8'); } catch { /* absent */ }
        if (current !== xml) {
            console.error('public/sitemap.xml n’est pas à jour : lancez node scripts/generate-sitemap.mjs');
            process.exit(1);
        }
        console.log('public/sitemap.xml est à jour.');
    } else {
        writeFileSync(SITEMAP_PATH, xml);
        console.log(`public/sitemap.xml généré (${xml.match(/<url>/g).length} URLs).`);
    }
}
