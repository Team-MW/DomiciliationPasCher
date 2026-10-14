// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { addReexpeditionRequest, getClientReexpeditions, addMessage } = vi.hoisted(() => ({
    addReexpeditionRequest: vi.fn().mockResolvedValue({
        id: 'rexp_1',
        address: '12 rue Test 31000 Toulouse',
        notes: '',
        status: 'en_attente',
    }),
    getClientReexpeditions: vi.fn().mockResolvedValue([]),
    addMessage: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: { addReexpeditionRequest, getClientReexpeditions, addMessage },
}));

vi.mock('../src/utils/emailService', () => ({
    sendReexpeditionRequestEmail: vi.fn(),
}));

vi.mock('../src/i18n/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key) => {
            const map = {
                'espaceClient.mail.title': 'Boîte aux Lettres & Courriers',
                'espaceClient.mail.subtitle': 'subtitle',
                'espaceClient.mail.requestForward': 'Demander une réexpédition physique',
                'espaceClient.mail.forwardLocked': 'Réservé au forfait Scan+',
                'espaceClient.mail.forwardLockedHint': 'Pas inclus dans Essentiel.',
                'espaceClient.mail.upgradeCta': 'Passer à Scan+',
                'espaceClient.mail.totalLabel': 'Total',
                'espaceClient.mail.totalHint': 'hint',
                'espaceClient.mail.unreadLabel': 'Non lus',
                'espaceClient.mail.unreadHint': 'hint',
                'espaceClient.mail.scanLabel': 'Scan',
                'espaceClient.mail.scanHint': 'hint',
                'espaceClient.mail.filterAll': 'Tous ({n})',
                'espaceClient.mail.filterUnread': 'Non lus',
                'espaceClient.mail.filterRead': 'Lus ({n})',
                'espaceClient.mail.emptyTitle': 'Aucun courrier',
                'espaceClient.mail.emptyHint': 'hint',
                'espaceClient.mail.reexpTitle': 'Réexpédition postale physique',
                'espaceClient.mail.reexpIntro': 'intro',
                'espaceClient.mail.destLabel': 'Adresse de réexpédition',
                'espaceClient.mail.destPlaceholder': 'Ex: 12 Rue',
                'espaceClient.mail.destHint': 'Pas l’adresse personnelle.',
                'espaceClient.mail.useSavedForward': 'Adresse de réexpédition enregistrée',
                'espaceClient.mail.usePersonalOnce': 'Utiliser l’adresse personnelle (cette demande)',
                'espaceClient.mail.notesLabel': 'Notes',
                'espaceClient.mail.notesPlaceholder': 'notes',
                'espaceClient.mail.confirmSend': "Confirmer l'envoi postal",
                'espaceClient.mail.cancel': 'Annuler',
                'espaceClient.mail.destRequired': 'Indiquez une adresse',
                'espaceClient.mail.sending': 'Envoi…',
                'espaceClient.mail.reexpSuccessTitle': 'Demande enregistrée !',
                'espaceClient.mail.reexpSuccessHint': 'hint',
                'espaceClient.mail.chatMessage': 'Demande vers : {address}. Instructions : {notes}',
                'espaceClient.mail.noNotes': 'aucune',
                'espaceClient.mail.myRequests': 'Vos demandes',
                'espaceClient.mail.statusPending': 'En attente',
            };
            return map[key] || key;
        },
    }),
}));

import Mail from '../src/pages/EspaceClient/components/Mail.jsx';

describe('Mail — réexpédition physique', () => {
    beforeEach(() => {
        addReexpeditionRequest.mockClear();
        getClientReexpeditions.mockClear();
        addMessage.mockClear();
        getClientReexpeditions.mockResolvedValue([]);
    });

    it('désactive le bouton pour le forfait Essentiel', () => {
        render(<Mail mail={[]} clientData={{ id: 'cli_1', plan: 'Essentiel' }} setActiveTab={vi.fn()} />);
        const btn = screen.getByRole('button', { name: /Demander une réexpédition physique/ });
        expect(btn).toBeDisabled();
        fireEvent.click(btn);
        expect(screen.queryByText('Réexpédition postale physique')).not.toBeInTheDocument();
        expect(screen.getByText(/Pas inclus dans Essentiel/)).toBeInTheDocument();
    });

    it('envoie la demande à l’admin pour Scan+', async () => {
        render(<Mail mail={[]} clientData={{ id: 'cli_scan', plan: 'Scan+', email: 'scan@test.fr', name: 'Jean', company: 'SAS Jean' }} setActiveTab={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Demander une réexpédition physique/ }));
        expect(screen.getByText('Réexpédition postale physique')).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText('Ex: 12 Rue'), {
            target: { value: '10 rue de la Paix 75002 Paris' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Confirmer l'envoi postal/ }));

        await waitFor(() => expect(addReexpeditionRequest).toHaveBeenCalledWith('cli_scan', {
            address: '10 rue de la Paix 75002 Paris',
            notes: '',
        }));
        expect(addMessage).toHaveBeenCalled();
        expect(await screen.findByText('Demande enregistrée !')).toBeInTheDocument();
    });

    it('ne préremplit pas avec l’adresse personnelle', () => {
        render(<Mail mail={[]} clientData={{
            id: 'cli_scan',
            plan: 'Scan+',
            address: '1 rue Maison 31000 Toulouse',
            extra_info: { adressePerso: '1 rue Maison 31000 Toulouse' },
        }} setActiveTab={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Demander une réexpédition physique/ }));
        expect(screen.getByPlaceholderText('Ex: 12 Rue')).toHaveValue('');
        expect(screen.getByRole('button', { name: /Utiliser l’adresse personnelle/ })).toBeInTheDocument();
    });

    it('préremplit avec l’adresse de réexpédition enregistrée', () => {
        render(<Mail mail={[]} clientData={{
            id: 'cli_scan',
            plan: 'Scan+',
            address: '1 rue Maison 31000 Toulouse',
            extra_info: {
                adressePerso: '1 rue Maison 31000 Toulouse',
                adresseReexp: '99 rue Bureau 75001 Paris',
            },
        }} setActiveTab={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Demander une réexpédition physique/ }));
        expect(screen.getByPlaceholderText('Ex: 12 Rue')).toHaveValue('99 rue Bureau 75001 Paris');
    });
});
