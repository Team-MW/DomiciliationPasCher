import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUser, useClerk, SignIn, UserButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../../services/adminDataService';
import { appAlert, appConfirm } from '../../components/AppDialog/dialogApi';
import './Admin.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

// Components
import { Icons } from './components/Icons';
import OverviewTab from './components/OverviewTab';
import StatsTab from './components/stats/StatsTab';
import DemandesTab from './components/DemandesTab';
import ClientsTab from './components/ClientsTab';
import FailedPaymentsTab from './components/FailedPaymentsTab';
import MeetingTab from './components/MeetingTab';
import MailTab from './components/MailTab';
import DossierClient from './components/DossierClient';
import CreateClientModal from './components/CreateClientModal';
import { DemandeDetailsModal } from './components/DemandesTab';

import { isAdminEmail } from '../../utils/adminEmail';
import EmailVerifyPanel from '../EspaceClient/components/EmailVerifyPanel';
import { useTranslation } from '../../i18n/LanguageContext';
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
    // Fiche complète du client ouvert : la liste ne contient pas les gros fichiers (Kbis) pour rester légère.
    const [fullClient, setFullClient] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadErrors, setLoadErrors] = useState([]);
    const [hasNewDemande, setHasNewDemande] = useState(false);
    const [hasNewBooking, setHasNewBooking] = useState(false);
    const [hasNewReexp, setHasNewReexp] = useState(false);
    const [loadingId, setLoadingId] = useState(null);

    const showConfirm = useCallback((message, options = {}) => appConfirm(message, options), []);
    const showAlert = useCallback((message, options = {}) => appAlert(message, options), []);

    const { t } = useTranslation();
    const [emailUnverified, setEmailUnverified] = useState(false);
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const isAdmin = isAdminEmail(userEmail);

    // L'onglet actif est lu au moment du calcul des pastilles ; le mettre en dépendance relançait TOUS les chargements
    // (clients, courriers, stats Stripe…) à chaque clic sur un onglet.
    const activeTabRef = useRef(activeTab);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        // Chaque source se charge indépendamment : si Stripe (statistiques) ou une table est
        // indisponible, le reste du tableau de bord s'affiche quand même, avec un bandeau d'alerte.
        const sources = [
            ['clients', () => adminDataService.getClients(), (v) => setClients(Array.isArray(v) ? v : [])],
            ['courriers', () => adminDataService.getMail(), (v) => setMail(Array.isArray(v) ? v : [])],
            ['demandes', () => adminDataService.getDemandes(), (v) => setDemandes(Array.isArray(v) ? v : [])],
            ['rendez-vous', () => adminDataService.getBookings(), (v) => setBookings(Array.isArray(v) ? v : [])],
            ['réexpéditions', () => adminDataService.getReexpeditions(), (v) => setReexpeditions(Array.isArray(v) ? v : [])],
            ['statistiques', () => adminDataService.getGlobalStats(), (v) => setStats(v)],
        ];
        try {
            const results = await Promise.allSettled(sources.map(([, load]) => load()));
            const failed = [];
            const value = {};
            results.forEach((res, i) => {
                const [name, , apply] = sources[i];
                if (res.status === 'fulfilled') {
                    apply(res.value);
                    value[name] = res.value;
                } else {
                    failed.push(name);
                    console.error(`Chargement admin (${name}) :`, res.reason);
                }
            });
            setLoadErrors(failed);
            // Compte admin dont l'email n'est pas vérifié : le serveur refuse tout ; on propose la vérification par code.
            setEmailUnverified(results.some((res) => res.status === 'rejected' && String(res.reason?.message || '').includes('EMAIL_NOT_VERIFIED')));

            // Pastilles « nouveau » : localStorage peut être indisponible (navigation privée).
            const seen = (key) => {
                try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; }
            };
            const d = value.demandes || [];
            const b = value['rendez-vous'] || [];
            const r = value['réexpéditions'] || [];
            const current = activeTabRef.current;
            if (d.length > seen('admin_seen_demandes') && current !== 'demandes') setHasNewDemande(true);
            if (b.length > seen('admin_seen_bookings') && current !== 'meeting') setHasNewBooking(true);
            if (r.length > seen('admin_seen_reexpeditions') && current !== 'courrier') setHasNewReexp(true);
        } finally {
            setIsLoading(false);
        }
    }, []);


    useEffect(() => {
        const remember = (key, value) => {
            try { localStorage.setItem(key, String(value)); } catch { /* stockage indisponible : pastille seulement */ }
        };
        if (activeTab === 'demandes') {
            setHasNewDemande(false);
            remember('admin_seen_demandes', demandes.length);
        }
        if (activeTab === 'meeting') {
            setHasNewBooking(false);
            remember('admin_seen_bookings', bookings.length);
        }
        if (activeTab === 'courrier') {
            setHasNewReexp(false);
            remember('admin_seen_reexpeditions', reexpeditions.length);
        }
    }, [activeTab, demandes.length, bookings.length, reexpeditions.length]);

    useEffect(() => {
        const body = document.querySelector('.admin-body');
        if (body) body.scrollTop = 0;
    }, [activeTab, selectedClientId]);

    const handleLogout = async () => {
        try {
            await signOut();
        } finally {
            navigate('/');
        }
    };

    useEffect(() => {
        if (isLoaded && isAdmin) {
            // Le schéma est préparé côté serveur (api/data.js) : il suffit de charger les données.
            refreshData();
        }
    }, [isLoaded, isAdmin, refreshData]);

    useEffect(() => {
        if (!selectedClientId) { setFullClient(null); return undefined; }
        let cancelled = false;
        Promise.resolve(adminDataService.getClientById(selectedClientId))
            .then((row) => { if (!cancelled && row) setFullClient(row); })
            .catch((err) => console.error('Fiche complète indisponible :', err));
        return () => { cancelled = true; };
    }, [selectedClientId, clients]);

    // Mémoïsé : un nouvel objet à chaque rendu relançait tout le chargement de la fiche (documents, paiements, synchro
    // Stripe) à chaque lettre tapée dans la recherche.
    const { selectedClient, detailsLoaded } = useMemo(() => {
        const listed = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;
        const loaded = Boolean(listed && fullClient?.id === listed.id);
        return { selectedClient: loaded ? { ...listed, ...fullClient } : listed, detailsLoaded: loaded };
    }, [clients, selectedClientId, fullClient]);

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

    if (isAdmin && emailUnverified) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: 20, textAlign: 'center' }}>
                <div style={{ maxWidth: 380, width: '100%', display: 'grid', gap: 12 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>Vérifiez votre adresse email</h1>
                    <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>{userEmail} n’est pas encore vérifiée. Saisissez le code que nous venons de vous envoyer par email.</p>
                    <EmailVerifyPanel t={t} onVerified={() => window.location.reload()} />
                    <button onClick={handleLogout} style={{ padding: 12, background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>Déconnexion</button>
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
                    <button className={`menu-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); setSelectedClientId(null); setIsMobileMenuOpen(false); }}>
                        <span className="menu-icon"><Icons.Stats /></span> Statistiques
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
                    <button className="admin-mobile-menu-btn" aria-label="Ouvrir le menu" onClick={() => setIsMobileMenuOpen(true)}>
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
                    {loadErrors.length > 0 && (
                        <div role="alert" style={{ margin: '0 0 16px', padding: '12px 16px', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <span>Certaines données n’ont pas pu être chargées : <strong>{loadErrors.join(', ')}</strong>. Les autres informations sont à jour.</span>
                            <button type="button" onClick={refreshData} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #F59E0B', background: '#FFFFFF', color: '#92400E', fontWeight: 600, cursor: 'pointer' }}>
                                Réessayer
                            </button>
                        </div>
                    )}
                    {/* Chargement : fine barre en haut, sans flouter ni bloquer la page (avant : voile flou sur tout l'écran,
                        rond centré sur la hauteur totale de la page, donc hors de vue, et qui ne tournait pas). */}
                    {isLoading && (
                        <div className="admin-loadbar" role="progressbar" aria-label="Chargement des données" aria-busy="true">
                            <span />
                        </div>
                    )}

                    {selectedClientId ? (
                        <DossierClient
                            client={selectedClient}
                            detailsLoaded={detailsLoaded}
                            onBack={() => setSelectedClientId(null)}
                            onUpdate={refreshData}
                            showConfirm={showConfirm}
                            showAlert={showAlert}
                        />
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab stats={stats} clients={clients} mail={mail} />}
                            {activeTab === 'stats' && <StatsTab />}
                            {activeTab === 'demandes' && <DemandesTab demandes={demandes} onUpdate={refreshData} onSelectDemande={setSelectedDemande} showConfirm={showConfirm} showAlert={showAlert} />}
                            {activeTab === 'clients' && <ClientsTab loading={isLoading} clients={clients} searchQuery={searchQuery} onSelect={setSelectedClientId} onUpdate={refreshData} onCreateClick={() => setIsCreatingClient(true)} />}
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
                                const created = await adminDataService.traiterDemande(id);
                                refreshData();
                                setSelectedDemande(null);
                                if (!created) {
                                    // 2e clic « Approuver » (autre onglet, autre admin) : rien ne s'est passé, ne pas dire le contraire.
                                    await showAlert('Cette demande a déjà été traitée (ou n’existe plus) : aucun email n’a été renvoyé.', { title: 'Déjà traitée', isWarning: true });
                                    return;
                                }
                                const emailFailed = created?.emailSent === false;
                                await showAlert(emailFailed
                                    ? "Accès créé, mais l'email de validation n'a pas pu être envoyé. Vérifiez la configuration SMTP."
                                    : "Accès créé avec succès ! L'email de validation a été envoyé.",
                                    emailFailed ? { title: 'Email non envoyé', isWarning: true } : { title: "Succès" });
                            } catch (err) {
                                console.error('Validation de la demande :', err);
                                await showAlert(`La demande n’a pas pu être validée : ${err?.message || 'erreur inconnue'}. Vérifiez la liste des clients avant de réessayer (pour éviter un doublon).`, { title: 'Échec de la validation', isDanger: true });
                            } finally {
                                setLoadingId(null);
                            }
                        }}
                        onReject={async (id) => {
                            const confirmed = await showConfirm("Refuser et supprimer définitivement cette demande ?\n\nLe compte de connexion créé par le prospect sera aussi supprimé. Cette action est irréversible.", { isDanger: true, title: "Supprimer la demande", confirmText: "Supprimer" });
                            if (confirmed) {
                                setLoadingId(id);
                                try {
                                    await adminDataService.deleteDemande(id);
                                    refreshData();
                                    setSelectedDemande(null);
                                } catch (err) {
                                    console.error('Suppression de la demande :', err);
                                    await showAlert('La demande n’a pas pu être supprimée. Réessayez.', { isDanger: true });
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
