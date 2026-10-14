// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { getMessages, addMessage, markMessagesAsRead } = vi.hoisted(() => ({
    getMessages: vi.fn().mockResolvedValue([]),
    addMessage: vi.fn().mockResolvedValue({
        id: 'msg_new',
        content: 'Bonjour',
        sender: 'client',
        createdAt: new Date().toISOString(),
    }),
    markMessagesAsRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: { getMessages, addMessage, markMessagesAsRead },
}));

vi.mock('../src/utils/emailService', () => ({
    sendClientNewMessageEmail: vi.fn(),
}));

vi.mock('../src/i18n/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key) => ({
            'espaceClient.messages.title': 'Messagerie Directe',
            'espaceClient.messages.online': 'En ligne',
            'espaceClient.messages.replyHint': 'Support DPC · réponse sous 24 h ouvrées',
            'espaceClient.messages.emptyTitle': 'Bienvenue dans votre messagerie sécurisée.',
            'espaceClient.messages.emptyHint': 'Posez vos questions ici.',
            'espaceClient.messages.you': 'Vous',
            'espaceClient.messages.supportName': 'Support DPC',
            'espaceClient.messages.placeholder': 'Écrivez votre message…',
            'espaceClient.messages.send': 'Envoyer',
            'espaceClient.messages.sending': 'Envoi…',
            'espaceClient.messages.today': "Aujourd'hui",
            'espaceClient.messages.yesterday': 'Hier',
            'espaceClient.messages.clientFallback': 'Client',
        }[key] || key),
    }),
}));

import Messages from '../src/pages/EspaceClient/components/Messages.jsx';

const client = { id: 'cli_1', email: 'a@test.fr', company: 'SAS Test' };

describe('Messagerie espace client', () => {
    beforeEach(() => {
        getMessages.mockClear();
        addMessage.mockClear();
        markMessagesAsRead.mockClear();
        getMessages.mockResolvedValue([]);
    });

    it('affiche l’état vide', async () => {
        render(<Messages clientData={client} />);
        expect(await screen.findByText('Bienvenue dans votre messagerie sécurisée.')).toBeInTheDocument();
        expect(screen.getByText('En ligne')).toBeInTheDocument();
    });

    it('affiche les bulles client et support', async () => {
        getMessages.mockResolvedValue([
            { id: '1', sender: 'admin', content: 'Bonjour', createdAt: new Date().toISOString() },
            { id: '2', sender: 'client', content: 'Merci', createdAt: new Date().toISOString() },
        ]);
        render(<Messages clientData={client} />);
        expect(await screen.findByText('Bonjour')).toBeInTheDocument();
        expect(screen.getByText('Merci')).toBeInTheDocument();
        expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    });

    it('envoie un message', async () => {
        render(<Messages clientData={client} />);
        await screen.findByPlaceholderText('Écrivez votre message…');
        fireEvent.change(screen.getByPlaceholderText('Écrivez votre message…'), {
            target: { value: 'Bonjour' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
        await waitFor(() => expect(addMessage).toHaveBeenCalledWith('cli_1', {
            content: 'Bonjour',
            sender: 'client',
        }));
    });
});
