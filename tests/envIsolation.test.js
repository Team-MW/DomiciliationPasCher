// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readServerEnv, readServerEnvAny } from '../api/_env.js';
import { getSmtpConfig } from '../api/_smtp.js';

// Un .env.local de développeur (vraies clés PlanetScale / Stripe / Gmail) ne doit jamais
// être lu pendant les tests : sinon un test pourrait toucher la vraie base ou envoyer de vrais emails.
describe('Isolation des tests vis-à-vis de .env.local', () => {
    it('ignore le fichier .env.local quand la variable n’est pas dans process.env', () => {
        for (const key of ['DATABASE_PASSWORD', 'VITE_DATABASE_PASSWORD', 'STRIPE_SECRET_KEY', 'SMTP_PASS', 'CLERK_SECRET_KEY']) {
            const saved = process.env[key];
            delete process.env[key];
            try {
                expect(readServerEnv(key), key).toBeNull();
            } finally {
                if (saved !== undefined) process.env[key] = saved;
            }
        }
        expect(readServerEnvAny('DATABASE_HOST', 'VITE_DATABASE_HOST')).toBe(process.env.DATABASE_HOST || process.env.VITE_DATABASE_HOST || null);
    });

    it('Vitest n’injecte aucune variable du .env.local (envDir isolé)', () => {
        for (const key of ['VITE_DATABASE_HOST', 'VITE_DATABASE_PASSWORD', 'VITE_STRIPE_PUBLISHABLE_KEY', 'VITE_CLERK_PUBLISHABLE_KEY']) {
            expect(process.env[key], key).toBeUndefined();
            expect(import.meta.env[key], key).toBeUndefined();
        }
    });

    it('la config SMTP ne vient que de process.env pendant les tests', () => {
        const keys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
        const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
        keys.forEach((k) => delete process.env[k]);
        try {
            expect(getSmtpConfig()).toBeNull();
            Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_USER: 'u@test', SMTP_PASS: 'x' });
            expect(getSmtpConfig()).toMatchObject({ host: 'smtp.test', user: 'u@test', port: 465, from: 'u@test' });
        } finally {
            keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
        }
    });
});
