import React from 'react';

export default function ClientsTab({ clients, searchQuery, onSelect, onUpdate, onCreateClick }) {
    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="content-card">
            <div className="card-header">
                <h2>Répertoire Clients ({filtered.length})</h2>
                <div className="header-actions">
                    <button className="btn-secondary-sm">Export CSV</button>
                    <button className="btn-primary-sm" onClick={onCreateClick}>+ Nouveau Client</button>
                </div>
            </div>
            <div className="card-body-table">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Entreprise</th>
                            <th>Offre</th>
                            <th>Accès Clerk</th>
                            <th>Statut</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(c => (
                            <tr key={c.id}>
                                <td>
                                    <div className="table-primary">{c.company}</div>
                                    <div className="table-secondary">{c.name}</div>
                                </td>
                                <td><span className="badge-outline">{c.plan}</span></td>
                                <td>
                                    <div className="clerk-id-badge">
                                        <div className="clerk-dot"></div>
                                        {c.clerkId ? c.clerkId : "En attente d'inscription"}
                                    </div>
                                </td>
                                <td><span className={`status-dot ${c.status === 'actif' ? 'status-active' : 'status-danger'}`}></span> {c.status}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-text" onClick={() => onSelect(c.id)}>Détails</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
