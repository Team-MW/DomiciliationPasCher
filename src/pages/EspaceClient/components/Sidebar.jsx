import React from 'react';
import { Link } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Icons } from './Icons';
import logoSvg from '../../../assets/DomiciliationPasCher-Logo.png';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function Sidebar({ activeTab, setActiveTab, mailCount, unreadMsgsCount, hasNewDocs, hasNewFactures, user, clientData, onLogout }) {
    const { t } = useTranslation();
    return (
        <aside className="ec-sidebar">
            <div className="ec-sidebar-brand">
                <Link to="/" className="ec-brand-logo">
                    <img src={logoSvg} alt="DPC" className="ec-logo-img" />
                </Link>
            </div>

            <nav className="ec-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingRight: '4px' }}>
                {/* 1. Dashboard */}
                <button className={`ec-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    <span className="ec-nav-icon"><Icons.Dashboard /></span> {t('espaceClient.sidebar.dashboard')}
                </button>

                {/* 2. Boite aux lettres */}
                <button className={`ec-nav-item ${activeTab === 'mail' ? 'active' : ''}`} onClick={() => setActiveTab('mail')}>
                    <span className="ec-nav-icon"><Icons.Mail /></span> {t('espaceClient.sidebar.mail')}
                    {mailCount > 0 && <span className="ec-nav-badge" style={{ background: '#ea580c' }}>{mailCount}</span>}
                </button>

                {/* 3. Adresse */}
                <button className={`ec-nav-item ${activeTab === 'adresse' ? 'active' : ''}`} onClick={() => setActiveTab('adresse')}>
                    <span className="ec-nav-icon"><Icons.Pin /></span> {t('espaceClient.sidebar.address')}
                </button>

                {/* 4. Documents */}
                <button className={`ec-nav-item ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
                    <span className="ec-nav-icon"><Icons.Folder /></span> {t('espaceClient.sidebar.docs')}
                    {hasNewDocs && <span className="ec-nav-dot" style={{ background: '#ea580c' }}></span>}
                </button>

                {/* 5. Abonnement */}
                <button className={`ec-nav-item ${activeTab === 'abonnement' ? 'active' : ''}`} onClick={() => setActiveTab('abonnement')}>
                    <span className="ec-nav-icon"><Icons.Subscription /></span> {t('espaceClient.sidebar.subscription')}
                </button>

                {/* 6. Factures */}
                <button className={`ec-nav-item ${activeTab === 'factures' ? 'active' : ''}`} onClick={() => setActiveTab('factures')}>
                    <span className="ec-nav-icon"><Icons.Invoice /></span> {t('espaceClient.sidebar.invoices')}
                    {hasNewFactures && <span className="ec-nav-dot" style={{ background: '#ea580c' }}></span>}
                </button>

                {/* 7. Moyen de paiement */}
                <button className={`ec-nav-item ${activeTab === 'paiement' ? 'active' : ''}`} onClick={() => setActiveTab('paiement')}>
                    <span className="ec-nav-icon"><Icons.CreditCard /></span> {t('espaceClient.sidebar.payment')}
                </button>

                {/* 8. Compte pro */}
                <button className={`ec-nav-item ${activeTab === 'comptepro' ? 'active' : ''}`} onClick={() => setActiveTab('compte-pro')}>
                    <span className="ec-nav-icon"><Icons.Bank /></span> {t('espaceClient.sidebar.proAccount')}
                    <span style={{ marginLeft: 'auto', background: 'rgba(79, 70, 229, 0.25)', color: '#818cf8', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px' }}>OFFRE</span>
                </button>

                {/* 9. Messagerie */}
                <button className={`ec-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
                    <span className="ec-nav-icon"><Icons.Chat /></span> {t('espaceClient.sidebar.messages')}
                    {unreadMsgsCount > 0 && <span className="ec-nav-badge" style={{ background: '#ea580c' }}>{unreadMsgsCount}</span>}
                </button>

                {/* 10. Salles & Bureaux */}
                <button className={`ec-nav-item ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => setActiveTab('meeting')}>
                    <span className="ec-nav-icon"><Icons.Calendar /></span> {t('espaceClient.sidebar.meeting')}
                </button>

                {/* 11. Aide */}
                <button className={`ec-nav-item ${activeTab === 'aide' ? 'active' : ''}`} onClick={() => setActiveTab('aide')}>
                    <span className="ec-nav-icon"><Icons.Help /></span> {t('espaceClient.sidebar.help')}
                </button>

                {/* 12. Paramètres */}
                <button className={`ec-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                    <span className="ec-nav-icon"><Icons.Settings /></span> {t('espaceClient.sidebar.settings')}
                </button>
            </nav>

            <div className="ec-sidebar-footer" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div className="ec-user-card">
                    <UserButton afterSignOutUrl="/" />
                    <div className="ec-user-info">
                        <div className="ec-user-name">{user?.firstName || 'Utilisateur'}</div>
                        <div className="ec-user-company">{clientData?.company || 'Espace Client'}</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
