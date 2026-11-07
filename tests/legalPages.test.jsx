// @vitest-environment happy-dom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { PLAN_CATALOG } from '../shared/plans.js';
import { detectBrowserLanguage, detectLanguageFromIP } from '../src/i18n/detectLanguage';
import MentionsLegales from '../src/pages/MentionsLegales/MentionsLegales';
import CGV from '../src/pages/CGV/CGV';
import Confidentialite from '../src/pages/Confidentialite/Confidentialite';
import Footer from '../src/components/Footer/Footer';

const appSource = fs.readFileSync(path.resolve(__dirname, '../src/App.jsx'), 'utf-8');
const norm = (s) => s.replace(/[\u202F\u00A0]/g, ' ');

function wrap(ui, initial = '/') {
    return render(
        <MemoryRouter initialEntries={[initial]}>
            <LanguageProvider>{ui}</LanguageProvider>
        </MemoryRouter>
    );
}

describe('routes légales (App.jsx)', () => {
    test('déclare /cgv et /confidentialite en lazy dans PublicLayout', () => {
        expect(appSource).toContain("lazyWithRetry(() => import('./pages/CGV/CGV'))");
        expect(appSource).toContain("lazyWithRetry(() => import('./pages/Confidentialite/Confidentialite'))");
        expect(appSource).toContain('<Route path="/cgv" element={<PublicLayout><CGV /></PublicLayout>} />');
        expect(appSource).toContain('<Route path="/confidentialite" element={<PublicLayout><Confidentialite /></PublicLayout>} />');
        expect(appSource).toContain('<CookieConsent />');
    });

    test('/about redirige vers /a-propos', () => {
        expect(appSource).toContain('<Route path="/about" element={<Navigate to="/a-propos" replace />} />');
        function Where() { return <div data-testid="where">{useLocation().pathname}</div>; }
        render(
            <MemoryRouter initialEntries={['/about']}>
                <Routes>
                    <Route path="/about" element={<Navigate to="/a-propos" replace />} />
                    <Route path="/a-propos" element={<Where />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByTestId('where').textContent).toBe('/a-propos');
    });
});

describe('pages légales', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.localStorage.setItem('dpc_lang', 'fr');
    });

    test('mentions légales : données société, date fixe, lien confidentialité, TVA à compléter', () => {
        wrap(<MentionsLegales />);
        const text = document.body.textContent;
        expect(text).toContain('CASSIN LUDOVIC');
        expect(text).toContain('RCS Toulouse 101 512 531');
        expect(text).toContain('AG/DOM/2026/06');
        expect(text).toContain('En vigueur au 5 novembre 2026');
        expect(text).toContain('440 N Barranca Ave #4133, Covina, CA 91723');
        expect(text).toContain('N° de TVA intracommunautaire : FR91101512531');
        expect(screen.getByRole('link', { name: 'Politique de confidentialité' }).getAttribute('href')).toBe('/confidentialite');
    });

    test('CGV : texte définitif (20 articles), prix et quotas issus de PLAN_CATALOG', () => {
        wrap(<CGV />);
        expect(screen.queryByText(/Projet — à faire valider par un juriste/)).toBeNull();
        expect(screen.getByText('Article 1 – Identification du prestataire')).toBeInTheDocument();
        expect(screen.getByText('Article 20 – Droit applicable et litiges')).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(20);
        const prices = norm(screen.getByTestId('cgv-formules-8').textContent);
        expect(prices).toBe(norm('Prix mensuel HT16,00 €24,00 €38,00 €'));
        expect(norm(screen.getByTestId('cgv-formules-5').textContent)).toBe(norm('Numérisation du contenu du courrierNon40 plis par mois100 plis par mois'));
        expect(norm(screen.getByTestId('cgv-extras-0').textContent)).toContain('0,50 € par pli');
        expect(document.body.textContent).toContain('FR91101512531');
        expect(document.body.textContent).toContain('CGV en vigueur au 06/11/2026.');
    });

    test('confidentialité : bandeau projet, sous-traitants, durées à compléter', () => {
        wrap(<Confidentialite />);
        expect(screen.getByText(/Projet — à faire valider par un juriste/)).toBeInTheDocument();
        const text = document.body.textContent;
        for (const name of ['Clerk', 'Stripe', 'PlanetScale', 'Cloudinary', 'Vercel', 'Gmail', 'Calendly']) {
            expect(text).toContain(name);
        }
        expect(text).toContain('[À COMPLÉTER — durée légale à confirmer]');
        expect(text).toContain('contact@domiciliation-pas-cher.com');
    });

    test('pied de page : CGV et confidentialité pointent vers leurs pages', () => {
        wrap(<Footer />);
        const legal = document.querySelector('.footer-legal');
        expect(within(legal).getByRole('link', { name: 'CGV' }).getAttribute('href')).toBe('/cgv');
        expect(within(legal).getByRole('link', { name: 'Politique de confidentialité' }).getAttribute('href')).toBe('/confidentialite');
        expect(within(legal).getByRole('button', { name: 'Gérer les cookies' })).toBeInTheDocument();
    });
});

describe('détection de langue sans appel tiers', () => {
    test('utilise uniquement navigator.languages / language', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        expect(detectBrowserLanguage({ languages: ['ru-RU'], language: 'ru-RU' })).toBe('ru');
        expect(detectBrowserLanguage({ languages: ['uk-UA', 'en-GB'], language: 'uk-UA' })).toBe('en');
        expect(detectBrowserLanguage({ languages: ['uk-UA'], language: 'uk-UA' })).toBe('fr');
        expect(detectBrowserLanguage({ languages: ['fr-FR', 'en-US'], language: 'fr-FR' })).toBe('fr');
        expect(detectBrowserLanguage({ language: 'de-DE' })).toBe('fr');
        expect(detectBrowserLanguage(null)).toBe('fr');
        await expect(detectLanguageFromIP()).resolves.toMatch(/^(fr|en|ru)$/);
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });
});
