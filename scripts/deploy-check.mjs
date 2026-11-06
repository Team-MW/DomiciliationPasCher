/**
 * Contrôles statiques rapides (étape 1 de npm run verify) : routes, forfaits, prix, config Vercel, routes API.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_CATALOG, planAmountTtc, canRequestPhysicalForward, resolvePlanId } from '../shared/plans.js';
import * as frontPlans from '../src/data/plans.js';
import { MEETING_TYPES, MEETING_DURATIONS, meetingPriceHt } from '../src/utils/meetingPrices.js';
import { resolveApiHandlerFile } from '../vite.config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf-8');

function listApiHandlers(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) out.push(...listApiHandlers(full));
        else if (name.endsWith('.js') && !name.startsWith('_')) out.push(full);
    }
    return out;
}

const app = read('src/App.jsx');
for (const route of [
    'path="/"', 'path="/tarifs"', 'path="/villes"', 'path="/services"', 'path="/a-propos"',
    'path="/rendez-vous"', 'path="/offre"', 'path="/connexion"', 'path="/inscription"',
    'path="/app/espace-client"', 'path="/app/admin"', 'path="/souscription"',
    'path="/mentions-legales"', 'path="/fiches-pratiques"', 'path="/fiches-pratiques/:slug"',
    'path="/espace-client"', 'path="/admin"', 'path="/cgv"', 'path="/confidentialite"',
]) {
    assert(app.includes(route), `route manquante: ${route}`);
}
assert(app.includes('RedirectKeepSearch to="/app/espace-client"'));
assert(app.includes('RedirectKeepSearch to="/app/admin"'));

const handlers = listApiHandlers(path.join(root, 'api'));
assert(handlers.length > 8, 'trop peu de handlers API');
for (const file of handlers) {
    assert(/export default (async )?function/.test(fs.readFileSync(file, 'utf-8')), path.relative(root, file));
}

assert.deepEqual(Object.keys(PLAN_CATALOG).sort(), ['essentiel', 'physique', 'scan-plus']);
for (const plan of Object.values(PLAN_CATALOG)) {
    assert(plan.id && plan.name && plan.offre && plan.ht > 0);
    assert.equal(planAmountTtc(plan.ht, 'month'), Math.round(plan.ht * 1.2 * 100) / 100);
}
assert.equal(frontPlans.PLAN_CATALOG, PLAN_CATALOG);
assert.equal(typeof frontPlans.resolvePlanId, 'function');

const vercel = JSON.parse(read('vercel.json'));
// Une seule réécriture SPA vers index.html. Elle doit couvrir toutes les pages du site,
// et jamais /api/* : une route d'API inconnue répond 404 au lieu de renvoyer la page d'accueil
// (avant, '/(.*)' faisait passer une API absente ou mal nommée pour un succès HTTP 200).
assert.equal(vercel.rewrites?.length, 1, 'une seule réécriture attendue');
assert.equal(vercel.rewrites[0].destination, '/index.html');
const spaRewrite = new RegExp(`^${vercel.rewrites[0].source}$`);
for (const page of ['/', '/tarifs', '/connexion', '/app/admin', '/app/espace-client', '/fiches-pratiques/un-article', '/cgv', '/admin']) {
    assert(spaRewrite.test(page), `la page ${page} doit être servie par index.html`);
}
for (const api of ['/api/data', '/api/email', '/api/cron/reminders', '/api/inexistant']) {
    assert(!spaRewrite.test(api), `${api} ne doit pas être réécrit vers index.html`);
}
assert.deepEqual(vercel.crons, [{ path: '/api/cron/reminders', schedule: '0 * * * *' }]);
for (const header of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy']) {
    assert(JSON.stringify(vercel.headers || []).includes(header), `en-tête de sécurité manquant : ${header}`);
}

// Le serveur de dev exécute les vrais handlers de api/ : chaque route doit s'y résoudre,
// et les modules internes (_*.js) ne doivent jamais être servis.
for (const name of ['stripe-failed-payments', 'get-payment-method', 'stripe-customers', 'verify-session', 'data', 'email', 'stripe-webhook', 'cron/reminders']) {
    const file = resolveApiHandlerFile(`/api/${name}`, root);
    assert(file && file.endsWith(path.join('api', `${name}.js`)), `route de dev introuvable : /api/${name}`);
}
for (const internal of ['/api/_db', '/api/_auth', '/api/../package']) {
    assert.equal(resolveApiHandlerFile(internal, root), null, `${internal} ne doit pas être exposé`);
}

assert.equal(canRequestPhysicalForward('Essentiel'), false);
assert.equal(canRequestPhysicalForward('Scan+'), true);
assert.equal(canRequestPhysicalForward('Physique+'), true);
assert.equal(resolvePlanId('Essentiel'), 'essentiel');

assert.equal(meetingPriceHt(MEETING_TYPES.room, MEETING_DURATIONS.hour), 25);
assert.equal(meetingPriceHt(MEETING_TYPES.room, MEETING_DURATIONS.morning), 75);
assert.equal(meetingPriceHt(MEETING_TYPES.room, MEETING_DURATIONS.fullday), 140);
assert.equal(meetingPriceHt(MEETING_TYPES.office, MEETING_DURATIONS.fullday), 140);

console.log('deploy-check: ok');
