import { describe, it, expect, vi, beforeEach } from 'vitest';

const { execute } = vi.hoisted(() => ({
    execute: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock('../src/lib/db.js', () => ({
    conn: { execute },
    executeQuery: vi.fn(),
}));

vi.mock('../src/services/emailService.js', () => ({
    sendApprovalEmail: vi.fn(),
}));

vi.mock('../src/utils/api.js', () => ({
    fetchWithRetry: vi.fn(),
}));

import { adminDataService } from '../src/services/adminDataService.js';

describe('réservations salles & bureaux', () => {
    beforeEach(() => {
        execute.mockClear();
        execute.mockResolvedValue({ rows: [] });
    });

    it('enregistre une demande en_attente avec la ville du client', async () => {
        const created = await adminDataService.addBookingRequest('cli_1', {
            type: 'Salle de réunion (6-8 pers)',
            date: '2026-09-15',
            duration: 'Matinée (9h-12h)',
            city: 'Toulouse',
        });

        expect(execute).toHaveBeenCalledTimes(1);
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO bookings/);
        expect(params[1]).toBe('cli_1');
        expect(params[2]).toBe('Toulouse');
        expect(params[3]).toBe('Salle de réunion (6-8 pers)');
        expect(params[4]).toBe('2026-09-15');
        expect(params[5]).toBe('Matinée (9h-12h)');
        expect(params[6]).toBe('en_attente');
        expect(created.status).toBe('en_attente');
        expect(created.id).toMatch(/^book_/);
    });

    it('met à jour le statut (accepter / refuser)', async () => {
        await adminDataService.updateBookingStatus('book_1', 'confirmée');
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toMatch(/UPDATE bookings SET status/);
        expect(params).toEqual(['confirmée', 'book_1']);
    });

    it('ne vide plus la table bookings au démarrage', async () => {
        await adminDataService.initBookings();
        const sqls = execute.mock.calls.map(([sql]) => sql);
        expect(sqls.some((s) => /DELETE FROM bookings/i.test(s))).toBe(false);
        expect(sqls.some((s) => /CREATE TABLE IF NOT EXISTS bookings/i.test(s))).toBe(true);
        expect(sqls.some((s) => /ALTER TABLE bookings ADD COLUMN city/i.test(s))).toBe(true);
    });
});
