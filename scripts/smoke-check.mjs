#!/usr/bin/env node
/**
 * Vérification d'un site déployé ou local, SANS rien modifier ni envoyer.
 *
 *   npm run smoke -- http://localhost:5173
 *   npm run smoke -- https://www.domiciliation-pas-cher.com
 *   npm run smoke -- https://… --json rapport.json    → enregistre aussi le résultat brut
 *   npm run smoke -- http://localhost:5173 --dist dist → analyse aussi le build local (fuites)
 *
 * Sonde SMTP : POST /api/email avec un type public SANS destinataire. Le serveur vérifie la
 * configuration SMTP avant le destinataire : 400 « email requis » = SMTP configuré,
 * 500 = SMTP manquant. Aucun email ne part dans les deux cas.
 *
 * Aucune valeur secrète n'est affichée : seulement « trouvé / absent ».
 * Code de sortie 0 = tous les contrôles OK, 1 = au moins un échec.
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || 'http://localhost:5173').replace(/\/$/, '');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const distDir = args.includes('--dist') ? args[args.indexOf('--dist') + 1] : null;
const isLocal = /localhost|127\.0\.0\.1/.test(base);

// Motifs de secrets qui ne doivent JAMAIS apparaître dans le JavaScript public.
const SECRET_PATTERNS = [
    ['Mot de passe PlanetScale', /pscale_pw_[A-Za-z0-9_]{10,}/],
    ['Hôte de base de données', /[a-z0-9.-]*\.psdb\.cloud/],
    ['Clé secrète Stripe', /sk_(live|test)_[A-Za-z0-9]{10,}/],
    ['Clé secrète Clerk', /sk_(live|test)_[A-Za-z0-9]{20,}/],
    ['Secret webhook Stripe', /whsec_[A-Za-z0-9]{10,}/],
    ['Mot de passe SMTP', /SMTP_PASS/],
];

const checks = [];
const add = (group, name, status, detail = '') => {
    checks.push({ group, name, status, detail });
};

async function request(pathname, { method = 'GET', body, headers = {} } = {}) {
    const started = Date.now();
    try {
        const res = await fetch(base + pathname, {
            method,
            redirect: 'manual',
            headers: { 'User-Agent': 'dpc-smoke-check', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(20000),
        });
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { /* pas du JSON */ }
        return { status: res.status, headers: res.headers, text, json, ms: Date.now() - started };
    } catch (error) {
        return { status: 0, error: error?.message || String(error), text: '', json: null, ms: Date.now() - started };
    }
}

const short = (r) => {
    if (r.status === 0) return `injoignable (${r.error})`;
    const msg = r.json?.error || r.json?.message;
    return `HTTP ${r.status}${msg ? ` « ${String(msg).slice(0, 70)} »` : ''}`;
};

async function checkPages() {
    const pages = ['/', '/tarifs', '/rendez-vous', '/mentions-legales', '/cgv', '/confidentialite', '/connexion'];
    for (const p of pages) {
        const r = await request(p);
        const ok = r.status === 200 && /<div id="root">/.test(r.text);
        add('Pages', `GET ${p}`, ok ? 'ok' : 'fail', `${short(r)} · ${r.ms} ms`);
    }
    const sitemap = await request('/sitemap.xml');
    const urlCount = (sitemap.text.match(/<loc>/g) || []).length;
    add('SEO', 'sitemap.xml', sitemap.status === 200 && urlCount > 0 ? 'ok' : 'fail', `${short(sitemap)} · ${urlCount} URL`);
    const hasNewPages = /\/cgv<|\/confidentialite</.test(sitemap.text);
    add('SEO', 'sitemap contient /cgv et /confidentialite', hasNewPages ? 'ok' : 'fail', hasNewPages ? 'oui' : 'non (ancienne version)');
    const robots = await request('/robots.txt');
    add('SEO', 'robots.txt', robots.status === 200 ? 'ok' : 'fail', short(robots));
}

async function checkHeaders() {
    const r = await request('/');
    if (isLocal) {
        add('En-têtes de sécurité', 'En-têtes HTTP (vercel.json)', 'na', 'appliqués par Vercel uniquement, pas par le serveur de dev');
        return;
    }
    for (const h of ['x-frame-options', 'x-content-type-options', 'referrer-policy', 'strict-transport-security']) {
        const v = r.headers?.get?.(h);
        add('En-têtes de sécurité', h, v ? 'ok' : 'fail', v || 'absent');
    }
}

async function checkSmtp() {
    // Type public + aucun destinataire : vérifie la config SMTP sans jamais envoyer.
    const r = await request('/api/email', { method: 'POST', body: { type: 'consultation_creation' } });
    const msg = String(r.json?.error || r.json?.message || '');
    if (r.status === 400 && /email/i.test(msg)) {
        add('SMTP', 'Configuration SMTP du serveur', 'ok', 'configurée (le serveur a refusé la requête vide sans erreur SMTP)');
    } else if (r.status === 500) {
        add('SMTP', 'Configuration SMTP du serveur', 'fail',
            /SMTP/i.test(msg) ? 'MANQUANTE sur ce serveur (redéployer après ajout des variables)' : `erreur serveur : ${short(r)}`);
    } else {
        add('SMTP', 'Configuration SMTP du serveur', 'fail', short(r));
    }
}

async function checkApiSecurity() {
    // 1. Données clients : la nouvelle API exige un compte connecté.
    const data = await request('/api/data', { method: 'POST', body: { method: 'getMyAccount', args: [] } });
    add('Sécurité API', 'Données client sans connexion → refus 401', data.status === 401 ? 'ok' : 'fail',
        [404, 405].includes(data.status) ? 'route absente (ancienne version : la base est lue directement depuis le navigateur)' : short(data));

    // 2. Email réservé à l'admin, appelé sans connexion (sans destinataire : rien ne peut partir).
    const mail = await request('/api/email', { method: 'POST', body: { type: 'account_created' } });
    add('Sécurité API', 'Email réservé admin sans connexion → refus 401', mail.status === 401 ? 'ok' : 'fail',
        mail.status === 401 ? short(mail) : `${short(mail)} — l’endpoint accepte des envois sans authentification`);

    // 3. Historique de paiements d'un email arbitraire.
    const pay = await request('/api/list-payments?email=smoke-check%40example.invalid');
    add('Sécurité API', 'Paiements d’un tiers sans connexion → refus 401', pay.status === 401 ? 'ok' : 'fail',
        pay.status === 401 ? short(pay) : `${short(pay)} — n’importe qui peut lister les paiements d’un email`);

    // 4. Modules internes jamais exposés.
    const internal = await request('/api/_db');
    const servesSource = /\b(import|export)\b[\s\S]*getDbConn|@planetscale/.test(internal.text) && !/<div id="root">/.test(internal.text);
    add('Sécurité API', 'Module interne /api/_db : code source non servi', servesSource ? 'fail' : 'ok',
        servesSource ? `${short(internal)} — le code source du module est lisible` : internal.status === 404 ? short(internal) : `${short(internal)} (page du site, pas de code)`);

    // 5. Cron protégé par CRON_SECRET.
    const cron = await request('/api/cron/reminders');
    add('Sécurité API', 'Cron sans secret → refus 401', cron.status === 401 ? 'ok' : 'fail', short(cron));
    if (cron.status === 401 && /non configur/i.test(String(cron.json?.error))) {
        add('Configuration', 'CRON_SECRET', 'fail', 'non configuré : les rappels automatiques ne tournent pas');
    }

    // 6. Webhook Stripe : refuse une requête non signée.
    const wh = await request('/api/stripe-webhook', { method: 'POST', body: { type: 'checkout.session.completed' } });
    const whOk = wh.status === 400;
    const whLocalNoSecret = isLocal && wh.status === 503;
    add('Paiement', 'Webhook Stripe présent et signature exigée', whOk ? 'ok' : whLocalNoSecret ? 'na' : 'fail',
        [404, 405].includes(wh.status) ? 'route absente (ancienne version) — Stripe reçoit des erreurs'
            : whLocalNoSecret ? 'route présente ; pas de STRIPE_WEBHOOK_SECRET en local (normal, configuré dans Vercel)'
                : wh.status === 503 ? 'STRIPE_WEBHOOK_SECRET non configuré' : short(wh));
}

function scanForSecrets(label, text) {
    const found = SECRET_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
    add('Fuites de secrets', label, found.length ? 'fail' : 'ok', found.length ? `TROUVÉ : ${found.join(', ')}` : 'aucun secret détecté');
}

async function checkBundle() {
    const home = await request('/');
    const scripts = [...home.text.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
    const modulePreloads = [...home.text.matchAll(/<link[^>]+href="([^"]+\.js)"/g)].map((m) => m[1]);
    const assets = [...new Set([...scripts, ...modulePreloads])].filter((s) => s.startsWith('/assets/'));
    if (assets.length) {
        let all = '';
        const seen = new Set(assets);
        const queue = [...assets];
        // Suit aussi les imports dynamiques (pages chargées à la demande).
        while (queue.length && seen.size < 120) {
            const a = queue.shift();
            const r = await request(a);
            all += r.text;
            for (const m of r.text.matchAll(/["'(/](assets\/[A-Za-z0-9._-]+\.js)/g)) {
                const p = '/' + m[1];
                if (!seen.has(p)) { seen.add(p); queue.push(p); }
            }
        }
        scanForSecrets(`JavaScript public du site (${seen.size} fichiers)`, all);
    } else if (!distDir) {
        add('Fuites de secrets', 'JavaScript public', 'na', 'serveur de dev : utilisez --dist dist pour analyser le build');
    }
    if (distDir) {
        const dir = path.resolve(distDir, 'assets');
        if (!fs.existsSync(dir)) {
            add('Fuites de secrets', `Build local (${distDir})`, 'fail', 'dossier introuvable : lancez npm run build');
        } else {
            const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
            const all = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf-8')).join('\n');
            scanForSecrets(`Build local ${distDir}/ (${files.length} fichiers JS)`, all);
        }
    }
}

function print() {
    const icon = { ok: '✅', fail: '❌', na: '➖' };
    console.log(`\n=== Vérification de ${base} — ${new Date().toLocaleString('fr-FR')} ===`);
    let group = '';
    for (const c of checks) {
        if (c.group !== group) { group = c.group; console.log(`\n[${group}]`); }
        console.log(`${icon[c.status]} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    }
    const fails = checks.filter((c) => c.status === 'fail').length;
    const oks = checks.filter((c) => c.status === 'ok').length;
    console.log(`\nRésultat : ${oks} OK, ${fails} échec(s), ${checks.length - oks - fails} non applicable(s)`);
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ base, date: new Date().toISOString(), checks }, null, 2));
    process.exit(fails ? 1 : 0);
}

await checkPages();
await checkHeaders();
await checkSmtp();
await checkApiSecurity();
await checkBundle();
print();
