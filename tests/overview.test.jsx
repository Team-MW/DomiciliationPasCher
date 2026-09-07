// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../src/i18n/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key) => {
            const map = {
                'espaceClient.overview.mailLabel': 'Boîte aux lettres',
                'espaceClient.overview.mailCount': '{n} courrier',
                'espaceClient.overview.mailCountPlural': '{n} courriers',
                'espaceClient.overview.unread': '{n} non lu',
                'espaceClient.overview.unreadPlural': '{n} non lus',
                'espaceClient.overview.mailFooter': 'Courriers numérisés →',
                'espaceClient.overview.docsLabel': 'Documents & Contrats',
                'espaceClient.overview.docsFooter': 'Archives →',
                'espaceClient.overview.planLabel': 'Formule Active',
                'espaceClient.overview.planActive': 'Statut Actif',
                'espaceClient.overview.bookingsLabel': 'Réservations',
                'espaceClient.overview.bookingsFooter': 'Salles →',
                'espaceClient.overview.officialAddress': 'Adresse Officielle',
                'espaceClient.overview.copy': 'Copier',
                'espaceClient.overview.copied': 'Copiée',
                'espaceClient.overview.company': 'Société',
                'espaceClient.overview.office': 'Siège Social',
                'espaceClient.overview.cityKicker': 'Toulouse · Centre agréé',
                'espaceClient.overview.approval': "Certificat d'agrément préfectoral actif",
                'espaceClient.overview.proBadge': 'Avantage Pro',
                'espaceClient.overview.proTitle': 'Compte Pro avec IBAN Français',
                'espaceClient.overview.proHint': 'hint',
                'espaceClient.overview.discover': "Découvrir l'offre →",
                'espaceClient.overview.invoices': 'Factures',
                'espaceClient.overview.payment': 'Paiement',
                'espaceClient.overview.help': 'Aide & FAQ',
                'espaceClient.overview.support': 'Support',
                'espaceClient.overview.companyFallback': 'Entreprise',
            };
            return map[key] || key;
        },
    }),
}));

import Overview from '../src/pages/EspaceClient/components/Overview.jsx';

describe('Overview dashboard', () => {
    beforeEach(() => {
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    it('affiche les métriques et ouvre l’onglet courrier', () => {
        const setActiveTab = vi.fn();
        render(
            <Overview
                mail={[{ id: 1, status: 'lu' }, { id: 2, status: 'non lu' }]}
                documents={[{}, {}, {}]}
                bookings={[]}
                clientData={{ company: 'sasu', plan: 'Scan+' }}
                setActiveTab={setActiveTab}
            />
        );

        expect(screen.getByText('1 non lu')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Scan+')).toBeInTheDocument();
        expect(screen.getByText('sasu')).toBeInTheDocument();
        expect(screen.getByText('Toulouse · Centre agréé')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Boîte aux lettres/i }));
        expect(setActiveTab).toHaveBeenCalledWith('mail');
    });

    it('copie l’adresse officielle sans alerte', async () => {
        render(
            <Overview
                mail={[]}
                documents={[]}
                bookings={[]}
                clientData={{ company: 'sasu', plan: 'Scan+' }}
                setActiveTab={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Copier' }));
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(await screen.findByRole('button', { name: 'Copiée' })).toBeInTheDocument();
    });
});
