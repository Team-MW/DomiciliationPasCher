// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const C = vi.hoisted(() => ({ create: vi.fn(), setActive: vi.fn(), sendLoginLink: vi.fn() }));
vi.mock('@clerk/clerk-react', () => ({
    useSignIn: () => ({ isLoaded: true, signIn: { create: C.create } }),
    useClerk: () => ({ setActive: C.setActive }),
}));
vi.mock('../src/services/adminDataService', () => ({ adminDataService: { sendLoginLink: C.sendLoginLink } }));

import { LoginLinkRequest } from '../src/pages/Connexion/LoginLink.jsx';
import { useTicketSignIn } from '../src/pages/Connexion/useTicketSignIn.js';

function TicketProbe({ ticket }) {
    const state = useTicketSignIn(ticket, '/app/espace-client');
    return <p data-testid="state">{state}</p>;
}

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Page de connexion : lien par email', () => {
    it('« Mot de passe oublié ou code non reçu ? » → envoie le lien et confirme', async () => {
        C.sendLoginLink.mockResolvedValue({ ok: true });
        render(<LoginLinkRequest defaultEmail="ada@x.fr" />);
        fireEvent.click(screen.getByRole('button', { name: /Recevoir un lien de connexion par email/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/C’est envoyé/));
        expect(C.sendLoginLink).toHaveBeenCalledWith('ada@x.fr');
    });

    it('adresse vide : message clair, aucun appel', async () => {
        render(<LoginLinkRequest defaultOpen />);
        fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/adresse email de votre compte/);
        expect(C.sendLoginLink).not.toHaveBeenCalled();
    });

    it('lien valide : connexion par jeton puis session activée', async () => {
        C.create.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_1' });
        const replace = vi.fn();
        Object.defineProperty(window, 'location', { value: { ...window.location, replace }, writable: true });
        render(<TicketProbe ticket="tok_1" />);
        await waitFor(() => expect(C.setActive).toHaveBeenCalledWith({ session: 'sess_1' }));
        expect(C.create).toHaveBeenCalledWith({ strategy: 'ticket', ticket: 'tok_1' });
        expect(replace).toHaveBeenCalledWith('/app/espace-client');
    });

    it('lien expiré : état « failed » (la page propose un nouveau lien)', async () => {
        C.create.mockRejectedValue(new Error('expired'));
        render(<TicketProbe ticket="tok_old" />);
        await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('failed'));
    });
});
