import { parisDateIso } from '../../../../shared/parisDate.js';
import React, { useState } from 'react';

/**
 * Ajout manuel d'une facture (paiement) dans le dossier client.
 * Remplace les deux `prompt()` du navigateur : montant prérempli au prix du contrat du client,
 * sélecteur de date, validation avant envoi.
 */
export default function AddInvoiceModal({ defaultAmount, clientLabel, onCancel, onSubmit }) {
    const [amount, setAmount] = useState(String(defaultAmount ?? '').replace('.', ','));
    const [date, setDate] = useState(() => parisDateIso());
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = Number(String(amount).trim().replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0) {
            setError('Indiquez un montant TTC supérieur à 0 (ex. 28,80).');
            return;
        }
        if (value > 10000) {
            setError('Montant inhabituel (plus de 10 000 €) : vérifiez la saisie.');
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
            setError('Indiquez une date valide.');
            return;
        }
        setError('');
        setSaving(true);
        try {
            await onSubmit({ amount: Math.round(value * 100) / 100, date });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-modal-overlay" style={{ zIndex: 1000 }} role="presentation" onClick={() => !saving && onCancel()}>
            <div
                className="admin-modal"
                style={{ maxWidth: '440px' }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-invoice-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id="add-invoice-title">Ajouter une facture</h2>
                    <button type="button" className="btn-close" onClick={onCancel} disabled={saving} aria-label="Fermer">×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    {clientLabel && (
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>Client : <strong style={{ color: '#0F172A' }}>{clientLabel}</strong></p>
                    )}
                    <div className="form-group">
                        <label htmlFor="invoice-amount">Montant TTC (€)</label>
                        <input
                            id="invoice-amount"
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            autoFocus
                            required
                        />
                        <small style={{ color: '#64748B', fontSize: '12px' }}>Prérempli avec le prix du contrat de ce client.</small>
                    </div>
                    <div className="form-group" style={{ marginTop: '14px' }}>
                        <label htmlFor="invoice-date">Date de la facture</label>
                        <input id="invoice-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    {error && (
                        <div role="alert" style={{ marginTop: '14px', padding: '10px 12px', background: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px' }}>
                            {error}
                        </div>
                    )}
                    <div className="modal-footer" style={{ marginTop: '20px' }}>
                        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Annuler</button>
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter la facture'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
