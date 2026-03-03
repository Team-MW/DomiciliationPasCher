import { useUser, useClerk } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import './EspaceClient.css';

const quickActions = [
    { icon: '📬', label: 'Mon courrier', desc: 'Consulter mes lettres', soon: false },
    { icon: '📄', label: 'Mes documents', desc: 'Attestations & contrats', soon: false },
    { icon: '📅', label: 'Réservations', desc: 'Salles & bureaux', soon: true },
    { icon: '🏢', label: 'Mon adresse', desc: 'Gérer ma domiciliation', soon: false },
    { icon: '💳', label: 'Facturation', desc: 'Factures & paiements', soon: true },
    { icon: '⚙️', label: 'Mon profil', desc: 'Paramètres du compte', soon: false },
];

const recentActivity = [
    { icon: '📬', title: 'Courrier reçu', desc: 'Lettre recommandée — URSSAF', time: 'Il y a 2h', badge: 'Nouveau' },
    { icon: '📄', title: 'Document disponible', desc: 'Attestation de domiciliation 2025', time: 'Hier', badge: null },
    { icon: '✅', title: 'Contrat activé', desc: 'Domiciliation Paris 8e activée', time: 'Il y a 3 jours', badge: null },
];

export default function EspaceClient() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Entrepreneur';

    return (
        <div className="ec-layout">

            {/* ── Sidebar ── */}
            <aside className="ec-sidebar">
                <div className="ec-sidebar-brand">
                    <Link to="/" className="ec-brand-link">
                        <div className="ec-brand-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <span className="ec-brand-name">DomPasCher</span>
                    </Link>
                </div>

                <nav className="ec-nav">
                    <div className="ec-nav-label">Navigation</div>
                    {[
                        { icon: '🏠', label: 'Tableau de bord', active: true },
                        { icon: '📬', label: 'Mon courrier' },
                        { icon: '📄', label: 'Documents' },
                        { icon: '📅', label: 'Réservations', badge: 'Bientôt' },
                        { icon: '🏢', label: 'Mon adresse' },
                        { icon: '💳', label: 'Facturation', badge: 'Bientôt' },
                    ].map((item, i) => (
                        <button
                            key={i}
                            className={`ec-nav-item ${item.active ? 'active' : ''}`}
                            disabled={!!item.badge && !item.active}
                        >
                            <span className="ec-nav-icon">{item.icon}</span>
                            <span className="ec-nav-label-text">{item.label}</span>
                            {item.badge && <span className="ec-nav-badge">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="ec-sidebar-footer">
                    <div className="ec-user-info">
                        <div className="ec-user-avatar">
                            {user?.imageUrl
                                ? <img src={user.imageUrl} alt="avatar" />
                                : <span>{firstName.charAt(0).toUpperCase()}</span>
                            }
                        </div>
                        <div className="ec-user-meta">
                            <div className="ec-user-name">{firstName}</div>
                            <div className="ec-user-email">{user?.emailAddresses?.[0]?.emailAddress}</div>
                        </div>
                    </div>
                    <button className="ec-signout-btn" onClick={handleSignOut}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                        Déconnexion
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="ec-main">
                {/* Header */}
                <div className="ec-topbar">
                    <div>
                        <h1 className="ec-welcome">Bonjour, {firstName} 👋</h1>
                        <p className="ec-date">
                            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="ec-topbar-actions">
                        <Link to="/" className="ec-back-link">
                            ← Retour au site
                        </Link>
                    </div>
                </div>

                {/* Status banner */}
                <div className="ec-status-banner">
                    <div className="ec-status-dot" />
                    <span>Votre domiciliation est <strong>active</strong> · Adresse visible dans "Mon adresse"</span>
                </div>

                {/* Quick Actions */}
                <section className="ec-section">
                    <h2 className="ec-section-title">Accès rapide</h2>
                    <div className="ec-actions-grid">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                className={`ec-action-card ${action.soon ? 'soon' : ''}`}
                                disabled={action.soon}
                            >
                                <div className="ec-action-icon">{action.icon}</div>
                                <div className="ec-action-label">{action.label}</div>
                                <div className="ec-action-desc">{action.desc}</div>
                                {action.soon && <span className="ec-action-soon">Bientôt</span>}
                                {!action.soon && (
                                    <svg className="ec-action-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Stats */}
                <section className="ec-section">
                    <h2 className="ec-section-title">Aperçu</h2>
                    <div className="ec-stats">
                        {[
                            { label: 'Courriers reçus', value: '3', sub: 'ce mois', color: '#1A56DB' },
                            { label: 'Non lus', value: '1', sub: 'à consulter', color: '#F59E0B' },
                            { label: 'Documents', value: '5', sub: 'disponibles', color: '#10B981' },
                            { label: 'Prochain renouvellement', value: '24j', sub: 'restants', color: '#64748B' },
                        ].map((s, i) => (
                            <div key={i} className="ec-stat">
                                <div className="ec-stat-value" style={{ color: s.color }}>{s.value}</div>
                                <div className="ec-stat-label">{s.label}</div>
                                <div className="ec-stat-sub">{s.sub}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recent activity */}
                <section className="ec-section">
                    <div className="ec-section-header">
                        <h2 className="ec-section-title">Activité récente</h2>
                        <button className="ec-see-all">Voir tout</button>
                    </div>
                    <div className="ec-activity">
                        {recentActivity.map((item, i) => (
                            <div key={i} className="ec-activity-item">
                                <div className="ec-activity-icon">{item.icon}</div>
                                <div className="ec-activity-content">
                                    <div className="ec-activity-title">
                                        {item.title}
                                        {item.badge && <span className="ec-activity-badge">{item.badge}</span>}
                                    </div>
                                    <div className="ec-activity-desc">{item.desc}</div>
                                </div>
                                <div className="ec-activity-time">{item.time}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Coming soon banner */}
                <div className="ec-coming-soon">
                    <div className="ec-cs-icon">🚀</div>
                    <div>
                        <div className="ec-cs-title">Nouvelles fonctionnalités à venir</div>
                        <div className="ec-cs-desc">Réservation de salles, dépôt de documents, formulaires en ligne — tout cela arrive très prochainement dans votre espace client.</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
