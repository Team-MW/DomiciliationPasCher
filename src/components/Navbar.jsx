import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import './Navbar.css';

const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/services', label: 'Services' },
    { to: '/tarifs', label: 'Tarifs' },
    { to: '/villes', label: 'Villes' },
    { to: '/about', label: 'À propos' },
];

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 16);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
            <div className="container navbar-inner">

                {/* Logo */}
                <Link to="/" className="navbar-logo" id="nav-logo">
                    <div className="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <div className="logo-text">
                        <span className="logo-name">DomiciliationPasCher</span>
                        <span className="logo-tagline">Centre agréé · France</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <nav className="navbar-nav" id="navbar-nav">
                    {navLinks.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/'}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Desktop Actions */}
                <div className="navbar-actions">
                    <SignedOut>
                        {/* Lien direct vers la page connexion — pas de modal */}
                        <Link to="/connexion" className="btn btn-ghost" id="nav-signin-btn">
                            Se connecter
                        </Link>
                    </SignedOut>

                    <SignedIn>
                        {/* Lien vers espace client + UserButton Clerk */}
                        <Link to="/espace-client" className="btn btn-ghost" id="nav-dashboard-btn">
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
                        to="/espace-client"
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
