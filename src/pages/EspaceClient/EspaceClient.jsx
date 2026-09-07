import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../../services/adminDataService';
import { parseExtraInfo, resolvePersonalAddress } from '../../utils/contractLegalFields';
import { useTranslation } from '../../i18n/LanguageContext';
import './EspaceClient.css';

// Components
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Mail from './components/Mail';
import Adresse from './components/Adresse';
import Docs from './components/Docs';
import Abonnement from './components/Abonnement';
import Factures from './components/Factures';
import MoyenPaiement from './components/MoyenPaiement';
import ComptePro from './components/ComptePro';
import Meeting from './components/Meeting';
import Messages from './components/Messages';
import Aide from './components/Aide';
import Settings from './components/Settings';

const CLIENT_TABS = new Set([
    'overview', 'mail', 'adresse', 'docs', 'abonnement', 'factures',
    'paiement', 'compte-pro', 'meeting', 'messages', 'aide', 'settings',
]);

function tabFromSearch() {
    if (typeof window === 'undefined') return 'overview';
    const tab = new URLSearchParams(window.location.search).get('tab');
    return CLIENT_TABS.has(tab) ? tab : 'overview';
}

export default function EspaceClient() {
    const { t } = useTranslation();
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState(tabFromSearch);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [clientData, setClientData] = useState(null);
    const [mail, setMail] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadMsgsCount, setUnreadMsgsCount] = useState(0);
    const [hasNewDocs, setHasNewDocs] = useState(false);
    const [hasNewFactures, setHasNewFactures] = useState(false);
    const [pendingDemande, setPendingDemande] = useState(null);

    useEffect(() => {
        const body = document.querySelector('.ec-main');
        if (body) body.scrollTop = 0;
    }, [activeTab]);

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            const params = new URLSearchParams(window.location.search);
            const isPreview = params.get('preview') === 'true';

            if (isPreview) {
                const previewClient = {
                    id: '1',
                    company: "DEMO PREVIEW INC.",
                    plan: "Scan+",
                    status: "actif",
                    since: "2024-12-01"
                };
                const [m, d, b] = await Promise.all([
                    adminDataService.getMail(),
                    adminDataService.getDocuments('1'),
                    adminDataService.getClientBookings('1')
                ]);
                if (isMounted) {
                    setClientData(previewClient);
                    setMail(m.slice(0, 5));
                    setDocuments(d);
                    setBookings(b);
                    setIsLoading(false);
                }
                return;
            }

            if (isLoaded && user) {
                await adminDataService.init();
                const email = user.primaryEmailAddress?.emailAddress;
                const cleanEmail = email?.trim().toLowerCase();
                const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'mwcrea.agency@gmail.com').split(',');

                const savedSessionId = localStorage.getItem('last_successful_session');
                let data = await adminDataService.getClientByEmail(cleanEmail);

                // Fallback : Recherche par Session ID pour les clients déjà approuvés
                if (!data && savedSessionId) {
                    data = await adminDataService.getClientBySessionId(savedSessionId);
                    if (data) localStorage.removeItem('last_successful_session');
                }

                // NOUVEAU : Si toujours pas de client, on regarde dans les demandes
                if (!data) {
                    const demandes = await adminDataService.getDemandes();
                    let maDemande = demandes.find(d => d.email?.trim().toLowerCase() === cleanEmail);

                    // Fallback par Session ID pour les demandes
                    if (!maDemande && savedSessionId) {
                        maDemande = await adminDataService.getDemandeBySessionId(savedSessionId);
                        if (maDemande) localStorage.removeItem('last_successful_session');
                    }

                    if (maDemande) {
                        const extra = parseExtraInfo(maDemande.extra_info);
                        data = {
                            id: maDemande.id,
                            name: extra.nom ? `${extra.prenom} ${extra.nom}` : maDemande.clientName,
                            email: maDemande.email,
                            company: maDemande.company,
                            plan: maDemande.plan,
                            phone: extra.telephone || '',
                            address: resolvePersonalAddress({}, extra),
                            extra_info: maDemande.extra_info,
                            status: 'en_attente_validation',
                            since: maDemande.date,
                            isTemporary: true
                        };
                    }
                }

                if (data && data.extra_info) {
                    const extra = parseExtraInfo(data.extra_info);
                    data.phone = data.phone || extra.telephone || '';
                    data.address = data.address || resolvePersonalAddress(data, extra);
                    data.company = data.company || extra.nomSociete || '';
                    if (extra.nom && extra.prenom && !data.name) {
                        data.name = `${extra.prenom} ${extra.nom}`;
                    }
                }

                // Si c'est un admin ET qu'il n'a pas de compte client/demande, on le redirige vers l'admin
                if (ADMIN_EMAILS.map(e => e.trim().toLowerCase()).includes(cleanEmail) && !data) {
                    navigate('/admin');
                    return;
                }

                if (!isMounted) return;

                if (data) {
                    // LIEN DÉFINITIF : Lier le Clerk ID au compte trouvé
                    if (!data.clerkId || data.clerkId === '') {
                        try {
                            if (data.isTemporary) {
                                await adminDataService.updateDemandeClerkId(data.id, user.id);
                            } else {
                                await adminDataService.updateClientClerkId(data.id, user.id);
                            }
                            data.clerkId = user.id; // On met à jour localement pour éviter de reboucler
                        } catch (err) { console.error("Lien Clerk ID échoué:", err); }
                    }
                    setClientData(data);

                    // On ne charge les dossiers/mails que si c'est un vrai client (pas une demande temporaire)
                    if (!data.isTemporary) {
                        const [m, d, b, msgs] = await Promise.all([
                            adminDataService.getClientMail(data.id),
                            adminDataService.getDocuments(data.id),
                            adminDataService.getClientBookings(data.id),
                            adminDataService.getMessages(data.id)
                        ]);
                        if (isMounted) {
                            setMail(m);
                            setDocuments(d);
                            setBookings(b);
                            const unread = msgs.filter(x => x.sender === 'admin' && x.status === 'sent').length;
                            setUnreadMsgsCount(unread);
                        }
                    } else {
                        // Pour une demande temporaire, on met des listes vides
                        if (isMounted) {
                            setMail([]);
                            setDocuments([]);
                            setBookings([]);
                            setUnreadMsgsCount(0);
                        }
                    }
                } else {
                    if (isMounted) setClientData(null);
                }
                if (isMounted) setIsLoading(false);
            }
        }

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [isLoaded, user]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    if (isLoading) return <div className="ec-loading">{t('espaceClient.shell.loading')}</div>;

    if (!isLoading && !clientData) {
        return (
            <div className="ec-pending-screen">
                <div className="ec-pending-card" style={{ maxWidth: '500px' }}>
                    <div className="pending-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {pendingDemande ? '⏳' : '🔍'}
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
                        {pendingDemande ? t('espaceClient.shell.pendingTitle') : t('espaceClient.shell.notFoundTitle')}
                    </h2>
                    <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
                        {pendingDemande
                            ? t('espaceClient.shell.pendingBody')
                            : t('espaceClient.shell.notFoundBody').replace('{email}', user?.primaryEmailAddress?.emailAddress)
                        }
                    </p>

                    {!pendingDemande && (
                        <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#9A3412', textAlign: 'left' }}>
                            <strong>{t('espaceClient.shell.note')}</strong>{t('espaceClient.shell.noteBody')}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button className="btn-primary" onClick={() => window.location.reload()} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
                            {t('espaceClient.shell.refresh')}
                        </button>
                        <button className="btn-outline" onClick={handleLogout} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
                            {t('espaceClient.shell.logout')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoading && clientData?.status === 'résilié') {
        return (
            <div className="ec-pending-screen">
                <div className="ec-pending-card" style={{ maxWidth: '500px', borderTop: '4px solid #0F172A' }}>
                    <div className="pending-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>
                        ⛔
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
                        {t('espaceClient.shell.terminatedTitle')}
                    </h2>
                    <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
                        {t('espaceClient.shell.terminatedBody').replace('{company}', clientData.company || '')}
                    </p>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#334155', textAlign: 'left' }}>
                        {t('espaceClient.shell.terminatedHint')}
                    </div>
                    <button className="btn-outline" onClick={handleLogout} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
                        {t('espaceClient.shell.logout')}
                    </button>
                </div>
            </div>
        );
    }

    if (!isLoading && (clientData?.status === 'impayé' || clientData?.status === 'echec_paiement')) {
        return (
            <div className="ec-pending-screen">
                <div className="ec-pending-card" style={{ maxWidth: '500px', borderTop: '4px solid #EF4444' }}>
                    <div className="pending-icon" style={{ fontSize: '48px', marginBottom: '16px', color: '#EF4444' }}>
                        ⚠️
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
                        {t('espaceClient.shell.suspendedTitle')}
                    </h2>
                    <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
                        {t('espaceClient.shell.suspendedBody').replace('{company}', clientData.company || '')}
                    </p>

                    <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#991B1B', textAlign: 'left' }}>
                        <strong>{t('espaceClient.shell.howTo')}</strong><br />
                        {t('espaceClient.shell.howToBody')}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button className="btn-primary" onClick={() => window.location.reload()} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700', background: '#EF4444' }}>
                            {t('espaceClient.shell.checkPayment')}
                        </button>
                        <button className="btn-outline" onClick={handleLogout} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
                            {t('espaceClient.shell.logout')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ec-layout">
            <div className={`ec-mobile-backdrop ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className={`ec-sidebar-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                        setActiveTab(tab);
                        setIsMobileMenuOpen(false);
                        if (tab === 'messages') setUnreadMsgsCount(0);
                        if (tab === 'docs' && clientData) {
                            setHasNewDocs(false);
                            localStorage.setItem(`client_seen_docs_${clientData.id}`, documents.length.toString());
                        }
                        if (tab === 'factures' && clientData) {
                            setHasNewFactures(false);
                        }
                    }}
                    mailCount={mail.filter(m => m.status === 'non lu').length}
                    unreadMsgsCount={unreadMsgsCount}
                    hasNewDocs={hasNewDocs}
                    hasNewFactures={hasNewFactures}
                    user={user}
                    clientData={clientData}
                    onLogout={handleLogout}
                />
            </div>

            <main className="ec-main">
                <header className="ec-header">
                    <div className="ec-header-left">
                        <button className="ec-mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <div className="ec-header-titles">
                            <h1 className="ec-welcome-title">{t('espaceClient.shell.welcome').replace('{name}', user?.firstName || t('espaceClient.shell.owner'))}</h1>
                            <p className="ec-welcome-sub">{t('espaceClient.shell.welcomeSub')} <strong>{clientData?.company}</strong></p>
                        </div>
                    </div>
                    <div className="ec-header-right">
                        {clientData?.status === 'en_attente_validation' ? (
                            <div className="ec-status-tag" style={{ background: '#FFF7ED', color: '#9A3412', border: '1px solid #FFEDD5' }}>
                                <span className="status-dot-orange" style={{ background: '#F97316' }}></span>
                                {t('espaceClient.shell.validating')}
                            </div>
                        ) : (
                            <div className="ec-status-tag">
                                <span className="status-dot-green"></span>
                                {t('espaceClient.shell.planActive').replace('{plan}', clientData?.plan)}
                            </div>
                        )}
                    </div>
                </header>

                <div className="ec-view-container">
                    {activeTab === 'overview' && (
                        <Overview 
                            mail={mail} 
                            documents={documents} 
                            bookings={bookings} 
                            clientData={clientData} 
                            setActiveTab={setActiveTab} 
                        />
                    )}
                    {activeTab === 'mail' && (
                        <Mail
                            mail={mail}
                            clientData={clientData}
                            setActiveTab={setActiveTab}
                            onMailRead={async (mailId) => {
                                // Mettre à jour l'état local immédiatement
                                setMail(prev => prev.map(m => m.id === mailId ? { ...m, status: 'lu' } : m));
                                // Appel API pour mettre à jour la BDD
                                try {
                                    await adminDataService.markMailAsRead(mailId);
                                } catch (e) {
                                    console.error("Erreur lors du marquage comme lu", e);
                                }
                            }}
                        />
                    )}
                    {activeTab === 'adresse' && (
                        <Adresse 
                            clientData={clientData} 
                            setActiveTab={setActiveTab} 
                        />
                    )}
                    {activeTab === 'docs' && (
                        <Docs
                            documents={documents}
                            setDocuments={setDocuments}
                            clientData={clientData}
                            setClientData={setClientData}
                        />
                    )}
                    {activeTab === 'abonnement' && (
                        <Abonnement 
                            clientData={clientData} 
                            setActiveTab={setActiveTab}
                            setClientData={setClientData}
                        />
                    )}
                    {activeTab === 'factures' && (
                        <Factures 
                            clientData={clientData} 
                            setClientData={setClientData} 
                        />
                    )}
                    {activeTab === 'paiement' && (
                        <MoyenPaiement 
                            clientData={clientData} 
                            setClientData={setClientData} 
                        />
                    )}
                    {activeTab === 'compte-pro' && (
                        <ComptePro 
                            clientData={clientData} 
                        />
                    )}
                    {activeTab === 'meeting' && (
                        <Meeting
                            clientData={clientData}
                            setActiveTab={setActiveTab}
                        />
                    )}
                    {activeTab === 'messages' && (
                        <Messages 
                            clientData={clientData} 
                        />
                    )}
                    {activeTab === 'aide' && (
                        <Aide 
                            clientData={clientData} 
                            setActiveTab={setActiveTab} 
                        />
                    )}
                    {activeTab === 'settings' && (
                        <Settings 
                            clientData={clientData} 
                            setClientData={setClientData} 
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
