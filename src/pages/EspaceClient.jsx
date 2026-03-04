import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { adminDataService } from '../services/adminDataService';
import './EspaceClient.css';

/* ── ICONS ─────────────────────────────────────────────── */
const Icons = {
    Dashboard: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    Mail: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
    Docs: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    Pin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    Calendar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    ArrowRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
};

export default function EspaceClient() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [clientData, setClientData] = useState(null);
    const [mail, setMail] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isLoaded && user) {
            const email = user.primaryEmailAddress?.emailAddress;
            const data = adminDataService.getClientByEmail(email);

            if (data) {
                setClientData(data);
                setMail(adminDataService.getClientMail(data.id));
                setDocuments(adminDataService.getDocuments(data.id));
            } else {
                // Si pas de correspondance dans les clients réels, on utilise des fakes pour la démo
                setClientData({
                    company: "Votre Entreprise",
                    plan: "Scan+",
                    status: "actif",
                    since: "2024-12-01"
                });
            }
            setIsLoading(false);
        }
    }, [isLoaded, user]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    if (isLoading) return <div className="ec-loading">Initialisation de votre espace sécurisé...</div>;

    return (
        <div className="ec-layout">
            <aside className="ec-sidebar">
                <div className="ec-sidebar-brand">
                    <Link to="/" className="ec-brand-logo">
                        <div className="ec-logo-icon">DPC</div>
                        <span className="ec-logo-text">ESPACE CLIENT</span>
                    </Link>
                </div>

                <nav className="ec-nav">
                    <button className={`ec-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        <span className="ec-nav-icon"><Icons.Dashboard /></span> Dashboard
                    </button>
                    <button className={`ec-nav-item ${activeTab === 'mail' ? 'active' : ''}`} onClick={() => setActiveTab('mail')}>
                        <span className="ec-nav-icon"><Icons.Mail /></span> Courrier
                        {mail.filter(m => m.status === 'non lu').length > 0 && <span className="ec-nav-badge">{mail.filter(m => m.status === 'non lu').length}</span>}
                    </button>
                    <button className={`ec-nav-item ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
                        <span className="ec-nav-icon"><Icons.Docs /></span> Documents
                    </button>
                    <button className={`ec-nav-item ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => setActiveTab('meeting')}>
                        <span className="ec-nav-icon"><Icons.Calendar /></span> Salles & Bureaux
                    </button>
                    <button className={`ec-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                        <span className="ec-nav-icon"><Icons.Settings /></span> Paramètres
                    </button>
                </nav>

                <div className="ec-sidebar-footer">
                    <div className="ec-user-card">
                        <div className="ec-user-avatar">
                            {user?.imageUrl ? <img src={user.imageUrl} /> : <span>{user?.firstName?.charAt(0) || 'U'}</span>}
                        </div>
                        <div className="ec-user-info">
                            <div className="ec-user-name">{user?.firstName || 'Utilisateur'}</div>
                            <div className="ec-user-company">{clientData?.company}</div>
                        </div>
                    </div>
                    <button className="ec-nav-item ec-logout" onClick={handleLogout}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Déconnexion
                    </button>
                </div>
            </aside>

            <main className="ec-main">
                <header className="ec-header">
                    <div className="ec-header-left">
                        <h1 className="ec-welcome-title">Bonjour, {user?.firstName || 'Propriétaire'}</h1>
                        <p className="ec-welcome-sub">Bienvenue sur votre console de gestion {clientData?.company}</p>
                    </div>
                    <div className="ec-header-right">
                        <div className="ec-status-tag">
                            <span className="status-dot-green"></span>
                            Abonnement {clientData?.plan} Actif
                        </div>
                    </div>
                </header>

                <div className="ec-view-container">
                    {activeTab === 'overview' && (
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
                                    <div className="ec-stat-label">Statut Dossier</div>
                                    <div className="ec-stat-value color-success">100%</div>
                                    <div className="ec-stat-footer">Conforme</div>
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
                    )}

                    {activeTab === 'mail' && (
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
                    )}

                    {activeTab === 'docs' && (
                        <div className="ec-tab-animate">
                            <div className="ec-grid-docs">
                                {documents.map(doc => (
                                    <div key={doc.id} className="ec-doc-card">
                                        <div className="ec-doc-icon"><Icons.Docs /></div>
                                        <div className="ec-doc-info">
                                            <span className="ec-doc-name">{doc.name}</span>
                                            <span className="ec-doc-meta">{doc.size} · Mis en ligne le {doc.uploadedAt}</span>
                                        </div>
                                        <button className="ec-doc-download">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                        </button>
                                    </div>
                                ))}
                                {documents.length === 0 && <div className="ec-empty">Aucun document archivé.</div>}
                            </div>
                        </div>
                    )}

                    {(activeTab === 'meeting' || activeTab === 'settings') && (
                        <div className="ec-tab-animate">
                            <div className="ec-coming-soon">
                                <h3>Cette section sera bientôt disponible</h3>
                                <p>Nous finalisons les derniers détails pour vous offrir une expérience optimale.</p>
                                <button className="ec-btn-primary" onClick={() => setActiveTab('overview')}>Retour au dashboard</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
