// @vitest-environment happy-dom
/**
 * Audit UI (espace client, admin, i18n) : tests adverses qui PASSENT.
 * Les bugs confirmés sont dans tests/audit/ui.bugs.test.jsx (it.skip + « // BUG: »).
 *
 * Harnais : on ne simule PAS adminDataService ; on simule `fetch` (routeur /api/data par méthode),
 * pour exercer le vrai proxy callDataApi / fetchWithRetry.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
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
    SignUp: (props) => <div data-testid="clerk-signup" data-email={props.initialValues?.emailAddress || ''} />,
    SignedIn: ({ children }) => <>{children}</>,
    SignedOut: () => null,
}));
vi.mock('../../src/i18n/detectLanguage', () => ({ detectLanguageFromIP: vi.fn().mockResolvedValue(null) }));
vi.mock('../../src/utils/emailService', () => ({
    sendAdminDocumentUploadedEmail: vi.fn(), sendClientNewMessageEmail: vi.fn(), sendReexpeditionRequestEmail: vi.fn(),
    sendFailedPaymentEmail: vi.fn(), sendAdminMessageEmail: vi.fn(), sendReexpeditionStatusEmail: vi.fn(), sendApprovalEmail: vi.fn(),
}));
vi.mock('../../src/utils/pdfConverter', () => ({ convertPdfToPng: vi.fn() }));
vi.mock('../../src/utils/cloudinary', () => ({ uploadFile: vi.fn() }));
vi.mock('../../src/utils/pdfGenerator', () => ({
    generateSignedContratBlob: vi.fn(), generateSignedProcurationBlob: vi.fn(), generateAttestationPdf: vi.fn(), generateContratPdf: vi.fn(),
}));
vi.mock('../../src/utils/stripe', () => ({ handleCheckout: vi.fn() }));
vi.mock('../../src/components/SignatureModal/SignatureModal', () => ({ default: () => null }));
vi.mock('../../src/components/Seo/usePageMeta', () => ({ default: () => {} }));

import fr from '../../src/i18n/fr.js';
import en from '../../src/i18n/en.js';
import ru from '../../src/i18n/ru.js';
import { LanguageProvider } from '../../src/i18n/LanguageContext';
import { DialogProvider } from '../../src/components/AppDialog/DialogProvider';
import EspaceClient from '../../src/pages/EspaceClient/EspaceClient.jsx';
import Abonnement from '../../src/pages/EspaceClient/components/Abonnement.jsx';
import EmailVerifyPanel from '../../src/pages/EspaceClient/components/EmailVerifyPanel.jsx';
import InscriptionPage from '../../src/pages/Connexion/Inscription.jsx';
import DossierClient from '../../src/pages/Admin/components/DossierClient.jsx';
import { clientPlanPricing, PLAN_CATALOG } from '../../shared/plans.js';

// ─── Routeur fetch ────────────────────────────────────────────────────────────
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: async () => body });
const DEFAULT_LISTS = new Set(['getClientMail', 'getDocuments', 'getClientBookings', 'getMessages', 'getClientReexpeditions', 'getPayments', 'getEmailLogs']);
async function router(url, opts = {}) {
    const u = String(url);
    if (u.startsWith('/api/data')) {
        const { method, args } = JSON.parse(opts.body || '{}');
        H.calls.push({ method, args });
        const h = H.handlers[method];
        if (h) return h(...(args || []));
        return json(200, { result: DEFAULT_LISTS.has(method) ? [] : null });
    }
    if (u.startsWith('/api/list-payments')) return (H.handlers.listPayments || (() => json(200, { payments: [], subscriptionStatus: 'active' })))(u);
    return json(200, {});
}

const ok = (result) => () => json(200, { result });
const fail = (status, error) => () => json(status, { error });

beforeEach(() => {
    H.handlers = {};
    H.calls = [];
    H.user = { id: 'u1', firstName: 'Jean', primaryEmailAddress: { emailAddress: 'jean@x.fr' } };
    try { window.localStorage.clear(); } catch { /* */ }
    window.localStorage.setItem('dpc_lang', 'fr');
    globalThis.fetch = vi.fn(router);
    window.fetch = globalThis.fetch;
    try { sessionStorage.clear(); } catch { /* */ }
});
afterEach(() => { vi.useRealTimers(); });

const client = (over = {}) => ({ id: 'c1', name: 'Jean D', email: 'jean@x.fr', company: 'ACME', plan: 'Confort', status: 'actif', since: '2026-01-15', extra_info: JSON.stringify({ grille_tarifaire: '2026-11', contractSigned: true, procurationSigned: true }), ...over });
const go = (q = '') => window.history.pushState({}, '', `/app/espace-client${q}`);
const mountEC = () => render(<MemoryRouter><LanguageProvider><DialogProvider><EspaceClient /></DialogProvider></LanguageProvider></MemoryRouter>);

// ─── 1. i18n ──────────────────────────────────────────────────────────────────
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? (e.name === '__tests__' ? [] : walk(path.join(d, e.name)))
    : /\.(jsx?|tsx?)$/.test(e.name) ? [path.join(d, e.name)] : []));
const lookup = (dict, key) => key.split('.').reduce((v, k) => v?.[k], dict);
const DICTS = { fr, en, ru };

describe('i18n : toute clé utilisée existe en fr, en ET ru', () => {
    const files = walk(path.resolve(__dirname, '../../src'));

    it('clés statiques t(\'a.b.c\') de tout src/', () => {
        const missing = [];
        let count = 0;
        for (const f of files) {
            const src = fs.readFileSync(f, 'utf8');
            for (const m of src.matchAll(/(?<![\w.])t\(\s*(['"])([A-Za-z0-9_.-]+)\1\s*[,)]/g)) {
                const key = m[2];
                if (!key.includes('.')) continue;
                count++;
                for (const [lang, dict] of Object.entries(DICTS)) {
                    if (lookup(dict, key) === undefined) missing.push(`${path.relative(process.cwd(), f)} : ${key} (${lang})`);
                }
            }
        }
        expect(count).toBeGreaterThan(400); // le scanner trouve bien les appels
        expect(missing).toEqual([]);
    });

    it('familles de clés dynamiques (template literals) complètes dans les 3 langues', () => {
        const families = [
            ...['email', 'auth', 'server'].map((k) => `espaceClient.shell.loadError_${k}`),
            ...['dashboard', 'mail', 'address', 'docs', 'subscription', 'invoices', 'payment', 'proAccount', 'messages', 'meeting', 'help', 'settings'].map((k) => `espaceClient.sidebar.${k}`),
            ...['essential', 'scan', 'forward'].flatMap((k) => [`espaceClient.subscription.${k}.title`, `espaceClient.subscription.${k}.features`]),
            ...['statusPending', 'statusSent', 'statusRefused'].map((k) => `espaceClient.mail.${k}`),
            ...['confirmed', 'refused', 'pending'].map((k) => `espaceClient.meeting.statusLabel.${k}`),
            ...['creation', 'transfert', 'domiciliation'].map((k) => `espaceClient.settings.projectTypes.${k}`),
        ];
        const missing = [];
        for (const key of families) for (const [lang, dict] of Object.entries(DICTS)) if (lookup(dict, key) === undefined) missing.push(`${key} (${lang})`);
        expect(missing).toEqual([]);
    });

    it('les clés dynamiques de la sidebar correspondent à SECTION_LABEL_KEY (aucun onglet sans libellé)', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../../src/pages/EspaceClient/EspaceClient.jsx'), 'utf8');
        const tabs = [...src.match(/const CLIENT_TABS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
        const map = src.match(/const SECTION_LABEL_KEY = \{([\s\S]*?)\};/)[1];
        for (const tab of tabs) expect(map, `onglet ${tab}`).toMatch(new RegExp(`['"]?${tab}['"]?\\s*:`));
    });
});

// ─── 2. Écrans d'erreur / états de l'espace client ───────────────────────────
describe('Espace client : la bonne page selon la réponse du serveur', () => {
    it.each([
        ['403 hors email (accès refusé)', fail(403, 'Accès refusé'), /session n’a pas pu être vérifiée/],
        ['réseau coupé (fetch rejette)', () => { throw new TypeError('Failed to fetch'); }, /serveur n’a pas répondu/],
        ['réponse non JSON (502)', () => ({ ok: false, status: 502, headers: { get: () => null }, json: async () => { throw new Error('html'); } }), /serveur n’a pas répondu/],
    ])('%s → écran d’erreur, jamais « Aucun dossier trouvé »', async (_l, handler, expected) => {
        go(); H.handlers.getMyAccount = handler;
        mountEC();
        await waitFor(() => expect(document.body.textContent).toMatch(expected));
        expect(document.body.textContent).not.toMatch(/Aucun dossier trouvé/);
    });

    it('demande payée non encore validée : tableau de bord + étiquette « en cours de validation », pas d’écran introuvable', async () => {
        go();
        H.handlers.getMyAccount = ok({ kind: 'demande', record: { id: 'd1', email: 'jean@x.fr', company: 'ACME', plan: 'Confort', date: '2026-11-08T10:11:12.000Z', extra_info: JSON.stringify({ prenom: 'Jean', nom: 'D' }) } });
        mountEC();
        await waitFor(() => expect(document.querySelector('.ec-status-tag')).toBeTruthy());
        expect(document.querySelector('.ec-status-tag').textContent).toMatch(/en cours de validation/);
        expect(document.body.textContent).not.toMatch(/Aucun dossier trouvé|undefined|NaN/);
        // demande : on ne demande pas son courrier (pas encore de fiche client)
        expect(H.calls.some((c) => c.method === 'getClientMail')).toBe(false);
    });

    it('EMAIL_NOT_VERIFIED : la preuve gardée par /inscription est essayée AVANT tout envoi de code', async () => {
        go();
        window.localStorage.setItem('dpc_signup_proof', JSON.stringify({ email: 'jean@x.fr', token: 'abcdefghijklmnop1234' }));
        H.handlers.getMyAccount = fail(403, 'EMAIL_NOT_VERIFIED');
        H.handlers.verifyEmailWithProof = () => new Promise(() => {}); // en cours
        mountEC();
        await waitFor(() => expect(H.calls.some((c) => c.method === 'verifyEmailWithProof')).toBe(true));
        expect(H.calls.find((c) => c.method === 'verifyEmailWithProof').args[0]).toEqual({ token: 'abcdefghijklmnop1234' });
        expect(H.calls.some((c) => c.method === 'sendEmailVerificationCode')).toBe(false);
        expect(document.body.textContent).toMatch(/Activation de votre accès en cours/);
    });

    it('client résilié / impayé : écrans dédiés, nom de société injecté sans « {company} » ni « undefined »', async () => {
        for (const status of ['résilié', 'impayé', 'echec_paiement']) {
            go(); H.handlers.getMyAccount = ok({ kind: 'client', record: client({ status, company: '' }) });
            const view = mountEC();
            await waitFor(() => expect(document.querySelector('.ecs-btn')).toBeTruthy());
            expect(document.body.textContent).not.toMatch(/\{company\}|undefined|null/);
            view.unmount();
        }
    });
});

// ─── 3. Données bizarres : aucun « undefined / NaN / [object Object] / date ISO brute » ─────────────
const ODD_CLIENTS = {
    'sans since ni plan, extra vide': client({ since: null, plan: '', extra_info: null }),
    'extra_info double-encodé, annuel, ancienne grille': client({ plan: 'Scan+', extra_info: JSON.stringify(JSON.stringify({ frequence: 'annuel', prenom: 'Zoé' })) }),
    'extra_info illisible': client({ extra_info: '{pas du json' }),
    'grille 2026-11 annuelle Premium': client({ plan: 'physique', extra_info: JSON.stringify({ grille_tarifaire: '2026-11', frequence: 'annuel' }) }),
    'since au format horodatage ISO': client({ since: '2026-03-31T22:15:00.000Z' }),
    'nom et société vides': client({ name: '', company: '', since: '2026-02-29' }),
};
const TABS = ['overview', 'mail', 'adresse', 'abonnement', 'factures', 'paiement', 'compte-pro', 'meeting', 'messages', 'aide', 'settings', 'docs'];
const BAD_TEXT = /undefined|NaN|\[object Object\]|Invalid Date|\{[a-z]+\}/;
const RAW_ISO = /\b\d{4}-\d{2}-\d{2}\b/;

describe('Espace client : clients aux données incomplètes ou anciennes, sur chaque onglet', () => {
    for (const [label, record] of Object.entries(ODD_CLIENTS)) {
        it(`${label} : aucun texte cassé sur les ${TABS.length} onglets`, async () => {
            const problems = [];
            for (const tab of TABS) {
                go(`?tab=${tab}`);
                H.handlers.getMyAccount = ok({ kind: 'client', record });
                const view = mountEC();
                await waitFor(() => expect(document.querySelector('.ec-header')).toBeTruthy());
                await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
                const text = document.querySelector('.ec-layout').textContent;
                const bad = text.match(BAD_TEXT);
                if (bad) problems.push(`${tab}: « ${text.slice(Math.max(0, bad.index - 40), bad.index + 30)} »`);
                const iso = text.match(RAW_ISO);
                if (iso) problems.push(`${tab}: date brute « ${iso[0]} »`);
                view.unmount();
            }
            expect(problems).toEqual([]);
        });
    }
});

// ─── 4. Prix : un seul prix par client, partout ──────────────────────────────
describe('Abonnement : prix affiché = clientPlanPricing (ancien / actuel, mensuel / annuel, 3 formules)', () => {
    const cases = [];
    for (const plan of ['Essentiel', 'Confort', 'Premium', 'scan-plus', 'Physique+']) {
        for (const grid of [null, '2026-11']) for (const frequence of ['mensuel', 'annuel']) cases.push([plan, grid, frequence]);
    }
    it.each(cases)('%s / grille %s / %s', (plan, grid, frequence) => {
        const extra = { frequence, ...(grid ? { grille_tarifaire: grid } : {}) };
        const expected = clientPlanPricing(plan, extra);
        render(<LanguageProvider><DialogProvider>
            <Abonnement clientData={{ id: 'c1', email: 'a@b.fr', plan, status: 'actif', since: '2026-05-04', extra_info: JSON.stringify(extra) }} setClientData={() => {}} />
        </DialogProvider></LanguageProvider>);
        // carte principale
        const main = screen.getByRole('heading', { level: 3, name: new RegExp(PLAN_CATALOG[expected.id].name) }).parentElement;
        expect(main.textContent).toContain(`${expected.ht} €`);
        // sélecteur : la carte « actuelle » porte le même prix, les autres le tarif en vigueur
        fireEvent.click(screen.getByRole('button', { name: /changer l.offre/i }));
        const dialogCards = [...document.body.querySelectorAll('.ec-content-card')].filter((c) => /Formule actuelle/.test(c.textContent));
        expect(dialogCards.length).toBeGreaterThan(0);
        for (const card of dialogCards) expect(card.textContent).toContain(`${expected.ht} €`);
        const legacyNote = screen.queryByText(/reste à votre tarif d’origine/i);
        expect(Boolean(legacyNote)).toBe(expected.legacy);
    });
});

// ─── 5. EmailVerifyPanel ─────────────────────────────────────────────────────
const t = (k) => lookup(fr, k) ?? k;
describe('EmailVerifyPanel : preuve d’abord, code ensuite', () => {
    it('un paiement Stripe n’est JAMAIS une preuve (adresse non vérifiée par Stripe) : on passe au code', async () => {
        window.localStorage.setItem('last_successful_session', 'cs_test_123');
        H.handlers.sendEmailVerificationCode = ok({ email: 'jean@x.fr' });
        render(<EmailVerifyPanel t={t} onVerified={vi.fn()} />);
        expect(await screen.findByLabelText(/Code reçu par email/)).toBeTruthy();
        expect(H.calls.some((c) => c.method === 'verifyEmailWithProof')).toBe(false);
    });

    it('lien signé de nos emails (dpc_signup_proof) accepté → onVerified, aucun code envoyé', async () => {
        window.localStorage.setItem('dpc_signup_proof', JSON.stringify({ email: 'jean@x.fr', token: 'tok_tok_tok_tok_tok' }));
        H.handlers.verifyEmailWithProof = ok({ verified: true });
        const onVerified = vi.fn();
        render(<EmailVerifyPanel t={t} onVerified={onVerified} />);
        await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
        expect(H.calls.find((c) => c.method === 'verifyEmailWithProof').args[0]).toEqual({ token: 'tok_tok_tok_tok_tok' });
        expect(H.calls.some((c) => c.method === 'sendEmailVerificationCode')).toBe(false);
    });

    it('preuve refusée (autre adresse) → repli sur le code par email, champ de saisie affiché', async () => {
        window.localStorage.setItem('dpc_signup_proof', JSON.stringify({ token: 'tok_tok_tok_tok_tok' }));
        H.handlers.verifyEmailWithProof = fail(403, 'Preuve insuffisante');
        H.handlers.sendEmailVerificationCode = ok({ email: 'jean@x.fr' });
        render(<EmailVerifyPanel t={t} onVerified={vi.fn()} />);
        expect(await screen.findByLabelText(/Code reçu par email/)).toBeTruthy();
        expect(screen.getByText('jean@x.fr')).toBeTruthy();
    });

    it('localStorage qui lève une exception → pas de plantage, envoi du code', async () => {
        const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
        H.handlers.sendEmailVerificationCode = ok({ email: 'jean@x.fr' });
        render(<EmailVerifyPanel t={t} onVerified={vi.fn()} />);
        expect(await screen.findByLabelText(/Code reçu par email/)).toBeTruthy();
        expect(H.calls.some((c) => c.method === 'verifyEmailWithProof')).toBe(false);
        spy.mockRestore();
    });

    it('compte déjà vérifié (alreadyVerified) → onVerified directement', async () => {
        H.handlers.sendEmailVerificationCode = ok({ alreadyVerified: true });
        const onVerified = vi.fn();
        render(<EmailVerifyPanel t={t} onVerified={onVerified} />);
        await waitFor(() => expect(onVerified).toHaveBeenCalled());
    });

    it('saisie : non-chiffres retirés, envoi automatique au 6e chiffre, une seule fois', async () => {
        H.handlers.sendEmailVerificationCode = ok({ email: 'jean@x.fr' });
        let confirmed = 0;
        H.handlers.confirmEmailVerificationCode = (code) => { confirmed++; return json(200, { result: { verified: true, code } }); };
        const onVerified = vi.fn();
        render(<EmailVerifyPanel t={t} onVerified={onVerified} />);
        const input = await screen.findByLabelText(/Code reçu par email/);
        fireEvent.change(input, { target: { value: '12 3a4' } });
        expect(input.value).toBe('1234');
        expect(confirmed).toBe(0);
        fireEvent.change(input, { target: { value: '123 456' } });
        await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
        expect(confirmed).toBe(1);
        expect(H.calls.find((c) => c.method === 'confirmEmailVerificationCode').args).toEqual(['123456']);
    });

    it('code faux → message du serveur, champ vidé, saisie toujours possible', async () => {
        H.handlers.sendEmailVerificationCode = ok({ email: 'jean@x.fr' });
        H.handlers.confirmEmailVerificationCode = fail(400, 'Code incorrect');
        render(<EmailVerifyPanel t={t} onVerified={vi.fn()} />);
        const input = await screen.findByLabelText(/Code reçu par email/);
        fireEvent.change(input, { target: { value: '000000' } });
        expect(await screen.findByRole('alert')).toHaveTextContent('Code incorrect');
        expect(screen.getByLabelText(/Code reçu par email/).value).toBe('');
    });

    it('envoi du code en échec (500) → bouton « M’envoyer un code » + message', async () => {
        H.handlers.sendEmailVerificationCode = fail(500, 'SMTP indisponible');
        render(<EmailVerifyPanel t={t} onVerified={vi.fn()} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('SMTP indisponible');
        expect(screen.getByRole('button', { name: /M’envoyer un code/ })).toBeTruthy();
    });
});

// ─── 6. /inscription : preuve ?v= gardée ─────────────────────────────────────
describe('/inscription : preuve du lien d’email', () => {
    const open = (search) => { window.history.pushState({}, '', `/inscription${search}`); return render(<MemoryRouter><InscriptionPage /></MemoryRouter>); };
    it('?email=&v= valides → preuve stockée (email normalisé), formulaire ouvert', async () => {
        H.handlers.checkPaymentStatus = ok(true);
        open('?email=Jean.D%40X.fr&v=AbCdEfGhIjKlMnOpQrStUvWxYz012345');
        expect(await screen.findByTestId('clerk-signup')).toBeTruthy();
        expect(JSON.parse(window.localStorage.getItem('dpc_signup_proof'))).toEqual({ email: 'jean.d@x.fr', token: 'AbCdEfGhIjKlMnOpQrStUvWxYz012345' });
    });
    it('v trop court ou avec caractères interdits → rien n’est stocké', async () => {
        H.handlers.checkPaymentStatus = ok(true);
        open('?email=a%40b.fr&v=<script>');
        await screen.findByTestId('clerk-signup');
        expect(window.localStorage.getItem('dpc_signup_proof')).toBeNull();
    });
    it('v sans email → rien n’est stocké, page « Accès réservé »', async () => {
        open('?v=AbCdEfGhIjKlMnOpQrStUvWxYz012345');
        expect(await screen.findByText('Accès réservé')).toBeTruthy();
        expect(window.localStorage.getItem('dpc_signup_proof')).toBeNull();
    });
    it('vérification du paiement en panne → saisie de l’adresse proposée (pas d’écran figé)', async () => {
        H.handlers.checkPaymentStatus = fail(500, 'down');
        open('?email=a%40b.fr');
        expect(await screen.findByPlaceholderText(/adresse e-mail de paiement/)).toHaveValue('a@b.fr');
    });
});

// ─── 7. Admin DossierClient : boutons qui doivent apparaître ─────────────────
describe('Admin DossierClient : compte de connexion et ancien tarif', () => {
    const mountDossier = (over) => render(
        <DossierClient client={{ id: 'c9', name: 'Casin', email: 'casin@x.fr', company: 'CAS', plan: 'Essentiel', status: 'actif', since: '2026-11-06', extra_info: '{}', ...over }}
            onBack={vi.fn()} onUpdate={vi.fn()} showConfirm={vi.fn()} showAlert={vi.fn()} />,
    );
    it.each([
        ['sans clerkId', '', /Chercher son compte de connexion/],
        ['clerkId « user_unknown »', 'user_unknown', /Chercher son compte de connexion/],
        ['clerkId relié', 'user_2abc', /Vérifier son compte de connexion/],
    ])('%s → bouton du compte de connexion visible', async (_l, clerkId, label) => {
        await act(async () => { mountDossier({ clerkId }); });
        expect(screen.getByRole('button', { name: label })).toBeTruthy();
    });

    it('ancien client (sans grille) → encadré « Ancien tarif » 20 € → 16 € + bouton', async () => {
        await act(async () => { mountDossier({ extra_info: JSON.stringify({ frequence: 'mensuel' }) }); });
        expect(screen.getByRole('button', { name: 'Passer au tarif actuel' })).toBeTruthy();
        expect(document.body.textContent).toMatch(/Essentiel à 20 € HT\/mois \(ancienne grille\)\. Tarif actuel : 16 € HT/);
    });

    it('client de la grille 2026-11 → aucun bouton « Passer au tarif actuel »', async () => {
        await act(async () => { mountDossier({ extra_info: JSON.stringify({ grille_tarifaire: '2026-11' }) }); });
        expect(screen.queryByRole('button', { name: 'Passer au tarif actuel' })).toBeNull();
        expect(document.body.textContent).not.toMatch(/Ancien tarif/);
    });

    it('extra_info double-encodé (grille 2026-11) → reconnu comme grille actuelle', async () => {
        await act(async () => { mountDossier({ extra_info: JSON.stringify(JSON.stringify({ grille_tarifaire: '2026-11' })) }); });
        expect(screen.queryByRole('button', { name: 'Passer au tarif actuel' })).toBeNull();
    });

    it('date d’entrée lisible, jamais au format ISO', async () => {
        await act(async () => { mountDossier({}); });
        expect(document.body.textContent).toMatch(/6 novembre 2026/);
        expect(within(document.querySelector('.dossier-sidebar')).queryByText('2026-11-06')).toBeNull();
    });
});
