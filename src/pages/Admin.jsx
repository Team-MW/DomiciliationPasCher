import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../services/adminDataService';
import './Admin.css';

/* ── ICONS ─────────────────────────────────────────────── */
const Icons = {
    Overview: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    Demandes: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
    Clients: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    Mail: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
    Billing: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    Logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
    Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    TrendUp: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12 }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
    File: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
    Image: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
};

export default function Admin() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    // Auth State
    const [pinOk, setPinOk] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
    const [pinInput, setPinInput] = useState('');

    // Data State
    const [activeTab, setActiveTab] = useState('overview');
    const [clients, setClients] = useState([]);
    const [mail, setMail] = useState([]);
    const [demandes, setDemandes] = useState([]);
    const [stats, setStats] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState(null);

    const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '0000';

    useEffect(() => {
        if (pinOk) {
            adminDataService.init();
            refreshData();
        }
    }, [pinOk]);

    const refreshData = () => {
        setClients(adminDataService.getClients());
        setMail(adminDataService.getMail());
        setDemandes(adminDataService.getDemandes());
        setStats(adminDataService.getGlobalStats());
    };

    const handlePinSuccess = () => {
        setPinOk(true);
        sessionStorage.setItem('admin_auth', 'true');
    };

    const handleLogout = async () => {
        sessionStorage.removeItem('admin_auth');
        await signOut();
        navigate('/');
    };

    if (!pinOk) {
        return (
            <div className="admin-pin-screen">
                <div className="admin-pin-card">
                    <div className="admin-pin-header">
                        <h1>Terminal Admin</h1>
                        <p>Code d'accès requis pour déverrouiller la console</p>
                    </div>
                    <div className="admin-pin-form">
                        <input
                            type="password"
                            className="admin-pin-input"
                            placeholder="••••"
                            maxLength={4}
                            value={pinInput}
                            autoFocus
                            onChange={e => setPinInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && pinInput.trim() === ADMIN_PIN) handlePinSuccess();
                            }}
                        />
                        <button className="admin-pin-btn" onClick={() => pinInput.trim() === ADMIN_PIN && handlePinSuccess()}>
                            DÉVERROUILLER
                        </button>
                    </div>
                    <button className="pin-cancel-link" onClick={() => navigate('/')}>Quitter la console</button>
                </div>
            </div>
        );
    }

    const selectedClient = selectedClientId ? adminDataService.getClientById(selectedClientId) : null;

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <div className="logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px' }}>
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <div className="logo-text">CONSOLE ADMIN</div>
                </div>

                <nav className="admin-menu">
                    <button className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Overview /></span> Vue d'ensemble
                    </button>
                    <button className={`menu-item ${activeTab === 'demandes' ? 'active' : ''}`} onClick={() => { setActiveTab('demandes'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Demandes /></span> Demandes {stats.pendingDemandes > 0 && <span className="menu-badge">{stats.pendingDemandes}</span>}
                    </button>
                    <button className={`menu-item ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => { setActiveTab('clients'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Clients /></span> Gestion Clients
                    </button>
                    <button className={`menu-item ${activeTab === 'mail' ? 'active' : ''}`} onClick={() => { setActiveTab('mail'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Mail /></span> Centre Courrier
                    </button>
                    <button className={`menu-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Billing /></span> Facturation
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', padding: '12px' }}>
                    <button className="menu-item logout-item" onClick={handleLogout}>
                        <span className="menu-icon"><Icons.Logout /></span> Déconnexion
                    </button>
                </div>
            </aside>

            <main className="admin-content">
                <header className="admin-header">
                    <div className="header-search">
                        <span className="search-icon"><Icons.Search /></span>
                        <input
                            type="text"
                            placeholder="Rechercher un dossier, une entreprise..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="header-profile">
                        <div className="profile-info">
                            <span className="profile-name">Admin DPC</span>
                            <span className="profile-email">{user?.primaryEmailAddress?.emailAddress}</span>
                        </div>
                        <div className="profile-avatar">AD</div>
                    </div>
                </header>

                <div className="admin-body">
                    {selectedClientId ? (
                        <DossierClient
                            client={selectedClient}
                            onBack={() => setSelectedClientId(null)}
                            onUpdate={refreshData}
                        />
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab stats={stats} clients={clients} mail={mail} />}
                            {activeTab === 'demandes' && <DemandesTab demandes={demandes} onUpdate={refreshData} />}
                            {activeTab === 'clients' && <ClientsTab clients={clients} searchQuery={searchQuery} onSelect={setSelectedClientId} onUpdate={refreshData} />}
                            {activeTab === 'mail' && <MailTab mail={mail} clients={clients} onUpdate={refreshData} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

/* ─── TABS COMPONENTS ──────────────────────────────────── */

function OverviewTab({ stats, clients, mail }) {
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

function DemandesTab({ demandes, onUpdate }) {
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

function ClientsTab({ clients, searchQuery, onSelect, onUpdate }) {
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
                    <button className="btn-primary-sm">+ Nouveau Client</button>
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
                                        {c.clerkId ? c.clerkId : 'Clerk Non Lié'}
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

function DossierClient({ client, onBack, onUpdate }) {
    const [documents, setDocuments] = useState([]);

    useEffect(() => {
        if (client) setDocuments(adminDataService.getDocuments(client.id));
    }, [client]);

    const handleUploadSim = () => {
        const name = prompt('Nom du document ?');
        if (name) {
            adminDataService.addDocument(client.id, {
                name: name, size: '250KB', type: 'application/pdf', owner: 'admin', url: '#'
            });
            setDocuments(adminDataService.getDocuments(client.id));
        }
    };

    if (!client) return null;

    return (
        <div className="dossier-animate">
            <div className="dossier-header">
                <button onClick={onBack} className="btn-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14 }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Retour
                </button>
                <div className="dossier-title">
                    <h1>{client.company}</h1>
                    <span className="badge-status">Compte {client.status}</span>
                </div>
            </div>

            <div className="dossier-grid">
                <div className="content-card">
                    <div className="card-header">
                        <h2>Espace Documentaire</h2>
                        <button className="btn-primary-sm" onClick={handleUploadSim}>Uploader</button>
                    </div>
                    <div className="card-body">
                        {documents.length === 0 ? (
                            <div className="empty-state-full">
                                <Icons.File />
                                <p>Aucun document dans le dossier.</p>
                            </div>
                        ) : (
                            <div className="docs-grid">
                                {documents.map(doc => (
                                    <div key={doc.id} className="doc-card">
                                        <div className="doc-icon">
                                            {doc.type.includes('image') ? <Icons.Image /> : <Icons.File />}
                                        </div>
                                        <div className="doc-info">
                                            <span className="doc-name">{doc.name}</span>
                                            <span className="doc-meta">{doc.size} · {doc.owner}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="dossier-sidebar">
                    <div className="content-card">
                        <div className="card-header"><h2>Informations</h2></div>
                        <div className="card-body info-list">
                            <div className="info-group"><label>Clerk User ID</label><code style={{ fontSize: '10px' }}>{client.clerkId || 'N/A'}</code></div>
                            <div className="info-group"><label>Gérant</label><span>{client.name}</span></div>
                            <div className="info-group"><label>Email</label><span>{client.email}</span></div>
                            <div className="info-group"><label>Formule</label><span>{client.plan}</span></div>
                            <div className="info-group"><label>Date d'entrée</label><span>{client.since}</span></div>
                            <div className="info-actions">
                                <button className="btn-danger-outline">Suspendre l'accès</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MailTab({ mail, clients, onUpdate }) {
    return (
        <div className="tab-container">
            <div className="tab-header">
                <h1>Centre de Courrier</h1>
                <button className="btn-primary-sm">Nouveau Scan</button>
            </div>

            <div className="mail-grid">
                {mail.map(m => (
                    <div key={m.id} className={`mail-card-v2 ${m.status === 'non lu' ? 'is-unread' : ''}`}>
                        <div className="mail-icon-v2"><Icons.Mail /></div>
                        <div className="mail-body-v2">
                            <div className="mail-company">{m.company}</div>
                            <div className="mail-from">Exp: {m.from}</div>
                            <div className="mail-meta">{m.type} · {m.date}</div>
                            <div className="mail-actions-v2">
                                <button className="btn-primary-sm" onClick={() => { adminDataService.markMailAsRead(m.id); onUpdate(); }}>
                                    {m.status === 'non lu' ? 'Marquer Lu' : 'Visualiser'}
                                </button>
                                <button className="btn-secondary-sm">Transférer</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
