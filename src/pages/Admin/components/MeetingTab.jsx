import React, { useState } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';

export default function MeetingTab({ bookings, clients, onUpdate }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateStatus = async (bookingId, newStatus) => {
        setIsUpdating(true);
        try {
            await adminDataService.updateBookingStatus(bookingId, newStatus);
            onUpdate(); // refresh state
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la mise à jour de la réservation.");
        } finally {
            setIsUpdating(false);
        }
    };

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
                        <div key={b.id} className="booking-card" style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid var(--admin-border)', boxShadow: 'var(--card-shadow)', marginBottom: '16px' }}>
                            <div className="booking-type" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: 800 }}>
                                {b.type}
                                <span style={{ fontSize: '11px', background: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                    {b.city || '—'}
                                </span>
                            </div>
                            <div className="booking-client" style={{ marginTop: '8px', fontSize: '14px' }}><strong>{client?.company || 'Client Inconnu'}</strong> · {client?.name}</div>
                            <div className="booking-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--admin-text-sub)', marginTop: '8px' }}>
                                <div style={{ width: '14px' }}><Icons.Calendar /></div>
                                {new Date(b.date).toLocaleDateString()} · {b.duration}
                            </div>
                            <div className="booking-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                                <span className="booking-status" style={{
                                    padding: '4px 8px', borderRadius: '4px', 
                                    background: b.status === 'en_attente' ? '#FEF3C7' : b.status === 'confirmée' ? '#D1FAE5' : '#FEE2E2',
                                    color: b.status === 'en_attente' ? '#D97706' : b.status === 'confirmée' ? '#059669' : '#DC2626', 
                                    fontSize: '11px', fontWeight: 700
                                }}>
                                    {b.status.toUpperCase()}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {b.status === 'en_attente' && (
                                        <>
                                            <button className="btn-primary-sm" disabled={isUpdating} onClick={() => handleUpdateStatus(b.id, 'confirmée')} style={{ background: '#10B981', color: 'white' }}>Accepter</button>
                                            <button className="btn-text" disabled={isUpdating} onClick={() => handleUpdateStatus(b.id, 'refusée')} style={{ color: '#EF4444' }}>Refuser</button>
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
