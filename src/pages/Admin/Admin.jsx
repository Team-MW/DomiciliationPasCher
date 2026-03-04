import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../../services/adminDataService';
import './Admin.css';

// Components
import { Icons } from './components/Icons';
import OverviewTab from './components/OverviewTab';
import DemandesTab from './components/DemandesTab';
import ClientsTab from './components/ClientsTab';
import MailTab from './components/MailTab';
import MeetingTab from './components/MeetingTab';
import DossierClient from './components/DossierClient';
import CreateClientModal from './components/CreateClientModal';

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
    const [isCreatingClient, setIsCreatingClient] = useState(false);

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
                    <button className={`menu-item ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => { setActiveTab('meeting'); setSelectedClientId(null); }}>
                        <span className="menu-icon"><Icons.Calendar /></span> Salles & Bureaux
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
                            {activeTab === 'clients' && <ClientsTab clients={clients} searchQuery={searchQuery} onSelect={setSelectedClientId} onUpdate={refreshData} onCreateClick={() => setIsCreatingClient(true)} />}
                            {activeTab === 'mail' && <MailTab mail={mail} clients={clients} onUpdate={refreshData} />}
                            {activeTab === 'meeting' && <MeetingTab bookings={adminDataService.getBookings()} clients={clients} onUpdate={refreshData} />}
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
