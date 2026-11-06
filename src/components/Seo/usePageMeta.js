import { useEffect } from 'react';

/** Origine canonique du site (doit rester alignée avec index.html et public/sitemap.xml). */
export const SITE_URL = 'https://www.domiciliation-pas-cher.com';

/** Construit l'URL absolue canonique d'un chemin (« / », « /tarifs »…). */
export function canonicalUrl(path = '/') {
    const clean = `/${String(path || '/').replace(/^\/+/, '')}`;
    return `${SITE_URL}${clean === '/' ? '/' : clean.replace(/\/+$/, '')}`;
}

/**
 * Tronque un texte pour une meta description (≈ 155 caractères, coupe sur un mot).
 */
export function toMetaDescription(text, max = 155) {
    const flat = String(text || '').replace(/\s+/g, ' ').trim();
    if (flat.length <= max) return flat;
    const cut = flat.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.—-]+$/, '')}…`;
}

function upsertHeadElement(selector, create) {
    let el = document.head.querySelector(selector);
    let created = false;
    if (!el) {
        el = create();
        document.head.appendChild(el);
        created = true;
    }
    return { el, created };
}

function setAttr(selector, create, attr, value, restorers) {
    const { el, created } = upsertHeadElement(selector, create);
    const previous = el.getAttribute(attr);
    el.setAttribute(attr, value);
    restorers.push(() => {
        if (created) el.remove();
        else if (previous === null) el.removeAttribute(attr);
        else el.setAttribute(attr, previous);
    });
}

const meta = (key, name) => () => {
    const el = document.createElement('meta');
    el.setAttribute(key, name);
    return el;
};

/**
 * Applique les métadonnées d'une page dans <head> et renvoie une fonction de nettoyage
 * qui restaure l'état précédent (balises créées supprimées, valeurs d'origine remises).
 *
 * @param {object} opts
 * @param {string} [opts.title]        document.title + og:title
 * @param {string} [opts.description]  meta description + og:description
 * @param {string} [opts.path]         chemin canonique (« /tarifs ») → link canonical + og:url
 * @param {boolean} [opts.noindex]     ajoute <meta name="robots" content="noindex,nofollow">
 */
export function applyPageMeta({ title, description, path, noindex = false } = {}) {
    if (typeof document === 'undefined') return () => {};
    const restorers = [];

    if (title) {
        const previousTitle = document.title;
        document.title = title;
        restorers.push(() => { document.title = previousTitle; });
        setAttr('meta[property="og:title"]', meta('property', 'og:title'), 'content', title, restorers);
    }

    if (description) {
        setAttr('meta[name="description"]', meta('name', 'description'), 'content', description, restorers);
        setAttr('meta[property="og:description"]', meta('property', 'og:description'), 'content', description, restorers);
    }

    if (path) {
        const url = canonicalUrl(path);
        setAttr('link[rel="canonical"]', () => {
            const el = document.createElement('link');
            el.setAttribute('rel', 'canonical');
            return el;
        }, 'href', url, restorers);
        setAttr('meta[property="og:url"]', meta('property', 'og:url'), 'content', url, restorers);
    }

    if (noindex) {
        setAttr('meta[name="robots"]', meta('name', 'robots'), 'content', 'noindex,nofollow', restorers);
    }

    return () => {
        for (let i = restorers.length - 1; i >= 0; i -= 1) restorers[i]();
    };
}

/**
 * Hook React : métadonnées SEO par route (titre, description, canonical, Open Graph, noindex).
 * Les valeurs d'origine de index.html sont restaurées au démontage.
 */
export default function usePageMeta({ title, description, path, noindex = false } = {}) {
    useEffect(
        () => applyPageMeta({ title, description, path, noindex }),
        [title, description, path, noindex],
    );
}
