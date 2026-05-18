import React from 'react';
import { Icons } from './Icons';

export default function Overview({ mail, documents, bookings, clientData }) {
    const unreadMailCount = mail.filter(m => m.status === 'non lu').length;

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div className="ec-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
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

            <div className="ec-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                
                <div className="ec-content-card" style={{ background: '#09090b', color: 'white', border: '1px solid #1e293b' }}>
                    <div className="ec-card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '20px 24px' }}>
                        <h2 style={{ fontSize: '15px', color: 'white' }}>Adresse de Domiciliation</h2>
                        <button className="ec-btn-text" style={{ fontSize: '12px', color: '#ffffff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
                            const text = `${clientData?.company}\n150 Rue Nicolas Louis Vauquelin\n31100 Toulouse\nFRANCE`;
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
                                150 Rue Nicolas Louis Vauquelin<br/>
                                31100 Toulouse<br/>
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
