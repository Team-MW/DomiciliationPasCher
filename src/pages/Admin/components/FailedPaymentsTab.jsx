import React from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function FailedPaymentsTab({ clients, onSelect, onUpdate }) {
    // Filtrer les clients avec un problème de paiement
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
        <div className="content-card">
            <div className="card-header" style={{ borderBottom: '1px solid #fee2e2', background: '#fff1f2', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
                <h2 style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 20}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Facturation - Paiements Échoués ({failedClients.length})
                </h2>
                <div className="header-actions">
                    <button className="btn-secondary-sm" style={{ color: '#991b1b', borderColor: '#fca5a5' }}>Exporter la liste</button>
                </div>
            </div>
            
            {failedClients.length === 0 ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Aucun paiement échoué</h3>
                    <p>Tous vos clients sont à jour dans leurs paiements. Excellent travail !</p>
                </div>
            ) : (
                <div className="card-body-table" style={{ background: '#fffcfc' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Entreprise / Client</th>
                                <th>Email</th>
                                <th>Statut du Dossier</th>
                                <th style={{ textAlign: 'right' }}>Actions Requises</th>
                            </tr>
                        </thead>
                        <tbody>
                            {failedClients.map(c => (
                                <tr key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: 'pointer', background: '#fef2f2' }} className="row-hover">
                                    <td>
                                        <div className="table-primary" style={{ color: '#7f1d1d' }}>{c.company}</div>
                                        <div className="table-secondary">{c.name}</div>
                                    </td>
                                    <td>{c.email}</td>
                                    <td>
                                        <span style={{
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            border: '1px solid #fca5a5'
                                        }}>
                                            {c.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button 
                                            className="btn-primary-sm" 
                                            style={{ background: '#10b981', boxShadow: 'none', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                            onClick={(e) => handleMarkAsActive(c.id, e)}
                                        >
                                            Régulariser
                                        </button>
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
