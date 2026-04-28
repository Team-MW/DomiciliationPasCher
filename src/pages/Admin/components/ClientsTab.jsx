import React from 'react';

export default function ClientsTab({ clients, searchQuery, onSelect, onUpdate, onCreateClick }) {
    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="clients-container">
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main)' }}>Suivi des Clients</h2>
                    <p style={{ color: 'var(--admin-text-sub)', fontSize: '14px', marginTop: '4px' }}>Gérez et suivez vos dossiers clients en temps réel.</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary-sm" onClick={onCreateClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Nouveau Client
                    </button>
                </div>
            </div>

            <div className="cards-grid">
                {filtered.map(c => (
                    <div key={c.id} className="case-card" onClick={() => onSelect(c.id)}>
                        <div className="case-card-header">
                            <span className={`case-badge ${c.status === 'actif' ? 'badge-success' : 'badge-danger'}`}>
                                {c.status === 'actif' ? 'Actif' : 'Inactif'}
                            </span>
                            <span className="case-date">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                {c.since || 'Non définie'}
                            </span>
                        </div>
                        
                        <div className="case-card-body">
                            <h3 className="case-title">{c.company}</h3>
                            <p className="case-client-name">{c.name}</p>
                            <div className="case-plan">Offre: <strong>{c.plan}</strong></div>
                            
                            <div className="case-progress-container">
                                <div className="case-progress-label">
                                    <span>Dossier</span>
                                    <span>{c.clerkId ? '100%' : '50%'}</span>
                                </div>
                                <div className="case-progress-bar">
                                    <div className="case-progress-fill" style={{ width: c.clerkId ? '100%' : '50%' }}></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="case-card-footer">
                            <span className="case-footer-label">STATUT COMPTE</span>
                            <div className="case-status-actions">
                                <span className={`status-pill ${c.clerkId ? 'active' : 'pending'}`}>
                                    {c.clerkId ? 'Clerk Lié' : 'En attente'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
