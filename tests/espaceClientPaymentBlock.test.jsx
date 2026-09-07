// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@clerk/clerk-react', () => ({
    useUser: () => ({
        isLoaded: true,
        user: {
            id: 'user_123',
            firstName: 'Test',
            primaryEmailAddress: { emailAddress: 'client@example.com' },
        },
    }),
    useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock('../src/i18n/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key) => {
            const map = {
                'espaceClient.shell.loading': 'Chargement',
                'espaceClient.shell.suspendedTitle': 'Incident de paiement',
                'espaceClient.shell.suspendedBody': 'Votre espace client pour {company} est suspendu.',
                'espaceClient.shell.howTo': 'Veuillez régler votre situation',
                'espaceClient.shell.howToBody': ' Sans règlement sous 2 mois, vous ne serez plus domicilié à cette adresse.',
                'espaceClient.shell.checkPayment': 'Vérifier mon paiement',
                'espaceClient.shell.logout': 'Se déconnecter',
                'espaceClient.shell.terminatedTitle': 'Vous n’êtes plus domicilié',
                'espaceClient.shell.terminatedBody': 'La domiciliation de {company} a été résiliée.',
                'espaceClient.shell.terminatedHint': 'Contactez-nous après régularisation.',
            };
            return map[key] || key;
        },
        tr: { common: { loading: 'Chargement' } },
    }),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: {
        init: vi.fn(),
        getClientByEmail: vi.fn(),
        getClientBySessionId: vi.fn(),
        getDemandes: vi.fn().mockResolvedValue([]),
        getClientMail: vi.fn().mockResolvedValue([]),
        getDocuments: vi.fn().mockResolvedValue([]),
        getClientBookings: vi.fn().mockResolvedValue([]),
        getMessages: vi.fn().mockResolvedValue([]),
        updateClientClerkId: vi.fn(),
    },
}));

import EspaceClient from '../src/pages/EspaceClient/EspaceClient.jsx';
import { adminDataService } from '../src/services/adminDataService';

function renderPortal() {
    return render(
        <BrowserRouter>
            <EspaceClient />
        </BrowserRouter>
    );
}

describe('Espace client — impayé et résiliation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        adminDataService.getClientByEmail.mockResolvedValue({
            id: 'cli_1',
            company: 'SAS Test',
            email: 'client@example.com',
            plan: 'Scan+',
            status: 'echec_paiement',
            clerkId: 'user_123',
        });
    });

    it('demande de régler sous 2 mois sous peine de perdre la domiciliation', async () => {
        renderPortal();
        expect(await screen.findByText('Incident de paiement')).toBeInTheDocument();
        expect(screen.getByText(/Veuillez régler votre situation/)).toBeInTheDocument();
        expect(screen.getByText(/vous ne serez plus domicilié/)).toBeInTheDocument();
    });

    it('affiche la résiliation après le délai de 2 mois', async () => {
        adminDataService.getClientByEmail.mockResolvedValue({
            id: 'cli_1',
            company: 'SAS Test',
            email: 'client@example.com',
            plan: 'Scan+',
            status: 'résilié',
            clerkId: 'user_123',
        });
        renderPortal();
        expect(await screen.findByText('Vous n’êtes plus domicilié')).toBeInTheDocument();
        expect(screen.getByText(/a été résiliée/)).toBeInTheDocument();
        expect(screen.queryByText('Incident de paiement')).toBeNull();
    });
});
