import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../../../api/log-signature';
import { __setAuthVerifierForTests } from '../../../../api/_auth.js';

// Mock du driver @planetscale/database
vi.mock('@planetscale/database', () => {
    const mockExecute = vi.fn();
    return {
        connect: vi.fn(() => ({
            execute: mockExecute
        }))
    };
});

describe('log-signature API handler', () => {
    let mockExecute;

    beforeEach(async () => {
        vi.clearAllMocks();
        process.env.VITE_DATABASE_HOST = 'mock-host';
        process.env.VITE_DATABASE_USERNAME = 'mock-username';
        process.env.VITE_DATABASE_PASSWORD = 'mock-password';
        
        const dbModule = await import('@planetscale/database');
        mockExecute = dbModule.connect().execute;
        mockExecute.mockReset();
        __setAuthVerifierForTests(async (token) => ({
            admin: { userId: 'user_admin', email: 'mwcrea.agency@gmail.com' },
            client: { userId: 'user_client', email: 'jean@example.com' },
        }[token] || null));
    });

    it('returns 405 for non-POST methods', async () => {
        const req = { method: 'GET' };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    it('returns 400 when parameters are missing', async () => {
        const req = { method: 'POST', body: { clientId: '123' } };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
    });

    it('logs the signature and returns proof details', async () => {
        mockExecute
            .mockResolvedValueOnce({ insertId: 101 }) // First call (INSERT)
            .mockResolvedValueOnce({ rows: [{ signed_at: '2026-07-29T12:00:00Z' }] }); // Second call (SELECT)

        const req = { 
            method: 'POST', 
            headers: { 'x-forwarded-for': '192.168.1.1', authorization: 'Bearer admin' },
            body: { 
                clientId: 'client_123', 
                contractRef: 'contrat_domiciliation',
                signeeName: 'Jean Dupont',
                signeeEmail: 'jean@example.com'
            } 
        };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        
        await handler(req, res);
        
        expect(mockExecute).toHaveBeenCalledTimes(2);
        expect(mockExecute).toHaveBeenNthCalledWith(1, expect.any(String), ['client_123', 'contrat_domiciliation', 'Jean Dupont', 'jean@example.com', '192.168.1.1']);
        
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            logId: 101,
            ipAddress: '192.168.1.1',
            signedAt: '2026-07-29T12:00:00Z'
        });
    });

    it('refuse sans être connecté (401)', async () => {
        const req = { method: 'POST', headers: {}, body: { clientId: 'client_123', contractRef: 'c', signeeName: 'X', signeeEmail: 'x@x.fr' } };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(mockExecute).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO signature_logs'), expect.anything());
    });

    it('refuse une preuve de signature pour la fiche d’un autre client (403)', async () => {
        mockExecute.mockResolvedValue({ rows: [] }); // aucune fiche possédée
        const req = { method: 'POST', headers: { authorization: 'Bearer client' }, body: { clientId: 'client_999', contractRef: 'c', signeeName: 'X', signeeEmail: 'x@x.fr' } };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('le titulaire signe avec son propre email, pas celui envoyé par le navigateur', async () => {
        mockExecute.mockImplementation(async (sql) => {
            if (/FROM clients WHERE \(email/.test(sql)) return { rows: [{ id: 'client_123', email: 'jean@example.com', extra_info: '{}' }] };
            if (/INSERT INTO signature_logs/.test(sql)) return { insertId: 7 };
            if (/SELECT signed_at/.test(sql)) return { rows: [{ signed_at: '2026-11-05T10:00:00Z' }] };
            return { rows: [] };
        });
        const req = { method: 'POST', headers: { authorization: 'Bearer client' }, body: { clientId: 'client_123', contractRef: 'contrat_domiciliation', signeeName: 'Jean Dupont', signeeEmail: 'quelquun@autre.fr' } };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const insert = mockExecute.mock.calls.find(([sql]) => /INSERT INTO signature_logs/.test(sql));
        expect(insert[1][3]).toBe('jean@example.com');
    });
});
