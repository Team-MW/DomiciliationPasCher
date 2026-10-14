// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { fichesData } from '../src/data/fichesData';
import fr from '../src/i18n/fr.js';
import en from '../src/i18n/en.js';
import ru from '../src/i18n/ru.js';
import FichesPratiques from '../src/pages/FichesPratiques/FichesPratiques.jsx';
import FicheDetail from '../src/pages/FicheDetail/FicheDetail.jsx';

vi.mock('../src/i18n/detectLanguage', () => ({
    detectLanguageFromIP: vi.fn().mockResolvedValue(null),
}));

const slugs = Object.keys(fichesData);

function renderAt(path, lang = 'fr') {
    window.scrollTo = vi.fn();
    window.localStorage.setItem('dpc_lang', lang);
    return render(
        <MemoryRouter initialEntries={[path]}>
            <LanguageProvider>
                <Routes>
                    <Route path="/fiches-pratiques" element={<FichesPratiques />} />
                    <Route path="/fiches-pratiques/:slug" element={<FicheDetail />} />
                </Routes>
            </LanguageProvider>
        </MemoryRouter>
    );
}

describe('fiches pratiques — traductions', () => {
    beforeEach(() => {
        window.localStorage.setItem('dpc_lang', 'fr');
    });

    it('a les mêmes slugs dans fichesData et dans fr / en / ru', () => {
        for (const lang of [fr, en, ru]) {
            const translated = Object.keys(lang.fichesPratiques.fiches).sort();
            expect(translated).toEqual([...slugs].sort());
        }
    });

    it('chaque fiche a un titre, une catégorie et un contenu dans les 3 langues', () => {
        for (const [langName, bundle] of [['fr', fr], ['en', en], ['ru', ru]]) {
            for (const slug of slugs) {
                const fiche = bundle.fichesPratiques.fiches[slug];
                expect(fiche.title?.trim(), `${langName} ${slug} title`).toBeTruthy();
                expect(fiche.category?.trim(), `${langName} ${slug} category`).toBeTruthy();
                expect(fiche.content?.trim(), `${langName} ${slug} content`).toBeTruthy();
            }
        }
    });

    it('affiche la liste en français avec toutes les fiches', () => {
        renderAt('/fiches-pratiques', 'fr');
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Fiches/i);
        expect(screen.getByText(fr.fichesPratiques.cta.button)).toBeInTheDocument();
        for (const slug of slugs) {
            const link = screen.getByRole('link', { name: fr.fichesPratiques.fiches[slug].title });
            expect(link.getAttribute('href')).toBe(`/fiches-pratiques/${slug}`);
        }
    });

    it('affiche la liste en anglais', () => {
        renderAt('/fiches-pratiques', 'en');
        expect(screen.getByText(en.fichesPratiques.eyebrow)).toBeInTheDocument();
        expect(screen.getByText(en.fichesPratiques.fiches['formes-juridiques'].title)).toBeInTheDocument();
        expect(screen.getByText(en.fichesPratiques.cta.button)).toBeInTheDocument();
        expect(screen.queryByText(fr.fichesPratiques.cta.button)).toBeNull();
    });

    it('affiche la liste en russe', () => {
        renderAt('/fiches-pratiques', 'ru');
        expect(screen.getByText(ru.fichesPratiques.eyebrow)).toBeInTheDocument();
        expect(screen.getByText(ru.fichesPratiques.fiches['les-adresses'].title)).toBeInTheDocument();
        expect(screen.getByText(ru.fichesPratiques.cta.button)).toBeInTheDocument();
    });

    it.each(slugs)('détail %s traduit en anglais', (slug) => {
        renderAt(`/fiches-pratiques/${slug}`, 'en');
        const fiche = en.fichesPratiques.fiches[slug];
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(fiche.title);
        expect(screen.getByText(fiche.content)).toBeInTheDocument();
        expect(screen.getByText(en.fichesPratiques.backLink)).toBeInTheDocument();
        expect(screen.getByText(en.fichesPratiques.sidebar.needHelp)).toBeInTheDocument();
        expect(screen.queryByText(fr.fichesPratiques.backLink)).toBeNull();
    });

    it('redirige une fiche inconnue vers la liste', () => {
        renderAt('/fiches-pratiques/n-existe-pas', 'fr');
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Fiches/i);
    });
});
