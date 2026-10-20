import { useState, useEffect, useCallback } from 'react';
import { useUser, useClerk, SignIn, UserButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../../services/adminDataService';
import { appAlert, appConfirm } from '../../components/AppDialog/dialogApi';
import './Admin.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

// Components
import { Icons } from './components/Icons';
import OverviewTab from './components/OverviewTab';
import DemandesTab from './components/DemandesTab';
import ClientsTab from './components/ClientsTab';
import FailedPaymentsTab from './components/FailedPaymentsTab';
import MeetingTab from './components/MeetingTab';
import MailTab from './components/MailTab';
import DossierClient from './components/DossierClient';
import CreateClientModal from './components/CreateClientModal';
import { DemandeDetailsModal } from './components/DemandesTab';

export default function Admin() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    // Data State
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [clients, setClients] = useState([]);
    const [mail, setMail] = useState([]);
    const [demandes, setDemandes] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [reexpeditions, setReexpeditions] = useState([]);
    const [stats, setStats] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingId, setLoadingId] = useState(null);

    const showConfirm = useCallback((message, options = {}) => appConfirm(message, options), []);
    const showAlert = useCallback((message, options = {}) => appAlert(message, options), []);

    const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'mwcrea.agency@gmail.com').split(',');
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const isAdmin = ADMIN_EMAILS.includes(userEmail);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [c, m, d, b, r, s] = await Promise.all([
                adminDataService.getClients(),
                adminDataService.getMail(),
                adminDataService.getDemandes(),
                adminDataService.getBookings(),
                adminDataService.getReexpeditions(),
                adminDataService.getGlobalStats()
            ]);
            setClients(c);
            setMail(m);
            setDemandes(d);
            setBookings(b);
            setReexpeditions(Array.isArray(r) ? r : []);
            setStats(s);

            const lastDemandesCount = parseInt(localStorage.getItem('admin_seen_demandes') || '0');
            if (d.length > lastDemandesCount && activeTab !== 'demandes') {
                setHasNewDemande(true);
            }
            const lastBookingsCount = parseInt(localStorage.getItem('admin_seen_bookings') || '0');
            if (b.length > lastBookingsCount && activeTab !== 'meeting') {
                setHasNewBooking(true);
            }
            const lastReexpCount = parseInt(localStorage.getItem('admin_seen_reexpeditions') || '0');
            if ((r || []).length > lastReexpCount && activeTab !== 'courrier') {
                setHasNewReexp(true);
            }

        } catch (err) {
            console.error("Erreur de chargement des données:", err);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    const [hasNewDemande, setHasNewDemande] = useState(false);
    const [hasNewBooking, setHasNewBooking] = useState(false);
    const [hasNewReexp, setHasNewReexp] = useState(false);

    useEffect(() => {
        if (activeTab === 'demandes') {
            setHasNewDemande(false);
            localStorage.setItem('admin_seen_demandes', demandes.length.toString());
        }
        if (activeTab === 'meeting') {
            setHasNewBooking(false);
            localStorage.setItem('admin_seen_bookings', bookings.length.toString());
        }
        if (activeTab === 'courrier') {
            setHasNewReexp(false);
            localStorage.setItem('admin_seen_reexpeditions', reexpeditions.length.toString());
        }
    }, [activeTab, demandes.length, bookings.length, reexpeditions.length]);

    useEffect(() => {
        const body = document.querySelector('.admin-body');
        if (body) body.scrollTop = 0;
    }, [activeTab, selectedClientId]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    useEffect(() => {
        if (isLoaded && isAdmin) {
            const setup = async () => {
                await adminDataService.init();
                refreshData();
            };
            setup();
        }
    }, [isLoaded, isAdmin, refreshData]);

    if (!isLoaded) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFF', color: '#0f172a', fontWeight: 700 }}>
                Vérification des accès...
            </div>
        );
    }

    if (!user) {
        return (
            <div className="admin-auth-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
                <div style={{ maxWidth: '400px', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>Console Administration</h1>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Veuillez vous connecter avec votre compte administrateur.</p>
                    </div>
                    <SignIn 
                        fallbackRedirectUrl="/admin"
                        forceRedirectUrl="/admin"
                        appearance={{
                            variables: {
                                colorPrimary: '#0f172a',
                            }
                        }}
                    />
                    <button onClick={() => navigate('/')} style={{ marginTop: '24px', width: '100%', padding: '12px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontWeight: '600' }}>
                        Retour au site
                    </button>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="admin-denied-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: '20px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444', fontFamily: 'Outfit, sans-serif' }}>Accès Refusé</h1>
                <p style={{ color: '#64748b', fontSize: '16px', marginTop: '8px', maxWidth: '400px' }}>
                    Vous n'avez pas les droits d'administrateur pour accéder à cette console.
                </p>
                <p style={{ color: '#0f172a', fontWeight: '600', marginTop: '16px' }}>Connecté en tant que: {userEmail}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button onClick={handleLogout} style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        Déconnexion
                    </button>
                    <button onClick={() => navigate('/')} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        Retour au site
                    </button>
                </div>
            </div>
        );
    }

    const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;

    return (
        <div className="admin-layout">
            <div className={`admin-mobile-backdrop ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
            <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="admin-logo">
                    <img src={logoSvg} alt="DPC" className="admin-logo-img" />
                </div>

                <nav className="admin-menu">
                    <div className="sidebar-section-title">Analytiques</div>
                    <button className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSelectedClientId(null); setIsMobileMenuOpen(false); }}>
                        <span className="menu-icon"><Icons.Overview /></span> Dashboard
                    </button>

                    <div className="sidebar-section-title">Demandes</div>
                    <button className={`menu-item ${activeTab === 'demandes' ? 'active' : ''}`} onClick={() => { setActiveTab('demandes'); setSelectedClientId(null); setIsMobileMenuOpen(false); }}>
                        <span className="menu-icon"><Icons.Demandes /></span> Demandes 
                        {stats.pendingDemandes > 0 && <span className="menu-badge" style={{ background: '#EF4444' }}>{stats.pendingDemandes}</span>}
                        {hasNewDemande && <span className="red-dot"></span>}
                    </button>

                    <div className="sidebar-section-title">Gestion</div>
                    <button className={`menu-item ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => { setActiveTab('clients'); setSelectedClientId(null); setIsMobileMenuOpen(false); }}>
                        <span className="menu-icon"><Icons.Clients /></span> Gestion Clients 
                        {stats.pendingMessages > 0 && <span className="menu-badge" style={{ background: '#6366F1' }}>{stats.pendingMessages}</span>}
                        {stats.pendingMessages > 0 && activeTab !== 'clients' && <span className="red-dot"></span>}
                    </button>
                    <button className={`menu-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setSelectedClientId(null); setIsMobileMenuOpen(false); }}>
                        <span className="menu-icon"><Icons.Billing /></span> Facturation
                    </button>
                    <button className={`menu-item ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => { setActiveTab('meeting'); setSelectedClientId(null); setIsMobileMenuOpen(false); }}>
                        <span className="menu-icon"><Icons.Calendar /></span> Salles & Bureaux
                        {hasNewBooking && <span className="red-dot"></span>}
                    </button>
                    <button className={`menu-item ${activeTab === 'courrier' ? 'active' : ''}`} onClick={() => { setActiveTab('courrier'); setSelectedClientId(null); setIsMobileMenuOpen(false); }}>
                        <span className="menu-icon"><Icons.Mail /></span> Courrier
                        {stats.pendingReexpeditions > 0 && <span className="menu-badge" style={{ background: '#F59E0B' }}>{stats.pendingReexpeditions}</span>}
                        {hasNewReexp && <span className="red-dot"></span>}
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', padding: '12px 20px', borderTop: '1px solid var(--admin-border)' }}>
                    <button className="menu-item logout-item" onClick={handleLogout} style={{ color: '#EF4444' }}>
                        <span className="menu-icon" style={{ color: '#EF4444' }}><Icons.Logout /></span> Déconnexion
                    </button>
                </div>
            </aside>

            <main className="admin-content">
                <header className="admin-header">
                    <button className="admin-mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
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
                            <UserButton afterSignOutUrl="/" />
                        </div>
                </header>

                <div className="admin-body">
                    {isLoading && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                        </div>
                    )}

                    {selectedClientId ? (
                        <DossierClient
                            client={selectedClient}
                            onBack={() => setSelectedClientId(null)}
                            onUpdate={refreshData}
                            showConfirm={showConfirm}
                            showAlert={showAlert}
                        />
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab stats={stats} clients={clients} mail={mail} />}
                            {activeTab === 'demandes' && <DemandesTab demandes={demandes} onUpdate={refreshData} onSelectDemande={setSelectedDemande} showConfirm={showConfirm} showAlert={showAlert} />}
                            {activeTab === 'clients' && <ClientsTab clients={clients} searchQuery={searchQuery} onSelect={setSelectedClientId} onUpdate={refreshData} onCreateClick={() => setIsCreatingClient(true)} />}
                            {activeTab === 'billing' && <FailedPaymentsTab clients={clients} onSelect={setSelectedClientId} onUpdate={refreshData} showConfirm={showConfirm} showAlert={showAlert} />}
                            {activeTab === 'meeting' && <MeetingTab bookings={bookings} clients={clients} onUpdate={refreshData} showAlert={showAlert} />}
                            {activeTab === 'courrier' && <MailTab reexpeditions={reexpeditions} onUpdate={refreshData} showAlert={showAlert} onSelectClient={setSelectedClientId} />}
                        </>
                    )}
                </div>

                {selectedDemande && (
                    <DemandeDetailsModal 
                        demande={selectedDemande} 
                        onClose={() => setSelectedDemande(null)} 
                        onAccept={async (id) => {
                            setLoadingId(id);
                            try {
                                await adminDataService.traiterDemande(id);
                                refreshData();
                                setSelectedDemande(null);
                                await showAlert("Accès créé avec succès ! L'email de validation a été envoyé.", { title: "Succès" });
                            } finally {
                                setLoadingId(null);
                            }
                        }}
                        onReject={async (id) => {
                            const confirmed = await showConfirm("Supprimer cette demande ?", { isDanger: true });
                            if (confirmed) {
                                setLoadingId(id);
                                try {
                                    await adminDataService.deleteDemande(id);
                                    refreshData();
                                    setSelectedDemande(null);
                                } finally {
                                    setLoadingId(null);
                                }
                            }
                        }}
                        loadingId={loadingId}
                    />
                )}

                {isCreatingClient && (
                    <CreateClientModal
                        onClose={() => setIsCreatingClient(false)}
                        onCreated={() => {
                            refreshData();
                            setIsCreatingClient(false);
                        }}
                        showAlert={showAlert}
                    />
                )}
            </main>
        </div>
    );
}
