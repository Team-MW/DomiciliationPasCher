// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const H = vi.hoisted(() => ({ account: null }));
vi.mock('@clerk/clerk-react', () => ({
    useUser: () => ({ isLoaded: true, user: { id: 'u1', firstName: 'Jean', primaryEmailAddress: { emailAddress: 'jean@x.fr' } } }),
    useClerk: () => ({ signOut: vi.fn() }),
    UserButton: () => null,
}));
vi.mock('../src/i18n/detectLanguage', () => ({ detectLanguageFromIP: vi.fn().mockResolvedValue(null) }));
vi.mock('../src/utils/emailService', () => ({ sendAdminDocumentUploadedEmail: vi.fn(), sendClientNewMessageEmail: vi.fn(), sendReexpeditionRequestEmail: vi.fn() }));
const svc = vi.hoisted(() => ({
    getMyAccount: vi.fn(async () => H.account),
    getClientMail: vi.fn().mockResolvedValue([]),
    getDocuments: vi.fn().mockResolvedValue([]),
    getClientBookings: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    getClientReexpeditions: vi.fn().mockResolvedValue([]),
    markMessagesAsRead: vi.fn().mockResolvedValue(null),
    syncStripePayments: vi.fn(),
    updateClientStatus: vi.fn(),
}));
vi.mock('../src/services/adminDataService', () => ({ adminDataService: svc }));

import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DialogProvider } from '../src/components/AppDialog/DialogProvider';
import EspaceClient from '../src/pages/EspaceClient/EspaceClient.jsx';

const mount = () => render(<MemoryRouter><LanguageProvider><DialogProvider><EspaceClient /></DialogProvider></LanguageProvider></MemoryRouter>);
const go = (q = '') => window.history.pushState({}, '', `/app/espace-client${q}`);
const client = (over = {}) => ({ id: 'c1', name: 'Jean D', email: 'jean@x.fr', company: 'ACME', plan: 'scan-plus', status: 'actif', since: '2026-01-01', extra_info: '{}', ...over });

beforeEach(() => {
    window.localStorage.setItem('dpc_lang', 'fr');
    vi.clearAllMocks();
    svc.getClientMail.mockResolvedValue([]);
    svc.getMessages.mockResolvedValue([]);
    svc.getDocuments.mockResolvedValue([]);
});

describe('Espace client : robustesse', () => {
    it('une liste en panne (messages) n’affiche PAS « Aucun dossier trouvé » : le dossier reste visible + bandeau', async () => {
        go(); H.account = { kind: 'client', record: client() };
        svc.getMessages.mockRejectedValueOnce(new Error('500'));
        mount();
        await waitFor(() => expect(document.querySelector('.ec-sidebar')).toBeTruthy());
        expect(document.body.textContent).not.toMatch(/Aucun dossier trouvé/);
        expect(await screen.findByRole('alert')).toHaveTextContent(/n’a pas pu être chargée/);
    });

    it('listes nulles ou avec des éléments vides : aucun plantage', async () => {
        go(); H.account = { kind: 'client', record: client() };
        svc.getClientMail.mockResolvedValueOnce(null);
        svc.getDocuments.mockResolvedValueOnce([null, { id: 'd', name: null }]);
        mount();
        await waitFor(() => expect(document.querySelector('.ec-sidebar')).toBeTruthy());
    });

    it('en-tête : nom de formule lisible (« Confort »), jamais l’identifiant technique ni « undefined »', async () => {
        go(); H.account = { kind: 'client', record: client({ plan: 'scan-plus', extra_info: JSON.stringify({ grille_tarifaire: '2026-11' }) }) };
        mount();
        await waitFor(() => expect(document.querySelector('.ec-status-tag')).toBeTruthy());
        expect(document.querySelector('.ec-status-tag').textContent).toMatch(/Confort/);
        expect(document.querySelector('.ec-status-tag').textContent).not.toMatch(/scan-plus|undefined/);
    });

    it('impayé : « Vérifier mon paiement » en échec → message visible (pas un clic sans effet)', async () => {
        go(); H.account = { kind: 'client', record: client({ status: 'impayé' }) };
        svc.syncStripePayments.mockRejectedValue(new Error('réseau'));
        mount();
        fireEvent.click(await screen.findByText(/Vérifier mon paiement/i, { selector: 'button' }));
        await waitFor(() => expect(document.body.textContent).toMatch(/Impossible de vérifier votre paiement/));
    });

    it('le verrou d’écriture de l’aperçu est retiré en quittant la page', async () => {
        go('?preview=true');
        const view = mount();
        await waitFor(() => expect(window.__dpcPreviewMode).toBe(true));
        view.unmount();
        expect(window.__dpcPreviewMode).toBe(false);
    });

    it.each([
        ['serveur en panne (500)', Object.assign(new Error('Erreur serveur (500)'), { status: 500 }), /serveur n’a pas répondu/],
        ['session invalide (401)', Object.assign(new Error('Authentification requise'), { status: 401 }), /session n’a pas pu être vérifiée/],
        ['email non vérifié (403)', Object.assign(new Error('EMAIL_NOT_VERIFIED'), { status: 403 }), /cette adresse email est bien la vôtre/],
    ])('compte inaccessible : %s → message d’erreur précis, JAMAIS « Aucun dossier trouvé »', async (_label, error, expected) => {
        go(); H.account = null;
        svc.getMyAccount.mockRejectedValueOnce(error);
        mount();
        await waitFor(() => expect(document.body.textContent).toMatch(expected));
        expect(document.body.textContent).not.toMatch(/Aucun dossier trouvé/);
        // Email non vérifié : écran neutre « Dernière étape » (validation automatique), pas « impossible ».
        expect(document.body.textContent).toMatch(error.status === 403 ? /Dernière étape : activation de votre accès/ : /Connexion à votre dossier impossible/);
    });

    it('vraiment aucun dossier (réponse vide) : « Aucun dossier trouvé » reste affiché', async () => {
        go(); H.account = null;
        mount();
        await waitFor(() => expect(document.body.textContent).toMatch(/Aucun dossier trouvé/));
        expect(document.body.textContent).not.toMatch(/Connexion à votre dossier impossible/);
    });
});

