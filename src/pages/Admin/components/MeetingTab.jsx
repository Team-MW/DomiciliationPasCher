import React, { useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function MeetingTab({ bookings, clients, onUpdate }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateStatus = async (bookingId, newStatus) => {
        setIsUpdating(true);
        try {
            await adminDataService.updateBookingStatus(bookingId, newStatus);
            onUpdate(); 
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la mise à jour de la réservation.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="meetings-container">
            <div className="tab-header" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main)' }}>Salles & Bureaux</h2>
                <p style={{ color: 'var(--admin-text-sub)', fontSize: '14px', marginTop: '4px' }}>Gérez les réservations d'espaces de travail.</p>
            </div>

            <div className="cards-grid">
                {bookings.length === 0 ? (
                    <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--admin-border)', gridColumn: '1 / -1' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--admin-text-sub)', opacity: 0.5, marginBottom: '16px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <p style={{ color: 'var(--admin-text-sub)', fontSize: '16px', fontWeight: '600' }}>Aucune réservation en cours ou passée.</p>
                    </div>
                ) : (
                    bookings.map(b => {
                        const client = clients.find(c => c.id === b.clientId);
                        return (
                            <div key={b.id} className="case-card">
                                <div className="case-card-header">
                                    <span className="case-badge badge-success" style={{
                                        background: b.status === 'en_attente' ? '#FEF3C7' : b.status === 'confirmée' ? '#D1FAE5' : '#FEE2E2',
                                        color: b.status === 'en_attente' ? '#D97706' : b.status === 'confirmée' ? '#059669' : '#DC2626', 
                                    }}>
                                        {b.status.toUpperCase()}
                                    </span>
                                    <span className="case-date">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        {new Date(b.date).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div className="case-card-body">
                                    <h3 className="case-title">{b.type}</h3>
                                    <p className="case-client-name" style={{ fontWeight: '700', marginTop: '8px' }}>{client?.company || 'Client Inconnu'}</p>
                                    <p className="case-client-email" style={{ fontSize: '13px', color: 'var(--admin-text-sub)' }}>{client?.name}</p>
                                    
                                    <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: 'var(--admin-text-main)' }}>
                                        Durée: <strong>{b.duration}</strong><br />
                                        Ville: <strong>{b.city || '—'}</strong>
                                    </div>
                                </div>
                                
                                <div className="case-card-footer" style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                                    {b.status === 'en_attente' && (
                                        <>
                                            <button 
                                                className="btn-primary-sm" 
                                                disabled={isUpdating} 
                                                onClick={() => handleUpdateStatus(b.id, 'confirmée')} 
                                                style={{ background: '#10B981', color: 'white', flex: 1, padding: '10px' }}
                                            >
                                                Accepter
                                            </button>
                                            <button 
                                                className="btn-text" 
                                                disabled={isUpdating} 
                                                onClick={() => handleUpdateStatus(b.id, 'refusée')} 
                                                style={{ color: '#EF4444', flex: 1, padding: '10px', border: '1px solid #fee2e2', borderRadius: '8px' }}
                                            >
                                                Refuser
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
