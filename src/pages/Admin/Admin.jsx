import { useState, useEffect, useCallback } from 'react';
import { useUser, useClerk, SignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../../services/adminDataService';
import './Admin.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

// Components
import { Icons } from './components/Icons';
import OverviewTab from './components/OverviewTab';
import DemandesTab from './components/DemandesTab';
import ClientsTab from './components/ClientsTab';
import FailedPaymentsTab from './components/FailedPaymentsTab';
import MeetingTab from './components/MeetingTab';
import DossierClient from './components/DossierClient';
import CreateClientModal from './components/CreateClientModal';

export default function Admin() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    // Data State
    const [activeTab, setActiveTab] = useState('overview');
    const [clients, setClients] = useState([]);
    const [mail, setMail] = useState([]);
    const [demandes, setDemandes] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'mwcrea.agency@gmail.com';

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [c, m, d, b, s] = await Promise.all([
                adminDataService.getClients(),
                adminDataService.getMail(),
                adminDataService.getDemandes(),
                adminDataService.getBookings(),
                adminDataService.getGlobalStats()
            ]);
            setClients(c);
            setMail(m);
            setDemandes(d);
            setBookings(b);
            setStats(s);

            const lastDemandesCount = parseInt(localStorage.getItem('admin_seen_demandes') || '0');
            if (d.length > lastDemandesCount && activeTab !== 'demandes') {
                setHasNewDemande(true);
            }
            const lastBookingsCount = parseInt(localStorage.getItem('admin_seen_bookings') || '0');
            if (b.length > lastBookingsCount && activeTab !== 'meeting') {
                setHasNewBooking(true);
            }

        } catch (err) {
            console.error("Erreur de chargement des données:", err);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    const [hasNewDemande, setHasNewDemande] = useState(false);
    const [hasNewBooking, setHasNewBooking] = useState(false);

    useEffect(() => {
        if (activeTab === 'demandes') {
            setHasNewDemande(false);
            localStorage.setItem('admin_seen_demandes', demandes.length.toString());
        }
        if (activeTab === 'meeting') {
            setHasNewBooking(false);
            localStorage.setItem('admin_seen_bookings', bookings.length.toString());
        }
    }, [activeTab, demandes.length, bookings.length]);

    useEffect(() => {
        const body = document.querySelector('.admin-body');
        if (body) body.scrollTop = 0;
    }, [activeTab, selectedClientId]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const isAdmin = userEmail === ADMIN_EMAIL;

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
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <img src={logoSvg} alt="DPC" className="admin-logo-img" />
                </div>

                <nav className="admin-menu">
                    <button className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Overview /></span> Dashboard
                    </button>
                    <button className={`menu-item ${activeTab === 'demandes' ? 'active' : ''}`} onClick={() => { setActiveTab('demandes'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Demandes /></span> Demandes 
                        {stats.pendingDemandes > 0 && <span className="menu-badge" style={{ background: '#EF4444' }}>{stats.pendingDemandes}</span>}
                        {hasNewDemande && <span className="red-dot"></span>}
                    </button>
                    <button className={`menu-item ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => { setActiveTab('clients'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Clients /></span> Gestion Clients 
                        {stats.pendingMessages > 0 && <span className="menu-badge" style={{ background: '#6366F1' }}>{stats.pendingMessages}</span>}
                        {stats.pendingMessages > 0 && activeTab !== 'clients' && <span className="red-dot"></span>}
                    </button>
                    <button className={`menu-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Billing /></span> Facturation
                    </button>
                    <button className={`menu-item ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => { setActiveTab('meeting'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Calendar /></span> Salles & Bureaux
                        {hasNewBooking && <span className="red-dot"></span>}
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', padding: '12px' }}>
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
                    {isLoading && <div className="loading-overlay">Chargement des données...</div>}

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
                            {activeTab === 'clients' && <ClientsTab clients={clients} searchQuery={searchQuery} onSelect={setSelectedClientId} onUpdate={refreshData} onCreateClick={() => setIsCreatingClient(true)} />}
                            {activeTab === 'billing' && <FailedPaymentsTab clients={clients} onSelect={setSelectedClientId} onUpdate={refreshData} />}
                            {activeTab === 'meeting' && <MeetingTab bookings={bookings} clients={clients} onUpdate={refreshData} />}
                        </>
                    )}
                </div>

                {isCreatingClient && (
                    <CreateClientModal
                        onClose={() => setIsCreatingClient(false)}
                        onCreated={() => {
                            refreshData();
                            setIsCreatingClient(false);
                        }}
                    />
                )}
            </main>
        </div>
    );
}
