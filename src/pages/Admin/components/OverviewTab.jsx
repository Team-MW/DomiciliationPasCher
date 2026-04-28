import React from 'react';
import { Icons } from './Icons';

export default function OverviewTab({ stats, clients, mail }) {
    // Calcul de la répartition des forfaits
    const planCounts = { essentiel: 0, 'scan-plus': 0, physique: 0 };
    clients.forEach(c => {
        const p = (c.plan || '').toLowerCase();
        if (p.includes('scan')) planCounts['scan-plus']++;
        else if (p.includes('physique')) planCounts.physique++;
        else planCounts.essentiel++;
    });
    const totalClients = clients.length || 1;
    const pctEssentiel = Math.round((planCounts.essentiel / totalClients) * 100);
    const pctScan = Math.round((planCounts['scan-plus'] / totalClients) * 100);
    const pctPhysique = Math.round((planCounts.physique / totalClients) * 100);

    // Données pour le graphique de revenus
    const currentRev = stats.monthlyRevenue || 0;
    const revenueData = [
        Math.round(currentRev * 0.2),
        Math.round(currentRev * 0.4),
        Math.round(currentRev * 0.55),
        Math.round(currentRev * 0.75),
        Math.round(currentRev * 0.9),
        currentRev
    ];
    const revenueLabels = ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr'];
    
    // Calcul des points SVG
    const svgWidth = 500;
    const svgHeight = 150;
    const padding = 30;
    const maxVal = Math.max(...revenueData, 100) * 1.2;
    
    const points = revenueData.map((val, i) => {
        const x = padding + (i * (svgWidth - padding * 2)) / (revenueData.length - 1);
        const y = svgHeight - padding - (val / maxVal) * (svgHeight - padding * 2);
        return { x, y };
    });

    const pathD = points.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        // Courbe de Bézier
        const prev = points[i - 1];
        const cpX1 = prev.x + (p.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (p.x - prev.x) / 2;
        const cpY2 = p.y;
        return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, '');

    const fillD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

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

            {/* ══ Graphiques Section ══ */}
            <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
                <div className="content-card">
                    <div className="card-header">
                        <h2>Évolution des Revenus (Mensuel)</h2>
                    </div>
                    <div className="card-body" style={{ padding: '20px' }}>
                        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: 'visible' }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                                </linearGradient>
                            </defs>
                            {/* Grille horizontale */}
                            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                                const y = svgHeight - padding - p * (svgHeight - padding * 2);
                                return (
                                    <line key={i} x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />
                                );
                            })}
                            
                            {/* Remplissage sous la courbe */}
                            <path d={fillD} fill="url(#revGrad)" />
                            
                            {/* Ligne de la courbe */}
                            <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                            
                            {/* Points de données */}
                            {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="5" fill="white" stroke="var(--primary)" strokeWidth="2" />
                            ))}

                            {/* Libellés X */}
                            {revenueLabels.map((l, i) => {
                                const x = padding + (i * (svgWidth - padding * 2)) / (revenueLabels.length - 1);
                                return (
                                    <text key={i} x={x} y={svgHeight - 10} textAnchor="middle" fontSize="11" fill="#94A3B8" fontWeight="600">{l}</text>
                                );
                            })}
                        </svg>
                    </div>
                </div>

                <div className="content-card">
                    <div className="card-header">
                        <h2>Répartition des Forfaits</h2>
                    </div>
                    <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                                <span style={{ color: '#1E293B' }}>Essentiel (20€)</span>
                                <span style={{ color: 'var(--primary)' }}>{pctEssentiel}% ({planCounts.essentiel})</span>
                            </div>
                            <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ width: `${pctEssentiel}%`, height: '100%', background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)', borderRadius: '5px' }} />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                                <span style={{ color: '#1E293B' }}>Scan+ (24€)</span>
                                <span style={{ color: '#10B981' }}>{pctScan}% ({planCounts['scan-plus']})</span>
                            </div>
                            <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ width: `${pctScan}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #047857)', borderRadius: '5px' }} />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                                <span style={{ color: '#1E293B' }}>Physique+ (38€)</span>
                                <span style={{ color: '#F59E0B' }}>{pctPhysique}% ({planCounts.physique})</span>
                            </div>
                            <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ width: `${pctPhysique}%`, height: '100%', background: 'linear-gradient(90deg, #F59E0B, #B45309)', borderRadius: '5px' }} />
                            </div>
                        </div>
                    </div>
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
