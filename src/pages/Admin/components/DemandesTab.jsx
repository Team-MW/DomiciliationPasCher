import React, { useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function DemandesTab({ demandes, onUpdate, onSelectDemande, showConfirm, showAlert }) {
    const [loadingId, setLoadingId] = useState(null);

    const handleAccepter = async (id) => {
        setLoadingId(id);
        try {
            await adminDataService.traiterDemande(id);
            onUpdate();
            await showAlert(`Accès créé avec succès !`);
        } finally {
            setLoadingId(null);
        }
    };

    const handleRefuser = async (id) => {
        const confirmed = await showConfirm("Supprimer cette demande ?", { isDanger: true });
        if (confirmed) {
            setLoadingId(id);
            try {
                await adminDataService.deleteDemande(id);
                onUpdate();
            } finally {
                setLoadingId(null);
            }
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
                            <div 
                                className="case-card-clickable" 
                                onClick={() => onSelectDemande(d)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="case-card-header">
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span className="case-badge badge-success">En attente</span>
                                        {extra?.stripe_session_id && (
                                            <span className="case-badge" style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', fontSize: '10px' }}>
                                                 💳 Paiement Validé Stripe
                                            </span>
                                        )}
                                    </div>
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
                                            <div style={{ color: '#6366F1', fontWeight: '700', marginTop: '4px' }}>👉 Cliquez pour voir tout le dossier</div>
                                        </div>
                                    )}
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--admin-border)' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--admin-text-sub)' }}>Offre: <strong>{d.plan}</strong></span>
                                        <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--admin-text-main)' }}>{d.amount}€</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="case-card-footer" style={{ display: 'flex', gap: '10px', padding: '16px', paddingTop: '0' }}>
                                <button
                                    className="btn-primary-sm"
                                    onClick={() => handleAccepter(d.id)}
                                    disabled={loadingId === d.id}
                                    style={{ flex: 2, padding: '12px', borderRadius: '8px' }}
                                >
                                    {loadingId === d.id ? '...' : 'Approuver'}
                                </button>
                                <button
                                    className="btn-outline-sm"
                                    onClick={() => handleRefuser(d.id)}
                                    disabled={loadingId === d.id}
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer' }}
                                >
                                    Refuser
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

export function DemandeDetailsModal({ demande, onClose, onAccept, onReject, loadingId }) {
    let extra = null;
    try {
        if (demande.extra_info) {
            extra = typeof demande.extra_info === 'string' ? JSON.parse(demande.extra_info) : demande.extra_info;
        }
    } catch (e) {}

    return (
        <div className="admin-modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '40px', overflowY: 'auto' }}>
            <div className="admin-modal" style={{ maxWidth: '650px', marginBottom: '40px' }}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Dossier de Souscription</h2>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>
                
                {/* Body */}
                <div style={{ padding: '32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Société / Projet</label>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>{demande.company}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Reçu le</label>
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(demande.date).toLocaleString()}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Section Dirigeant */}
                        <section>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '24px', height: '24px', background: '#F1F5F9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</span>
                                Dirigeant
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                                <div className="info-group"><label>Nom complet</label><span>{extra?.prenom} {extra?.nom}</span></div>
                                <div className="info-group"><label>Téléphone</label><span>{extra?.telephone}</span></div>
                                <div className="info-group"><label>E-mail</label><span>{demande.email}</span></div>
                                <div className="info-group"><label>Nationalité</label><span>{extra?.nationalite || 'Française'}</span></div>
                                <div className="info-group" style={{ gridColumn: 'span 2' }}><label>Naissance</label><span>{extra?.dateNaissance} à {extra?.lieuNaissance}</span></div>
                            </div>
                        </section>

                        {/* Section Entreprise */}
                        <section>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '24px', height: '24px', background: '#F1F5F9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏢</span>
                                Informations Entreprise
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                                <div className="info-group"><label>Forme juridique</label><span>{extra?.formeJuridique}</span></div>
                                <div className="info-group"><label>Type de projet</label><span>{extra?.typeProjet === 'creation' ? 'Création' : extra?.typeProjet === 'transfert' ? 'Transfert' : 'Domiciliation seule'}</span></div>
                                <div className="info-group" style={{ gridColumn: 'span 2' }}><label>Activité</label><span>{extra?.activite}</span></div>
                                {extra?.siren && <div className="info-group"><label>SIREN</label><span>{extra?.siren}</span></div>}
                                <div className="info-group"><label>Ville</label><span>{extra?.ville || 'Toulouse (31)'}</span></div>
                            </div>
                        </section>

                        {/* Section Paiement */}
                        <section>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '24px', height: '24px', background: '#F1F5F9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💳</span>
                                Paiement & Offre
                            </h3>
                            <div style={{ background: '#EEF2FF', padding: '20px', borderRadius: '12px', border: '1px solid #E0E7FF' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#4338CA', fontSize: '14px' }}>Offre choisie :</span>
                                    <strong style={{ color: '#1E1B4B' }}>{demande.plan}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#4338CA', fontSize: '14px' }}>Fréquence :</span>
                                    <strong style={{ color: '#1E1B4B' }}>{extra?.frequence === 'annuel' ? 'Annuelle' : 'Mensuelle'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #C7D2FE', paddingTop: '12px', marginTop: '12px' }}>
                                    <span style={{ color: '#4338CA', fontWeight: '800' }}>Montant encaissé :</span>
                                    <strong style={{ color: '#4338CA', fontSize: '20px' }}>{demande.amount}€</strong>
                                </div>
                                {extra?.stripe_session_id && (
                                    <div style={{ marginTop: '16px', fontSize: '11px', color: '#6366F1', background: 'white', padding: '10px', borderRadius: '8px', border: '1px dashed #C7D2FE', wordBreak: 'break-all' }}>
                                        <strong>Stripe ID:</strong> {extra.stripe_session_id}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ padding: '32px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '16px' }}>
                    <button 
                        className="btn-primary-sm" 
                        onClick={() => onAccept(demande.id)}
                        disabled={loadingId === demande.id}
                        style={{ flex: 2, padding: '16px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                    >
                        {loadingId === demande.id ? 'Traitement...' : 'Approuver la demande'}
                    </button>
                    <button 
                        className="btn-secondary" 
                        onClick={() => onReject(demande.id)}
                        disabled={loadingId === demande.id}
                        style={{ flex: 1, padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', border: '1px solid #E2E8F0', background: 'white', color: '#64748B', cursor: 'pointer' }}
                    >
                        Refuser
                    </button>
                </div>
            </div>
        </div>
    );
}
