// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import { render, screen, act, waitFor } from '@testing-library/react';
import { LanguageProvider, useTranslation } from '../src/i18n/LanguageContext';

const read = (p) => fs.readFileSync(p, 'utf8');

describe('Performance : les gros modules ne sont chargés qu’à la demande', () => {
    it('lecteur PDF (pdfjs) : jamais importé statiquement, worker non dupliqué', () => {
        expect(read('src/pages/Souscription/Souscription.jsx')).not.toMatch(/^import .*pdfConverter/m);
        expect(read('src/utils/pdfConverter.js')).not.toMatch(/^import 'pdfjs-dist\/build\/pdf\.worker/m);
    });

    it('export Excel (xlsx) : chargé au clic', () => {
        expect(read('src/pages/Admin/components/ClientsTab.jsx')).not.toMatch(/^import .*exportClientsExcel/m);
    });

    it('logo de l’espace client : SVG léger, pas le PNG de 318 Ko', () => {
        for (const f of ['src/pages/EspaceClient/components/Sidebar.jsx', 'src/pages/EspaceClient/components/AccountStateScreen.jsx']) {
            expect(read(f)).not.toContain('DomiciliationPasCher-Logo.png');
        }
    });

    it('pages secondaires en lazy + préchargées ; seules accueil et /offre restent dans le bundle principal', () => {
        const app = read('src/App.jsx');
        const eagerPages = [...app.matchAll(/^import \w+ from '\.\/pages\/([^']+)'/gm)].map((m) => m[1]);
        expect(eagerPages.sort()).toEqual(['Home/Home', 'Landing/Landing']);
        expect(app).toContain('usePrefetchPages();');
    });

    it('langues : en / ru hors du bundle principal', () => {
        const ctx = read('src/i18n/LanguageContext.jsx');
        expect(ctx).not.toMatch(/^import (en|ru) from/m);
        expect(read('src/main.jsx')).toContain('preloadInitialLanguage()');
    });

    it('changer de langue charge la traduction puis réaffiche les textes', async () => {
        try { localStorage.setItem('dpc_lang', 'fr'); } catch { /* */ }
        const Probe = () => {
            const { t, setLang } = useTranslation();
            return <button type="button" onClick={() => setLang('ru')}>{t('common.loading')}</button>;
        };
        render(<LanguageProvider><Probe /></LanguageProvider>);
        const fr = screen.getByRole('button').textContent;
        await act(async () => { screen.getByRole('button').click(); });
        await waitFor(() => expect(screen.getByRole('button').textContent).not.toBe(fr));
        expect(screen.getByRole('button').textContent).toMatch(/[А-Яа-я]/);
    });

    it('messagerie : pas d’appel serveur quand l’onglet est caché', () => {
        expect(read('src/pages/EspaceClient/components/Messages.jsx')).toContain('!document.hidden');
    });
});
