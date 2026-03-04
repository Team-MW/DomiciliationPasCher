import React from 'react';
import { Icons } from './Icons';

export default function MeetingTab({ bookings, clients, onUpdate }) {
    return (
        <div className="tab-container">
            <div className="tab-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Réservations Salles & Bureaux</h1>
            </div>

            <div className="booking-grid">
                {bookings.length === 0 && (
                    <div className="empty-state-full" style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--admin-border)', width: '100%' }}>
                        <Icons.Calendar />
                        <p>Aucune réservation en cours ou passée.</p>
                    </div>
                )}
                {bookings.map(b => {
                    const client = clients.find(c => c.id === b.clientId);
                    return (
                        <div key={b.id} className="booking-card">
                            <div className="booking-type">{b.type}</div>
                            <div className="booking-client">{client?.company || 'Client Inconnu'} · {client?.name}</div>
                            <div className="booking-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--admin-text-sub)', marginTop: '8px' }}>
                                <div style={{ width: '14px' }}><Icons.Calendar /></div>
                                {new Date(b.date).toLocaleDateString()} · {b.duration}
                            </div>
                            <div className="booking-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                                <span className="booking-status" style={{
                                    padding: '4px 8px', borderRadius: '4px', background: b.status === 'en_attente' ? '#FEF3C7' : '#F1F5F9',
                                    color: b.status === 'en_attente' ? '#D97706' : '#64748B', fontSize: '11px', fontWeight: 700
                                }}>
                                    {b.status}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {b.status === 'en_attente' && (
                                        <>
                                            <button className="btn-primary-sm" onClick={() => alert('Réservation confirmée')}>Confirmer</button>
                                            <button className="btn-text" style={{ color: '#EF4444' }}>Refuser</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
