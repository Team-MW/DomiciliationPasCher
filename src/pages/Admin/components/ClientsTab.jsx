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
                            <tr key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: 'pointer' }} className="row-hover">
                                <td>
                                    <div className="table-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {c.company}
                                        {parseInt(c.unreadCount) > 0 && (
                                            <span style={{
                                                background: '#EF4444',
                                                color: 'white',
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '10px',
                                                fontWeight: 800,
                                                animation: 'pulse 2s infinite'
                                            }}>
                                                {c.unreadCount}
                                            </span>
                                        )}
                                    </div>
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
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, color: '#94A3B8' }}><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
