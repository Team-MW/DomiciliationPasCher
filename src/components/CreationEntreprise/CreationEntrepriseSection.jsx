import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import './CreationEntrepriseSection.css';

const CARD_ICONS = {
    creation: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.5-1 1-4c2 1 3 3 4 4z" />
        </svg>
    ),
    conseil: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="8" y1="9" x2="16" y2="9" />
            <line x1="8" y1="13" x2="13" y2="13" />
        </svg>
    ),
    dissolution: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
    ),
};

export default function CreationEntrepriseSection() {
    const { tr } = useTranslation();

    useEffect(() => {
        const animatedElements = document.querySelectorAll('#creation-entreprise .animate-in');
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) entry.target.classList.add('visible');
                });
            },
            { threshold: 0.1 }
        );
        animatedElements.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <section className="creation-section" id="creation-entreprise">
            <div className="creation-container">
                {/* Header */}
                <div className="creation-header animate-in">
                    <div className="creation-badge">{tr.creation.badge}</div>
                    <h2 className="creation-title">
                        {tr.creation.title} <span>{tr.creation.titleHighlight}</span>
                    </h2>
                    <p className="creation-subtitle">{tr.creation.subtitle}</p>
                </div>

                {/* 3 cartes cliquables → Calendly */}
                <div className="creation-grid animate-in">
                    {tr.creation.cards.map((card, i) => (
                        <Link
                            key={card.id}
                            to="/rendez-vous"
                            className={`creation-card ${card.featured ? 'is-featured' : ''}`}
                            id={`creation-card-${card.id}`}
                            style={{ transitionDelay: `${i * 0.04}s` }}
                        >
                            {card.badge && <span className="cc-badge">{card.badge}</span>}

                            <div className="cc-icon">{CARD_ICONS[card.id]}</div>

                            <div className="cc-head">
                                <h3 className="cc-title">{card.title}</h3>
                                <p className="cc-desc">{card.desc}</p>
                            </div>

                            <ul className="cc-features">
                                {card.features.map(f => (
                                    <li key={f}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <div className="cc-foot">
                                <span className="cc-tag">{card.tag}</span>
                                <span className="cc-btn">
                                    {tr.creation.cardCta}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Réassurance */}
                <div className="creation-reassurance animate-in">
                    {tr.creation.reassurance.map(r => (
                        <span key={r} className="creation-reassurance-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {r}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
