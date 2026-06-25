import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { adminDataService } from '../../services/adminDataService';
import './EspaceClient.css';

// Components
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Mail from './components/Mail';
import Docs from './components/Docs';
import Meeting from './components/Meeting';
import Messages from './components/Messages';
import Factures from './components/Factures';
import Settings from './components/Settings';

export default function EspaceClient() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
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
                setClientData(previewClient);
                const [m, d, b] = await Promise.all([
                    adminDataService.getMail(),
                    adminDataService.getDocuments('1'),
                    adminDataService.getClientBookings('1')
                ]);
                setMail(m.slice(0, 5));
                setDocuments(d);
                setBookings(b);
                setIsLoading(false);
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
                }

                // NOUVEAU : Si toujours pas de client, on regarde dans les demandes
                if (!data) {
                    const demandes = await adminDataService.getDemandes();
                    let maDemande = demandes.find(d => d.email?.trim().toLowerCase() === cleanEmail);

                    // Fallback par Session ID pour les demandes
                    if (!maDemande && savedSessionId) {
                        maDemande = await adminDataService.getDemandeBySessionId(savedSessionId);
                    }

                    if (maDemande) {
                        let extra = {};
                        try {
                            extra = typeof maDemande.extra_info === 'string' ? JSON.parse(maDemande.extra_info) : (maDemande.extra_info || {});
                        } catch (e) { console.error("Error parsing extra_info", e); }

                        data = {
                            id: maDemande.id,
                            name: extra.nom ? `${extra.prenom} ${extra.nom}` : maDemande.clientName,
                            email: maDemande.email,
                            company: maDemande.company,
                            plan: maDemande.plan,
                            phone: extra.telephone || '',
                            address: extra.adressePerso || '',
                            status: 'en_attente_validation',
                            since: maDemande.date,
                            isTemporary: true
                        };
                    }
                }

                // Pour les clients existants, on complète aussi avec extra_info si des champs manquent
                if (data && data.extra_info) {
                    let extra = {};
                    try {
                        extra = typeof data.extra_info === 'string' ? JSON.parse(data.extra_info) : data.extra_info;
                    } catch (e) { }

                    data.phone = data.phone || extra.telephone || '';
                    data.address = data.address || extra.adressePerso || '';
                    if (extra.nom && !data.name) {
                        data.name = `${extra.prenom} ${extra.nom}`;
                    }
                }

                // Si c'est un admin ET qu'il n'a pas de compte client/demande, on le redirige vers l'admin
                if (ADMIN_EMAILS.map(e => e.trim().toLowerCase()).includes(cleanEmail) && !data) {
                    navigate('/admin');
                    return;
                }

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
                        setMail(m);
                        setDocuments(d);
                        setBookings(b);
                        const unread = msgs.filter(x => x.sender === 'admin' && x.status === 'sent').length;
                        setUnreadMsgsCount(unread);
                    } else {
                        // Pour une demande temporaire, on met des listes vides
                        setMail([]);
                        setDocuments([]);
                        setBookings([]);
                        setUnreadMsgsCount(0);
                    }
                } else {
                    setClientData(null);
                }
                setIsLoading(false);
            }
        }

        fetchData();
    }, [isLoaded, user]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    if (isLoading) return <div className="ec-loading">Initialisation de votre espace sécurisé...</div>;

    if (!isLoading && !clientData) {
        return (
            <div className="ec-pending-screen">
                <div className="ec-pending-card" style={{ maxWidth: '500px' }}>
                    <div className="pending-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {pendingDemande ? '⏳' : '🔍'}
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
                        {pendingDemande ? 'Dossier en attente de validation' : 'Aucun dossier trouvé'}
                    </h2>
                    <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
                        {pendingDemande
                            ? "Votre paiement a été validé ! Votre dossier est maintenant en cours de vérification par nos équipes (validation manuelle sous 24h)."
                            : `Nous n'avons pas trouvé de dossier correspondant à l'adresse e-mail : ${user?.primaryEmailAddress?.emailAddress}.`
                        }
                    </p>

                    {!pendingDemande && (
                        <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#9A3412', textAlign: 'left' }}>
                            <strong>Note :</strong> Assurez-vous d'utiliser le même e-mail que lors de votre inscription. Si vous avez payé mais que vous voyez ce message, contactez-nous.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button className="btn-primary" onClick={() => window.location.reload()} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
                            Rafraîchir la page
                        </button>
                        <button className="btn-outline" onClick={handleLogout} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
                            Se déconnecter
                        </button>
                    </div>
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
                        Accès Suspendu — Incident de Paiement
                    </h2>
                    <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
                        Votre espace client pour <strong>{clientData.company}</strong> a été temporairement suspendu suite à un incident de paiement ou un prélèvement bloqué.
                    </p>

                    <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#991B1B', textAlign: 'left' }}>
                        <strong>Comment régulariser votre situation ?</strong><br />
                        Un email contenant votre facture et un lien de paiement sécurisé vous a été envoyé par Stripe pour mettre à jour votre carte bancaire. Vous pouvez également nous contacter pour obtenir de l'aide.
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button className="btn-primary" onClick={() => window.location.reload()} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700', background: '#EF4444' }}>
                            Vérifier mon paiement
                        </button>
                        <button className="btn-outline" onClick={handleLogout} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
                            Se déconnecter
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ec-layout">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    if (tab === 'messages') setUnreadMsgsCount(0);
                    if (tab === 'docs' && clientData) {
                        setHasNewDocs(false);
                        localStorage.setItem(`client_seen_docs_${clientData.id}`, documents.length.toString());
                    }
                    if (tab === 'factures' && clientData) {
                        setHasNewFactures(false);
                        // On ne connaît pas le count ici mais Factures le connaît. 
                        // On peut juste le mettre à un grand nombre ou l'update plus tard.
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

            <main className="ec-main">
                <header className="ec-header">
                    <div className="ec-header-left">
                        <h1 className="ec-welcome-title">Bienvenue, {user?.firstName || 'Propriétaire'}</h1>
                        <p className="ec-welcome-sub">Gérez votre domiciliation et vos courriers pour <strong>{clientData?.company}</strong></p>
                    </div>
                    <div className="ec-header-right">
                        {clientData?.status === 'en_attente_validation' ? (
                            <div className="ec-status-tag" style={{ background: '#FFF7ED', color: '#9A3412', border: '1px solid #FFEDD5' }}>
                                <span className="status-dot-orange" style={{ background: '#F97316' }}></span>
                                Dossier en cours de validation
                            </div>
                        ) : (
                            <div className="ec-status-tag">
                                <span className="status-dot-green"></span>
                                Abonnement {clientData?.plan} Actif
                            </div>
                        )}
                    </div>
                </header>

                <div className="ec-view-container">
                    {activeTab === 'overview' && <Overview mail={mail} documents={documents} bookings={bookings} clientData={clientData} />}
                    {activeTab === 'mail' && <Mail mail={mail} />}
                    {activeTab === 'docs' && (
                        <Docs
                            documents={documents}
                            setDocuments={setDocuments}
                            clientData={clientData}
                            setClientData={setClientData}
                        />
                    )}
                    {activeTab === 'meeting' && (
                        <Meeting
                            clientData={clientData}
                            setActiveTab={setActiveTab}
                        />
                    )}
                    {activeTab === 'messages' && (
                        <Messages clientData={clientData} />
                    )}
                    {activeTab === 'factures' && (
                        <Factures clientData={clientData} />
                    )}
                    {activeTab === 'settings' && (
                        <Settings clientData={clientData} setClientData={setClientData} />
                    )}
                </div>
            </main>
        </div>
    );
}
