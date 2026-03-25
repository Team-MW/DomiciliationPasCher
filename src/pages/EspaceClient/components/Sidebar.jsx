import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './Icons';
import logoSvg from '../../../assets/DomiciliationPasCher-Logo.png';

export default function Sidebar({ activeTab, setActiveTab, mailCount, unreadMsgsCount, hasNewDocs, hasNewFactures, user, clientData, onLogout }) {
    return (
        <aside className="ec-sidebar">
            <div className="ec-sidebar-brand">
                <Link to="/" className="ec-brand-logo">
                    <img src={logoSvg} alt="DPC" className="ec-logo-img" />
                </Link>
            </div>

            <nav className="ec-nav">
                <button className={`ec-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    <span className="ec-nav-icon"><Icons.Dashboard /></span> Dashboard
                </button>
                <button className={`ec-nav-item ${activeTab === 'mail' ? 'active' : ''}`} onClick={() => setActiveTab('mail')}>
                    <span className="ec-nav-icon"><Icons.Mail /></span> Courrier
                    {mailCount > 0 && <span className="ec-nav-badge">{mailCount}</span>}
                    {mailCount > 0 && activeTab !== 'mail' && <span className="red-dot"></span>}
                </button>
                <button className={`ec-nav-item ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
                    <span className="ec-nav-icon"><Icons.Docs /></span> Documents
                    {hasNewDocs && <span className="red-dot"></span>}
                </button>
                <button className={`ec-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
                    <span className="ec-nav-icon"><Icons.Chat /></span> Messagerie
                    {unreadMsgsCount > 0 && <span className="ec-nav-badge">{unreadMsgsCount}</span>}
                    {unreadMsgsCount > 0 && activeTab !== 'messages' && <span className="red-dot"></span>}
                </button>
                <button className={`ec-nav-item ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => setActiveTab('meeting')}>
                    <span className="ec-nav-icon"><Icons.Calendar /></span> Salles & Bureaux
                </button>
                <button className={`ec-nav-item ${activeTab === 'factures' ? 'active' : ''}`} onClick={() => setActiveTab('factures')}>
                    <span className="ec-nav-icon"><Icons.Invoice /></span> Factures
                    {hasNewFactures && <span className="red-dot"></span>}
                </button>
                <button className={`ec-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                    <span className="ec-nav-icon"><Icons.Settings /></span> Paramètres
                </button>
            </nav>

            <div className="ec-sidebar-footer">
                <div className="ec-user-card">
                    <div className="ec-user-avatar">
                        {user?.imageUrl ? <img src={user.imageUrl} alt="Avatar" /> : <span>{user?.firstName?.charAt(0) || 'U'}</span>}
                    </div>
                    <div className="ec-user-info">
                        <div className="ec-user-name">{user?.firstName || 'Utilisateur'}</div>
                        <div className="ec-user-company">{clientData?.company}</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
