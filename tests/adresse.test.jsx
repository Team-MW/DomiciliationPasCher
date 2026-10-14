// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../src/i18n/detectLanguage', () => ({
    detectLanguageFromIP: vi.fn().mockResolvedValue(null),
}));

import { LanguageProvider } from '../src/i18n/LanguageContext';
import Adresse from '../src/pages/EspaceClient/components/Adresse.jsx';

describe('Onglet Adresse — personnelle vs réexpédition', () => {
    beforeEach(() => {
        localStorage.setItem('dpc_lang', 'fr');
    });

    it('affiche les deux adresses distinctes, pas seulement le siège', () => {
        const setActiveTab = vi.fn();
        render(
            <LanguageProvider>
                <Adresse
                    setActiveTab={setActiveTab}
                    clientData={{
                        company: 'SAS Test',
                        address: '1 rue Maison 31000 Toulouse',
                        extra_info: {
                            adressePerso: '1 rue Maison 31000 Toulouse',
                            adresseReexp: '99 rue Bureau 75001 Paris',
                        },
                    }}
                />
            </LanguageProvider>
        );
        expect(screen.getByText('Adresse de Domiciliation')).toBeInTheDocument();
        expect(screen.getByText('Adresse personnelle')).toBeInTheDocument();
        expect(screen.getByText('Adresse de réexpédition')).toBeInTheDocument();
        expect(screen.getByText('1 rue Maison 31000 Toulouse')).toBeInTheDocument();
        expect(screen.getByText('99 rue Bureau 75001 Paris')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Modifier dans Paramètres/ }));
        expect(setActiveTab).toHaveBeenCalledWith('settings');
    });
});
