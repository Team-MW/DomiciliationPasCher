// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../src/i18n/LanguageContext', () => ({ useTranslation: () => ({ tr: { common: {} }, t: (k) => k }) }));

import ErrorBoundary from '../src/components/ErrorBoundary/ErrorBoundary.jsx';
import { loadWithRetry } from '../src/utils/lazyWithRetry.js';
import { normalizeFrenchPhone, isValidFrenchPhone } from '../src/pages/Souscription/souscriptionPhone.js';
import { dropPlaceholders, HEAVY_PLACEHOLDER, sanitizeClientExtra } from '../api/_client-extra.js';
import { createDataService } from '../api/_data-service.js';
import EmailHistory from '../src/pages/Admin/components/EmailHistory.jsx';

describe('Téléphone : saisi touche par touche', () => {
    const typeSlowly = (text) => [...text].reduce((field, key) => normalizeFrenchPhone(field + key), '');
    it.each(['+33612345678', '33612345678', '0033612345678', '06 12 34 56 78', '+33 6 12 34 56 78'])('« %s » tapé caractère par caractère → 0612345678', (typed) => {
        const result = typeSlowly(typed);
        expect(result).toBe('0612345678');
        expect(isValidFrenchPhone(result)).toBe(true);
    });
});

describe('Téléphone : collé tel quel (avec « (0) » du préfixe international)', () => {
    it.each(['+33 (0)6 12 34 56 78', '+33 6 12 34 56 78', '0033 6 12 34 56 78'])('« %s » → 0612345678', (pasted) => {
        expect(normalizeFrenchPhone(pasted)).toBe('0612345678');
    });
});

describe('Page blanche évitée : ErrorBoundary + rechargement unique', () => {
    it('une erreur d’affichage montre un message et un bouton « Recharger », jamais une page blanche', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const Boom = () => { throw new Error('chunk introuvable'); };
        render(<ErrorBoundary><Boom /></ErrorBoundary>);
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Recharger/i })).toBeInTheDocument();
    });

    it('page qui ne charge pas : un seul rechargement automatique, puis l’erreur remonte', async () => {
        sessionStorage.clear();
        const reload = vi.fn();
        Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
        const failing = () => Promise.reject(new Error('Failed to fetch dynamically imported module'));
        void loadWithRetry(failing); // 1er échec : recharge la page
        await new Promise((r) => setTimeout(r, 0));
        expect(reload).toHaveBeenCalledTimes(1);
        await expect(loadWithRetry(failing)).rejects.toThrow('Failed to fetch'); // 2e échec : pas de boucle de rechargements
        expect(reload).toHaveBeenCalledTimes(1);
        await expect(loadWithRetry(() => Promise.resolve({ default: () => null }))).resolves.toBeTruthy();
        expect(sessionStorage.getItem('dpc_chunk_reload')).toBeNull(); // succès : le garde est remis à zéro
    });

    it('App.jsx : toutes les pages en lazyWithRetry, protégées par ErrorBoundary', () => {
        const app = fs.readFileSync('src/App.jsx', 'utf8');
        expect(app).not.toMatch(/= lazy\(/);
        expect(app).toContain('<ErrorBoundary>');
    });
});

describe('Le marqueur de la liste allégée n’est jamais enregistré à la place d’un vrai fichier', () => {
    it('retiré des mises à jour (client, admin, service)', async () => {
        expect(dropPlaceholders({ a: 1, kbisUrl: HEAVY_PLACEHOLDER })).toEqual({ a: 1 });
        expect(sanitizeClientExtra({ kbisUrl: HEAVY_PLACEHOLDER, nom: 'Ada' })).toEqual({ nom: 'Ada' });
        const real = `data:application/pdf;base64,${'A'.repeat(100)}`;
        let written = null;
        const conn = { execute: vi.fn(async (sql, params) => {
            if (/^SELECT extra_info FROM clients/.test(sql)) return { rows: [{ extra_info: JSON.stringify({ kbisUrl: real, prenom: 'Ada' }) }] };
            if (/^UPDATE clients SET extra_info/.test(sql)) written = JSON.parse(params[0]);
            return { rows: [] };
        }) };
        await createDataService({ conn }).updateClientExtraInfo('c1', { prenom: 'Adaa', kbisUrl: HEAVY_PLACEHOLDER });
        expect(written).toEqual({ kbisUrl: real, prenom: 'Adaa' });
    });

    it('le bouton « Modifier les infos » attend la fiche complète ; la fiche est mémoïsée', () => {
        expect(fs.readFileSync('src/pages/Admin/components/DossierClient.jsx', 'utf8')).toContain('disabled={!detailsLoaded}');
        const admin = fs.readFileSync('src/pages/Admin/Admin.jsx', 'utf8');
        expect(admin).toContain('useMemo(');
        expect(admin).toContain('detailsLoaded={detailsLoaded}');
    });
});

describe('Historique des emails : un seul intitulé par jour (heure locale)', () => {
    beforeEach(() => { process.env.TZ = 'Europe/Paris'; });
    it('00h30 et 08h00 heure de Paris le même jour → un seul groupe ; « queued » n’est pas un échec', () => {
        const logs = [
            { id: '1', type: 'welcome', subject: 'A', to_email: 'a@b.fr', client_email: 'a@b.fr', status: 'sent', sent_at: '2026-11-05T23:30:00Z' },
            { id: '2', type: 'approval', subject: 'B', to_email: 'a@b.fr', client_email: 'a@b.fr', status: 'queued', sent_at: '2026-11-06T07:00:00Z' },
        ];
        const { container } = render(<EmailHistory logs={logs} clientEmail="a@b.fr" />);
        expect(container.querySelectorAll('.eh-day').length).toBe(1);
        expect(container.querySelectorAll('.eh-badge.is-ko').length).toBe(0);
    });
});

describe('Animations globales : elles existent sur toutes les pages', () => {
    it('spin, dpc-pulse et scaleIn sont dans index.css ; l’accueil utilise l’impulsion verte', () => {
        const css = fs.readFileSync('src/index.css', 'utf8');
        for (const name of ['spin', 'dpc-pulse', 'scaleIn']) expect(css).toContain(`@keyframes ${name}`);
        expect(fs.readFileSync('src/pages/Home/Home.jsx', 'utf8')).toContain("animation: 'dpc-pulse 2s infinite'");
    });
});

describe('Plan de l’URL', () => {
    it('?plan= accepte les noms commerciaux et le choix en cours est reporté dans l’URL', () => {
        const src = fs.readFileSync('src/pages/Souscription/Souscription.jsx', 'utf8');
        expect(src).toContain("resolvePlanId(searchParams.get('plan'))");
        expect(src).toContain('setSearchParams(next, { replace: true });');
        expect(src).toContain('payLockRef.current');
    });
});
