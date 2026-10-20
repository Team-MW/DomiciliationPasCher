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
    sendDocumentRequestEmail: vi.fn(),
}));

vi.mock('../src/utils/api.js', () => ({
    fetchWithRetry: vi.fn(),
}));

import { adminDataService } from '../src/services/adminDataService.js';

describe('demandes de réexpédition physique', () => {
    beforeEach(() => {
        execute.mockClear();
        execute.mockResolvedValue({ rows: [] });
    });

    it('refuse une demande pour le forfait Essentiel', async () => {
        execute.mockResolvedValueOnce({ rows: [{ plan: 'Essentiel', extra_info: '{}' }] });
        await expect(
            adminDataService.addReexpeditionRequest('cli_1', { address: '12 rue Test 31000 Toulouse' })
        ).rejects.toThrow(/Scan\+/);
        expect(execute.mock.calls.some(([sql]) => /INSERT INTO reexpeditions/i.test(sql))).toBe(false);
    });

    it('enregistre une demande Scan+ en_attente', async () => {
        execute.mockResolvedValueOnce({ rows: [{ id: 'cli_1', plan: 'Scan+', extra_info: '{}' }] });
        execute.mockResolvedValueOnce({ rows: [] });

        const created = await adminDataService.addReexpeditionRequest('cli_1', {
            address: '12 rue de la Paix 75002 Paris',
            notes: 'Recommandés uniquement',
        });

        const insert = execute.mock.calls.find(([sql]) => /INSERT INTO reexpeditions/i.test(sql));
        expect(insert).toBeTruthy();
        expect(insert[1][1]).toBe('cli_1');
        expect(insert[1][2]).toBe('12 rue de la Paix 75002 Paris');
        expect(insert[1][3]).toBe('Recommandés uniquement');
        expect(insert[1][4]).toBe('en_attente');
        expect(created.status).toBe('en_attente');
        expect(created.id).toMatch(/^rexp_/);
    });

    it('met à jour le statut (expédiée)', async () => {
        await adminDataService.updateReexpeditionStatus('rexp_1', 'expediee');
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toMatch(/UPDATE reexpeditions SET status/);
        expect(params).toEqual(['expediee', 'rexp_1']);
    });
});
