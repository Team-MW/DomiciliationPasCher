// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../src/i18n/detectLanguage', () => ({ detectLanguageFromIP: vi.fn().mockResolvedValue(null) }));
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DialogProvider } from '../src/components/AppDialog/DialogProvider';
import Abonnement from '../src/pages/EspaceClient/components/Abonnement.jsx';

// Langue française imposée (jsdom annonce un navigateur anglais : les dates suivent la langue du client).
const renderIt = (extra) => { try { localStorage.setItem('dpc_lang', 'fr'); } catch { /* */ } return render(
    <LanguageProvider><DialogProvider>
        <Abonnement clientData={{ id: 'c1', email: 'a@b.fr', plan: 'Essentiel', status: 'actif', since: '2026-11-06', extra_info: JSON.stringify(extra) }} setClientData={() => {}} />
    </DialogProvider></LanguageProvider>,
); };

describe('Abonnement : un seul prix par formule, jamais deux pour la même', () => {
    it('ancien client (Essentiel à 20 € HT) : le sélecteur affiche 20 € pour sa formule actuelle, pas 16 €, et explique le changement', () => {
        renderIt({});
        fireEvent.click(screen.getAllByRole('button', { name: /changer l.offre/i })[0]);
        const current = screen.getAllByText(/Formule actuelle/i)[0].closest('.ec-content-card');
        expect(within(current).getByText(/20 €/)).toBeTruthy();
        expect(within(current).queryByText(/16 €/)).toBeNull();
        expect(screen.getByText(/reste à votre tarif d’origine/i)).toBeTruthy();
        // les autres formules sont au tarif en vigueur
        expect(screen.getAllByText(/24 €/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/38 €/).length).toBeGreaterThan(0);
    });

    it('client de la grille actuelle : 16 € partout, aucune note', () => {
        renderIt({ grille_tarifaire: '2026-11' });
        fireEvent.click(screen.getAllByRole('button', { name: /changer l.offre/i })[0]);
        expect(screen.queryByText(/reste à votre tarif d’origine/i)).toBeNull();
        expect(screen.queryByText(/20 €/)).toBeNull();
    });
});

describe('Abonnement : prochaine échéance', () => {
    afterEach(() => vi.useRealTimers());
    it('souscrit le 6 novembre (mensuel), le 10 novembre : échéance le 6 décembre 2026, jamais la date de souscription en format brut', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-10T10:00:00Z'));
        renderIt({ grille_tarifaire: '2026-11', frequence: 'mensuel' });
        expect(screen.getByText('6 décembre 2026')).toBeTruthy();
        expect(screen.queryByText('2026-11-06')).toBeNull();
    });
    it('abonnement annuel : échéance un an plus tard', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-10T10:00:00Z'));
        renderIt({ grille_tarifaire: '2026-11', frequence: 'annuel' });
        expect(screen.getByText('6 novembre 2027')).toBeTruthy();
    });
});
