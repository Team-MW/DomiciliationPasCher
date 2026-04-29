import React from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function FailedPaymentsTab({ clients, onSelect, onUpdate }) {
    const failedClients = clients.filter(c => c.status === 'impayé' || c.status === 'echec_paiement');

    const handleMarkAsActive = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Confirmer que le paiement a bien été régularisé ? Le compte repassera en "actif".')) {
            try {
                await adminDataService.updateClientStatus(id, 'actif');
                onUpdate();
            } catch (err) {
                console.error("Erreur mise à jour statut", err);
                alert("Erreur lors de la mise à jour");
            }
        }
    };

    return (
        <div className="failed-payments-container">
            <div className="tab-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 24, height: 24 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Paiements Échoués ({failedClients.length})
                    </h2>
                    <p style={{ color: 'var(--admin-text-sub)', fontSize: '14px', marginTop: '4px' }}>Dossiers nécessitant une régularisation de paiement.</p>
                </div>
            </div>
            
            {failedClients.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--admin-text-main)', marginBottom: '8px' }}>Aucun paiement échoué</h3>
                    <p style={{ color: 'var(--admin-text-sub)' }}>Tous vos clients sont à jour dans leurs paiements. Excellent travail !</p>
                </div>
            ) : (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client / Entreprise</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {failedClients.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                                <td style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => onSelect(c.id)}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#991B1B' }}>{c.company}</div>
                                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{c.name} ({c.email})</div>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '9999px', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '700', textTransform: 'capitalize' }}>
                                        {c.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 20px', fontSize: '13px', color: '#64748B' }}>{c.since || 'Non définie'}</td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button onClick={(e) => handleMarkAsActive(c.id, e)} style={{ padding: '8px 14px', background: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                            Régulariser
                                        </button>
                                        <button onClick={() => onSelect(c.id)} style={{ padding: '8px 14px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                            Dossier
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>
    );
}
