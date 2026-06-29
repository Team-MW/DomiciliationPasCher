// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { ProtectedRoute, PublicOnlyRoute } from '../src/App.jsx';

// Mock react-router-dom
vi.mock('react-router-dom', () => {
    return {
        Navigate: vi.fn(({ to, replace }) => (
            <div data-testid="navigate" data-to={to} data-replace={replace ? 'true' : 'false'}>
                Navigate to {to}
            </div>
        )),
    };
});

// Mock clerk react
const mockUseUser = vi.fn();
vi.mock('@clerk/clerk-react', () => {
    return {
        useUser: () => mockUseUser(),
        SignedIn: ({ children }) => <div data-testid="signed-in">{children}</div>,
        SignedOut: ({ children }) => <div data-testid="signed-out">{children}</div>,
    };
});

// Mock translate hook since App.jsx or its imports might depend on it
vi.mock('../src/i18n/LanguageContext', () => {
    return {
        useTranslation: () => ({
            tr: {
                common: {
                    loading: 'Chargement...'
                }
            }
        })
    };
});

describe('Route Security Guards (ProtectedRoute & PublicOnlyRoute)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset query search params
        delete window.location;
        window.location = new URL('http://localhost/');
    });

    afterEach(() => {
        cleanup();
    });

    describe('ProtectedRoute', () => {
        test('should render children directly if preview=true in URL', () => {
            window.location = new URL('http://localhost/?preview=true');

            render(
                <ProtectedRoute>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedRoute>
            );

            expect(screen.getByTestId('protected-content')).toBeDefined();
            expect(screen.queryByTestId('signed-in')).toBeNull();
        });

        test('should render SignedIn and SignedOut wrappers if not preview mode', () => {
            render(
                <ProtectedRoute>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedRoute>
            );

            // It should output SignedIn wrapper with content
            expect(screen.getByTestId('signed-in')).toBeDefined();
            expect(screen.getByTestId('protected-content')).toBeDefined();

            // It should output SignedOut wrapper containing Navigate to /connexion
            expect(screen.getByTestId('signed-out')).toBeDefined();
            
            const navigateElement = screen.getByTestId('navigate');
            expect(navigateElement.getAttribute('data-to')).toBe('/connexion');
            expect(navigateElement.getAttribute('data-replace')).toBe('true');
        });
    });

    describe('PublicOnlyRoute', () => {
        test('should render children if user is not loaded yet', () => {
            mockUseUser.mockReturnValue({
                isLoaded: false,
                user: null
            });

            render(
                <PublicOnlyRoute>
                    <div data-testid="public-content">Public Content</div>
                </PublicOnlyRoute>
            );

            expect(screen.getByTestId('public-content')).toBeDefined();
            expect(screen.queryByTestId('navigate')).toBeNull();
        });

        test('should render children if user is loaded but not logged in', () => {
            mockUseUser.mockReturnValue({
                isLoaded: true,
                user: null
            });

            render(
                <PublicOnlyRoute>
                    <div data-testid="public-content">Public Content</div>
                </PublicOnlyRoute>
            );

            expect(screen.getByTestId('public-content')).toBeDefined();
            expect(screen.queryByTestId('navigate')).toBeNull();
        });

        test('should redirect normal client to client space (/app/espace-client) if logged in', () => {
            mockUseUser.mockReturnValue({
                isLoaded: true,
                user: {
                    primaryEmailAddress: { emailAddress: 'client@example.com' }
                }
            });

            render(
                <PublicOnlyRoute>
                    <div data-testid="public-content">Public Content</div>
                </PublicOnlyRoute>
            );

            expect(screen.queryByTestId('public-content')).toBeNull();
            
            const navigateElement = screen.getByTestId('navigate');
            expect(navigateElement.getAttribute('data-to')).toBe('/app/espace-client');
            expect(navigateElement.getAttribute('data-replace')).toBe('true');
        });

        test('should redirect admin to admin dashboard (/app/admin) if logged in', () => {
            // Setup VITE_ADMIN_EMAILS mock
            vi.stubEnv('VITE_ADMIN_EMAILS', 'admin@dompascher.fr,admin2@dompascher.fr');

            mockUseUser.mockReturnValue({
                isLoaded: true,
                user: {
                    primaryEmailAddress: { emailAddress: 'admin@dompascher.fr' }
                }
            });

            render(
                <PublicOnlyRoute>
                    <div data-testid="public-content">Public Content</div>
                </PublicOnlyRoute>
            );

            expect(screen.queryByTestId('public-content')).toBeNull();
            
            const navigateElement = screen.getByTestId('navigate');
            expect(navigateElement.getAttribute('data-to')).toBe('/app/admin');
            expect(navigateElement.getAttribute('data-replace')).toBe('true');

            vi.unstubAllEnvs();
        });
    });
});
