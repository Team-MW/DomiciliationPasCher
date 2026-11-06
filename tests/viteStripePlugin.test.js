// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import viteConfig from '../vite.config.js';

vi.mock('stripe', () => {
    return {
        default: class {
            constructor() {
                return {
                    customers: {
                        list: vi.fn().mockResolvedValue({ data: [] }),
                        create: vi.fn().mockResolvedValue({ id: 'cus_mock_local_123' })
                    }
                };
            }
        }
    };
});

function callMiddleware(middleware, { url, method = 'POST', body, headers = {} }) {
    return new Promise((resolve) => {
        const req = {
            url,
            method,
            headers: { host: 'localhost:5173', ...headers },
            on: (event, cb) => {
                if (event === 'data' && body !== undefined) cb(Buffer.from(JSON.stringify(body)));
                if (event === 'end') cb();
            },
        };
        const out = { statusCode: 200, body: '' };
        const res = {
            setHeader: vi.fn(),
            end: (data) => { out.body = data; resolve(out); },
            set statusCode(code) { out.statusCode = code; },
            get statusCode() { return out.statusCode; },
        };
        const next = vi.fn(() => resolve({ next: true }));
        middleware(req, res, next);
    });
}

describe('Plugin Vite : API locale', () => {
    let middleware;

    beforeEach(() => {
        const plugin = viteConfig.plugins.find(p => p && p.name === 'local-stripe-api');
        const middlewares = [];
        plugin.configureServer({ middlewares: { use: (mw) => middlewares.push(mw) } });
        middleware = middlewares[0];
        process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    });

    it('exécute le vrai handler : sans jeton Clerk, ensure-stripe-customer répond 401 comme en prod', async () => {
        const out = await callMiddleware(middleware, {
            url: '/api/ensure-stripe-customer',
            body: { email: 'test@local.dev' },
        });
        expect(out.statusCode).toBe(401);
        expect(JSON.parse(out.body)).toEqual({ error: 'Authentification requise' });
    });

    it('laisse passer les URLs qui ne sont pas des routes API', async () => {
        expect(await callMiddleware(middleware, { url: '/tarifs', method: 'GET' })).toEqual({ next: true });
    });

    it('route /api/* inconnue ou module interne : 404, jamais le code source', async () => {
        for (const url of ['/api/_db', '/api/_auth.js', '/api/inexistant']) {
            const out = await callMiddleware(middleware, { url, method: 'GET' });
            expect(out.statusCode, url).toBe(404);
        }
    });
});
