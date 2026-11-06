// @vitest-environment happy-dom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import CookieConsent from '../src/components/CookieConsent/CookieConsent';
import {
    CONSENT_STORAGE_KEY,
    CONSENT_MAX_AGE_MS,
    readConsent,
    openCookieConsent,
} from '../src/components/CookieConsent/consent';
import fr from '../src/i18n/fr.js';

function renderBanner() {
    return render(
        <MemoryRouter>
            <LanguageProvider>
                <CookieConsent />
            </LanguageProvider>
        </MemoryRouter>
    );
}

describe('bandeau de consentement cookies', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.localStorage.setItem('dpc_lang', 'fr');
        window.gtag = vi.fn();
        window.dataLayer = [];
    });

    test('index.html pose le consentement refusé par défaut avant GTM et gtag', () => {
        const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
        const defaultIdx = html.indexOf("gtag('consent', 'default'");
        expect(defaultIdx).toBeGreaterThan(-1);
        const block = html.slice(defaultIdx, html.indexOf('});', defaultIdx));
        for (const key of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) {
            expect(block).toMatch(new RegExp(`${key}: 'denied'`));
        }
        expect(block).toContain('wait_for_update: 500');
        expect(defaultIdx).toBeLessThan(html.indexOf('GTM-PGCFPVNV'));
        expect(defaultIdx).toBeLessThan(html.indexOf('gtag/js?id=AW-18266266861'));
        expect(html).toContain(CONSENT_STORAGE_KEY);
        expect(html).not.toContain('upload-widget.cloudinary.com');
        expect(html).not.toContain('/api/log-error');
    });

    test('s’affiche sans choix enregistré, accessible, avec deux boutons équivalents', () => {
        renderBanner();
        const dialog = screen.getByRole('dialog', { name: fr.cookieConsent.ariaLabel });
        expect(dialog).toBeInTheDocument();
        const accept = screen.getByRole('button', { name: fr.cookieConsent.accept });
        const refuse = screen.getByRole('button', { name: fr.cookieConsent.refuse });
        expect(accept.className).toBe(refuse.className);
        expect(screen.getByRole('link', { name: fr.cookieConsent.learnMore }).getAttribute('href')).toBe('/confidentialite');
        expect(window.gtag).not.toHaveBeenCalled();
    });

    test('« Tout accepter » met à jour gtag et stocke le choix', () => {
        renderBanner();
        fireEvent.click(screen.getByRole('button', { name: fr.cookieConsent.accept }));
        expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
            ad_storage: 'granted',
            analytics_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
        });
        expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)).value).toBe('granted');
        expect(readConsent()).toBe('granted');
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('« Tout refuser » met à jour gtag en refusé et stocke le choix', () => {
        renderBanner();
        fireEvent.click(screen.getByRole('button', { name: fr.cookieConsent.refuse }));
        expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
        expect(readConsent()).toBe('denied');
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('ne s’affiche pas si un choix valide existe, et se rouvre via « Gérer les cookies »', () => {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ value: 'denied', ts: Date.now() }));
        renderBanner();
        expect(screen.queryByRole('dialog')).toBeNull();
        act(() => openCookieConsent());
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: fr.cookieConsent.refuse }));
    });

    test('redemande le consentement après expiration ou valeur corrompue', () => {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ value: 'granted', ts: Date.now() - CONSENT_MAX_AGE_MS - 1000 }));
        expect(readConsent()).toBeNull();
        window.localStorage.setItem(CONSENT_STORAGE_KEY, '{oops');
        expect(readConsent()).toBeNull();
    });

    test('sans window.gtag, pousse un objet arguments dans dataLayer', () => {
        delete window.gtag;
        renderBanner();
        fireEvent.click(screen.getByRole('button', { name: fr.cookieConsent.accept }));
        const call = window.dataLayer.find((e) => e && e[0] === 'consent');
        expect(call).toBeDefined();
        expect(Array.isArray(call)).toBe(false);
        expect(call[1]).toBe('update');
        expect(call[2].ad_storage).toBe('granted');
    });
});
