// @vitest-environment happy-dom
/**
 * Audit UI : bugs RÉELS reproduits. Chaque test est en it.skip (la suite reste verte) ;
 * retirer le .skip pour voir l'échec, puis le garder comme test de non-régression une fois corrigé.
 * Harnais identique à ui.test.jsx : `fetch` simulé, vrai adminDataService.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const H = vi.hoisted(() => ({
    user: { id: 'u1', firstName: 'Jean', primaryEmailAddress: { emailAddress: 'jean@x.fr' } },
    handlers: {},
    calls: [],
}));

vi.mock('@clerk/clerk-react', () => ({
    useUser: () => ({ isLoaded: true, user: H.user }),
    useClerk: () => ({ signOut: vi.fn() }),
    UserButton: () => null,
}));
vi.mock('../../src/i18n/detectLanguage', () => ({ detectLanguageFromIP: vi.fn().mockResolvedValue(null) }));
vi.mock('../../src/utils/emailService', () => ({ sendAdminDocumentUploadedEmail: vi.fn(), sendClientNewMessageEmail: vi.fn(), sendReexpeditionRequestEmail: vi.fn() }));
vi.mock('../../src/utils/pdfConverter', () => ({ convertPdfToPng: vi.fn() }));
vi.mock('../../src/utils/cloudinary', () => ({ uploadFile: vi.fn() }));
vi.mock('../../src/utils/pdfGenerator', () => ({
    generateSignedContratBlob: vi.fn(), generateSignedProcurationBlob: vi.fn(), generateAttestationPdf: vi.fn(), generateContratPdf: vi.fn(),
}));
vi.mock('../../src/utils/stripe', () => ({ handleCheckout: vi.fn() }));
vi.mock('../../src/components/SignatureModal/SignatureModal', () => ({ default: () => null }));

import { LanguageProvider, loadLanguage } from '../../src/i18n/LanguageContext';
import { DialogProvider } from '../../src/components/AppDialog/DialogProvider';
import fr from '../../src/i18n/fr.js';
import EspaceClient from '../../src/pages/EspaceClient/EspaceClient.jsx';
import Abonnement from '../../src/pages/EspaceClient/components/Abonnement.jsx';
import Meeting from '../../src/pages/EspaceClient/components/Meeting.jsx';
import Docs from '../../src/pages/EspaceClient/components/Docs.jsx';
import Factures from '../../src/pages/EspaceClient/components/Factures.jsx';
import EmailVerifyPanel from '../../src/pages/EspaceClient/components/EmailVerifyPanel.jsx';
import { clientPlanPricing, PLAN_CATALOG } from '../../shared/plans.js';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: async () => body });
async function router(url, opts = {}) {
    const u = String(url);
    if (u.startsWith('/api/data')) {
        const { method, args } = JSON.parse(opts.body || '{}');
        H.calls.push({ method, args });
        const h = H.handlers[method];
        if (h) return h(...(args || []));
        return json(200, { result: /^get/.test(method) ? [] : null });
    }
    if (u.startsWith('/api/list-payments')) return (H.handlers.listPayments || (() => json(200, { payments: [], subscriptionStatus: 'active' })))(u);
    return json(200, {});
}
const ok = (result) => () => json(200, { result });

beforeEach(() => {
    H.handlers = {}; H.calls = [];
    try { window.localStorage.clear(); } catch { /* */ }
    window.localStorage.setItem('dpc_lang', 'fr');
    globalThis.fetch = vi.fn(router);
    window.fetch = globalThis.fetch;
});
afterEach(() => { vi.useRealTimers(); });

const wrap = (ui) => render(<MemoryRouter><LanguageProvider><DialogProvider>{ui}</DialogProvider></LanguageProvider></MemoryRouter>);
const lookup = (dict, key) => key.split('.').reduce((v, k) => v?.[k], dict);

describe('Bugs confirmés — espace client', () => {
    // BUG: Meeting.jsx:228 affiche `{b.date} · {b.duration}` bruts : « 2026-11-20 · Matinée (9h-12h) » (date ISO brute,
    // et libellé de durée/type en français même en anglais/russe). formatBookingDate existe dans utils/meetingPrices.js mais n'est pas utilisé.
    it('Réservations : la date de réservation n’est jamais affichée au format ISO brut', async () => {
        H.handlers.getClientBookings = ok([{ id: 'b1', clientId: 'c1', type: 'Salle de réunion (6-8 pers)', date: '2026-11-20', duration: 'Matinée (9h-12h)', status: 'confirmée' }]);
        wrap(<Meeting clientData={{ id: 'c1', email: 'a@b.fr' }} />);
        await screen.findByText(/Salle de réunion/);
        expect(document.body.textContent).not.toMatch(/2026-11-20/);
    });

    // BUG: Docs.jsx:1191 utilise `doc.date`, colonne qui n'existe pas dans la table `documents` (le serveur renvoie `uploadedAt`,
    // cf. api/_data-service.js addDocument) → chaque « autre document » du client affiche « Partagé le Invalid Date ».
    it('Mes documents : un document téléversé affiche une vraie date, jamais « Invalid Date »', async () => {
        await act(async () => {
            wrap(<Docs documents={[{ id: 'd1', clientId: 'c1', name: 'attestation_urssaf.pdf', size: '20 KB', type: 'application/pdf', uploadedAt: '2026-11-08', owner: 'client', folder: 'Documents', url: 'https://res.cloudinary.com/x.pdf' }]}
                setDocuments={vi.fn()} setClientData={vi.fn()} clientData={{ id: 'c1', email: 'a@b.fr', plan: 'Confort', status: 'actif', since: '2026-01-01', extra_info: '{}' }} />);
        });
        expect(screen.getByText('attestation_urssaf.pdf')).toBeTruthy();
        expect(document.body.textContent).not.toMatch(/Invalid Date/);
    });

    // BUG: Abonnement.jsx:25 — canSwitch ne tient pas compte de status 'en_attente_validation' (demande payée non validée, id = id de DEMANDE).
    // Le texte prévu (« disponible une fois votre dossier validé », pendingHint) n'apparaît jamais et les boutons « Passer à cette formule »
    // sont actifs ; /api/change-plan répond alors 403/404 (« Client introuvable ») : erreur affichée au client.
    it('Demande en cours de validation : changement de formule bloqué et expliqué', () => {
        wrap(<Abonnement clientData={{ id: 'demande_1', email: 'a@b.fr', plan: 'Essentiel', status: 'en_attente_validation', since: '2026-11-08T10:00:00.000Z', extra_info: JSON.stringify({ grille_tarifaire: '2026-11' }), isTemporary: true }} setClientData={() => {}} />);
        expect(screen.getAllByText(/une fois votre dossier validé/).length).toBeGreaterThan(0);
        for (const btn of screen.getAllByRole('button', { name: /Passer à cette formule|Choisir/i })) expect(btn).toBeDisabled();
    });

    // BUG: Abonnement.jsx:30 et :36 (et Mail.jsx:224, Docs.jsx:613/758) formatent les dates en 'fr-FR' en dur :
    // un client en anglais/russe lit « Next renewal : 6 décembre 2026 ». Les autres onglets (Overview, Mail, Factures, Settings) suivent la langue.
    it('Abonnement en anglais : dates en anglais (pas « décembre »)', async () => {
        await loadLanguage('en');
        window.localStorage.setItem('dpc_lang', 'en');
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-10T10:00:00Z'));
        wrap(<Abonnement clientData={{ id: 'c1', email: 'a@b.fr', plan: 'Essentiel', status: 'actif', since: '2026-11-06', extra_info: JSON.stringify({ grille_tarifaire: '2026-11', frequence: 'mensuel' }) }} setClientData={() => {}} />);
        expect(document.body.textContent).toMatch(/Subscription|subscription/);
        expect(document.body.textContent).not.toMatch(/novembre|décembre/);
    });

    // BUG: Abonnement.jsx:22-24 prend `plan || 'Essentiel'` alors que l'en-tête, Overview et Mail utilisent clientPlanPricing(plan, extra),
    // qui se replie sur extra.offre. Fiche sans `plan` mais offre 'scan' : en-tête « Abonnement Confort actif » / quota 40 scans,
    // mais l'onglet Abonnement affiche « Forfait Essentiel » à 16 €. Deux formules pour le même client.
    it('Fiche sans plan (offre « scan ») : Abonnement affiche la même formule que l’en-tête (Confort)', () => {
        const extra = { grille_tarifaire: '2026-11', offre: 'scan' };
        const expected = clientPlanPricing('', extra);
        expect(expected.id).toBe('scan-plus');
        wrap(<Abonnement clientData={{ id: 'c1', email: 'a@b.fr', plan: '', status: 'actif', since: '2026-11-06', extra_info: JSON.stringify(extra) }} setClientData={() => {}} />);
        expect(screen.getAllByRole('heading', { level: 3 })[0].textContent).toMatch(/Confort/);
        expect(screen.getAllByRole('heading', { level: 3 })[0].parentElement.textContent).toContain(`${expected.ht} €`);
    });

    // BUG: EspaceClient.jsx:502 — l'en-tête affiche clientPlanPricing(...).name, qui vaut l'ANCIEN nom pour un client de l'ancienne grille
    // (« Abonnement Scan+ actif », « Physique+ »), alors que l'onglet Abonnement et le tableau de bord affichent le nom actuel (« Confort »,
    // « Premium ») — règle AI_INSTRUCTIONS : nom actuel pour tous, l'ancien client garde seulement son prix.
    it('Ancien client Scan+ : l’en-tête affiche le nom actuel de la formule (Confort), comme l’onglet Abonnement', async () => {
        window.history.pushState({}, '', '/app/espace-client?tab=abonnement');
        H.handlers.getMyAccount = ok({ kind: 'client', record: { id: 'c1', name: 'Jean', email: 'jean@x.fr', company: 'ACME', plan: 'Scan+', status: 'actif', since: '2025-06-01', extra_info: '{}' } });
        wrap(<EspaceClient />);
        await waitFor(() => expect(document.querySelector('.ec-status-tag')).toBeTruthy());
        expect(screen.getAllByRole('heading', { level: 3 })[0].textContent).toMatch(/Confort/);
        expect(document.querySelector('.ec-status-tag').textContent).toMatch(new RegExp(PLAN_CATALOG['scan-plus'].name));
        expect(document.querySelector('.ec-status-tag').textContent).not.toMatch(/Scan\+/);
    });

    // BUG: adminDataService.syncStripePayments (src/services/adminDataService.js ~l.70-88) avale toute erreur (500 de /api/list-payments,
    // réseau coupé) et renvoie { payments: [] } ; Factures.jsx n'atteint donc jamais sa branche `stripeError` et affiche
    // « Aucune facture Stripe pour le moment » : une panne est présentée comme une absence de factures (même piège que « Aucun dossier trouvé »).
    it('Factures : /api/list-payments en 500 → message d’erreur, jamais « Aucune facture »', async () => {
        H.handlers.listPayments = () => json(500, { error: 'Stripe indisponible' });
        wrap(<Factures clientData={{ id: 'c1', email: 'a@b.fr', plan: 'Confort', status: 'actif', since: '2026-01-01', extra_info: JSON.stringify({ stripe_customer_id: 'cus_1' }) }} setClientData={vi.fn()} />);
        await waitFor(() => expect(document.body.textContent).toMatch(/Impossible de récupérer vos factures|Could not fetch your Stripe invoices/));
        expect(document.body.textContent).not.toMatch(/Aucune facture|No Stripe invoice/);
    });

    // BUG: EmailVerifyPanel.jsx:627 prévoit « 429 → on affiche quand même la saisie », mais callDataApi passe par fetchWithRetry
    // (src/utils/api.js), qui RÉESSAIE 5 fois les 429 (~15 s d'attente) puis lève « fetchWithRetry: exceeded 5 retries for /api/data »
    // SANS status : le client voit ce message technique et le champ du code DISPARAÎT (step 'idle'), alors qu'il a déjà un code valide
    // dans sa boîte. Cas réel : « Renvoyer le code » < 45 s, rechargement de la page < 45 s, ou 5 essais faux.
    // (Même avec le status conservé, « Code envoyé à » s'afficherait suivi d'une adresse vide, sentTo n'étant pas rempli.)
    it('Vérification email : 429 (code déjà envoyé) → message du serveur + champ de saisie conservé', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        H.handlers.sendEmailVerificationCode = () => json(429, { error: 'Un code vient d’être envoyé. Patientez une minute.' });
        const t = (k) => lookup(fr, k) ?? k;
        render(<EmailVerifyPanel t={t} onVerified={vi.fn()} />);
        await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
        vi.useRealTimers();
        expect(await screen.findByRole('alert')).toHaveTextContent('Un code vient d’être envoyé');
        expect(screen.getByLabelText(/Code reçu par email/)).toBeTruthy();
        expect(H.calls.filter((c) => c.method === 'sendEmailVerificationCode').length).toBe(1); // pas 6 envois
    });
});
