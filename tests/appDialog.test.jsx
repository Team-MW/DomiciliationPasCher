// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
vi.mock('../src/i18n/detectLanguage', () => ({
    detectLanguageFromIP: vi.fn().mockResolvedValue(null),
}));

import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DialogProvider } from '../src/components/AppDialog/DialogProvider';
import { appAlert, appConfirm } from '../src/components/AppDialog/dialogApi';

const wrap = (ui) => render(
    <LanguageProvider>
        <DialogProvider>{ui}</DialogProvider>
    </LanguageProvider>
);

describe('modales AppDialog', () => {
    beforeEach(() => {
        window.localStorage.setItem('dpc_lang', 'fr');
    });
    it('affiche une confirmation stylée à la place de window.confirm', async () => {
        wrap(
            <button type="button" onClick={() => appConfirm('Passer au forfait Physique+ ?', { title: 'Changer de formule', confirmText: 'Confirmer le changement' })}>
                Changer
            </button>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Changer' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Changer de formule')).toBeInTheDocument();
        expect(screen.getByText('Passer au forfait Physique+ ?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirmer le changement' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Annuler|Cancel/ })).toBeInTheDocument();
    });

    it('résout true quand on confirme', async () => {
        let result;
        wrap(
            <button type="button" onClick={async () => { result = await appConfirm('OK ?'); }}>
                Go
            </button>
        );
        fireEvent.click(screen.getByRole('button', { name: 'Go' }));
        fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
        await waitFor(() => expect(result).toBe(true));
    });

    it('affiche une alerte stylée', async () => {
        wrap(
            <button type="button" onClick={() => appAlert('Scan indisponible')}>Ping</button>
        );
        fireEvent.click(screen.getByRole('button', { name: 'Ping' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Scan indisponible')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Fermer|Close/ }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
});
