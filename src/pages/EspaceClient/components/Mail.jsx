import React from 'react';

export default function Mail({ mail }) {
    return (
        <div className="ec-tab-animate">
            <div className="ec-content-card">
                <div className="ec-card-header">
                    <h2>Gestion de votre courrier numérique</h2>
                    <button className="ec-btn-primary">Réexpédier physiquement</button>
                </div>
                <table className="ec-table">
                    <thead>
                        <tr><th>Expéditeur</th><th>Type</th><th>Date de réception</th><th>Statut</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        {mail.map(m => (
                            <tr key={m.id}>
                                <td><strong>{m.from}</strong></td>
                                <td>{m.type}</td>
                                <td>{m.date}</td>
                                <td><span className={`ec-status-chip ${m.status === 'non lu' ? 'unread' : 'read'}`}>{m.status}</span></td>
                                <td><button className="ec-btn-secondary">Voir le scan</button></td>
                            </tr>
                        ))}
                        {mail.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Aucun courrier pour le moment.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
