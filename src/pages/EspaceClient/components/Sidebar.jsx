import React from 'react';
import { Link } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Icons } from './Icons';
import logoSvg from '../../../assets/DomiciliationPasCher-Logo-11.svg';
import { useTranslation } from '../../../i18n/LanguageContext';
import { parseExtraInfo } from '../../../utils/contractLegalFields';

export default function Sidebar({ activeTab, setActiveTab, mailCount, unreadMsgsCount, hasNewDocs, hasNewFactures, user, clientData }) {
    const { t } = useTranslation();
    const displayName = user?.firstName || parseExtraInfo(clientData?.extra_info).prenom || clientData?.name || clientData?.company || '';

    // Navigation regroupée par usage (avant : 12 entrées à plat).
    const groups = [
        { label: null, items: [
            { id: 'overview', icon: Icons.Dashboard, label: t('espaceClient.sidebar.dashboard') },
        ] },
        { label: t('espaceClient.sidebar.groupMail'), items: [
            { id: 'mail', icon: Icons.Mail, label: t('espaceClient.sidebar.mail'), badge: mailCount },
            { id: 'messages', icon: Icons.Chat, label: t('espaceClient.sidebar.messages'), badge: unreadMsgsCount },
        ] },
        { label: t('espaceClient.sidebar.groupAccount'), items: [
            { id: 'adresse', icon: Icons.Pin, label: t('espaceClient.sidebar.address') },
            { id: 'docs', icon: Icons.Folder, label: t('espaceClient.sidebar.docs'), dot: hasNewDocs },
            { id: 'abonnement', icon: Icons.Subscription, label: t('espaceClient.sidebar.subscription') },
        ] },
        { label: t('espaceClient.sidebar.groupBilling'), items: [
            { id: 'factures', icon: Icons.Invoice, label: t('espaceClient.sidebar.invoices'), dot: hasNewFactures },
            { id: 'paiement', icon: Icons.CreditCard, label: t('espaceClient.sidebar.payment') },
        ] },
        { label: t('espaceClient.sidebar.groupServices'), items: [
            { id: 'meeting', icon: Icons.Calendar, label: t('espaceClient.sidebar.meeting') },
            { id: 'compte-pro', icon: Icons.Bank, label: t('espaceClient.sidebar.proAccount'), tag: t('espaceClient.sidebar.offer') },
            { id: 'aide', icon: Icons.Help, label: t('espaceClient.sidebar.help') },
            { id: 'settings', icon: Icons.Settings, label: t('espaceClient.sidebar.settings') },
        ] },
    ];

    return (
        <aside className="ec-sidebar">
            <div className="ec-sidebar-brand">
                <Link to="/" className="ec-brand-logo">
                    <img src={logoSvg} alt="Domiciliation Pas Cher" className="ec-logo-img" />
                </Link>
                <span className="ec-sidebar-space">{t('espaceClient.sidebar.spaceLabel')}</span>
            </div>

            <nav className="ec-nav" aria-label={t('espaceClient.sidebar.spaceLabel')}>
                {groups.map((group, gi) => (
                    <div className="ec-nav-group" key={gi}>
                        {group.label && <div className="ec-nav-group-label">{group.label}</div>}
                        {group.items.map(({ id, icon: Icon, label, badge, dot, tag }) => (
                            <button
                                key={id}
                                type="button"
                                className={`ec-nav-item ${activeTab === id ? 'active' : ''}`}
                                aria-current={activeTab === id ? 'page' : undefined}
                                onClick={() => setActiveTab(id)}
                            >
                                <span className="ec-nav-icon"><Icon /></span>
                                <span className="ec-nav-label">{label}</span>
                                {badge > 0 && <span className="ec-nav-badge">{badge}</span>}
                                {dot && <span className="ec-nav-dot" aria-hidden="true" />}
                                {tag && <span className="ec-nav-tag">{tag}</span>}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="ec-sidebar-footer">
                <div className="ec-sidebar-legal">
                    <a href="/cgv" target="_blank" rel="noopener noreferrer">{t('espaceClient.docs.refSidebarCgv')}</a>
                    <span aria-hidden="true">·</span>
                    <a href="/documents/Contrat_domiciliation_modele.pdf" target="_blank" rel="noopener noreferrer">{t('espaceClient.docs.refSidebarContract')}</a>
                </div>
                <div className="ec-user-card">
                    <UserButton afterSignOutUrl="/" />
                    <div className="ec-user-info">
                        <div className="ec-user-name">{displayName}</div>
                        <div className="ec-user-company">{clientData?.company || t('espaceClient.sidebar.spaceLabel')}</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
