// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import { render, screen } from '@testing-library/react';
import ClientsTab from '../src/pages/Admin/components/ClientsTab.jsx';

describe('Admin : chargement lisible', () => {
    it('premier chargement : squelette, jamais « Aucun client » avant la réponse du serveur', () => {
        const { container } = render(<ClientsTab loading clients={[]} searchQuery="" onSelect={() => {}} onCreateClick={() => {}} />);
        expect(container.querySelectorAll('.admin-skel').length).toBeGreaterThan(5);
        expect(screen.queryByText(/Aucun client/)).toBeNull();
    });

    it('chargé et vide : message honnête ; avec une recherche : message de recherche', () => {
        const { rerender } = render(<ClientsTab loading={false} clients={[]} searchQuery="" onSelect={() => {}} onCreateClick={() => {}} />);
        expect(screen.getByText('Aucun client pour le moment.')).toBeInTheDocument();
        rerender(<ClientsTab loading={false} clients={[{ id: 'c1', name: 'Ada', company: 'ACME', email: 'a@b.fr', plan: 'Essentiel', status: 'actif', since: '2026-01-01' }]} searchQuery="zzz" onSelect={() => {}} onCreateClick={() => {}} />);
        expect(screen.getByText(/Aucun client trouvé pour « zzz »/)).toBeInTheDocument();
    });

    it('rechargement après une action : la liste reste visible (pas de squelette, pas de flou)', () => {
        const client = { id: 'c1', name: 'Ada', company: 'ACME', email: 'a@b.fr', plan: 'Essentiel', status: 'actif', since: '2026-01-01' };
        const { container } = render(<ClientsTab loading clients={[client]} searchQuery="" onSelect={() => {}} onCreateClick={() => {}} />);
        expect(container.querySelectorAll('.admin-skel').length).toBe(0);
        expect(screen.getByText('ACME')).toBeInTheDocument();
    });

    it('le CSS : barre de chargement fixe et animation de rotation complète (plus de voile flou plein écran)', () => {
        const css = fs.readFileSync('src/pages/Admin/Admin.css', 'utf8');
        expect(css).not.toMatch(/\.loading-overlay/);
        expect(css).toMatch(/\.admin-loadbar\s*\{[^}]*position:\s*fixed/);
        expect(css).toMatch(/@keyframes spin\s*\{[\s\S]*?100%\s*\{\s*transform:\s*rotate\(360deg\)/);
        const jsx = fs.readFileSync('src/pages/Admin/Admin.jsx', 'utf8');
        expect(jsx).not.toContain('loading-overlay');
        expect(jsx).toContain('admin-loadbar');
    });
});
