import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendBrandedMail } = vi.hoisted(() => ({ sendBrandedMail: vi.fn().mockResolvedValue({ messageId: 'm1' }) }));
vi.mock('../api/_email-kit.js', async (importOriginal) => ({ ...(await importOriginal()), sendBrandedMail }));
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({})) } }));
vi.mock('../api/_db.js', () => ({ getDbConn: () => null }));

import { deliverEmail, safeHttpUrl } from '../api/_email-core.js';
import { installApiAuth, isSameOriginApiUrl } from '../src/utils/apiAuth.js';
import { getAuthUser, __setAuthVerifierForTests, isAdminEmail } from '../api/_auth.js';

describe('emails : échappement HTML et liens', () => {
    beforeEach(() => {
        sendBrandedMail.mockClear();
        process.env.SMTP_HOST = 'smtp.test';
        process.env.SMTP_USER = 'user';
        process.env.SMTP_PASS = 'pass';
    });

    it('échappe le contenu fourni par l’utilisateur dans le HTML', async () => {
        await deliverEmail({
            email: 'client@test.fr',
            type: 'new_message',
            nom: '<img src=x onerror=alert(1)>',
            content: '<a href="https://phish.example">Cliquez</a>',
        });
        const { html } = sendBrandedMail.mock.calls[0][1];
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('<a href="https://phish.example">');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('refuse les liens de paiement non http(s)', () => {
        expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
        expect(safeHttpUrl('data:text/html,<script>')).toBeUndefined();
        expect(safeHttpUrl('https://checkout.stripe.com/x')).toBe('https://checkout.stripe.com/x');
    });
});

describe('jeton Clerk joint aux appels /api/*', () => {
    it('n’ajoute le jeton qu’aux routes API du même domaine', async () => {
        const calls = [];
        const target = {
            location: { origin: 'https://site.fr' },
            fetch: vi.fn(async (input, init) => { calls.push({ input, init }); return { ok: true }; }),
        };
        installApiAuth({ target, getToken: async () => 'jwt_123' });

        await target.fetch('/api/data', { method: 'POST' });
        await target.fetch('https://api.stripe.com/v1/x');
        await target.fetch('https://autre-site.fr/api/data');

        expect(calls[0].init.headers.get('Authorization')).toBe('Bearer jwt_123');
        expect(calls[1].init?.headers).toBeUndefined();
        expect(calls[2].init?.headers).toBeUndefined();
    });

    it('reconnaît les URLs API du même domaine', () => {
        expect(isSameOriginApiUrl('/api/data', 'https://site.fr')).toBe(true);
        expect(isSameOriginApiUrl('https://site.fr/api/x?y=1', 'https://site.fr')).toBe(true);
        expect(isSameOriginApiUrl('https://evil.fr/api/x', 'https://site.fr')).toBe(false);
        expect(isSameOriginApiUrl('/tarifs', 'https://site.fr')).toBe(false);
    });
});

describe('authentification serveur', () => {
    it('sans jeton ou avec un jeton refusé : aucun utilisateur', async () => {
        __setAuthVerifierForTests(async () => { throw new Error('bad signature'); });
        expect(await getAuthUser({ headers: {} })).toBeNull();
        expect(await getAuthUser({ headers: { authorization: 'Bearer forged' } })).toBeNull();
    });

    it('le rôle admin dépend de l’email vérifié côté serveur', async () => {
        __setAuthVerifierForTests(async () => ({ userId: 'u1', email: 'mwcrea.agency@gmail.com' }));
        expect((await getAuthUser({ headers: { authorization: 'Bearer ok' } })).isAdmin).toBe(true);
        __setAuthVerifierForTests(async () => ({ userId: 'u2', email: 'client@test.fr' }));
        expect((await getAuthUser({ headers: { authorization: 'Bearer ok' } })).isAdmin).toBe(false);
        expect(isAdminEmail(' MWCREA.agency@gmail.com ')).toBe(true);
    });
});
