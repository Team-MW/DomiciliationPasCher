import React, { useState } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';

export default function DemandesTab({ demandes, onUpdate }) {
    const [loadingId, setLoadingId] = useState(null);

    const handleAccepter = async (id) => {
        const d = demandes.find(item => item.id === id);
        setLoadingId(id);
        try {
            await adminDataService.traiterDemande(id);
            onUpdate();
            alert(`Accès créé avec succès pour ${d.email} ! Un email d'invitation a été simulé.`);
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="content-card">
            <div className="card-header">
                <h2>Nouvelles souscriptions ({demandes.length})</h2>
            </div>
            {demandes.length === 0 ? (
                <div className="empty-state-full">
                    <Icons.Demandes />
                    <p>Aucune demande en attente de traitement.</p>
                </div>
            ) : (
                <div className="card-body-table">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Postulant / Société</th>
                                <th>Formule</th>
                                <th>Transaction</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demandes.map(d => (
                                <tr key={d.id}>
                                    <td>
                                        <div className="table-primary">{d.company}</div>
                                        <div className="table-secondary">{d.clientName} · {d.email}</div>
                                    </td>
                                    <td><span className="badge-outline">{d.plan}</span></td>
                                    <td><strong>{d.amount}€</strong></td>
                                    <td>{new Date(d.date).toLocaleDateString()}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="btn-primary-sm"
                                            onClick={() => handleAccepter(d.id)}
                                            disabled={loadingId === d.id}
                                            style={{ minWidth: '140px' }}
                                        >
                                            {loadingId === d.id ? 'Création accès...' : 'Approuver'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
