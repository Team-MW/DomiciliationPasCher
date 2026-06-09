import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { useTranslation } from '../../i18n/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import './Navbar.css';

import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

const navLinkDefs = [
    { to: '/', labelKey: 'home' },
    { to: '/services', labelKey: 'services' },
    { to: '/tarifs', labelKey: 'tarifs' },
    { to: '/villes', labelKey: 'villes' },
    { to: '/fiches-pratiques', labelKey: 'fichesPratiques', isMega: true },
];

export default function Navbar() {
    const { tr } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isMegaOpen, setIsMegaOpen] = useState(false);
    const megaTimeout = useRef(null);
    const location = useLocation();

    const navLinks = navLinkDefs.map((link) => ({
        ...link,
        label: tr.nav.links[link.labelKey],
    }));

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 16);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleMouseEnter = () => {
        if (megaTimeout.current) clearTimeout(megaTimeout.current);
        setIsMegaOpen(true);
    };

    const handleMouseLeave = () => {
        if (megaTimeout.current) clearTimeout(megaTimeout.current);
        megaTimeout.current = setTimeout(() => {
            setIsMegaOpen(false);
        }, 150);
    };

    const handleLogoClick = (e) => {
        if (location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const mm = tr.nav.megaMenu;

    return (
        <header className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
            <div className="container navbar-inner">

                {/* Logo */}
                <Link to="/" className="navbar-logo" id="nav-logo" onClick={handleLogoClick}>
                    <img src={logoSvg} alt="DomiciliationPasCher" className="logo-img" />
                </Link>

                {/* Desktop Nav */}
                <nav className="navbar-nav" id="navbar-nav">
                    {navLinks.map(link => {
                        if (link.isMega) {
                            return (
                                <div
                                    key={link.to}
                                    className="nav-item-wrapper"
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <NavLink
                                        to={link.to}
                                        className={({ isActive }) => `nav-link ${isActive || isMegaOpen ? 'active' : ''}`}
                                    >
                                        {link.label}
                                        <svg className="nav-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </NavLink>

                                    {/* MEGA MENU */}
                                    <div className={`mega-menu ${isMegaOpen ? 'open' : ''}`}>
                                        <div className="container mega-menu-inner">
                                            <div className="mega-menu-main">
                                                <div className="mega-menu-top">
                                                    <Link to="/fiches-pratiques" className="mega-menu-all" onClick={() => setIsMegaOpen(false)}>
                                                        {mm.viewAll}
                                                    </Link>
                                                </div>
                                                <div className="mega-menu-grid">
                                                    <div className="mega-menu-col">
                                                        <h4 className="mega-menu-title">{mm.gererEntreprise}</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/fiscalite-et-imposition" onClick={() => setIsMegaOpen(false)}>{mm.fiscaliteImposition}</Link></li>
                                                            <li><Link to="/fiches-pratiques/transfert-de-siege-social" onClick={() => setIsMegaOpen(false)}>{mm.transfertSiege}</Link></li>
                                                            <li><Link to="/fiches-pratiques/gouvernance" onClick={() => setIsMegaOpen(false)}>{mm.gouvernance}</Link></li>
                                                            <li><Link to="/fiches-pratiques/services-aux-entreprises" onClick={() => setIsMegaOpen(false)}>{mm.servicesEntreprises}</Link></li>
                                                            <li><Link to="/fiches-pratiques/pieges-et-astuces-gestion" onClick={() => setIsMegaOpen(false)}>{mm.piegesAstucesGestion}</Link></li>
                                                        </ul>
                                                        <h4 className="mega-menu-title" style={{ marginTop: '24px' }}>{mm.actualites}</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/reformes-legales" onClick={() => setIsMegaOpen(false)}>{mm.reformesLegales}</Link></li>
                                                            <li><Link to="/fiches-pratiques/podcast" onClick={() => setIsMegaOpen(false)}>{mm.podcast}</Link></li>
                                                            <li><Link to="/fiches-pratiques/entrepreneuriat" onClick={() => setIsMegaOpen(false)}>{mm.entrepreneuriat}</Link></li>
                                                            <li><Link to="/fiches-pratiques/sedomicilier" onClick={() => setIsMegaOpen(false)}>{mm.seDomicilier}</Link></li>
                                                            <li><Link to="/fiches-pratiques/tech" onClick={() => setIsMegaOpen(false)}>{mm.tech}</Link></li>
                                                        </ul>
                                                    </div>
                                                    <div className="mega-menu-col">
                                                        <h4 className="mega-menu-title">{mm.domiciliation}</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/les-adresses" onClick={() => setIsMegaOpen(false)}>{mm.lesAdresses}</Link></li>
                                                            <li><Link to="/fiches-pratiques/gestion-du-courrier" onClick={() => setIsMegaOpen(false)}>{mm.gestionCourrier}</Link></li>
                                                            <li><Link to="/fiches-pratiques/pieges-et-astuces-domiciliation" onClick={() => setIsMegaOpen(false)}>{mm.piegesAstucesDomiciliation}</Link></li>
                                                            <li><Link to="/fiches-pratiques/tout-savoir-sur-la-domiciliation" onClick={() => setIsMegaOpen(false)}>{mm.toutSavoirDomiciliation}</Link></li>
                                                        </ul>
                                                        <h4 className="mega-menu-title" style={{ marginTop: '24px' }}>{mm.creerEntreprise}</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/formes-juridiques" onClick={() => setIsMegaOpen(false)}>{mm.formesJuridiques}</Link></li>
                                                            <li><Link to="/fiches-pratiques/aides-a-la-creation" onClick={() => setIsMegaOpen(false)}>{mm.aidesCreation}</Link></li>
                                                            <li><Link to="/fiches-pratiques/les-administrations" onClick={() => setIsMegaOpen(false)}>{mm.administrations}</Link></li>
                                                            <li><Link to="/fiches-pratiques/pieges-et-astuces-creation" onClick={() => setIsMegaOpen(false)}>{mm.piegesAstucesCreation}</Link></li>
                                                            <li><Link to="/fiches-pratiques/la-creation-d-entreprise" onClick={() => setIsMegaOpen(false)}>{mm.laCreationEntreprise}</Link></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mega-menu-sidebar">
                                                <h4 className="sidebar-title">{mm.selectionMois}</h4>
                                                <ul className="sidebar-list">
                                                    <li><Link to="/fiches-pratiques/auto-entrepreneur-astuces-impot" onClick={() => setIsMegaOpen(false)}>{mm.autoEntrepreneurAstuces}</Link></li>
                                                    <li><Link to="/fiches-pratiques/qu-est-ce-que-la-domiciliation" onClick={() => setIsMegaOpen(false)}>{mm.questCeDomiciliation}</Link></li>
                                                    <li><Link to="/fiches-pratiques/cout-gestion-comptabilite" onClick={() => setIsMegaOpen(false)}>{mm.coutComptabilite}</Link></li>
                                                    <li><Link to="/fiches-pratiques/creer-entreprise-en-ligne" onClick={() => setIsMegaOpen(false)}>{mm.creerEntrepriseEnLigne}</Link></li>
                                                    <li><Link to="/fiches-pratiques/pourquoi-domicilier-en-idf" onClick={() => setIsMegaOpen(false)}>{mm.pourquoiDomicilierIdf}</Link></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.to === '/'}
                                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                            >
                                {link.label}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Desktop Actions */}
                <div className="navbar-actions">
                    <LanguageSwitcher />
                    <SignedOut>
                        <Link to="/connexion" className="btn btn-ghost" id="nav-signin-btn" onClick={() => setIsMegaOpen(false)}>
                            {tr.nav.signIn}
                        </Link>
                    </SignedOut>

                    <SignedIn>
                        <Link to="/app/espace-client" className="btn btn-ghost" id="nav-dashboard-btn" onClick={() => setIsMegaOpen(false)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                            </svg>
                            {tr.nav.dashboard}
                        </Link>
                    </SignedIn>

                    <Link to="/tarifs" className="btn btn-primary" id="nav-cta-btn" onClick={() => setIsMegaOpen(false)}>
                        {tr.nav.cta}
                    </Link>
                </div>

                {/* Hamburger */}
                <button
                    className={`hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label={tr.nav.menuAria}
                    id="hamburger-btn"
                >
                    <span /><span /><span />
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} id="mobile-menu">
                <LanguageSwitcher />
                {navLinks.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === '/'}
                        className={({ isActive }) => `mobile-link${isActive ? ' active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                    >
                        {link.label}
                    </NavLink>
                ))}
                <div className="mobile-divider" />
                <SignedOut>
                    <Link
                        to="/connexion"
                        className="mobile-link"
                        onClick={() => setMenuOpen(false)}
                        id="mobile-signin-btn"
                    >
                        {tr.nav.signIn}
                    </Link>
                </SignedOut>
                <SignedIn>
                    <Link
                        to="/app/espace-client"
                        className="mobile-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        {tr.nav.dashboardMobile}
                    </Link>
                </SignedIn>
                <Link
                    to="/tarifs"
                    className="mobile-cta"
                    onClick={() => setMenuOpen(false)}
                    id="mobile-cta-btn"
                >
                    {tr.nav.mobileCta}
                </Link>
            </div>
        </header>
    );
}
