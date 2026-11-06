// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import usePageMeta, { applyPageMeta, canonicalUrl, toMetaDescription } from '../src/components/Seo/usePageMeta';

function resetHead() {
    document.head.innerHTML = `
        <meta name="description" content="desc index" />
        <link rel="canonical" href="https://www.domiciliation-pas-cher.com/" />
        <meta property="og:title" content="og index" />
        <meta property="og:description" content="ogd index" />
        <meta property="og:url" content="https://www.domiciliation-pas-cher.com/" />`;
    document.title = 'Titre index';
}

const q = (sel) => document.head.querySelectorAll(sel);
const attr = (sel, a) => document.head.querySelector(sel)?.getAttribute(a);

function Page(props) {
    usePageMeta(props);
    return null;
}

describe('usePageMeta', () => {
    beforeEach(resetHead);

    it('remplace le canonical existant (sans doublon), la description et Open Graph', () => {
        render(<Page title="Tarifs" description="Nos prix" path="/tarifs" />);
        expect(document.title).toBe('Tarifs');
        expect(q('link[rel="canonical"]')).toHaveLength(1);
        expect(attr('link[rel="canonical"]', 'href')).toBe('https://www.domiciliation-pas-cher.com/tarifs');
        expect(attr('meta[name="description"]', 'content')).toBe('Nos prix');
        expect(attr('meta[property="og:title"]', 'content')).toBe('Tarifs');
        expect(attr('meta[property="og:description"]', 'content')).toBe('Nos prix');
        expect(attr('meta[property="og:url"]', 'content')).toBe('https://www.domiciliation-pas-cher.com/tarifs');
    });

    it('crée le canonical s’il est absent et le retire au démontage', () => {
        document.head.innerHTML = '';
        const { unmount } = render(<Page path="/villes" />);
        expect(attr('link[rel="canonical"]', 'href')).toBe('https://www.domiciliation-pas-cher.com/villes');
        unmount();
        expect(q('link[rel="canonical"]')).toHaveLength(0);
    });

    it('restaure les valeurs de index.html au démontage', () => {
        const { unmount } = render(<Page title="X" description="Y" path="/services" />);
        unmount();
        expect(document.title).toBe('Titre index');
        expect(attr('meta[name="description"]', 'content')).toBe('desc index');
        expect(attr('link[rel="canonical"]', 'href')).toBe('https://www.domiciliation-pas-cher.com/');
        expect(attr('meta[property="og:url"]', 'content')).toBe('https://www.domiciliation-pas-cher.com/');
    });

    it('met à jour lors d’un changement de route / langue', () => {
        const { rerender } = render(<Page title="A" path="/a-propos" />);
        rerender(<Page title="B" path="/rendez-vous" />);
        expect(document.title).toBe('B');
        expect(q('link[rel="canonical"]')).toHaveLength(1);
        expect(attr('link[rel="canonical"]', 'href')).toBe('https://www.domiciliation-pas-cher.com/rendez-vous');
    });

    it('ajoute noindex,nofollow pendant le montage puis le supprime', () => {
        const { unmount } = render(<Page path="/connexion" noindex />);
        expect(attr('meta[name="robots"]', 'content')).toBe('noindex,nofollow');
        unmount();
        expect(q('meta[name="robots"]')).toHaveLength(0);
    });

    it('n’ajoute pas de robots sans noindex', () => {
        const cleanup = applyPageMeta({ title: 'T', path: '/' });
        expect(q('meta[name="robots"]')).toHaveLength(0);
        cleanup();
    });
});

describe('helpers', () => {
    it('canonicalUrl normalise les chemins', () => {
        expect(canonicalUrl('/')).toBe('https://www.domiciliation-pas-cher.com/');
        expect(canonicalUrl('tarifs/')).toBe('https://www.domiciliation-pas-cher.com/tarifs');
    });

    it('toMetaDescription tronque sur un mot', () => {
        const long = 'mot '.repeat(80);
        const out = toMetaDescription(long);
        expect(out.length).toBeLessThanOrEqual(155);
        expect(out.endsWith('…')).toBe(true);
        expect(toMetaDescription('court')).toBe('court');
    });
});
