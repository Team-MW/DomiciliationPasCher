import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

/* ─── Mock data (à remplacer par API) ─────────────────── */
const mockClients = [
    { id: 1, name: 'Marie Lambert', email: 'marie.l@gmail.com', company: 'ML Consulting', city: 'Lyon', plan: 'Scan+', status: 'actif', since: '2024-11-15', renewal: '2025-11-15', courrier: 3 },
    { id: 2, name: 'Thomas Bernard', email: 'thomas.b@startup.io', company: 'Bernard Tech', city: 'Paris', plan: 'Essentiel', status: 'actif', since: '2024-10-02', renewal: '2025-10-02', courrier: 1 },
    { id: 3, name: 'Sophie Martin', email: 'sophie.m@autoent.fr', company: 'Sophie M.', city: 'Marseille', plan: 'Scan+', status: 'actif', since: '2025-01-20', renewal: '2026-01-20', courrier: 0 },
    { id: 4, name: 'Karim Aziz', email: 'k.aziz@pro.com', company: 'Aziz & Associés', city: 'Bordeaux', plan: 'Essentiel', status: 'suspendu', since: '2024-07-08', renewal: '2025-07-08', courrier: 7 },
    { id: 5, name: 'Lucie Petit', email: 'lucie.p@freelance.fr', company: 'Lucie Design', city: 'Nantes', plan: 'Scan+', status: 'actif', since: '2025-02-01', renewal: '2026-02-01', courrier: 2 },
    { id: 6, name: 'Antoine Roux', email: 'a.roux@consulting.fr', company: 'Roux Conseil', city: 'Toulouse', plan: 'Essentiel', status: 'en attente', since: '2025-03-01', renewal: '2026-03-01', courrier: 0 },
    { id: 7, name: 'Emma Dubois', email: 'emma.d@studio.com', company: 'Studio Dubois', city: 'Nice', plan: 'Scan+', status: 'actif', since: '2024-12-10', renewal: '2025-12-10', courrier: 5 },
    { id: 8, name: 'Nicolas Blanc', email: 'n.blanc@pme.fr', company: 'Blanc Industries', city: 'Lille', plan: 'Essentiel', status: 'actif', since: '2025-01-05', renewal: '2026-01-05', courrier: 12 },
];

const mockCourriers = [
    { id: 1, client: 'Marie Lambert', company: 'ML Consulting', type: 'Recommandé', expediteur: 'URSSAF', date: '2025-03-03', status: 'non lu' },
    { id: 2, client: 'Nicolas Blanc', company: 'Blanc Industries', type: 'Lettre simple', expediteur: 'Impôts', date: '2025-03-03', status: 'non lu' },
    { id: 3, client: 'Emma Dubois', company: 'Studio Dubois', type: 'Recommandé', expediteur: 'SFR', date: '2025-03-02', status: 'scanné' },
    { id: 4, client: 'Thomas Bernard', company: 'Bernard Tech', type: 'Lettre simple', expediteur: 'Banque', date: '2025-03-02', status: 'lu' },
    { id: 5, client: 'Karim Aziz', company: 'Aziz & Associés', type: 'Colis', expediteur: 'Amazon', date: '2025-03-01', status: 'en attente' },
];

const mockReservations = [
    { id: 1, client: 'Thomas Bernard', type: 'Salle de réunion', date: '2025-03-05', heure: '14h00–17h00', status: 'confirmée' },
    { id: 2, client: 'Marie Lambert', type: 'Bureau privatif', date: '2025-03-06', heure: '09h00–12h00', status: 'en attente' },
    { id: 3, client: 'Emma Dubois', type: 'Salle de réunion', date: '2025-03-10', heure: '10h00–12h00', status: 'confirmée' },
];

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@domiciliationpascher.fr';

/* ─── Component ────────────────────────────────────────── */

export default function Admin() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchClients, setSearchClients] = useState('');
    const [filterStatus, setFilterStatus] = useState('tous');
    const [pinInput, setPinInput] = useState('');
    const [pinOk, setPinOk] = useState(false);
    const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '2025admin';

    /* Sécurité : vérifier email admin ou PIN */
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';
    const isAdminEmail = userEmail === ADMIN_EMAIL;
    const isAuthorized = isAdminEmail || pinOk;

    /* Stats */
    const totalClients = mockClients.length;
    const activeClients = mockClients.filter(c => c.status === 'actif').length;
    const suspendedClients = mockClients.filter(c => c.status === 'suspendu').length;
    const pendingClients = mockClients.filter(c => c.status === 'en attente').length;
    const monthlyRevenue = mockClients.filter(c => c.status === 'actif').reduce((acc, c) => acc + (c.plan === 'Scan+' ? 28 : 23), 0);
    const unreadCourrier = mockCourriers.filter(c => c.status === 'non lu').length;

    /* Filtrage clients */
    const filteredClients = mockClients.filter(c => {
        const matchSearch = !searchClients
            || c.name.toLowerCase().includes(searchClients.toLowerCase())
            || c.company.toLowerCase().includes(searchClients.toLowerCase())
            || c.email.toLowerCase().includes(searchClients.toLowerCase());
        const matchStatus = filterStatus === 'tous' || c.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    /* ── PIN screen ── */
    if (!isAuthorized) {
        return (
            <div className="admin-pin-screen">
                <div className="admin-pin-card">
                    <div className="admin-pin-icon">🔐</div>
                    <h1>Accès administrateur</h1>
                    <p>Saisissez le code d'accès administrateur pour continuer.</p>
                    <input
                        type="password"
                        className="admin-pin-input"
                        placeholder="Code d'accès"
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (pinInput === ADMIN_PIN) setPinOk(true);
                                else { setPinInput(''); alert('Code incorrect'); }
                            }
                        }}
                    />
                    <button
                        className="admin-pin-btn"
                        onClick={() => {
                            if (pinInput === ADMIN_PIN) setPinOk(true);
                            else { setPinInput(''); alert('Code incorrect'); }
                        }}
                    >
                        Accéder →
                    </button>
                    <div className="admin-pin-hint">
                        Accès réservé à l'administrateur
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">

            {/* ── Sidebar ── */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <div className="admin-sidebar-brand">
                        <div className="admin-brand-icon">⚙️</div>
                        <div>
                            <div className="admin-brand-name">Admin Panel</div>
                            <div className="admin-brand-sub">DomiciliationPasCher</div>
                        </div>
                    </div>
                </div>

                <nav className="admin-nav">
                    {[
                        { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
                        { id: 'clients', icon: '👥', label: 'Clients', badge: totalClients },
                        { id: 'courrier', icon: '📬', label: 'Courrier', badge: unreadCourrier || null },
                        { id: 'reservations', icon: '📅', label: 'Réservations', badge: mockReservations.filter(r => r.status === 'en attente').length || null },
                        { id: 'documents', icon: '📄', label: 'Documents' },
                        { id: 'facturation', icon: '💳', label: 'Facturation' },
                    ].map(item => (
                        <button
                            key={item.id}
                            className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span className="admin-nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.badge ? <span className="admin-nav-badge">{item.badge}</span> : null}
                        </button>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <div className="admin-admin-info">
                        <div className="admin-admin-dot" />
                        <div>
                            <div className="admin-admin-label">Administrateur</div>
                            <div className="admin-admin-email">{userEmail || 'Mode PIN'}</div>
                        </div>
                    </div>
                    <button className="admin-back-btn" onClick={() => navigate('/')}>← Site public</button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="admin-main">

                {/* ══ Dashboard ══ */}
                {activeTab === 'dashboard' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1>Tableau de bord</h1>
                            <span className="admin-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>

                        {/* KPIs */}
                        <div className="admin-kpis">
                            <div className="kpi-card blue">
                                <div className="kpi-icon">👥</div>
                                <div className="kpi-value">{totalClients}</div>
                                <div className="kpi-label">Total clients</div>
                            </div>
                            <div className="kpi-card green">
                                <div className="kpi-icon">✅</div>
                                <div className="kpi-value">{activeClients}</div>
                                <div className="kpi-label">Actifs</div>
                            </div>
                            <div className="kpi-card orange">
                                <div className="kpi-icon">⏳</div>
                                <div className="kpi-value">{pendingClients}</div>
                                <div className="kpi-label">En attente</div>
                            </div>
                            <div className="kpi-card red">
                                <div className="kpi-icon">⚠️</div>
                                <div className="kpi-value">{suspendedClients}</div>
                                <div className="kpi-label">Suspendus</div>
                            </div>
                            <div className="kpi-card purple">
                                <div className="kpi-icon">💰</div>
                                <div className="kpi-value">{monthlyRevenue}€</div>
                                <div className="kpi-label">CA mensuel HT</div>
                            </div>
                            <div className="kpi-card yellow">
                                <div className="kpi-icon">📬</div>
                                <div className="kpi-value">{unreadCourrier}</div>
                                <div className="kpi-label">Courrier non lu</div>
                            </div>
                        </div>

                        {/* Recent clients + courrier */}
                        <div className="admin-dashboard-grid">
                            <div className="admin-widget">
                                <div className="admin-widget-header">
                                    <h3>Derniers clients</h3>
                                    <button onClick={() => setActiveTab('clients')} className="admin-widget-link">Voir tout →</button>
                                </div>
                                <table className="admin-mini-table">
                                    <thead>
                                        <tr><th>Client</th><th>Ville</th><th>Plan</th><th>Statut</th></tr>
                                    </thead>
                                    <tbody>
                                        {mockClients.slice(0, 5).map(c => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div className="atd-name">{c.name}</div>
                                                    <div className="atd-sub">{c.company}</div>
                                                </td>
                                                <td>{c.city}</td>
                                                <td><span className="plan-badge">{c.plan}</span></td>
                                                <td><span className={`status-badge status-${c.status.replace(' ', '-')}`}>{c.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="admin-widget">
                                <div className="admin-widget-header">
                                    <h3>Courrier récent</h3>
                                    <button onClick={() => setActiveTab('courrier')} className="admin-widget-link">Voir tout →</button>
                                </div>
                                <div className="admin-courrier-list">
                                    {mockCourriers.slice(0, 4).map(c => (
                                        <div key={c.id} className="admin-courrier-item">
                                            <div className="aci-icon">📬</div>
                                            <div className="aci-content">
                                                <div className="aci-client">{c.client} — {c.expediteur}</div>
                                                <div className="aci-type">{c.type} · {c.date}</div>
                                            </div>
                                            <span className={`courier-status cs-${c.status.replace(' ', '-')}`}>{c.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Réservations à venir */}
                        <div className="admin-widget" style={{ marginTop: '20px' }}>
                            <div className="admin-widget-header">
                                <h3>Réservations à venir</h3>
                                <button onClick={() => setActiveTab('reservations')} className="admin-widget-link">Voir tout →</button>
                            </div>
                            <table className="admin-mini-table">
                                <thead>
                                    <tr><th>Client</th><th>Type</th><th>Date</th><th>Horaire</th><th>Statut</th></tr>
                                </thead>
                                <tbody>
                                    {mockReservations.map(r => (
                                        <tr key={r.id}>
                                            <td>{r.client}</td>
                                            <td>{r.type}</td>
                                            <td>{r.date}</td>
                                            <td>{r.heure}</td>
                                            <td><span className={`status-badge status-${r.status.replace(' ', '-')}`}>{r.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ Clients ══ */}
                {activeTab === 'clients' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1>Clients ({filteredClients.length})</h1>
                            <button className="admin-action-btn">+ Ajouter un client</button>
                        </div>

                        {/* Filters */}
                        <div className="admin-filters">
                            <input
                                type="text"
                                className="admin-search"
                                placeholder="Rechercher par nom, email, entreprise…"
                                value={searchClients}
                                onChange={e => setSearchClients(e.target.value)}
                            />
                            <select
                                className="admin-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="tous">Tous les statuts</option>
                                <option value="actif">Actif</option>
                                <option value="en attente">En attente</option>
                                <option value="suspendu">Suspendu</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Client</th>
                                        <th>Email</th>
                                        <th>Ville</th>
                                        <th>Plan</th>
                                        <th>Statut</th>
                                        <th>Courrier</th>
                                        <th>Renouvellement</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClients.map(c => (
                                        <tr key={c.id}>
                                            <td className="td-id">#{c.id}</td>
                                            <td>
                                                <div className="atd-cell">
                                                    <div className="atd-avatar">{c.name.charAt(0)}</div>
                                                    <div>
                                                        <div className="atd-name">{c.name}</div>
                                                        <div className="atd-sub">{c.company}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="td-email">{c.email}</td>
                                            <td>{c.city}</td>
                                            <td><span className="plan-badge">{c.plan}</span></td>
                                            <td>
                                                <span className={`status-badge status-${c.status.replace(' ', '-')}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td>
                                                {c.courrier > 0
                                                    ? <span className="courrier-count">{c.courrier} 📬</span>
                                                    : <span className="courrier-none">—</span>
                                                }
                                            </td>
                                            <td className="td-date">{c.renewal}</td>
                                            <td>
                                                <div className="admin-row-actions">
                                                    <button className="ara-btn ara-view">👁</button>
                                                    <button className="ara-btn ara-edit">✏️</button>
                                                    <button className="ara-btn ara-delete">🗑</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ Courrier ══ */}
                {activeTab === 'courrier' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1>Courriers ({mockCourriers.length})</h1>
                            <button className="admin-action-btn">+ Nouveau courrier</button>
                        </div>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Client</th>
                                        <th>Type</th>
                                        <th>Expéditeur</th>
                                        <th>Date</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockCourriers.map(c => (
                                        <tr key={c.id}>
                                            <td className="td-id">#{c.id}</td>
                                            <td>
                                                <div className="atd-name">{c.client}</div>
                                                <div className="atd-sub">{c.company}</div>
                                            </td>
                                            <td>{c.type}</td>
                                            <td>{c.expediteur}</td>
                                            <td className="td-date">{c.date}</td>
                                            <td>
                                                <span className={`courier-status cs-${c.status.replace(' ', '-')}`}>{c.status}</span>
                                            </td>
                                            <td>
                                                <div className="admin-row-actions">
                                                    <button className="ara-btn ara-view">👁</button>
                                                    <button className="ara-btn ara-edit">✏️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ Réservations ══ */}
                {activeTab === 'reservations' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1>Réservations ({mockReservations.length})</h1>
                            <button className="admin-action-btn">+ Nouvelle réservation</button>
                        </div>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Client</th>
                                        <th>Type d'espace</th>
                                        <th>Date</th>
                                        <th>Horaire</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockReservations.map(r => (
                                        <tr key={r.id}>
                                            <td className="td-id">#{r.id}</td>
                                            <td>{r.client}</td>
                                            <td>{r.type}</td>
                                            <td className="td-date">{r.date}</td>
                                            <td>{r.heure}</td>
                                            <td>
                                                <span className={`status-badge status-${r.status.replace(' ', '-')}`}>{r.status}</span>
                                            </td>
                                            <td>
                                                <div className="admin-row-actions">
                                                    <button className="ara-btn ara-view">✅</button>
                                                    <button className="ara-btn ara-delete">❌</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ Documents ══ */}
                {activeTab === 'documents' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1>Documents</h1>
                            <button className="admin-action-btn">+ Ajouter un document</button>
                        </div>
                        <div className="admin-empty-state">
                            <div className="admin-empty-icon">📄</div>
                            <h3>Gestion des documents</h3>
                            <p>Cette section permettra de gérer les attestations, contrats et documents clients. Fonctionnalité à venir.</p>
                        </div>
                    </div>
                )}

                {/* ══ Facturation ══ */}
                {activeTab === 'facturation' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1>Facturation</h1>
                        </div>
                        <div className="admin-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="kpi-card green">
                                <div className="kpi-icon">💰</div>
                                <div className="kpi-value">{monthlyRevenue}€</div>
                                <div className="kpi-label">CA mensuel HT (actifs)</div>
                            </div>
                            <div className="kpi-card blue">
                                <div className="kpi-icon">📈</div>
                                <div className="kpi-value">{monthlyRevenue * 12}€</div>
                                <div className="kpi-label">CA annuel HT estimé</div>
                            </div>
                            <div className="kpi-card purple">
                                <div className="kpi-icon">👤</div>
                                <div className="kpi-value">{activeClients}</div>
                                <div className="kpi-label">Abonnés actifs</div>
                            </div>
                        </div>
                        <div className="admin-empty-state" style={{ marginTop: '24px' }}>
                            <div className="admin-empty-icon">💳</div>
                            <h3>Facturation détaillée</h3>
                            <p>L'intégration Stripe et la gestion des factures PDF seront disponibles prochainement.</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
