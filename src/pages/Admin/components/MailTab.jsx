import React, { useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';

const statusStyle = (status) => {
    if (status === 'en_attente') return { background: '#FEF3C7', color: '#D97706', label: 'EN ATTENTE' };
    if (status === 'expediee') return { background: '#D1FAE5', color: '#059669', label: 'EXPÉDIÉE' };
    return { background: '#FEE2E2', color: '#DC2626', label: 'REFUSÉE' };
};

export default function MailTab({ reexpeditions = [], onUpdate, showAlert, onSelectClient }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const pending = reexpeditions.filter((r) => r.status === 'en_attente');
    const others = reexpeditions.filter((r) => r.status !== 'en_attente');

    const handleUpdateStatus = async (request, newStatus) => {
        setIsUpdating(true);
        try {
            await adminDataService.updateReexpeditionStatus(request.id, newStatus);
            if (request.clientEmail) {
                const { sendReexpeditionStatusEmail } = await import('../../../utils/emailService');
                await sendReexpeditionStatusEmail({
                    email: request.clientEmail,
                    nom: request.clientContact || request.clientName,
                    status: newStatus,
                    address: request.address,
                });
            }
            try {
                await adminDataService.addMessage(request.clientId, {
                    sender: 'admin',
                    content: newStatus === 'expediee'
                        ? `Votre courrier a été réexpédié vers : ${request.address}`
                        : 'Votre demande de réexpédition n’a pas pu être traitée. Contactez-nous pour plus d’informations.',
                });
            } catch (e) {
                console.error(e);
            }
            onUpdate?.();
        } catch (error) {
            console.error(error);
            await showAlert?.('Erreur lors de la mise à jour de la demande.');
        } finally {
            setIsUpdating(false);
        }
    };

    const renderCard = (r) => {
        const st = statusStyle(r.status);
        const contactName = String(r.clientContact || '').split(/\s*-\s*📞/)[0].trim();
        return (
            <div key={r.id} className="case-card" style={{ cursor: 'default' }}>
                <div className="case-card-header">
                    <span className="case-badge" style={{ background: st.background, color: st.color }}>{st.label}</span>
                    <span className="case-date">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                </div>
                <div className="case-card-body">
                    <h3 className="case-title">Réexpédition physique</h3>
                    <p className="case-client-name" style={{ fontWeight: 700, marginTop: '8px', color: '#0F172A' }}>{r.clientName || 'Client'}</p>
                    {contactName ? (
                        <p className="case-client-email" style={{ fontSize: '13px', color: 'var(--admin-text-sub)', margin: 0 }}>{contactName}</p>
                    ) : null}
                    {r.clientEmail ? (
                        <p style={{ fontSize: '13px', color: 'var(--admin-text-sub)', margin: '2px 0 0' }}>{r.clientEmail}</p>
                    ) : null}
                    {r.clientPlan ? (
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', margin: '8px 0 0' }}>Forfait {r.clientPlan}</p>
                    ) : null}
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                        Destination : <strong>{r.address}</strong>
                        {r.notes ? <><br />Notes : <strong>{r.notes}</strong></> : null}
                    </div>
                </div>
                <div className="case-card-footer" style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginTop: 'auto', flexWrap: 'wrap' }}>
                    {r.status === 'en_attente' && (
                        <>
                            <button
                                className="btn-primary-sm"
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(r, 'expediee')}
                                style={{ background: '#10B981', color: 'white', flex: 1, padding: '10px' }}
                            >
                                Marquer expédiée
                            </button>
                            <button
                                className="btn-text"
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(r, 'refusee')}
                                style={{ color: '#EF4444', flex: 1, padding: '10px', border: '1px solid #fee2e2', borderRadius: '8px' }}
                            >
                                Refuser
                            </button>
                        </>
                    )}
                    {onSelectClient && r.clientId && (
                        <button
                            type="button"
                            onClick={() => onSelectClient(r.clientId)}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        >
                            Ouvrir le dossier
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="meetings-container">
            <div className="tab-header" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main)' }}>Courrier & réexpéditions</h2>
                <p style={{ color: 'var(--admin-text-sub)', fontSize: '14px', marginTop: '4px' }}>
                    Traitez les demandes de réexpédition physique des forfaits Scan+ et Physique+.
                </p>
            </div>

            {reexpeditions.length === 0 ? (
                <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--admin-border)' }}>
                    <p style={{ color: 'var(--admin-text-sub)', fontSize: '16px', fontWeight: '600' }}>Aucune demande de réexpédition.</p>
                </div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#D97706', margin: '0 0 12px' }}>À traiter ({pending.length})</h3>
                            <div className="cards-grid" style={{ marginBottom: '28px' }}>
                                {pending.map(renderCard)}
                            </div>
                        </>
                    )}
                    {others.length > 0 && (
                        <>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#64748B', margin: '0 0 12px' }}>Historique</h3>
                            <div className="cards-grid">
                                {others.map(renderCard)}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
