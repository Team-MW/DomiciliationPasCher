import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../../services/adminDataService';
import { parseExtraInfo, resolvePersonalAddress } from '../../utils/contractLegalFields';
import { resolveClientStatusFromStripe } from '../../utils/stripeClientStatus';
import { useTranslation } from '../../i18n/LanguageContext';
import { setPreviewMode } from '../../utils/apiAuth';
import { PRICING_GRID, clientPlanPricing } from '../../../shared/plans.js';
import { appAlert } from '../../components/AppDialog/dialogApi';
import { isAdminEmail } from '../../utils/adminEmail';
import './EspaceClient.css';

// Components
import Sidebar from './components/Sidebar';
import AccountStateScreen from './components/AccountStateScreen';
import EmailVerifyPanel from './components/EmailVerifyPanel';
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

// Libellé du fil d'Ariane pour chaque onglet (clés de src/i18n/espaceClient/sidebar.js).
const SECTION_LABEL_KEY = {
    overview: 'dashboard', mail: 'mail', adresse: 'address', docs: 'docs', abonnement: 'subscription',
    factures: 'invoices', paiement: 'payment', 'compte-pro': 'proAccount', messages: 'messages',
    meeting: 'meeting', aide: 'help', settings: 'settings',
};

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
    const [checkingPayment, setCheckingPayment] = useState(false);
    // Une des listes (courrier, documents, réservations, messages) n'a pas pu être chargée : on le dit, sans masquer le dossier.
    const [partialLoad, setPartialLoad] = useState(false);
    // Échec du chargement du compte (session, email non vérifié, serveur) : à ne PAS confondre avec « dossier introuvable ».
    const [loadError, setLoadError] = useState(null);
    const [openingPortal, setOpeningPortal] = useState(false);

    useEffect(() => {
        const body = document.querySelector('.ec-main');
        if (body) body.scrollTop = 0;
    }, [activeTab]);

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            const params = new URLSearchParams(window.location.search);
            const isPreview = params.get('preview') === 'true';

            // Verrou d'écriture : actif uniquement en aperçu (aucune action ne part vers le serveur).
            setPreviewMode(isPreview);

            if (isPreview) {
                // Aperçu de démonstration : données fictives uniquement (l'ancien mode lisait la
                // fiche « 1 » sans authentification). Toute écriture est bloquée par setPreviewMode.
                const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
                const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
                const previewClient = {
                    id: 'preview',
                    company: 'DÉMO CONSEIL SAS',
                    name: 'Camille Martin',
                    plan: 'Confort',
                    status: 'actif',
                    since,
                    extra_info: JSON.stringify({ prenom: 'Camille', nom: 'Martin', grille_tarifaire: PRICING_GRID, frequence: 'mensuel', offre: 'scan' }),
                    isPreview: true,
                };
                const demoMail = [
                    { id: 'demo-1', clientId: 'preview', type: 'Lettre simple', from: 'URSSAF', date: daysAgo(1), status: 'non lu', preview: '#apercu' },
                    { id: 'demo-2', clientId: 'preview', type: 'Lettre recommandée', from: 'Centre des impôts', date: daysAgo(6), status: 'lu', preview: '#apercu' },
                    { id: 'demo-3', clientId: 'preview', type: 'Colis', from: 'Amazon', date: daysAgo(9), status: 'non lu', preview: null },
                ];
                // Aperçu d'un état particulier du compte : ?preview=true&etat=introuvable|validation|impaye|resilie
                const previewState = params.get('etat');
                if (previewState === 'impaye') previewClient.status = 'impayé';
                if (previewState === 'resilie') previewClient.status = 'résilié';
                if (isMounted) {
                    if (previewState === 'introuvable' || previewState === 'validation') {
                        setClientData(null);
                        setPendingDemande(previewState === 'validation' ? { id: 'preview-demande' } : null);
                        setIsLoading(false);
                        return;
                    }
                    setClientData(previewClient);
                    setMail(demoMail);
                    setDocuments([]);
                    setBookings([]);
                    setIsLoading(false);
                }
                return;
            }

            if (isLoaded && user) {
              try {
                const email = user.primaryEmailAddress?.emailAddress;
                const cleanEmail = email?.trim().toLowerCase();

                const savedSessionId = localStorage.getItem('last_successful_session');
                // Recherche faite côté serveur à partir de l'email vérifié du compte Clerk
                // (repli par session Stripe) ; le serveur lie aussi le Clerk ID à la fiche.
                const account = await adminDataService.getMyAccount({ sessionId: savedSessionId || null });
                let data = null;

                if (account?.kind === 'client') {
                    data = { ...account.record };
                    if (savedSessionId) localStorage.removeItem('last_successful_session');
                } else if (account?.kind === 'demande') {
                    const maDemande = account.record;
                    if (savedSessionId) localStorage.removeItem('last_successful_session');
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
                        city: maDemande.city || extra.ville || '',
                        clerkId: maDemande.clerkId,
                        isTemporary: true
                    };
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
                if (isAdminEmail(cleanEmail) && !data) {
                    navigate('/admin');
                    return;
                }

                if (!isMounted) return;

                if (data) {
                    setClientData(data);

                    // allSettled : une liste en panne ne doit plus faire croire au client que son dossier n'existe pas.
                    const settled = await Promise.allSettled([
                        data.isTemporary ? Promise.resolve([]) : adminDataService.getClientMail(data.id),
                        adminDataService.getDocuments(data.id),
                        adminDataService.getClientBookings(data.id),
                        adminDataService.getMessages(data.id)
                    ]);
                    const listOf = (r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value.filter(Boolean) : []);
                    const [m, d, b, msgs] = settled.map(listOf);
                    if (isMounted) {
                        setMail(m);
                        setDocuments(d);
                        setBookings(b);
                        setPartialLoad(settled.some((r) => r.status === 'rejected'));
                        const unread = msgs.filter(x => x.sender === 'admin' && x.status === 'sent').length;
                        setUnreadMsgsCount(unread);
                    }
                } else {
                    if (isMounted) setClientData(null);
                }
              } catch (err) {
                // Sans ce garde, une erreur réseau laissait l'écran « chargement » indéfiniment.
                console.error('Chargement de l’espace client impossible:', err);
                if (isMounted) {
                    setClientData(null);
                    setLoadError(String(err?.message || '').includes('EMAIL_NOT_VERIFIED') ? 'email' : (err?.status === 401 || err?.status === 403 ? 'auth' : 'server'));
                }
              } finally {
                if (isMounted) setIsLoading(false);
              }
            }
        }

        fetchData();

        return () => {
            isMounted = false;
            // Le verrou d'écriture de l'aperçu ne doit pas survivre à la page (sinon les POST sont refusés ailleurs sur le site).
            setPreviewMode(false);
        };
    }, [isLoaded, user?.id]);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (err) {
            console.error('Déconnexion :', err);
        } finally {
            navigate('/');
        }
    };

    const stripeCustomerIdFromClient = (client) => {
        const extra = parseExtraInfo(client?.extra_info);
        return extra.stripe_customer_id || extra.stripeCustomerId || client?.stripeCustomerId || null;
    };

    const handleCheckPayment = async () => {
        if (!clientData?.id || checkingPayment) return;
        setCheckingPayment(true);
        try {
            const stripeId = stripeCustomerIdFromClient(clientData);
            const syncData = await adminDataService.syncStripePayments(clientData.email, stripeId, clientData.since);
            if (!stripeId && syncData.foundCustomerId) {
                try {
                    const merged = await adminDataService.updateClientExtraInfo(clientData.id, {
                        stripe_customer_id: syncData.foundCustomerId,
                    });
                    setClientData((prev) => ({ ...prev, extra_info: JSON.stringify(merged) }));
                } catch (e) {
                    console.error(e);
                }
            }
            const newStatus = resolveClientStatusFromStripe(clientData.status, syncData.subscriptionStatus);
            if (newStatus !== clientData.status) {
                await adminDataService.updateClientStatus(clientData.id, newStatus);
                setClientData((prev) => ({ ...prev, status: newStatus }));
            }
        } catch (e) {
            console.error(e);
            await appAlert(t('espaceClient.shell.paymentCheckError'));
        } finally {
            setCheckingPayment(false);
        }
    };

    const handleUpdateCard = async () => {
        if (!clientData || openingPortal) return;
        setOpeningPortal(true);
        try {
            let stripeId = stripeCustomerIdFromClient(clientData);
            if (!stripeId) {
                const res = await fetch('/api/ensure-stripe-customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: clientData.email,
                        name: clientData.name || clientData.company,
                        company: clientData.company,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.customerId) {
                    stripeId = data.customerId;
                    const merged = await adminDataService.updateClientExtraInfo(clientData.id, {
                        stripe_customer_id: stripeId,
                    });
                    setClientData((prev) => ({ ...prev, extra_info: JSON.stringify(merged) }));
                }
            }
            if (!stripeId) {
                await appAlert(t('espaceClient.payment.portalError'));
                return;
            }
            const url = await adminDataService.createStripePortalSession(stripeId);
            if (url) window.location.href = url;
            else await appAlert(t('espaceClient.payment.portalOpenError'));
        } catch (e) {
            console.error(e);
            await appAlert(t('espaceClient.payment.portalError'));
        } finally {
            setOpeningPortal(false);
        }
    };

    // Prénom pour l'accueil : compte de connexion, sinon dossier ; à défaut, accueil sans nom.
    const welcomeName = (user?.firstName || parseExtraInfo(clientData?.extra_info).prenom || '').trim();

    if (isLoading) return <div className="ec-loading">{t('espaceClient.shell.loading')}</div>;

    // Textes communs aux écrans d'état (panneau marque + aide).
    const stateLabels = {
        brandAria: t('espaceClient.shell.stateBrandAria'),
        brandKicker: t('espaceClient.shell.stateBrandKicker'),
        brandTitle: t('espaceClient.shell.stateBrandTitle'),
        brandPoints: Array.isArray(t('espaceClient.shell.stateBrandPoints')) ? t('espaceClient.shell.stateBrandPoints') : [],
        agrement: t('espaceClient.shell.stateAgrement'),
        helpTitle: t('espaceClient.shell.stateHelpTitle'),
        helpHours: t('espaceClient.shell.stateHelpHours'),
    };
    const accountEmail = user?.primaryEmailAddress?.emailAddress || '';

    if (!isLoading && !clientData && loadError) {
        return (
            <AccountStateScreen
                tone="warning"
                icon="clock"
                kicker={t('espaceClient.shell.loadErrorKicker')}
                title={t('espaceClient.shell.loadErrorTitle')}
                body={<p>{t(`espaceClient.shell.loadError_${loadError}`)}</p>}
                accountEmail={accountEmail}
                accountLabel={t('espaceClient.shell.connectedAs')}
                actions={(
                    <>
                        {loadError === 'email' && <EmailVerifyPanel t={t} onVerified={() => window.location.reload()} />}
                        <button type="button" className="ecs-btn ecs-btn-primary" onClick={() => window.location.reload()}>{t('espaceClient.shell.refresh')}</button>
                        <button type="button" className="ecs-btn ecs-btn-ghost" onClick={handleLogout}>{t('espaceClient.shell.logout')}</button>
                    </>
                )}
                labels={stateLabels}
            />
        );
    }

    if (!isLoading && !clientData && pendingDemande) {
        return (
            <AccountStateScreen
                tone="info"
                icon="clock"
                kicker={t('espaceClient.shell.pendingKicker')}
                title={t('espaceClient.shell.pendingTitle')}
                body={<p>{t('espaceClient.shell.pendingBody')}</p>}
                accountEmail={accountEmail}
                accountLabel={t('espaceClient.shell.connectedAs')}
                timeline={{
                    title: t('espaceClient.shell.timelineTitle'),
                    steps: [
                        { label: t('espaceClient.shell.stepPaid'), state: 'done' },
                        { label: t('espaceClient.shell.stepReview'), state: 'current' },
                        { label: t('espaceClient.shell.stepAccess'), state: 'todo' },
                    ],
                }}
                actions={(
                    <>
                        <button type="button" className="ecs-btn ecs-btn-primary" onClick={() => window.location.reload()}>{t('espaceClient.shell.refresh')}</button>
                        <button type="button" className="ecs-btn ecs-btn-ghost" onClick={handleLogout}>{t('espaceClient.shell.logout')}</button>
                    </>
                )}
                labels={stateLabels}
            />
        );
    }

    if (!isLoading && !clientData) {
        return (
            <AccountStateScreen
                tone="info"
                icon="search"
                kicker={t('espaceClient.shell.notFoundKicker')}
                title={t('espaceClient.shell.notFoundTitle')}
                body={<p>{t('espaceClient.shell.notFoundLead')}</p>}
                accountEmail={accountEmail}
                accountLabel={t('espaceClient.shell.connectedAs')}
                reasons={{
                    title: t('espaceClient.shell.reasonsTitle'),
                    items: [
                        { text: t('espaceClient.shell.reasonEmail'), action: <button type="button" onClick={handleLogout}>{t('espaceClient.shell.reasonEmailAction')}</button> },
                        { text: t('espaceClient.shell.reasonJustPaid'), action: <button type="button" onClick={() => window.location.reload()}>{t('espaceClient.shell.reasonJustPaidAction')}</button> },
                        { text: t('espaceClient.shell.reasonNew'), action: <a href="/tarifs">{t('espaceClient.shell.reasonNewAction')}</a> },
                    ],
                }}
                actions={(
                    <>
                        <button type="button" className="ecs-btn ecs-btn-primary" onClick={() => window.location.reload()}>{t('espaceClient.shell.refresh')}</button>
                        <button type="button" className="ecs-btn ecs-btn-ghost" onClick={handleLogout}>{t('espaceClient.shell.logout')}</button>
                    </>
                )}
                labels={stateLabels}
            />
        );
    }

    if (!isLoading && clientData?.status === 'résilié') {
        return (
            <AccountStateScreen
                tone="neutral"
                icon="closed"
                kicker={t('espaceClient.shell.terminatedKicker')}
                title={t('espaceClient.shell.terminatedTitle')}
                body={<p>{t('espaceClient.shell.terminatedBody').replace('{company}', clientData.company || '')}</p>}
                notice={t('espaceClient.shell.terminatedHint')}
                actions={<button type="button" className="ecs-btn ecs-btn-ghost" onClick={handleLogout}>{t('espaceClient.shell.logout')}</button>}
                labels={stateLabels}
            />
        );
    }

    if (!isLoading && (clientData?.status === 'impayé' || clientData?.status === 'echec_paiement')) {
        return (
            <AccountStateScreen
                tone="danger"
                icon="card"
                kicker={t('espaceClient.shell.suspendedKicker')}
                title={t('espaceClient.shell.suspendedTitle')}
                body={<p>{t('espaceClient.shell.suspendedBody').replace('{company}', clientData.company || '')}</p>}
                notice={<><strong>{t('espaceClient.shell.howTo')}</strong>{t('espaceClient.shell.howToBody')}</>}
                actions={(
                    <>
                        <button type="button" className="ecs-btn ecs-btn-primary" onClick={handleUpdateCard} disabled={openingPortal}>
                            {openingPortal ? t('espaceClient.shell.openingPortal') : t('espaceClient.shell.updateCard')}
                        </button>
                        <button type="button" className="ecs-btn ecs-btn-ghost" onClick={handleCheckPayment} disabled={checkingPayment}>
                            {checkingPayment ? t('espaceClient.shell.checkingPayment') : t('espaceClient.shell.checkPayment')}
                        </button>
                        <button type="button" className="ecs-btn ecs-btn-ghost" onClick={handleLogout}>{t('espaceClient.shell.logout')}</button>
                    </>
                )}
                labels={stateLabels}
            />
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
                {partialLoad && (
                    <div className="ec-partial-load" role="alert">
                        <span>{t('espaceClient.shell.partialLoad')}</span>
                        <button type="button" onClick={() => window.location.reload()}>{t('espaceClient.shell.partialLoadRetry')}</button>
                    </div>
                )}
                <header className="ec-header">
                    <div className="ec-header-left">
                        <button className="ec-mobile-menu-btn" aria-label={t('espaceClient.shell.openMenu')} onClick={() => setIsMobileMenuOpen(true)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <nav className="ec-crumbs" aria-label="Fil d'Ariane">
                            <span className="ec-crumbs-root">{t('espaceClient.sidebar.spaceLabel')}</span>
                            <span className="ec-crumbs-sep" aria-hidden="true">›</span>
                            <span className="ec-crumbs-current">{t(`espaceClient.sidebar.${SECTION_LABEL_KEY[activeTab] || 'dashboard'}`)}</span>
                            {clientData?.company && <span className="ec-crumbs-company">{clientData.company}</span>}
                        </nav>
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
                                {t('espaceClient.shell.planActive').replace('{plan}', clientPlanPricing(clientData?.plan, parseExtraInfo(clientData?.extra_info)).name)}
                            </div>
                        )}
                    </div>
                </header>

                <div className="ec-view-container">
                    {activeTab === 'overview' && (
                        <Overview
                            welcomeName={welcomeName}
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
                                if (clientData?.isPreview) return; // aperçu : rien n'est enregistré
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
