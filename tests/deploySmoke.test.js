import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PLAN_CATALOG, planAmountTtc } from '../shared/plans.js';
import * as frontPlans from '../src/data/plans.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf-8');
}

function listApiHandlers(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) {
            out.push(...listApiHandlers(full));
        } else if (name.endsWith('.js') && !name.startsWith('_')) {
            out.push(full);
        }
    }
    return out;
}

describe('filet de déploiement', () => {
    it('expose toutes les routes critiques dans App.jsx', () => {
        const app = read('src/App.jsx');
        const routes = [
            'path="/"',
            'path="/tarifs"',
            'path="/villes"',
            'path="/services"',
            'path="/a-propos"',
            'path="/rendez-vous"',
            'path="/offre"',
            'path="/connexion"',
            'path="/inscription"',
            'path="/app/espace-client"',
            'path="/app/admin"',
            'path="/souscription"',
            'path="/mentions-legales"',
            'path="/fiches-pratiques"',
            'path="/fiches-pratiques/:slug"',
            'path="/espace-client"',
            'path="/admin"',
        ];
        for (const route of routes) {
            expect(app, `route manquante: ${route}`).toContain(route);
        }
        expect(app).toContain('RedirectKeepSearch to="/app/espace-client"');
        expect(app).toContain('RedirectKeepSearch to="/app/admin"');
    });

    it('chaque handler API exporte une fonction par défaut', () => {
        const handlers = listApiHandlers(path.join(root, 'api'));
        expect(handlers.length).toBeGreaterThan(8);
        for (const file of handlers) {
            const src = fs.readFileSync(file, 'utf-8');
            expect(src, path.relative(root, file)).toMatch(/export default (async )?function/);
        }
    });

    it('le catalogue de forfaits est complet et réexporté côté front', () => {
        expect(Object.keys(PLAN_CATALOG).sort()).toEqual(['essentiel', 'physique', 'scan-plus']);
        for (const plan of Object.values(PLAN_CATALOG)) {
            expect(plan.id).toBeTruthy();
            expect(plan.name).toBeTruthy();
            expect(typeof plan.ht).toBe('number');
            expect(plan.ht).toBeGreaterThan(0);
            expect(plan.offre).toBeTruthy();
            expect(planAmountTtc(plan.ht, 'month')).toBe(Math.round(plan.ht * 1.2 * 100) / 100);
        }
        expect(frontPlans.PLAN_CATALOG).toBe(PLAN_CATALOG);
        expect(frontPlans.resolvePlanId).toBeTypeOf('function');
        expect(frontPlans.canRequestPhysicalForward).toBeTypeOf('function');
    });

    it('Vercel réécrit le SPA et planifie le cron impayés', () => {
        const vercel = JSON.parse(read('vercel.json'));
        expect(vercel.rewrites).toEqual([
            { source: '/(.*)', destination: '/index.html' },
        ]);
        expect(vercel.crons).toEqual([
            { path: '/api/cron/reminders', schedule: '0 * * * *' },
        ]);
    });

    it('le plugin Vite délègue les GET Stripe au vrai handler', () => {
        const vite = read('vite.config.js');
        for (const name of ['stripe-failed-payments', 'get-payment-method', 'stripe-customers', 'verify-session']) {
            expect(vite).toContain(name);
        }
    });
});
