// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Tarifs from '../src/pages/Tarifs/Tarifs.jsx';

vi.mock('../src/i18n/detectLanguage', () => ({
    detectLanguageFromIP: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/components/CreationEntreprise/CreationEntrepriseSection', () => ({
    default: () => null,
}));

describe('page Tarifs — espaces de travail', () => {
    it('affiche salle et bureau au même tarif HT et un CTA vers la réservation', () => {
        window.localStorage.setItem('dpc_lang', 'fr');
        render(
            <MemoryRouter>
                <LanguageProvider>
                    <Tarifs />
                </LanguageProvider>
            </MemoryRouter>
        );

        expect(screen.getByText('Salle de Réunion')).toBeInTheDocument();
        expect(screen.getByText('Bureau Privatif')).toBeInTheDocument();
        // Salle et bureau ont le même tarif horaire (25 € HT), confirmé par le propriétaire.
        expect(screen.getAllByText('25€ HT').length).toBeGreaterThanOrEqual(2);
        const links = screen.getAllByRole('link', { name: /Réserver/ });
        expect(links.length).toBeGreaterThanOrEqual(2);
        for (const link of links) {
            expect(link.getAttribute('href')).toBe('/app/espace-client?tab=meeting');
        }
    });
});
