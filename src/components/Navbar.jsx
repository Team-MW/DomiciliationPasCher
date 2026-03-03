import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import './Navbar.css';

const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/services', label: 'Services' },
    { to: '/tarifs', label: 'Tarifs' },
    { to: '/villes', label: 'Nos Villes' },
    { to: '/a-propos', label: 'À Propos' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`navbar ${scrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`} id="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="navbar-logo" id="nav-logo">
                    <div className="logo-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="#002D58" />
                            <path d="M8 22V12L16 7L24 12V22H19V17H13V22H8Z" fill="white" opacity="0.9" />
                            <rect x="13" y="17" width="6" height="5" fill="#0066CC" />
                        </svg>
                    </div>
                    <div className="logo-text">
                        <span className="logo-name">DomiciliationPasCher</span>
                        <span className="logo-tagline">Toulouse &amp; France</span>
                    </div>
                </Link>

                <nav className="navbar-nav" id="navbar-nav">
                    {navLinks.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            end={link.to === '/'}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="navbar-cta">
                    <Link to="/tarifs" className="btn btn-primary" id="nav-cta-btn">
                        Domicilier mon entreprise
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="btn btn-white" type="button" style={{ marginLeft: '10px' }}>
                                Se connecter
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center' }}>
                            <UserButton />
                        </span>
                    </SignedIn>
                </div>

                <button
                    className={`hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                    id="hamburger-btn"
                >
                    <span></span><span></span><span></span>
                </button>
            </div>

            {/* Mobile menu */}
            <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} id="mobile-menu">
                {navLinks.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}
                        end={link.to === '/'}
                        onClick={() => setMenuOpen(false)}
                    >
                        {link.label}
                    </NavLink>
                ))}
                <Link
                    to="/tarifs"
                    className="btn btn-primary"
                    style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                    onClick={() => setMenuOpen(false)}
                >
                    Domicilier mon entreprise →
                </Link>
                <SignedOut>
                    <SignInButton mode="modal">
                        <button
                            className="btn btn-white"
                            type="button"
                            style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                            onClick={() => setMenuOpen(false)}
                        >
                            Se connecter
                        </button>
                    </SignInButton>
                </SignedOut>
                <SignedIn>
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                        <UserButton />
                    </div>
                </SignedIn>
            </div>
        </header>
    );
}
