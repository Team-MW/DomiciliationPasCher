import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { LanguageProvider } from '../../../i18n/LanguageContext';

// Mock Clerk React
vi.mock('@clerk/clerk-react', () => {
    return {
        SignedIn: ({ children }) => <div data-testid="signed-in">{children}</div>,
        SignedOut: ({ children }) => <div data-testid="signed-out">{children}</div>,
    };
});

const renderNavbar = () => {
    return render(
        <BrowserRouter>
            <LanguageProvider>
                <Navbar />
            </LanguageProvider>
        </BrowserRouter>
    );
};

describe('Navbar Component', () => {
    it('renders the logo and links', () => {
        renderNavbar();
        expect(screen.getByAltText('DomiciliationPasCher')).toBeInTheDocument();
        
        // Les liens de navigation de base doivent être présents (ex: Tarifs)
        const tarifsLinks = screen.getAllByText('Tarifs');
        expect(tarifsLinks.length).toBeGreaterThan(0);
    });

    it('renders SignedIn and SignedOut wrappers properly for auth state', () => {
        renderNavbar();
        
        // Le mock affiche les deux blocs pour vérifier qu'ils sont bien retournés
        expect(screen.getAllByTestId('signed-in').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('signed-out').length).toBeGreaterThan(0);
    });
});
