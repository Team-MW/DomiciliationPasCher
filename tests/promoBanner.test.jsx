// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import PromoBanner from '../src/components/PromoBanner/PromoBanner.jsx';
import { isPromoHiddenOn, PROMO_DISMISS_KEY } from '../src/components/PromoBanner/promoBannerRules.js';
import fr from '../src/i18n/fr.js';
import en from '../src/i18n/en.js';
import ru from '../src/i18n/ru.js';

const mount = (path) => render(<MemoryRouter initialEntries={[path]}><LanguageProvider><PromoBanner /></LanguageProvider></MemoryRouter>);

beforeEach(() => {
    cleanup();
    window.localStorage.setItem('dpc_lang', 'fr');
    window.sessionStorage.clear();
    document.documentElement.style.removeProperty('--promo-h');
});

describe('Bandeau promo', () => {
    it.each(['/', '/tarifs', '/villes', '/services', '/offre', '/cgv', '/fiches-pratiques/tech', '/rendez-vous'])('affiché sur %s, avec le lien vers les tarifs', (path) => {
        mount(path);
        expect(screen.getByRole('region')).toHaveTextContent(/-20 %/);
        expect(screen.getByRole('link', { name: 'Voir les offres' })).toHaveAttribute('href', '/tarifs');
    });

    it.each(['/souscription', '/inscription', '/connexion', '/app/espace-client', '/app/admin', '/espace-client'])('masqué dès que l’inscription commence ou dans un espace connecté : %s', (path) => {
        mount(path);
        expect(screen.queryByRole('region')).toBeNull();
        expect(document.documentElement.style.getPropertyValue('--promo-h')).toBe('0px');
        expect(isPromoHiddenOn(path)).toBe(true);
    });

    it('ne masque pas une page dont le nom commence pareil (ex. /applications)', () => {
        expect(isPromoHiddenOn('/applications')).toBe(false);
    });

    it('la croix le ferme pour toute la visite', () => {
        mount('/');
        fireEvent.click(screen.getByRole('button', { name: 'Fermer le bandeau' }));
        expect(screen.queryByRole('region')).toBeNull();
        expect(window.sessionStorage.getItem(PROMO_DISMISS_KEY)).toBe('1');
        cleanup();
        mount('/tarifs');
        expect(screen.queryByRole('region')).toBeNull();
    });

    it('texte -20 % annuel en français, traduit en anglais et en russe', () => {
        // Demande du 12/11 : pas de mois offert, seulement -20 % en annuel.
        expect(fr.promoBanner.desktop).toBe('-20 % sur tous les abonnements en paiement annuel');
        expect(JSON.stringify(fr.promoBanner)).not.toMatch(/BIENVENUE|offert/);
        for (const t of [en, ru]) {
            expect(Object.keys(t.promoBanner).sort()).toEqual(Object.keys(fr.promoBanner).sort());
            expect(t.promoBanner.desktop).toMatch(/20/);
            expect(JSON.stringify(t.promoBanner)).not.toMatch(/BIENVENUE/);
        }
    });
});
