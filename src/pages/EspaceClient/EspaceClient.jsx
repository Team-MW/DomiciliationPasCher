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

export default function EspaceClient() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [clientData, setClientData] = useState(null);
    const [mail, setMail] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const isPreview = params.get('preview') === 'true';

        if (isPreview) {
            setClientData({
                id: '1',
                company: "DEMO PREVIEW INC.",
                plan: "Scan+",
                status: "actif",
                since: "2024-12-01"
            });
            setMail(adminDataService.getMail().slice(0, 5));
            setDocuments(adminDataService.getDocuments('1'));
            setIsLoading(false);
            return;
        }

        if (isLoaded && user) {
            const email = user.primaryEmailAddress?.emailAddress;
            const data = adminDataService.getClientByEmail(email);

            if (data) {
                setClientData(data);
                setMail(adminDataService.getClientMail(data.id));
                setDocuments(adminDataService.getDocuments(data.id));
            } else {
                setClientData({
                    company: "Votre Entreprise",
                    plan: "Scan+",
                    status: "actif",
                    since: "2024-12-01"
                });
            }
            setIsLoading(false);
        }
    }, [isLoaded, user]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    if (isLoading) return <div className="ec-loading">Initialisation de votre espace sécurisé...</div>;

    return (
        <div className="ec-layout">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                mailCount={mail.filter(m => m.status === 'non lu').length}
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
                    {activeTab === 'overview' && <Overview mail={mail} documents={documents} clientData={clientData} />}
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
                    {activeTab === 'settings' && (
                        <div className="ec-tab-animate">
                            <div className="ec-content-card">
                                <div className="ec-card-header"><h2>Paramètres du compte</h2></div>
                                <div className="ec-card-body" style={{ padding: '24px' }}>
                                    <p>La gestion du profil et de la facturation sera disponible prochainement.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
