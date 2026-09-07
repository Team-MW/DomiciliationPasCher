// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { updateBookingStatus } = vi.hoisted(() => ({
    updateBookingStatus: vi.fn().mockResolvedValue({ id: 'book_1', status: 'confirmée' }),
}));

vi.mock('../src/services/adminDataService', () => ({
    adminDataService: { updateBookingStatus },
}));

import MeetingTab from '../src/pages/Admin/components/MeetingTab.jsx';

describe('MeetingTab admin', () => {
    beforeEach(() => {
        updateBookingStatus.mockClear();
    });

    it('affiche une réservation et accepte le créneau', async () => {
        const onUpdate = vi.fn();
        render(
            <MeetingTab
                bookings={[{
                    id: 'book_1',
                    clientId: 'cli_1',
                    type: 'Salle de réunion (6-8 pers)',
                    date: '2026-09-07',
                    duration: 'Matinée (9h-12h)',
                    city: 'Toulouse',
                    status: 'en_attente',
                }]}
                clients={[{ id: 'cli_1', company: 'DPC SARL', name: 'Jean Dupont' }]}
                onUpdate={onUpdate}
                showAlert={vi.fn()}
            />
        );

        expect(screen.getByText('Salle de réunion (6-8 pers)')).toBeInTheDocument();
        expect(screen.getByText('07/09/2026')).toBeInTheDocument();
        expect(screen.getByText('DPC SARL')).toBeInTheDocument();
        expect(screen.getByText('Toulouse')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Accepter' }));
        await waitFor(() => expect(updateBookingStatus).toHaveBeenCalledWith('book_1', 'confirmée'));
        expect(onUpdate).toHaveBeenCalled();
    });

    it('affiche un état vide', () => {
        render(<MeetingTab bookings={[]} clients={[]} onUpdate={vi.fn()} showAlert={vi.fn()} />);
        expect(screen.getByText(/Aucune réservation/)).toBeInTheDocument();
    });
});
