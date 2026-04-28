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
                <div className="cards-grid">
                    {failedClients.map(c => (
                        <div key={c.id} className="case-card" onClick={() => onSelect(c.id)} style={{ borderLeft: '4px solid #ef4444' }}>
                            <div className="case-card-header">
                                <span className="case-badge badge-danger" style={{ textTransform: 'uppercase' }}>{c.status}</span>
                                <span className="case-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    {c.since || 'Non définie'}
                                </span>
                            </div>
                            
                            <div className="case-card-body">
                                <h3 className="case-title" style={{ color: '#991b1b' }}>{c.company}</h3>
                                <p className="case-client-name">{c.name}</p>
                                <p className="case-client-email" style={{ fontSize: '13px', color: 'var(--admin-text-sub)', marginTop: '4px' }}>{c.email}</p>
                            </div>
                            
                            <div className="case-card-footer">
                                <button 
                                    className="btn-primary-sm" 
                                    style={{ background: '#10b981', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                                    onClick={(e) => handleMarkAsActive(c.id, e)}
                                >
                                    Régulariser
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
