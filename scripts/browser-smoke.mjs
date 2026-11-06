#!/usr/bin/env node
/* global document, window, location -- code exécuté dans Chrome via page.evaluate */
/**
 * Test du site construit dans un VRAI navigateur (Chrome), avant chaque push.
 *
 *   npm run test:browser
 *
 * 1. Construit le site comme Vercel (vite build) dans un dossier temporaire, avec une clé Clerk
 *    factice au bon format : le test ne dépend ni de vos clés, ni d'internet.
 * 2. Le sert en local (vite preview) et ouvre chaque page dans Chrome, sur ordinateur et mobile.
 * 3. Échoue si une page est blanche, lève une erreur JavaScript, n'a pas de titre, n'affiche
 *    pas son contenu, ou déborde horizontalement sur mobile.
 *
 * Tout accès réseau hors du site local est bloqué (Clerk, Google, Stripe…) : le test vérifie
 * NOTRE code, de façon reproductible, même hors ligne ou en CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'dpc-browser-smoke');

// Pages publiques : chacune doit afficher du contenu réel.
const PUBLIC_PAGES = [
    { path: '/', expect: /domiciliation/i },
    { path: '/tarifs', expect: /essentiel/i },
    { path: '/services', expect: /courrier|domiciliation/i },
    { path: '/villes', expect: /toulouse/i },
    { path: '/a-propos', expect: /domiciliation/i },
    { path: '/rendez-vous', expect: /rendez-vous|réserv/i },
    { path: '/offre', expect: /domiciliation/i },
    { path: '/souscription', expect: /forfait|formule|essentiel|email/i },
    { path: '/mentions-legales', expect: /CASSIN LUDOVIC/ },
    { path: '/cgv', expect: /conditions générales/i },
    { path: '/confidentialite', expect: /données personnelles|confidentialité/i },
    { path: '/fiches-pratiques', expect: /fiche|guide|domiciliation/i },
];
// Pages de connexion / espaces privés : sans Clerk chargé, elles doivent au moins ne pas planter.
const SHELL_PAGES = ['/connexion', '/inscription', '/app/espace-client', '/app/admin'];

const VIEWPORTS = [
    { name: 'ordinateur', width: 1366, height: 860 },
    { name: 'mobile', width: 390, height: 844 },
];

function firstFicheSlug() {
    try {
        const xml = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf-8');
        const m = xml.match(/<loc>[^<]*?(\/fiches-pratiques\/[^<]+)<\/loc>/);
        return m ? m[1] : null;
    } catch {
        return null;
    }
}

async function launchChrome() {
    // Chrome installé sur la machine (Mac, runners GitHub) : aucun téléchargement nécessaire.
    try {
        return await chromium.launch({ channel: 'chrome', headless: true });
    } catch (chromeError) {
        try {
            return await chromium.launch({ headless: true });
        } catch {
            throw new Error(
                `Impossible de lancer Chrome pour le test navigateur.\n` +
                `Installez Google Chrome, ou lancez : npx playwright-core install chromium\n` +
                `(détail : ${chromeError.message.split('\n')[0]})`
            );
        }
    }
}

const failures = [];
const fail = (where, message) => failures.push(`${where} — ${message}`);

async function checkPage(context, base, pagePath, { expect, viewport, shell }) {
    const where = `${pagePath} (${viewport.name})`;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => {
        const message = err.message.split('\n')[0];
        // Clerk ne peut pas se charger : internet est bloqué volontairement pendant le test.
        if (/Failed to load Clerk|clerk-js/i.test(message)) return;
        errors.push(message);
    });
    page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // Les ressources externes sont bloquées volontairement : on ignore leurs échecs de chargement.
        if (/Failed to load resource|net::ERR_FAILED|ERR_BLOCKED|clerk|ClerkJS|googletagmanager|gtag|stripe/i.test(text)) return;
        errors.push(`console : ${text.slice(0, 160)}`);
    });

    try {
        const response = await page.goto(base + pagePath, { waitUntil: 'load', timeout: 20000 });
        if (!response || response.status() >= 400) fail(where, `HTTP ${response?.status()}`);

        // La page ne doit pas rester blanche.
        await page.waitForFunction(() => {
            const el = document.getElementById('root');
            return el && el.children.length > 0;
        }, null, { timeout: 10000 }).catch(() => fail(where, 'PAGE BLANCHE : rien n’est affiché dans #root'));
        await page.waitForTimeout(400); // pages chargées à la demande (lazy)

        const info = await page.evaluate(() => ({
            text: document.getElementById('root')?.innerText || '',
            title: document.title,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            url: location.pathname,
        }));

        if (/Erreur de Configuration/.test(info.text)) fail(where, 'écran « Erreur de Configuration » affiché');
        if (!shell) {
            if (info.text.trim().length < 200) fail(where, `contenu quasi vide (${info.text.trim().length} caractères)`);
            if (expect && !expect.test(info.text)) fail(where, `texte attendu introuvable (${expect})`);
            if (!info.title || info.title.length < 10) fail(where, `titre de page absent ou trop court : « ${info.title} »`);
        }
        if (viewport.name === 'mobile' && info.scrollWidth > info.innerWidth + 2) {
            fail(where, `débordement horizontal sur mobile (${info.scrollWidth}px pour ${info.innerWidth}px)`);
        }
        for (const e of errors) fail(where, `erreur JavaScript : ${e}`);
        return info;
    } catch (error) {
        fail(where, `chargement impossible : ${error.message.split('\n')[0]}`);
        return null;
    } finally {
        await page.close();
    }
}

async function main() {
    const started = Date.now();
    process.env.VITE_CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from('verify.clerk.accounts.dev$').toString('base64')}`;
    process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_browser_smoke';

    console.log('• Build de production (dossier temporaire)…');
    await build({ root, logLevel: 'error', build: { outDir, emptyOutDir: true } });

    // Aucun secret ne doit se retrouver dans le JavaScript public (lisible par tout visiteur).
    const SECRET_PATTERNS = [
        ['mot de passe PlanetScale', /pscale_pw_[A-Za-z0-9_]{10,}/],
        ['hôte de base de données', /[a-z0-9.-]+\.psdb\.cloud/],
        ['clé secrète Stripe/Clerk', /sk_(live|test)_[A-Za-z0-9]{10,}/],
        ['secret webhook Stripe', /whsec_[A-Za-z0-9]{10,}/],
        ['variable serveur', /\b(DATABASE_PASSWORD|SMTP_PASS|CLERK_SECRET_KEY|STRIPE_SECRET_KEY|CRON_SECRET)\b/],
    ];
    const assetsDir = path.join(outDir, 'assets');
    const bundle = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8')).join('\n');
    for (const [name, re] of SECRET_PATTERNS) {
        if (re.test(bundle)) fail('build', `SECRET DANS LE SITE PUBLIC : ${name}`);
    }
    console.log('• Recherche de secrets dans le JavaScript public : terminée');

    const server = await preview({ root, logLevel: 'error', build: { outDir }, preview: { port: 4790, strictPort: false, host: '127.0.0.1' } });
    const base = (server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4790/').replace(/\/$/, '');
    const browser = await launchChrome();

    try {
        const fiche = firstFicheSlug();
        const pages = [...PUBLIC_PAGES];
        if (fiche) pages.push({ path: fiche, expect: /domiciliation|entreprise|société/i });
        else fail('/fiches-pratiques/:slug', 'aucune fiche trouvée dans le sitemap');

        const titles = new Map();
        for (const viewport of VIEWPORTS) {
            const context = await browser.newContext({ viewport, locale: 'fr-FR' });
            // Seul le site local est joignable.
            await context.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
            console.log(`• Pages publiques — ${viewport.name}`);
            for (const p of pages) {
                const info = await checkPage(context, base, p.path, { expect: p.expect, viewport });
                if (info && viewport.name === 'ordinateur') titles.set(p.path, info.title);
            }
            console.log(`• Pages de connexion et espaces privés — ${viewport.name}`);
            for (const p of SHELL_PAGES) await checkPage(context, base, p, { viewport, shell: true });

            // Une adresse inconnue renvoie vers l'accueil, sans planter.
            const info = await checkPage(context, base, '/page-qui-n-existe-pas', { viewport, shell: true });
            if (info && info.url !== '/') fail(`/page-qui-n-existe-pas (${viewport.name})`, `pas de retour à l’accueil (reste sur ${info.url})`);
            await context.close();
        }

        // Chaque page publique doit avoir son propre titre (SEO).
        const seen = new Map();
        for (const [p, t] of titles) {
            if (seen.has(t)) fail(p, `même titre que ${seen.get(t)} : « ${t} »`);
            else seen.set(t, p);
        }
    } finally {
        await browser.close();
        await new Promise((resolve) => server.httpServer.close(resolve));
        fs.rmSync(outDir, { recursive: true, force: true });
    }

    const total = (PUBLIC_PAGES.length + 1 + SHELL_PAGES.length + 1) * VIEWPORTS.length;
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (failures.length) {
        console.error(`\n❌ Test navigateur : ${failures.length} problème(s) sur ${total} pages vérifiées (${seconds} s)`);
        for (const f of failures) console.error(`   - ${f}`);
        process.exit(1);
    }
    console.log(`\n✅ Test navigateur : ${total} pages OK (ordinateur + mobile), aucune erreur (${seconds} s)`);
}

main().catch((error) => {
    console.error(`❌ Test navigateur impossible : ${error.message}`);
    process.exit(1);
});
