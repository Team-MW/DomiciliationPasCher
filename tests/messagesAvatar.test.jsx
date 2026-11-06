// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('../src/i18n/LanguageContext', () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock('../src/services/adminDataService', () => ({
    adminDataService: {
        getMessages: vi.fn(async () => [
            { id: 1, sender: 'client', content: 'Bonjour', createdAt: '2026-11-06T09:00:00Z' },
            { id: 2, sender: 'admin', content: 'Réponse 1', createdAt: '2026-11-06T09:05:00Z' },
            { id: 3, sender: 'admin', content: 'Réponse 2', createdAt: '2026-11-06T09:06:00Z' },
        ]),
        markMessagesAsRead: vi.fn(async () => {}),
    },
}));

import Messages from '../src/pages/EspaceClient/components/Messages.jsx';

describe('Messagerie : photo de profil (logo) du support', () => {
    it('affiche le logo dans l’en-tête et à côté de CHAQUE message de l’admin, jamais à côté du client', async () => {
        const { container } = render(<Messages clientData={{ id: 7, isPreview: true }} />);
        await screen.findByText('Réponse 2');
        expect(container.querySelector('.ec-chat-header .ec-support-avatar')).not.toBeNull();
        expect(container.querySelectorAll('.ec-chat-row.is-theirs .ec-support-avatar')).toHaveLength(2);
        expect(container.querySelectorAll('.ec-chat-row.is-mine .ec-support-avatar')).toHaveLength(0);
    });
});
