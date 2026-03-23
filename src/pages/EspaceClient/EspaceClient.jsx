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
    const [currentFolder, setCurrentFolder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadMsgsCount, setUnreadMsgsCount] = useState(0);

    useEffect(() => {
        const body = document.querySelector('.ec-main');
        if (body) body.scrollTop = 0;
    }, [activeTab, currentFolder]);

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
                const email = user.primaryEmailAddress?.emailAddress;
                const data = await adminDataService.getClientByEmail(email);

                if (data) {
                    // Si le compte Clerk n'était pas encore lié en DB, on le lie au premier login
                    if (!data.clerkId || data.clerkId === '') {
                        try {
                            await adminDataService.updateClientClerkId(data.id, user.id);
                            data.clerkId = user.id;
                        } catch (err) {
                            console.error("Impossible de lier le Clerk ID:", err);
                        }
                    }

                    setClientData(data);
                    const [m, d, b, msgs] = await Promise.all([
                        adminDataService.getClientMail(data.id),
                        adminDataService.getDocuments(data.id),
                        adminDataService.getClientBookings(data.id),
                        adminDataService.getMessages(data.id)
                    ]);
                    setMail(m);
                    setDocuments(d);
                    setBookings(b);
                    setUnreadMsgsCount(msgs.filter(x => x.sender === 'admin' && x.status === 'sent').length);
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
                <div className="ec-pending-card">
                    <div className="pending-icon">⏳</div>
                    <h2>Dossier en attente</h2>
                    <p>Votre profil "<strong>{user?.primaryEmailAddress?.emailAddress}</strong>" est actuellement en attente de création ou de validation par un membre de notre équipe.</p>
                    <p>Vous recevrez un e-mail dès que votre espace client sera activé.</p>
                    <button className="btn-primary" onClick={handleLogout} style={{ marginTop: '24px' }}>
                        Se déconnecter
                    </button>
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
                }}
                mailCount={mail.filter(m => m.status === 'non lu').length}
                unreadMsgsCount={unreadMsgsCount}
                user={user}
                clientData={clientData}
                onLogout={handleLogout}
            />

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
                    {activeTab === 'overview' && <Overview mail={mail} documents={documents} bookings={bookings} clientData={clientData} />}
                    {activeTab === 'mail' && <Mail mail={mail} />}
                    {activeTab === 'docs' && (
                        <Docs
                            documents={documents}
                            setDocuments={setDocuments}
                            currentFolder={currentFolder}
                            setCurrentFolder={setCurrentFolder}
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
