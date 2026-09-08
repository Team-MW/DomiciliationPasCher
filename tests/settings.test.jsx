// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { updateClientAddress, updateClientExtraInfo } = vi.hoisted(() => ({
    updateClientAddress: vi.fn().mockResolvedValue({ id: 'cli_1', address: '2 rue Perso 31000 Toulouse' }),
    updateClientExtraInfo: vi.fn().mockResolvedValue({
        adressePerso: '2 rue Perso 31000 Toulouse',
        adresseReexp: '8 rue Reexp 75001 Paris',
    }),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: { updateClientAddress, updateClientExtraInfo },
}));

vi.mock('../src/i18n/detectLanguage', () => ({
    detectLanguageFromIP: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/components/AddressAutocomplete/AddressAutocomplete', () => ({
    default: ({ value, onChange, placeholder }) => (
        <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    ),
}));

import { LanguageProvider } from '../src/i18n/LanguageContext';
import Settings from '../src/pages/EspaceClient/components/Settings.jsx';

const renderSettings = (clientData, setClientData = vi.fn()) => render(
    <LanguageProvider>
        <Settings clientData={clientData} setClientData={setClientData} />
    </LanguageProvider>
);

describe('Paramètres — adresses distinctes', () => {
    beforeEach(() => {
        localStorage.setItem('dpc_lang', 'fr');
        updateClientAddress.mockClear();
        updateClientExtraInfo.mockClear();
    });

    it('affiche l’adresse personnelle et l’adresse de réexpédition séparément', () => {
        renderSettings({
            id: 'cli_1',
            address: '1 rue Maison 31000 Toulouse',
            extra_info: {
                adressePerso: '1 rue Maison 31000 Toulouse',
                adresseReexp: '99 rue Bureau 75001 Paris',
            },
        });
        expect(screen.getByText('Adresse personnelle (résidence)')).toBeInTheDocument();
        expect(screen.getByText('Adresse de réexpédition')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Numéro, rue, code postal/)).toHaveValue('1 rue Maison 31000 Toulouse');
        expect(screen.getByPlaceholderText(/Où envoyer les originaux/)).toHaveValue('99 rue Bureau 75001 Paris');
    });

    it('enregistre les deux adresses sans les confondre', async () => {
        const setClientData = vi.fn();
        renderSettings({
            id: 'cli_1',
            address: '1 rue Maison 31000 Toulouse',
            extra_info: { adressePerso: '1 rue Maison 31000 Toulouse' },
        }, setClientData);

        fireEvent.change(screen.getByPlaceholderText(/Numéro, rue, code postal/), {
            target: { value: '2 rue Perso 31000 Toulouse' },
        });
        fireEvent.change(screen.getByPlaceholderText(/Où envoyer les originaux/), {
            target: { value: '8 rue Reexp 75001 Paris' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => {
            expect(updateClientAddress).toHaveBeenCalledWith('cli_1', '2 rue Perso 31000 Toulouse');
        });
        expect(updateClientExtraInfo).toHaveBeenCalledWith('cli_1', {
            adressePerso: '2 rue Perso 31000 Toulouse',
            adresseReexp: '8 rue Reexp 75001 Paris',
        });
        expect(await screen.findByText('Adresses mises à jour.')).toBeInTheDocument();
    });

    it('refuse d’enregistrer si le dossier n’est pas encore un client', async () => {
        renderSettings({
            id: 'dem_1',
            isTemporary: true,
            address: '1 rue Maison 31000 Toulouse',
            extra_info: { adressePerso: '1 rue Maison 31000 Toulouse' },
        });
        fireEvent.change(screen.getByPlaceholderText(/Où envoyer les originaux/), {
            target: { value: '8 rue Reexp 75001 Paris' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
        expect(await screen.findByText(/encore en validation/)).toBeInTheDocument();
        expect(updateClientExtraInfo).not.toHaveBeenCalled();
        expect(updateClientAddress).not.toHaveBeenCalled();
    });
});
