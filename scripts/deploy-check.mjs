/**
 * Vérifs de déploiement sans Vitest (les workers Vitest timeout sur ce Mac / iCloud).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_CATALOG, planAmountTtc, canRequestPhysicalForward, resolvePlanId } from '../shared/plans.js';
import * as frontPlans from '../src/data/plans.js';
import { MEETING_TYPES, MEETING_DURATIONS, meetingPriceHt } from '../src/utils/meetingPrices.js';

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
    'path="/espace-client"', 'path="/admin"',
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
assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
assert.deepEqual(vercel.crons, [{ path: '/api/cron/reminders', schedule: '0 * * * *' }]);

const vite = read('vite.config.js');
for (const name of ['stripe-failed-payments', 'get-payment-method', 'stripe-customers', 'verify-session']) {
    assert(vite.includes(name), name);
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
