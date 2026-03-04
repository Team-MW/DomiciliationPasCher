import React from 'react';
import { Icons } from './Icons';

export default function OverviewTab({ stats, clients, mail }) {
    return (
        <div className="tab-container">
            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-card-label">Clients Actifs</span>
                    <div className="stat-card-value">{stats.activeClients}</div>
                    <div className="stat-card-trend trend-up">
                        <Icons.TrendUp /> <span>12.5%</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Demandes en attente</span>
                    <div className="stat-card-value">{stats.pendingDemandes}</div>
                    <div className="stat-card-trend" style={{ color: '#1A56DB' }}>Action requise</div>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Revenu Mensuel</span>
                    <div className="stat-card-value">{stats.monthlyRevenue}€</div>
                    <div className="stat-card-trend trend-up">
                        <Icons.TrendUp /> <span>8.2%</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Santé Système</span>
                    <div className="stat-card-value" style={{ fontSize: '18px' }}>Opérationnel</div>
                    <div className="stat-card-trend trend-up">Stable</div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="content-card">
                    <div className="card-header">
                        <h2>Inscriptions Récentes</h2>
                        <button className="btn-text">Tout voir</button>
                    </div>
                    <div className="card-body-table">
                        <table className="admin-table">
                            <thead>
                                <tr><th>Client</th><th>Offre</th><th>Statut</th></tr>
                            </thead>
                            <tbody>
                                {clients.slice(0, 5).map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="table-primary">{c.company}</div>
                                            <div className="table-secondary">{c.name}</div>
                                        </td>
                                        <td><span className="badge-outline">{c.plan}</span></td>
                                        <td><span className={`status-dot ${c.status === 'actif' ? 'status-active' : 'status-danger'}`}></span> {c.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="content-card">
                    <div className="card-header">
                        <h2>Flux Courrier</h2>
                        <button className="btn-text">Marquer tout lu</button>
                    </div>
                    <div className="card-list">
                        {mail.filter(m => m.status === 'non lu').length === 0 ? (
                            <div className="empty-state">Aucun courrier urgent</div>
                        ) : (
                            mail.filter(m => m.status === 'non lu').map(m => (
                                <div key={m.id} className="list-item">
                                    <div className="item-icon"><Icons.Mail /></div>
                                    <div className="item-content">
                                        <div className="item-title">{m.company}</div>
                                        <div className="item-meta">{m.from} · {m.type}</div>
                                    </div>
                                    <div className="item-date">{m.date}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
