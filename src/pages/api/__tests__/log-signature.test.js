import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../../../api/log-signature';

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
            headers: { 'x-forwarded-for': '192.168.1.1' },
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
});
