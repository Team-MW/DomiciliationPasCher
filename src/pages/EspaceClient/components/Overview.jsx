import React from 'react';
import { Icons } from './Icons';

export default function Overview({ mail, documents, bookings, clientData }) {
    const unreadMailCount = mail.filter(m => m.status === 'non lu').length;

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div className="ec-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div className="ec-stat-card">
                    <div className="ec-stat-label">Courriers Reçus</div>
                    <div className="ec-stat-value">{mail.length}</div>
                    <div className="ec-stat-footer" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Depuis votre inscription
                    </div>
                </div>
                <div className="ec-stat-card" style={{ border: unreadMailCount > 0 ? '1px solid #ef4444' : '' }}>
                    <div className="ec-stat-label">Courriers Non Lus</div>
                    <div className="ec-stat-value" style={{ color: unreadMailCount > 0 ? '#ef4444' : 'var(--ec-text-main)' }}>{unreadMailCount}</div>
                    <div className="ec-stat-footer" style={{ color: unreadMailCount > 0 ? '#ef4444' : 'inherit' }}>
                        {unreadMailCount > 0 ? 'Action requise ' : 'À jour '}
                    </div>
                </div>
                <div className="ec-stat-card">
                    <div className="ec-stat-label">Documents Sécurisés</div>
                    <div className="ec-stat-value">{documents.length}</div>
                    <div className="ec-stat-footer">Vos archives</div>
                </div>
                <div className="ec-stat-card">
                    <div className="ec-stat-label">Réservations</div>
                    <div className="ec-stat-value">{bookings.length}</div>
                    <div className="ec-stat-footer">En attente / Confirmées</div>
                </div>
            </div>

            <div className="ec-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                
                <div className="ec-content-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="ec-card-header" style={{ padding: '20px 24px' }}>
                        <h2 style={{ fontSize: '15px' }}>Activité Récente (Courrier)</h2>
                    </div>
                    <div className="ec-activity-list" style={{ padding: '0 24px', flex: 1 }}>
                        {mail.slice(0, 4).map(m => (
                            <div key={m.id} className="ec-activity-item" style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div className="ec-activity-icon" style={{ background: m.status === 'non lu' ? '#eff6ff' : '#f8fafc', color: m.status === 'non lu' ? '#2563eb' : '#94a3b8', width: '36px', height: '36px', borderRadius: '10px' }}>
                                    <Icons.Mail />
                                </div>
                                <div className="ec-activity-body" style={{ flex: 1 }}>
                                    <div className="ec-activity-title" style={{ fontSize: '14px', fontWeight: '600' }}>{m.type} de {m.from}</div>
                                    <div className="ec-activity-meta" style={{ fontSize: '12px', color: '#64748b' }}>Reçu le {m.date}</div>
                                </div>
                                {m.status === 'non lu' && (
                                    <span style={{ width: '8px', height: '8px', background: '#2563eb', borderRadius: '50%' }}></span>
                                )}
                            </div>
                        ))}
                        {mail.length === 0 && (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Aucune activité récente.</div>
                        )}
                    </div>
                </div>

                <div className="ec-content-card" style={{ background: '#09090b', color: 'white', border: '1px solid #1e293b' }}>
                    <div className="ec-card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '20px 24px' }}>
                        <h2 style={{ fontSize: '15px', color: 'white' }}>Adresse de Domiciliation</h2>
                        <button className="ec-btn-text" style={{ fontSize: '12px', color: '#ffffff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
                            const text = `${clientData?.company}\n122 Avenue des Champs-Élysées\n75008 Paris`;
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(text);
                            } else {
                                const ta = document.createElement('textarea');
                                ta.value = text;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand('copy');
                                document.body.removeChild(ta);
                            }
                            alert("Adresse copiée : \n" + text);
                        }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 14}}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copier l'adresse
                        </button>
                    </div>
                    
                    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '800' }}>Société domiciliée</span>
                            <strong style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{clientData?.company}</strong>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '800' }}>Adresse Officielle</span>
                            <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                122 Avenue des Champs-Élysées<br/>
                                75008 Paris<br/>
                                FRANCE
                            </div>
                        </div>
                        
                        <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            ✔ Certificat de domiciliation actif
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
