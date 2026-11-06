import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddInvoiceModal from '../src/pages/Admin/components/AddInvoiceModal';

describe('Admin : fenêtre « Ajouter une facture » (remplace les prompt() du navigateur)', () => {
    it('préremplit le montant au format français et envoie montant + date', async () => {
        const onSubmit = vi.fn(async () => {});
        render(<AddInvoiceModal defaultAmount="28.80" clientLabel="ACME" onCancel={vi.fn()} onSubmit={onSubmit} />);

        const amount = screen.getByLabelText('Montant TTC (€)');
        expect(amount.value).toBe('28,80');
        fireEvent.change(screen.getByLabelText('Date de la facture'), { target: { value: '2026-11-06' } });
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter la facture' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ amount: 28.8, date: '2026-11-06' }));
    });

    it('refuse un montant nul ou illisible, avec un message, sans rien envoyer', async () => {
        const onSubmit = vi.fn();
        render(<AddInvoiceModal defaultAmount="28.80" onCancel={vi.fn()} onSubmit={onSubmit} />);

        for (const bad of ['0', 'abc', '-5']) {
            fireEvent.change(screen.getByLabelText('Montant TTC (€)'), { target: { value: bad } });
            fireEvent.click(screen.getByRole('button', { name: 'Ajouter la facture' }));
            expect(await screen.findByRole('alert')).toHaveTextContent('montant TTC supérieur à 0');
        }
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('signale un montant inhabituel (faute de frappe probable)', async () => {
        const onSubmit = vi.fn();
        render(<AddInvoiceModal defaultAmount="28.80" onCancel={vi.fn()} onSubmit={onSubmit} />);
        fireEvent.change(screen.getByLabelText('Montant TTC (€)'), { target: { value: '28800' } });
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter la facture' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Montant inhabituel');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('Annuler ferme sans rien envoyer', () => {
        const onCancel = vi.fn();
        const onSubmit = vi.fn();
        render(<AddInvoiceModal defaultAmount="16" onCancel={onCancel} onSubmit={onSubmit} />);
        fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
        expect(onCancel).toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
