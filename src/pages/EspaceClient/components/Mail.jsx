import React from 'react';

export default function Mail({ mail }) {
    return (
        <div className="ec-tab-animate">
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ec-text-main)' }}>Gestion du Courrier</h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '14px', marginTop: '4px' }}>Consultez et gérez vos courriers numériques reçus.</p>
                </div>
                <button className="ec-btn-primary">Réexpédier physiquement</button>
            </div>

            {mail.length === 0 ? (
                <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--ec-border)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--ec-text-sub)', opacity: 0.5, marginBottom: '16px' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '16px', fontWeight: '600' }}>Aucun courrier pour le moment.</p>
                </div>
            ) : (
                <div className="cards-grid">
                    {mail.map(m => (
                        <div key={m.id} className="case-card">
                            <div className="case-card-header">
                                <span className={`case-badge ${m.status === 'non lu' ? 'badge-danger' : 'badge-success'}`}>
                                    {m.status === 'non lu' ? 'Non Lu' : 'Lu'}
                                </span>
                                <span className="case-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    {m.date}
                                </span>
                            </div>
                            
                            <div className="case-card-body">
                                <h3 className="case-title">{m.from}</h3>
                                <p className="case-client-name" style={{ marginTop: '8px' }}>Type: <strong>{m.type}</strong></p>
                            </div>
                            
                            <div className="case-card-footer">
                                <button className="ec-btn-primary" style={{ width: '100%' }}>Voir le scan</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
