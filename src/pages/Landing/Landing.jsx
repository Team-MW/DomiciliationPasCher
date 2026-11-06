import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { openCookieConsent } from '../../components/CookieConsent/consent';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';
import './Landing.css';
import usePageMeta from '../../components/Seo/usePageMeta';

const LEGAL_LINK_STYLE = { color: '#64748B', textDecoration: 'none' };
const LEGAL_FOOTER_STYLE = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px',
    padding: '0 16px 28px',
    fontSize: '13px',
    color: '#94A3B8',
};

const HOW_IT_WORKS = [
    { n: '1', title: 'Vous remplissez', desc: '5 minutes, 100 % en ligne. Rien n’est débité avant la fin.' },
    { n: '2', title: 'Vous payez', desc: 'Paiement sécurisé Stripe. Sans engagement au-delà de 3 mois.' },
    { n: '3', title: 'Vous recevez', desc: 'Attestation de siège social immédiate, utilisable au greffe.' },
];

const TRUST_ITEMS = [
    {
        title: 'Agréé Préfecture',
        desc: 'Adresse officielle acceptée au greffe, aux impôts et en banque.',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18" />
                <path d="M5 21V8l7-5 7 5v13" />
                <path d="M9 21v-6h6v6" />
            </svg>
        ),
    },
    {
        title: 'Attestation immédiate',
        desc: 'Document de siège social délivré en ligne, dès la souscription.',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
                <path d="M13 2v7h7" />
                <path d="M9 15l2 2 4-4" />
            </svg>
        ),
    },
    {
        title: 'Sans engagement',
        desc: 'Résiliable à tout moment, au-delà de la durée légale de 3 mois.',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 7.5-2" />
            </svg>
        ),
    },
];

export default function Landing() {
    // Landing des campagnes publicitaires : hors sitemap et non indexée (doublon de l'accueil).
    usePageMeta({ title: 'Domiciliation à Toulouse dès 20 € HT/mois — Domiciliation Pas Cher', path: '/offre', noindex: true });
    const navigate = useNavigate();

    return (
        <div className="ld-page">
            <div className="ld-glow ld-glow-a" aria-hidden="true" />
            <div className="ld-glow ld-glow-b" aria-hidden="true" />

            <header className="ld-header">
                <img src={logoSvg} alt="DomiciliationPasCher" className="ld-logo" />
            </header>

            <main className="ld-main">
                <div className="ld-badge">
                    Offre créateurs — dès 20€ HT/mois
                </div>

                <h1 className="ld-title">
                    Votre domiciliation d'entreprise en <span>5 minutes chrono</span>
                </h1>

                <p className="ld-lead">
                    Attestation de siège social immédiate. 100 % en ligne, sécurisé, sans paperasse.
                </p>

                <button type="button" className="ld-cta" onClick={() => navigate('/souscription')}>
                    <span>Domicilier mon entreprise</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                </button>
                <p className="ld-social">
                    <span className="ld-stars" aria-hidden="true">★★★★★</span>
                    +2 000 entrepreneurs nous font déjà confiance
                </p>

                <section className="ld-how" aria-label="Comment ça se passe">
                    <p className="ld-how-kicker">Comment ça se passe</p>
                    <ol className="ld-how-list">
                        {HOW_IT_WORKS.map((item) => (
                            <li key={item.n} className="ld-how-item">
                                <span className="ld-how-n">{item.n}</span>
                                <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="ld-trust" aria-label="Garanties">
                    {TRUST_ITEMS.map((item) => (
                        <article key={item.title} className="ld-trust-item">
                            <div className="ld-trust-icon">{item.icon}</div>
                            <div className="ld-trust-copy">
                                <h2 className="ld-trust-title">{item.title}</h2>
                                <p className="ld-trust-desc">{item.desc}</p>
                            </div>
                        </article>
                    ))}
                </section>
            </main>

            <footer className="ld-legal" aria-label="Informations légales" style={LEGAL_FOOTER_STYLE}>
                <Link to="/mentions-legales" style={LEGAL_LINK_STYLE}>Mentions légales</Link>
                <span aria-hidden="true">·</span>
                <Link to="/cgv" style={LEGAL_LINK_STYLE}>CGV</Link>
                <span aria-hidden="true">·</span>
                <Link to="/confidentialite" style={LEGAL_LINK_STYLE}>Confidentialité</Link>
                <span aria-hidden="true">·</span>
                <button
                    type="button"
                    onClick={openCookieConsent}
                    style={{ ...LEGAL_LINK_STYLE, background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}
                >
                    Gérer les cookies
                </button>
            </footer>
        </div>
    );
}
