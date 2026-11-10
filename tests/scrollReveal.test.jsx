// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/i18n/LanguageContext', async () => {
    const real = (await import('../src/i18n/fr.js')).default;
    return { useTranslation: () => ({ lang: 'fr', t: (k) => k, tr: real }) };
});
vi.mock('../src/components/Seo/usePageMeta', () => ({ default: () => {} }));

import About from '../src/pages/About/About.jsx';

afterEach(() => { vi.unstubAllGlobals(); });

describe('Les blocs cachés par défaut (.animate-in) sont toujours révélés', () => {
    it('« À propos » : les blocs passent en .visible quand ils entrent à l’écran (avant : page blanche)', () => {
        const observed = [];
        let callback;
        vi.stubGlobal('IntersectionObserver', class {
            constructor(cb) { callback = cb; }
            observe(el) { observed.push(el); }
            unobserve() {}
            disconnect() {}
        });
        const { container } = render(<MemoryRouter><About /></MemoryRouter>);
        const blocks = container.querySelectorAll('.animate-in');
        expect(blocks.length).toBeGreaterThan(3);
        expect(observed.length).toBe(blocks.length);
        callback(observed.map((target) => ({ isIntersecting: true, target })));
        expect([...blocks].every((el) => el.classList.contains('visible'))).toBe(true);
    });

    it('sans IntersectionObserver (vieux navigateur) : tout est visible tout de suite', () => {
        vi.stubGlobal('IntersectionObserver', undefined);
        const { container } = render(<MemoryRouter><About /></MemoryRouter>);
        expect([...container.querySelectorAll('.animate-in')].every((el) => el.classList.contains('visible'))).toBe(true);
    });

    it('GARDE-FOU : tout fichier qui utilise la classe animate-in contient aussi un mécanisme de révélation', () => {
        const offenders = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const file = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(file);
                else if (/\.jsx$/.test(entry.name)) {
                    const src = fs.readFileSync(file, 'utf8');
                    if (/animate-in/.test(src) && !/IntersectionObserver|useScrollReveal/.test(src)) offenders.push(file);
                }
            }
        };
        walk('src');
        expect(offenders).toEqual([]);
    });

    it('le CSS affiche tout sans animation quand le visiteur demande moins de mouvement', () => {
        expect(fs.readFileSync('src/index.css', 'utf8')).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.animate-in \{ opacity: 1/);
    });
});

describe('Titres et cibles tactiles', () => {
    it('/souscription et /inscription ont un titre principal (h1)', () => {
        expect(fs.readFileSync('src/pages/Souscription/Souscription.jsx', 'utf8')).toContain('<h1>{currentMeta.title}</h1>');
        expect(fs.readFileSync('src/pages/Connexion/Inscription.jsx', 'utf8')).toMatch(/<h1[^>]*>Accès réservé<\/h1>/);
        expect(fs.readFileSync('src/pages/Souscription/Souscription.css', 'utf8')).not.toContain('.sous-step-header h2');
    });
    it('les boutons mobiles (Menu, cookies, détail) ont une taille de toucher suffisante', () => {
        const css = fs.readFileSync('src/index.css', 'utf8');
        expect(css).toMatch(/\.hamburger \{ min-width: 44px; min-height: 44px/);
        expect(css).toMatch(/\.footer-legal-btn \{ min-height: 40px/);
    });
});
