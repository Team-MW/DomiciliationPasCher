import React, { useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function DemandesTab({ demandes, onUpdate }) {
    const [loadingId, setLoadingId] = useState(null);

    const handleAccepter = async (id) => {
        const d = demandes.find(item => item.id === id);
        setLoadingId(id);
        try {
            await adminDataService.traiterDemande(id);
            onUpdate();
            alert(`Accès créé avec succès pour ${d.email} ! Un email d'invitation a été simulé.`);
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="demandes-container">
            <div className="tab-header" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main)' }}>Nouvelles Souscriptions</h2>
                <p style={{ color: 'var(--admin-text-sub)', fontSize: '14px', marginTop: '4px' }}>Traitez les demandes d'accès et validez les dossiers.</p>
            </div>

            {demandes.length === 0 ? (
                <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--admin-border)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--admin-text-sub)', opacity: 0.5, marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <p style={{ color: 'var(--admin-text-sub)', fontSize: '16px', fontWeight: '600' }}>Aucune demande en attente de traitement.</p>
                </div>
            ) : (
                <div className="cards-grid">
                    {demandes.map(d => {
                        let extra = null;
                        try {
                            if (d.extra_info) {
                                extra = typeof d.extra_info === 'string' ? JSON.parse(d.extra_info) : d.extra_info;
                            }
                        } catch (e) {}
                        
                        return (
                            <div key={d.id} className="case-card">
                            <div className="case-card-header">
                                <span className="case-badge badge-success">En attente</span>
                                <span className="case-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    {new Date(d.date).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <div className="case-card-body">
                                <h3 className="case-title">{d.company}</h3>
                                <p className="case-client-name">{d.clientName}</p>
                                <p className="case-client-email" style={{ fontSize: '13px', color: 'var(--admin-text-sub)', marginTop: '4px' }}>{d.email}</p>
                                
                                {extra && (
                                    <div style={{ marginTop: '12px', padding: '10px', background: '#F8FAFC', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div><strong>Dirigeant :</strong> {extra.prenom} {extra.nom}</div>
                                        <div><strong>Tél :</strong> {extra.telephone}</div>
                                        <div><strong>Né le :</strong> {extra.dateNaissance} à {extra.lieuNaissance}</div>
                                        <div><strong>Forme :</strong> {extra.formeJuridique} ({extra.typeProjet === 'creation' ? "Création" : extra.typeProjet === 'transfert' ? "Transfert" : "Domiciliation"})</div>
                                        <div><strong>Activité :</strong> {extra.activite}</div>
                                        <div><strong>Ville :</strong> {extra.ville || 'Toulouse'}</div>
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--admin-border)' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--admin-text-sub)' }}>Offre: <strong>{d.plan}</strong></span>
                                    <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--admin-text-main)' }}>{d.amount}€</span>
                                </div>
                            </div>
                            
                            <div className="case-card-footer">
                                <button
                                    className="btn-primary-sm"
                                    onClick={() => handleAccepter(d.id)}
                                    disabled={loadingId === d.id}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
                                >
                                    {loadingId === d.id ? 'Création accès...' : 'Approuver'}
                                </button>
                            </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
