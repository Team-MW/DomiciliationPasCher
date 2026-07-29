import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../../../api/view-pdf';
import * as cloudinary from 'cloudinary';

// Mock cloudinary and node-fetch
vi.mock('cloudinary', () => {
    return {
        v2: {
            config: vi.fn(),
            url: vi.fn().mockReturnValue('https://mock-signed-url.com/image.pdf')
        }
    };
});

// Mock global fetch for downloading the file from Cloudinary
global.fetch = vi.fn();

describe('view-pdf API handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default fetch response
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });
        
        // Mock process.env for tests
        process.env.VITE_CLOUDINARY_CLOUD_NAME = 'mock_cloud';
        process.env.VITE_CLOUDINARY_API_KEY = 'mock_key';
        process.env.VITE_CLOUDINARY_API_SECRET = 'mock_secret';
    });

    it('returns 400 when url is missing', async () => {
        const req = { query: {} };
        const res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn()
        };

        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith('URL manquante');
    });

    it('returns 500 when url is invalid', async () => {
        const req = { query: { url: 'invalid-url' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn()
        };

        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Erreur de récupération : URL Cloudinary invalide'));
    });

    it('generates a signed URL and downloads the PDF from Cloudinary', async () => {
        const req = { query: { url: 'https://res.cloudinary.com/demo/image/upload/v1234/sample.pdf' } };
        
        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            send: vi.fn()
        };

        await handler(req, res);
        
        expect(cloudinary.v2.config).toHaveBeenCalledWith({
            cloud_name: 'mock_cloud',
            api_key: 'mock_key',
            api_secret: 'mock_secret',
            secure: true
        });

        expect(cloudinary.v2.url).toHaveBeenCalledWith('v1234/sample', {
            sign_url: true,
            resource_type: 'image',
            secure: true
        });

        expect(global.fetch).toHaveBeenCalledWith('https://mock-signed-url.com/image.pdf');
        
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="document.pdf"');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalled();
    });

    it('returns 500 if Cloudinary returns an error', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 404
        });

        const req = { query: { url: 'https://res.cloudinary.com/demo/image/upload/v1234/sample.pdf' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            setHeader: vi.fn()
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Erreur de récupération : Cloudinary a répondu 404');
    });
});
