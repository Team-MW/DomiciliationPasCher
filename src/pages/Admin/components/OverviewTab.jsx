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

    // Données réelles issues de l'historique de la base de données (sécurisé avec valeurs par défaut sur le premier render)
    const revenueHistory = stats.revenueHistory || [
        { label: '...', revenue: 0 },
        { label: '...', revenue: 0 },
        { label: '...', revenue: 0 },
        { label: '...', revenue: 0 },
        { label: '...', revenue: 0 },
        { label: '...', revenue: 0 }
    ];
    const revenueData = revenueHistory.map(h => h.revenue);
    const revenueLabels = revenueHistory.map(h => h.label);
    
    // Calcul des points SVG
    const svgWidth = 500;
    const svgHeight = 150;
    const padding = 45; // Augmenté pour les légendes Y
    const maxVal = Math.max(...revenueData, 100) * 1.2;
    
    const points = revenueData.map((val, i) => {
        const x = padding + (i * (svgWidth - padding * 2)) / (revenueData.length - 1);
        const y = svgHeight - padding - (val / maxVal) * (svgHeight - padding * 2);
        return { x, y };
    });

    const pathD = points.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cpX1 = prev.x + (p.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (p.x - prev.x) / 2;
        const cpY2 = p.y;
        return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, '');

    const fillD = points.length > 0 
        ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`
        : '';

    // Calcul de l'évolution en pourcentage pour le tableau
    const tableData = revenueHistory.map((h, i) => {
        let pctChange = null;
        if (i > 0 && revenueHistory[i - 1].revenue > 0) {
            pctChange = Math.round(((h.revenue - revenueHistory[i - 1].revenue) / revenueHistory[i - 1].revenue) * 100);
        }
        return {
            ...h,
            pctChange
        };
    });

    return (
        <div className="tab-container">
            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-card-label">Clients Actifs</span>
                    <div className="stat-card-value">{stats.activeClients || 0}</div>
                    <div className="stat-card-trend trend-up">
                        <Icons.TrendUp /> <span>12.5%</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Demandes en attente</span>
                    <div className="stat-card-value">{stats.pendingDemandes || 0}</div>
                    <div className="stat-card-trend" style={{ color: '#1A56DB' }}>Action requise</div>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Revenu Mensuel</span>
                    <div className="stat-card-value">{(stats.monthlyRevenue || 0)}€</div>
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
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Analyse Mensuelle des Revenus (Live Stripe)</h2>
                        <span style={{ fontSize: '12px', background: '#ECFDF5', color: '#047857', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>
                            Base de données synchronisée
                        </span>
                    </div>
                    <div className="card-body" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px', alignItems: 'center' }}>
                        {/* Partie Gauche : Graphique Premium */}
                        <div>
                            <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                {/* Grille horizontale avec valeurs Y-axis */}
                                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                                    const y = svgHeight - padding - p * (svgHeight - padding * 2);
                                    const val = Math.round(p * maxVal);
                                    return (
                                        <g key={i}>
                                            <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />
                                            <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">{val}€</text>
                                        </g>
                                    );
                                })}
                                
                                {/* Remplissage sous la courbe */}
                                <path d={fillD} fill="url(#revGrad)" />
                                
                                {/* Ligne de la courbe */}
                                <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
                                
                                {/* Points de données avec tooltips de valeur */}
                                {points.map((p, i) => (
                                    <g key={i} className="chart-point-group">
                                        <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#2563EB" strokeWidth="3" />
                                        <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fill="#1E293B" fontWeight="800" style={{ pointerEvents: 'none' }}>
                                            {revenueData[i]}€
                                        </text>
                                    </g>
                                ))}

                                {/* Libellés X */}
                                {revenueLabels.map((l, i) => {
                                    const x = padding + (i * (svgWidth - padding * 2)) / (revenueLabels.length - 1);
                                    return (
                                        <text key={i} x={x} y={svgHeight - 8} textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="700">{l}</text>
                                    );
                                })}
                            </svg>
                        </div>

                        {/* Partie Droite : Tableau Professionnel connecté aux chiffres */}
                        <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '32px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                                Historique des Chiffres
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                                    <span>Mois</span>
                                    <span style={{ textAlign: 'right' }}>Revenus</span>
                                    <span style={{ textAlign: 'right' }}>Évolution</span>
                                </div>
                                {tableData.map((row, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 12px', borderBottom: '1px solid #F1F5F9', fontSize: '13px', fontWeight: '600', alignItems: 'center' }}>
                                        <span style={{ color: '#0F172A' }}>{row.label}</span>
                                        <span style={{ color: '#0F172A', fontWeight: '700', textAlign: 'right' }}>{row.revenue.toLocaleString()} €</span>
                                        <span style={{ 
                                            textAlign: 'right', 
                                            fontWeight: '700',
                                            color: row.pctChange === null ? '#94A3B8' : (row.pctChange >= 0 ? '#10B981' : '#EF4444')
                                        }}>
                                            {row.pctChange === null ? '-' : (row.pctChange >= 0 ? `+${row.pctChange}%` : `${row.pctChange}%`)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                                            <div className="table-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {c.company}
                                                {parseInt(c.unreadCount) > 0 && <span className="red-dot" style={{ position: 'static', transform: 'none' }}></span>}
                                            </div>
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

            </div>
        </div>
    );
}
