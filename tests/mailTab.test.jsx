// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { updateReexpeditionStatus, addMessage } = vi.hoisted(() => ({
    updateReexpeditionStatus: vi.fn().mockResolvedValue({ id: 'rexp_1', status: 'expediee' }),
    addMessage: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: { updateReexpeditionStatus, addMessage },
}));

vi.mock('../src/utils/emailService', () => ({
    sendReexpeditionStatusEmail: vi.fn().mockResolvedValue(true),
}));

import MailTab from '../src/pages/Admin/components/MailTab.jsx';

describe('MailTab admin — réexpéditions', () => {
    beforeEach(() => {
        updateReexpeditionStatus.mockClear();
        addMessage.mockClear();
    });

    it('affiche une demande et la marque expédiée', async () => {
        const onUpdate = vi.fn();
        render(
            <MailTab
                reexpeditions={[{
                    id: 'rexp_1',
                    clientId: 'cli_1',
                    clientName: 'SAS Jean',
                    clientContact: 'Jean Dupont - 📞 0612345678',
                    clientEmail: 'jean@test.fr',
                    clientPlan: 'Scan+',
                    address: '12 rue Test 31000 Toulouse',
                    notes: 'Recommandés',
                    status: 'en_attente',
                    createdAt: '2026-09-07T10:00:00.000Z',
                }]}
                onUpdate={onUpdate}
                showAlert={vi.fn()}
            />
        );

        expect(screen.getByText('12 rue Test 31000 Toulouse')).toBeInTheDocument();
        expect(screen.getByText('SAS Jean')).toBeInTheDocument();
        expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
        expect(screen.queryByText(/📞/)).not.toBeInTheDocument();
        expect(screen.getByText('jean@test.fr')).toBeInTheDocument();
        expect(screen.getByText('Forfait Scan+')).toBeInTheDocument();
        expect(screen.getByText('EN ATTENTE')).toBeInTheDocument();
        expect(screen.getByText(/À traiter \(1\)/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Marquer expédiée' }));
        await waitFor(() => expect(updateReexpeditionStatus).toHaveBeenCalledWith('rexp_1', 'expediee'));
        expect(onUpdate).toHaveBeenCalled();
    });

    it('affiche un état vide', () => {
        render(<MailTab reexpeditions={[]} onUpdate={vi.fn()} showAlert={vi.fn()} />);
        expect(screen.getByText(/Aucune demande de réexpédition/)).toBeInTheDocument();
    });

    it('affiche la demande réelle de test Courrier', () => {
        render(
            <MailTab
                reexpeditions={[{
                    id: 'rexp_test_1788784031859',
                    clientId: '1788434050702',
                    clientName: 'sasu',
                    clientContact: 'dazdaze zdeza - 📞 0787887878',
                    clientEmail: 'mwcreationv2@gmail.com',
                    clientPlan: 'Scan+',
                    address: '12 rue des Tests, 31000 Toulouse',
                    notes: 'Colis recommandé — test onglet Courrier',
                    status: 'en_attente',
                    createdAt: '2026-09-07T12:27:11.859Z',
                }]}
                onUpdate={vi.fn()}
                onSelectClient={vi.fn()}
            />
        );
        expect(screen.getByRole('heading', { name: 'Courrier & réexpéditions' })).toBeInTheDocument();
        expect(screen.getByText('sasu')).toBeInTheDocument();
        expect(screen.getByText('dazdaze zdeza')).toBeInTheDocument();
        expect(screen.getByText('mwcreationv2@gmail.com')).toBeInTheDocument();
        expect(screen.getByText('Forfait Scan+')).toBeInTheDocument();
        expect(screen.getByText('12 rue des Tests, 31000 Toulouse')).toBeInTheDocument();
        expect(screen.getByText('Colis recommandé — test onglet Courrier')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Marquer expédiée' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refuser' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ouvrir le dossier' })).toBeInTheDocument();
    });
});
