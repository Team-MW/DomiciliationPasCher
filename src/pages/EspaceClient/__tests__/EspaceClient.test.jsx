import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EspaceClient from '../EspaceClient';
import { adminDataService } from '../../../services/adminDataService';

// Mock Clerk React
vi.mock('@clerk/clerk-react', () => {
    return {
        useUser: () => ({
            isLoaded: true,
            user: {
                id: 'user_123',
                firstName: 'Test',
                primaryEmailAddress: { emailAddress: 'client@example.com' }
            }
        }),
        useClerk: () => ({
            signOut: vi.fn()
        })
    };
});

// Mock Language Context if needed (assuming defaults if missing or not used deeply)
vi.mock('../../../i18n/LanguageContext', () => ({
    useTranslation: () => ({ tr: { common: { loading: 'Chargement...' } } })
}));

// Mock adminDataService
vi.mock('../../../services/adminDataService', () => {
    return {
        adminDataService: {
            init: vi.fn(),
            getClientByEmail: vi.fn(),
            getClientBySessionId: vi.fn(),
            getDemandes: vi.fn().mockResolvedValue([]),
            getClientMail: vi.fn().mockResolvedValue([]),
            getDocuments: vi.fn().mockResolvedValue([]),
            getClientBookings: vi.fn().mockResolvedValue([]),
            getMessages: vi.fn().mockResolvedValue([])
        }
    };
});

const renderEspaceClient = () => {
    return render(
        <BrowserRouter>
            <EspaceClient />
        </BrowserRouter>
    );
};

describe('EspaceClient Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear local storage manually for tests
        window.localStorage.clear();
    });

    it('shows loading state initially or missing dossier state if no client found', async () => {
        adminDataService.getClientByEmail.mockResolvedValueOnce(null);

        renderEspaceClient();
        
        await waitFor(() => {
            expect(screen.getByText(/Aucun dossier trouvé/i)).toBeInTheDocument();
        });
    });

    it('loads and displays client data successfully', async () => {
        const mockClient = {
            id: 'client_1',
            company: 'Test Company LLC',
            status: 'actif',
            plan: 'Scan+',
            isTemporary: false
        };
        adminDataService.getClientByEmail.mockResolvedValueOnce(mockClient);

        renderEspaceClient();

        await waitFor(() => {
            expect(screen.getByText(/Test Company LLC/i)).toBeInTheDocument();
        });
        
        // On vérifie que les autres appels API ont bien été faits car isTemporary = false
        expect(adminDataService.getClientMail).toHaveBeenCalledWith('client_1');
    });

    it('uses localStorage session ID fallback if email not found', async () => {
        window.localStorage.setItem('last_successful_session', 'cs_test_123');
        adminDataService.getClientByEmail.mockResolvedValueOnce(null);
        adminDataService.getClientBySessionId.mockResolvedValueOnce({
            id: 'client_2',
            company: 'Session Company',
            status: 'actif',
            plan: 'Physique'
        });

        renderEspaceClient();

        await waitFor(() => {
            expect(screen.getByText(/Session Company/i)).toBeInTheDocument();
        });

        // localStorage doit être vidé après succès
        expect(window.localStorage.getItem('last_successful_session')).toBeNull();
    });
});
