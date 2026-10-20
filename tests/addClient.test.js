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

describe('adminDataService.addClient', () => {
    beforeEach(() => {
        execute.mockClear();
        execute.mockResolvedValue({ rows: [] });
    });

    it('persists address, phone and extra_info including offre', async () => {
        const created = await adminDataService.addClient({
            name: 'Jean Dupont',
            email: '  Jean.Dupont@Email.com ',
            company: 'DPC SARL',
            city: 'Toulouse',
            plan: 'Scan+',
            address: '12 rue de la Paix, 75000 Paris',
            phone: '0612345678',
            extra_info: {
                prenom: 'Jean',
                nom: 'Dupont',
                telephone: '0612345678',
                adressePerso: '12 rue de la Paix, 75000 Paris',
                siren: '12345678900012',
            },
        });

        expect(execute).toHaveBeenCalledTimes(1);
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO clients/);
        expect(sql).toMatch(/address, phone/);
        expect(params[1]).toBe('Jean Dupont');
        expect(params[2]).toBe('jean.dupont@email.com');
        expect(params[3]).toBe('DPC SARL');
        expect(params[4]).toBe('Toulouse');
        expect(params[5]).toBe('Scan+');
        expect(params[6]).toBe('actif');
        expect(params[9]).toBe('');
        expect(params[10]).toBe('manual');
        const extra = JSON.parse(params[11]);
        expect(extra.prenom).toBe('Jean');
        expect(extra.adressePerso).toBe('12 rue de la Paix, 75000 Paris');
        expect(extra.offre).toBe('scan');
        expect(params[12]).toBe('12 rue de la Paix, 75000 Paris');
        expect(params[13]).toBe('0612345678');
        expect(created.status).toBe('actif');
        expect(created.email).toBe('jean.dupont@email.com');
        expect(created.address).toBe('12 rue de la Paix, 75000 Paris');
    });

    it('fills name from prenom/nom and company as empty string when omitted', async () => {
        await adminDataService.addClient({
            email: 'sans.nom@test.fr',
            plan: 'Essentiel',
            extra_info: { prenom: 'Marie', nom: 'Martin' },
        });

        const params = execute.mock.calls[0][1];
        expect(params[1]).toBe('Marie Martin');
        expect(params[3]).toBe('');
        expect(JSON.parse(params[11]).offre).toBe('notification');
    });
});
