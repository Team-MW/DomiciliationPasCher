import React from 'react';
import { Icons } from './Icons';

export default function Overview({ mail, documents, bookings, clientData }) {
    return (
        <div className="ec-tab-animate">
            <div className="ec-stats-row">
                <div className="ec-stat-card">
                    <div className="ec-stat-label">Courriers reçus</div>
                    <div className="ec-stat-value">{mail.length}</div>
                    <div className="ec-stat-footer">Ce mois-ci</div>
                </div>
                <div className="ec-stat-card">
                    <div className="ec-stat-label">Non lus</div>
                    <div className="ec-stat-value color-warning">{mail.filter(m => m.status === 'non lu').length}</div>
                    <div className="ec-stat-footer">Action requise</div>
                </div>
                <div className="ec-stat-card">
                    <div className="ec-stat-label">Documents</div>
                    <div className="ec-stat-value">{documents.length}</div>
                    <div className="ec-stat-footer">Archives sécurisées</div>
                </div>
                <div className="ec-stat-card">
                    <div className="ec-stat-label">Réservations</div>
                    <div className="ec-stat-value" style={{ color: '#6366F1' }}>
                        {bookings.length}
                    </div>
                    <div className="ec-stat-footer">En attente / Confirmées</div>
                </div>
            </div>

            <div className="ec-dashboard-grid">
                <div className="ec-content-card">
                    <div className="ec-card-header">
                        <h2>Activité Récente</h2>
                        <button className="ec-btn-text">Voir tout</button>
                    </div>
                    <div className="ec-activity-list">
                        {mail.slice(0, 3).map(m => (
                            <div key={m.id} className="ec-activity-item">
                                <div className="ec-activity-icon"><Icons.Mail /></div>
                                <div className="ec-activity-body">
                                    <div className="ec-activity-title">Courrier reçu de {m.from}</div>
                                    <div className="ec-activity-meta">{m.type} · Reçu le {m.date}</div>
                                </div>
                            </div>
                        ))}
                        {mail.length === 0 && <div className="ec-empty">Aucune activité récente.</div>}
                    </div>
                </div>

                <div className="ec-content-card">
                    <div className="ec-card-header">
                        <h2>Votre Adresse</h2>
                        <button className="ec-btn-text">Copier</button>
                    </div>
                    <div className="ec-address-box">
                        <div className="ec-address-icon"><Icons.Pin /></div>
                        <div className="ec-address-content">
                            <strong>{clientData?.company}</strong><br />
                            122 Avenue des Champs-Élysées<br />
                            75008 Paris
                        </div>
                    </div>
                    <div className="ec-address-badge">Certificat de domiciliation disponible</div>
                </div>
            </div>
        </div>
    );
}
