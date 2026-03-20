import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './Icons';
import logoSvg from '../../../assets/DomiciliationPasCher-Logo-11.svg';

export default function Sidebar({ activeTab, setActiveTab, mailCount, unreadMsgsCount, user, clientData, onLogout }) {
    return (
        <aside className="ec-sidebar">
            <div className="ec-sidebar-brand">
                <Link to="/" className="ec-brand-logo">
                    <img src={logoSvg} alt="DPC" className="ec-logo-img" />
                    <span className="ec-logo-text">CLIENT HUB</span>
                </Link>
            </div>

            <nav className="ec-nav">
                <button className={`ec-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    <span className="ec-nav-icon"><Icons.Dashboard /></span> Dashboard
                </button>
                <button className={`ec-nav-item ${activeTab === 'mail' ? 'active' : ''}`} onClick={() => setActiveTab('mail')}>
                    <span className="ec-nav-icon"><Icons.Mail /></span> Courrier
                    {mailCount > 0 && <span className="ec-nav-badge">{mailCount}</span>}
                </button>
                <button className={`ec-nav-item ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
                    <span className="ec-nav-icon"><Icons.Docs /></span> Documents
                </button>
                <button className={`ec-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
                    <span className="ec-nav-icon"><Icons.Chat /></span> Messagerie
                    {unreadMsgsCount > 0 && <span className="ec-nav-badge">{unreadMsgsCount}</span>}
                </button>
                <button className={`ec-nav-item ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => setActiveTab('meeting')}>
                    <span className="ec-nav-icon"><Icons.Calendar /></span> Salles & Bureaux
                </button>
                <button className={`ec-nav-item ${activeTab === 'factures' ? 'active' : ''}`} onClick={() => setActiveTab('factures')}>
                    <span className="ec-nav-icon"><Icons.Invoice /></span> Factures
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
                <button className="ec-nav-item ec-logout" onClick={onLogout}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Déconnexion
                </button>
            </div>
        </aside>
    );
}
