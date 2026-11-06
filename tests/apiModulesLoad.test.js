// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Filet anti-panne pour les fonctions serveur (Vercel) :
 *  1. chaque fichier de api/ se charge sans erreur (import cassé, faute de frappe, dépendance absente) ;
 *  2. chaque route répond proprement (4xx) à une requête invalide et anonyme, sans planter
 *     et sans jamais répondre 2xx ou 500.
 * Aucun secret n'est défini : on vérifie aussi qu'une variable manquante ne fait pas tomber le module.
 */
const apiDir = path.resolve(__dirname, '..', 'api');

function listJs(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return listJs(full);
        return entry.name.endsWith('.js') ? [full] : [];
    });
}

const allFiles = listJs(apiDir);
const routes = allFiles.filter((f) => !path.basename(f).startsWith('_'));
const rel = (f) => path.relative(apiDir, f);

function mockRes() {
    const res = { statusCode: 200, headers: {}, body: undefined, ended: false };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; res.ended = true; return res; };
    res.send = (data) => { res.body = data; res.ended = true; return res; };
    res.end = (data) => { res.body = data; res.ended = true; return res; };
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; return res; };
    res.redirect = (code, url) => { res.statusCode = typeof code === 'number' ? code : 302; res.headers.location = url || code; res.ended = true; return res; };
    return res;
}

const SECRET_KEYS = ['DATABASE_HOST', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'VITE_DATABASE_HOST', 'VITE_DATABASE_USERNAME',
    'VITE_DATABASE_PASSWORD', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CLERK_SECRET_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CRON_SECRET'];
const saved = {};

beforeAll(() => {
    for (const k of SECRET_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
});
afterAll(() => {
    for (const k of SECRET_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
});

describe('Fonctions serveur (api/) : chargement', () => {
    it('le dossier api/ contient bien les routes attendues', () => {
        const names = routes.map(rel);
        for (const expected of ['data.js', 'email.js', 'checkout.js', 'verify-session.js', 'stripe-webhook.js', 'cron/reminders.js']) {
            expect(names, expected).toContain(expected);
        }
    });

    it.each(allFiles.map((f) => [rel(f), f]))('%s se charge sans erreur', async (_name, file) => {
        const mod = await import(pathToFileURL(file).href);
        if (!path.basename(file).startsWith('_')) {
            expect(typeof mod.default, 'export default doit être une fonction').toBe('function');
        }
    });
});

describe('Fonctions serveur (api/) : requête anonyme invalide', () => {
    // Requête sans jeton, avec une méthode et un corps absurdes : jamais de succès, jamais de plantage.
    it.each(routes.map((f) => [rel(f), f]))('%s répond 4xx sans planter', async (_name, file) => {
        const { default: handler } = await import(pathToFileURL(file).href);
        const req = {
            method: 'PATCH',
            url: `/api/${rel(file).replace(/\.js$/, '')}`,
            headers: { host: 'localhost' },
            query: {},
            body: { method: '__inconnu__', args: 'pas-un-tableau' },
            on: () => {},
        };
        const res = mockRes();
        await handler(req, res); // une exception fait échouer le test
        expect(res.statusCode, `${rel(file)} a répondu ${res.statusCode} : ${JSON.stringify(res.body)?.slice(0, 120)}`).toBeGreaterThanOrEqual(400);
        expect(res.statusCode, `${rel(file)} a répondu ${res.statusCode} : ${JSON.stringify(res.body)?.slice(0, 120)}`).toBeLessThan(500);
    });
});
