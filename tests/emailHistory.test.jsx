// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent, within } from '@testing-library/react';
import EmailHistory from '../src/pages/Admin/components/EmailHistory.jsx';
import { EMAIL_TYPE_INFO, emailSourceOf } from '../shared/emailTypes.js';
import { EMAIL_TYPES } from '../api/_email-core.js';
import { sendBrandedMail, logEmail } from '../api/_email-kit.js';

const LOGS = [
    { id: '1', type: 'payment_link_reminder', subject: 'Rappel : finalisez votre abonnement', to_email: 'c@x.fr', client_email: 'c@x.fr', status: 'sent', sent_at: '2026-11-06T10:00:00Z', body_text: 'Bonjour David,\nVotre lien de paiement…', source: 'auto' },
    { id: '2', type: 'account_created', subject: 'Votre dossier est prêt', to_email: 'c@x.fr', client_email: 'c@x.fr', status: 'failed', error: 'Configuration SMTP du serveur manquante.', sent_at: '2026-11-06T09:00:00Z', source: 'manuel' },
    { id: '3', type: 'admin_new_message', subject: 'Nouveau message de David', to_email: 'contact@domiciliation-pas-cher.com', client_email: 'c@x.fr', status: 'sent', sent_at: '2026-11-05T09:00:00Z' },
];

describe('Historique des emails (fiche client)', () => {
    it('affiche compteurs, libellés lisibles, origine et statut', () => {
        render(<EmailHistory logs={LOGS} clientEmail="c@x.fr" />);
        expect(screen.getByText('Relance du lien de paiement')).toBeInTheDocument();
        expect(screen.getByText('Dossier créé : lien de paiement')).toBeInTheDocument();
        expect(screen.getByText('Alerte : message du client')).toBeInTheDocument();
        const stats = document.querySelector('.eh-stats');
        expect(within(stats).getByText('3')).toBeInTheDocument();
        expect(screen.getAllByText('Échec').length).toBeGreaterThan(0);
    });

    it('filtre les échecs et montre la raison + le contenu au clic', () => {
        render(<EmailHistory logs={LOGS} clientEmail="c@x.fr" />);
        fireEvent.click(screen.getByRole('tab', { name: /Échecs/ }));
        expect(screen.queryByText('Relance du lien de paiement')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Dossier créé : lien de paiement'));
        expect(screen.getByText(/Configuration SMTP du serveur manquante/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /Automatiques/ }));
        fireEvent.click(screen.getByText('Relance du lien de paiement'));
        expect(screen.getByText(/Votre lien de paiement/)).toBeInTheDocument();
    });

    it('recherche dans le contenu, état vide et chargement', () => {
        const { rerender } = render(<EmailHistory logs={LOGS} />);
        fireEvent.change(screen.getByPlaceholderText(/Objet, contenu/), { target: { value: 'lien de paiement' } });
        expect(screen.getByText('Relance du lien de paiement')).toBeInTheDocument();
        expect(screen.queryByText('Alerte : message du client')).not.toBeInTheDocument();
        rerender(<EmailHistory logs={[]} />);
        expect(screen.getByText('Aucun email enregistré pour ce client')).toBeInTheDocument();
        rerender(<EmailHistory logs={null} />);
        expect(screen.getByLabelText('Chargement de l’historique')).toBeInTheDocument();
    });

    it('anciennes lignes sans colonne source : origine déduite du type', () => {
        expect(emailSourceOf({ type: 'renewal_reminder' })).toBe('auto');
        expect(emailSourceOf({ type: 'admin_new_client' })).toBe('interne');
        expect(emailSourceOf({ type: 'approval', source: 'manuel' })).toBe('manuel');
    });
});

describe('Journal : chaque email, sans exception, a un libellé dans l’historique', () => {
    it('tous les types du moteur + tous les types envoyés directement par le serveur sont catalogués', () => {
        const direct = new Set();
        for (const f of fs.readdirSync('api', { recursive: true })) {
            if (!String(f).endsWith('.js')) continue;
            const src = fs.readFileSync(path.join('api', f), 'utf8');
            for (const m of src.matchAll(/type:\s*'([a-z_]+)'/g)) direct.add(m[1]);
            for (const m of src.matchAll(/'(request_documents(?:_reminder)?)'/g)) direct.add(m[1]);
        }
        const emailish = [...direct].filter((t) => !['card', 'meeting_booking'].includes(t));
        const missing = [...new Set([...EMAIL_TYPES, ...emailish])].filter((t) => !EMAIL_TYPE_INFO[t]);
        expect(missing).toEqual([]);
    });

    it('archive le contenu texte, l’origine et l’identifiant SMTP', async () => {
        const conn = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
        const transporter = { sendMail: vi.fn().mockResolvedValue({ messageId: '<abc@gmail>' }) };
        await sendBrandedMail(transporter, { conn, to: 'c@x.fr', subject: 'S', html: '<p>Votre courrier</p>', type: 'new_mail' });
        const [sql, params] = conn.execute.mock.calls.find(([q]) => q.startsWith('INSERT INTO email_logs'));
        expect(sql).toContain('body_text, source, message_id');
        expect(params).toEqual(expect.arrayContaining(['sent', 'Votre courrier', 'auto', '<abc@gmail>']));
    });

    it('un échec est journalisé avec sa raison ; un journal en panne ne bloque rien', async () => {
        const conn = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
        const transporter = { sendMail: vi.fn().mockRejectedValue(new Error('535 refusé')) };
        await expect(sendBrandedMail(transporter, { conn, to: 'c@x.fr', subject: 'S', html: '<p>x</p>', type: 'approval', source: 'manuel' })).rejects.toThrow('535');
        const params = conn.execute.mock.calls.find(([q]) => q.startsWith('INSERT INTO email_logs'))[1];
        expect(params).toEqual(expect.arrayContaining(['failed', '535 refusé', 'manuel']));
        const broken = { execute: vi.fn().mockRejectedValue(new Error('db down')) };
        await expect(logEmail(broken, { to: 'a', status: 'sent' })).resolves.toBeUndefined();
    });
});
