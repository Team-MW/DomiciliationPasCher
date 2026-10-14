// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { addClient } = vi.hoisted(() => ({
    addClient: vi.fn().mockResolvedValue({ id: '1' }),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: { addClient },
}));

import CreateClientModal from '../src/pages/Admin/components/CreateClientModal.jsx';

describe('CreateClientModal', () => {
    beforeEach(() => {
        addClient.mockClear();
        addClient.mockResolvedValue({ id: '1' });
    });

    it('submits a complete dossier and calls addClient then onCreated', async () => {
        const onCreated = vi.fn();
        const showAlert = vi.fn();

        render(
            <CreateClientModal
                onClose={vi.fn()}
                onCreated={onCreated}
                showAlert={showAlert}
            />
        );

        fireEvent.change(screen.getByPlaceholderText('ex: Jean Dupont'), { target: { value: 'Jean Dupont' } });
        fireEvent.change(screen.getByPlaceholderText('client@email.com'), { target: { value: 'jean.dupont@test.fr' } });
        fireEvent.change(screen.getByPlaceholderText('Jean'), { target: { value: 'Jean' } });
        fireEvent.change(screen.getByPlaceholderText('Dupont'), { target: { value: 'Dupont' } });
        fireEvent.change(screen.getByPlaceholderText('06 12 34 56 78'), { target: { value: '06 12 34 56 78' } });
        fireEvent.change(screen.getByPlaceholderText('12 rue de la Paix, 75000 Paris'), {
            target: { value: '12 rue de la Paix, 75000 Paris' },
        });
        fireEvent.change(screen.getByPlaceholderText('DPC SARL'), { target: { value: 'DPC SARL' } });
        fireEvent.change(screen.getByPlaceholderText('123 456 789 00012'), { target: { value: '12345678900012' } });

        fireEvent.click(screen.getByRole('button', { name: 'Créer le dossier complet' }));

        await waitFor(() => expect(addClient).toHaveBeenCalledTimes(1));
        const payload = addClient.mock.calls[0][0];
        expect(payload.name).toBe('Jean Dupont');
        expect(payload.email).toBe('jean.dupont@test.fr');
        expect(payload.company).toBe('DPC SARL');
        expect(payload.city).toBe('Toulouse');
        expect(payload.plan).toBe('Essentiel');
        expect(payload.address).toBe('12 rue de la Paix, 75000 Paris');
        expect(payload.phone).toBe('06 12 34 56 78');
        expect(payload.extra_info).toMatchObject({
            prenom: 'Jean',
            nom: 'Dupont',
            telephone: '06 12 34 56 78',
            adressePerso: '12 rue de la Paix, 75000 Paris',
            siren: '12345678900012',
            nomSociete: 'DPC SARL',
            offre: 'notification',
            typeProjet: 'creation',
        });
        expect(onCreated).toHaveBeenCalledTimes(1);
        expect(showAlert).not.toHaveBeenCalled();
    });

    it('shows a duplicate-email alert without closing', async () => {
        addClient.mockRejectedValue(new Error("Duplicate entry 'x' for key 'clients.email'"));
        const onCreated = vi.fn();
        const showAlert = vi.fn().mockResolvedValue(true);

        render(
            <CreateClientModal
                onClose={vi.fn()}
                onCreated={onCreated}
                showAlert={showAlert}
            />
        );

        fireEvent.change(screen.getByPlaceholderText('ex: Jean Dupont'), { target: { value: 'Jean Dupont' } });
        fireEvent.change(screen.getByPlaceholderText('client@email.com'), { target: { value: 'deja@test.fr' } });
        fireEvent.click(screen.getByRole('button', { name: 'Créer le dossier complet' }));

        await waitFor(() => expect(showAlert).toHaveBeenCalled());
        expect(showAlert.mock.calls[0][0]).toMatch(/déjà utilisée/i);
        expect(onCreated).not.toHaveBeenCalled();
    });
});
