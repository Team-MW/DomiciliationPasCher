// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { addBookingRequest, getClientBookings, handleCheckout } = vi.hoisted(() => ({
    addBookingRequest: vi.fn().mockResolvedValue({ id: 'book_1' }),
    getClientBookings: vi.fn().mockResolvedValue([]),
    handleCheckout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: { addBookingRequest, getClientBookings },
}));

vi.mock('../src/utils/stripe', () => ({ handleCheckout }));

vi.mock('../src/i18n/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key) => {
            const map = {
                'espaceClient.meeting.title': 'Réserver une Salle ou un Bureau',
                'espaceClient.meeting.centre': '📍 Centre {city}',
                'espaceClient.meeting.intro': 'intro {city}',
                'espaceClient.meeting.successTitle': 'Demande envoyée !',
                'espaceClient.meeting.successHint': 'hint',
                'espaceClient.meeting.typeLabel': 'Type de location',
                'espaceClient.meeting.typeRoom': 'Salle de réunion (6-8 pers)',
                'espaceClient.meeting.typeOffice': 'Bureau privé (1-2 pers)',
                'espaceClient.meeting.typeCowork': 'Espace Coworking',
                'espaceClient.meeting.dateLabel': 'Date souhaitée',
                'espaceClient.meeting.durationLabel': 'Durée',
                'espaceClient.meeting.morning': 'Matinée (9h-12h)',
                'espaceClient.meeting.afternoon': 'Après-midi (14h-18h)',
                'espaceClient.meeting.fullday': 'Journée complète',
                'espaceClient.meeting.pay': 'Payer ({price} € HT) et Réserver',
                'espaceClient.meeting.connecting': 'Connexion à Stripe...',
                'espaceClient.meeting.yourBookings': 'Vos réservations',
                'espaceClient.meeting.empty': 'empty',
                'espaceClient.meeting.needDate': 'Veuillez choisir une date de réservation.',
                'espaceClient.meeting.cancelled': 'cancelled',
                'espaceClient.meeting.payError': 'pay error',
            };
            return map[key] || key;
        },
    }),
}));

import Meeting from '../src/pages/EspaceClient/components/Meeting.jsx';

const FUTURE_DATE = `${new Date().getFullYear() + 1}-09-20`;

const client = {
    id: 'cli_42',
    name: 'Jean Dupont',
    email: 'jean@test.fr',
    city: 'Toulouse',
};

describe('Meeting (espace client)', () => {
    beforeEach(() => {
        addBookingRequest.mockClear();
        getClientBookings.mockClear();
        handleCheckout.mockClear();
        getClientBookings.mockResolvedValue([]);
        sessionStorage.clear();
        localStorage.clear();
        window.history.replaceState({}, '', '/app/espace-client');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            json: async () => ({ success: true, metadata: { type: 'meeting_booking' } }),
        }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('refuse de payer sans date', async () => {
        render(<Meeting clientData={client} setActiveTab={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Payer/ }));
        expect(await screen.findByText(/Veuillez choisir une date/)).toBeInTheDocument();
        expect(handleCheckout).not.toHaveBeenCalled();
    });

    it('lance Stripe one_time avec le tarif salle demi-journée et mémorise la ville', async () => {
        render(<Meeting clientData={client} setActiveTab={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Date souhaitée'), {
            target: { value: FUTURE_DATE },
        });
        fireEvent.click(screen.getByRole('button', { name: /75,00/ }));

        await waitFor(() => expect(handleCheckout).toHaveBeenCalledTimes(1));
        expect(handleCheckout.mock.calls[0]).toEqual([
            'salle',
            75,
            'Réservation Salle de réunion (6-8 pers) (Matinée (9h-12h))',
            'one_time',
            expect.stringContaining('/app/espace-client?tab=meeting&booking_success=true'),
            expect.stringContaining('/app/espace-client?tab=meeting&booking_cancel=true'),
            'jean@test.fr',
            'Jean Dupont',
            { client_id: 'cli_42', type: 'meeting_booking', meeting_type: 'Salle de réunion (6-8 pers)', date: FUTURE_DATE, duration: 'Matinée (9h-12h)', city: 'Toulouse' },
        ]);
        const pending = JSON.parse(sessionStorage.getItem('pendingBooking'));
        expect(pending).toMatchObject({
            type: 'Salle de réunion (6-8 pers)',
            date: FUTURE_DATE,
            duration: 'Matinée (9h-12h)',
            city: 'Toulouse',
        });
    });

    it('enregistre la réservation au retour Stripe réussi', async () => {
        sessionStorage.setItem('pendingBooking', JSON.stringify({
            type: 'Bureau privé (1-2 pers)',
            date: '2026-09-21',
            duration: 'Journée complète',
            city: 'Toulouse',
        }));
        window.history.replaceState({}, '', '/app/espace-client?tab=meeting&booking_success=true&session_id=cs_test_paid');
        getClientBookings
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{
                id: 'book_9',
                type: 'Bureau privé (1-2 pers)',
                date: '2026-09-21',
                duration: 'Journée complète',
                status: 'en_attente',
            }]);

        render(<Meeting clientData={client} setActiveTab={vi.fn()} />);

        await waitFor(() => expect(addBookingRequest).toHaveBeenCalledTimes(1));
        expect(addBookingRequest).toHaveBeenCalledWith('cli_42', expect.objectContaining({
            type: 'Bureau privé (1-2 pers)',
            city: 'Toulouse',
        }));
        expect(await screen.findByText('Demande envoyée !')).toBeInTheDocument();
        expect(sessionStorage.getItem('pendingBooking')).toBeNull();
    });

    it('n’enregistre pas une réservation sans flag Stripe booking_success', async () => {
        sessionStorage.setItem('pendingBooking', JSON.stringify({
            type: 'Bureau privé (1-2 pers)',
            date: '2026-09-21',
            duration: 'Journée complète',
            city: 'Toulouse',
        }));
        window.history.replaceState({}, '', '/app/espace-client?tab=meeting');

        render(<Meeting clientData={client} setActiveTab={vi.fn()} />);

        await waitFor(() => expect(getClientBookings).toHaveBeenCalled());
        expect(addBookingRequest).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('pendingBooking')).toBeTruthy();
    });

    it('n’enregistre pas une réservation sans session Stripe vérifiée', async () => {
        sessionStorage.setItem('pendingBooking', JSON.stringify({
            type: 'Bureau privé (1-2 pers)',
            date: '2026-09-21',
            duration: 'Journée complète',
            city: 'Toulouse',
        }));
        window.history.replaceState({}, '', '/app/espace-client?tab=meeting&booking_success=true');

        render(<Meeting clientData={client} setActiveTab={vi.fn()} />);

        await waitFor(() => expect(getClientBookings).toHaveBeenCalled());
        expect(addBookingRequest).not.toHaveBeenCalled();
        expect(await screen.findByText(/pay error/)).toBeInTheDocument();
    });

    it('ne bloque pas un nouvel essai si l’enregistrement de la réservation a échoué', async () => {
        addBookingRequest.mockRejectedValueOnce(new Error('db down'));
        sessionStorage.setItem('pendingBooking', JSON.stringify({
            type: 'Bureau privé (1-2 pers)',
            date: '2026-09-21',
            duration: 'Journée complète',
            city: 'Toulouse',
        }));
        window.history.replaceState({}, '', '/app/espace-client?tab=meeting&booking_success=true&session_id=cs_fail');

        render(<Meeting clientData={client} setActiveTab={vi.fn()} />);

        await waitFor(() => expect(addBookingRequest).toHaveBeenCalledTimes(1));
        expect(localStorage.getItem('dpc_paid_booking_cs_fail')).toBeNull();
        expect(await screen.findByText(/pay error/)).toBeInTheDocument();
    });
});
