// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const signUpProps = vi.hoisted(() => ({ last: null }));
vi.mock('@clerk/clerk-react', () => ({
    SignUp: (props) => { signUpProps.last = props; return <div data-testid="clerk-signup" />; },
    ClerkLoading: () => null,
}));
const svc = vi.hoisted(() => ({ checkPaymentStatus: vi.fn() }));
vi.mock('../src/services/adminDataService', () => ({ adminDataService: svc }));
vi.mock('../src/components/AppDialog/dialogApi', () => ({ appAlert: vi.fn() }));
vi.mock('../src/components/Seo/usePageMeta', () => ({ default: () => {} }));

import InscriptionPage from '../src/pages/Connexion/Inscription.jsx';

const open = (search) => {
    window.history.pushState({}, '', `/inscription${search}`);
    return render(<MemoryRouter><InscriptionPage /></MemoryRouter>);
};

beforeEach(() => {
    vi.clearAllMocks();
    signUpProps.last = null;
    try { localStorage.clear(); } catch { /* */ }
});

describe('Création d’accès d’un client qui vient de payer (cas William)', () => {
    it('lien de l’email sur un AUTRE appareil : paiement vérifié par email, formulaire Clerk ouvert avec l’email prérempli', async () => {
        svc.checkPaymentStatus.mockResolvedValue(true);
        open('?email=William.Rouzee%40iCloud.com');
        expect(await screen.findByTestId('clerk-signup')).toBeInTheDocument();
        expect(svc.checkPaymentStatus).toHaveBeenCalledWith('william.rouzee@icloud.com');
        expect(signUpProps.last.initialValues).toEqual({ emailAddress: 'william.rouzee@icloud.com' });
        expect(signUpProps.last.signInUrl).toBe('/connexion');
        expect(localStorage.getItem('allow_registration')).toBe('true');
    });

    it('email sans souscription : pas de formulaire, saisie de l’adresse proposée (email prérempli)', async () => {
        svc.checkPaymentStatus.mockResolvedValue(false);
        open('?email=inconnu%40x.fr');
        await waitFor(() => expect(screen.getByPlaceholderText(/adresse e-mail de paiement/i)).toBeInTheDocument());
        expect(screen.getByPlaceholderText(/adresse e-mail de paiement/i).value).toBe('inconnu@x.fr');
        expect(screen.queryByTestId('clerk-signup')).toBeNull();
    });

    it('vérification manuelle (« J’ai déjà payé ») : ouvre le formulaire si le paiement est trouvé', async () => {
        svc.checkPaymentStatus.mockResolvedValue(true);
        open('');
        fireEvent.click(screen.getByText(/J'ai déjà payé/i));
        fireEvent.change(screen.getByPlaceholderText(/adresse e-mail de paiement/i), { target: { value: 'william.rouzee@icloud.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Vérifier et accéder/i }));
        expect(await screen.findByTestId('clerk-signup')).toBeInTheDocument();
    });

    it('stockage navigateur indisponible (navigation privée) : la vérification manuelle fonctionne quand même', async () => {
        svc.checkPaymentStatus.mockResolvedValue(true);
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
        open('');
        fireEvent.click(screen.getByText(/J'ai déjà payé/i));
        fireEvent.change(screen.getByPlaceholderText(/adresse e-mail de paiement/i), { target: { value: 'a@b.fr' } });
        fireEvent.click(screen.getByRole('button', { name: /Vérifier et accéder/i }));
        expect(await screen.findByTestId('clerk-signup')).toBeInTheDocument();
        spy.mockRestore();
    });
});
