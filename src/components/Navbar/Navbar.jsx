import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import './Navbar.css';

import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/services', label: 'Services' },
    { to: '/tarifs', label: 'Tarifs' },
    { to: '/villes', label: 'Adresses' },
    { to: '/fiches-pratiques', label: 'Fiches pratiques', isMega: true },
];

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isMegaOpen, setIsMegaOpen] = useState(false);
    const megaTimeout = useRef(null);
    const location = useLocation();

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
        megaTimeout.current = setTimeout(() => {
            setIsMegaOpen(false);
        }, 300);
    };

    const handleLogoClick = (e) => {
        if (location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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
                                    key={link.label}
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
                                                    <Link to="/fiches-pratiques" className="mega-menu-all">
                                                        Voir toutes les fiches pratiques →
                                                    </Link>
                                                </div>
                                                <div className="mega-menu-grid">
                                                    <div className="mega-menu-col">
                                                        <h4 className="mega-menu-title">Gérer son entreprise</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/fiscalite-et-imposition">Fiscalité et imposition</Link></li>
                                                            <li><Link to="/fiches-pratiques/transfert-de-siege-social">Transfert de siège social</Link></li>
                                                            <li><Link to="/fiches-pratiques/gouvernance">Gouvernance</Link></li>
                                                            <li><Link to="/fiches-pratiques/services-aux-entreprises">Services aux entreprises</Link></li>
                                                            <li><Link to="/fiches-pratiques/pieges-et-astuces-gestion">Pièges et astuces</Link></li>
                                                        </ul>
                                                        <h4 className="mega-menu-title" style={{ marginTop: '24px' }}>Actualités</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/reformes-legales">Réformes légales</Link></li>
                                                            <li><Link to="/fiches-pratiques/podcast">Podcast</Link></li>
                                                            <li><Link to="/fiches-pratiques/entrepreneuriat">Entrepreneuriat</Link></li>
                                                            <li><Link to="/fiches-pratiques/sedomicilier">SeDomicilier</Link></li>
                                                            <li><Link to="/fiches-pratiques/tech">Tech</Link></li>
                                                        </ul>
                                                    </div>
                                                    <div className="mega-menu-col">
                                                        <h4 className="mega-menu-title">Domiciliation</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/les-adresses">Les adresses</Link></li>
                                                            <li><Link to="/fiches-pratiques/gestion-du-courrier">Gestion du courrier</Link></li>
                                                            <li><Link to="/fiches-pratiques/pieges-et-astuces-domiciliation">Pièges et astuces</Link></li>
                                                            <li><Link to="/fiches-pratiques/tout-savoir-sur-la-domiciliation">Tout savoir sur la domiciliation</Link></li>
                                                        </ul>
                                                        <h4 className="mega-menu-title" style={{ marginTop: '24px' }}>Créer une entreprise</h4>
                                                        <ul className="mega-menu-list">
                                                            <li><Link to="/fiches-pratiques/formes-juridiques">Les formes juridiques</Link></li>
                                                            <li><Link to="/fiches-pratiques/aides-a-la-creation">Les aides à la création</Link></li>
                                                            <li><Link to="/fiches-pratiques/les-administrations">Les administrations</Link></li>
                                                            <li><Link to="/fiches-pratiques/pieges-et-astuces-creation">Pièges et astuces</Link></li>
                                                            <li><Link to="/fiches-pratiques/la-creation-d-entreprise">La création d'entreprise</Link></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mega-menu-sidebar">
                                                <h4 className="sidebar-title">Notre sélection du mois</h4>
                                                <ul className="sidebar-list">
                                                    <li><Link to="/fiches-pratiques/auto-entrepreneur-astuces-impot">Auto-entrepreneur : les 5 astuces pour payer moins d’impôt</Link></li>
                                                    <li><Link to="/fiches-pratiques/qu-est-ce-que-la-domiciliation">Qu'est-ce que la domiciliation ?</Link></li>
                                                    <li><Link to="/fiches-pratiques/cout-gestion-comptabilite">Combien coûte la gestion de votre comptabilité ?</Link></li>
                                                    <li><Link to="/fiches-pratiques/creer-entreprise-en-ligne">Comment créer son entreprise en ligne ?</Link></li>
                                                    <li><Link to="/fiches-pratiques/pourquoi-domicilier-en-idf">Pourquoi domicilier son entreprise en IDF ?</Link></li>
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
                    <SignedOut>
                        <Link to="/connexion" className="btn btn-ghost" id="nav-signin-btn">
                            Se connecter
                        </Link>
                    </SignedOut>

                    <SignedIn>
                        <Link to="/app/espace-client" className="btn btn-ghost" id="nav-dashboard-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                            </svg>
                            Mon espace
                        </Link>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>

                    <Link to="/tarifs" className="btn btn-primary" id="nav-cta-btn">
                        Démarrer →
                    </Link>
                </div>

                {/* Hamburger */}
                <button
                    className={`hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                    id="hamburger-btn"
                >
                    <span /><span /><span />
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} id="mobile-menu">
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
                        Se connecter
                    </Link>
                </SignedOut>
                <SignedIn>
                    <Link
                        to="/app/espace-client"
                        className="mobile-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        Mon espace client
                    </Link>
                    <div style={{ padding: '8px 12px' }}>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </SignedIn>
                <Link
                    to="/tarifs"
                    className="mobile-cta"
                    onClick={() => setMenuOpen(false)}
                    id="mobile-cta-btn"
                >
                    Domicilier mon entreprise
                </Link>
            </div>
        </header>
    );
}
