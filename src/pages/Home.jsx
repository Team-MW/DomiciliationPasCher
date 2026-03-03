import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const stats = [
    { value: '+3 000', label: 'Entreprises domiciliées', icon: '🏢' },
    { value: '+50', label: 'Créations par semaine', icon: '🚀' },
    { value: '10', label: 'Grandes villes françaises', icon: '📍' },
    { value: '23€', label: 'HT / mois seulement', icon: '✨' },
];

const features = [
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
        title: 'Adresse Prestigieuse',
        desc: 'Une adresse professionnelle dans les plus grandes villes de France pour votre siège social ou établissement secondaire.',
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
        ),
        title: 'Gestion du Courrier',
        desc: 'Réception, tri et transfert de votre courrier professionnel. Option scan disponible pour consulter vos lettres à distance.',
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="3" />
            </svg>
        ),
        title: 'Salle de Réunion',
        desc: 'Réservez notre salle de réunion équipée pour recevoir vos clients et partenaires dans un cadre professionnel.',
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
        ),
        title: 'Location de Bureau',
        desc: 'Besoin d\'un espace de travail pour une journée ? Location de bureau privé à la demi-journée ou à la journée.',
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
        title: 'Conformité Légale',
        desc: 'Domiciliation conforme à la loi Dutreil. Centre de domiciliation agréé, tous documents officiels inclus.',
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
        title: '100% en Ligne',
        desc: 'Souscription et gestion en ligne en quelques minutes. Espace client sécurisé disponible 24h/24.',
    },
];

const cities = [
    { name: 'Paris', icon: '🗼', desc: 'Île-de-France' },
    { name: 'Lyon', icon: '🦁', desc: 'Auvergne-Rhône-Alpes' },
    { name: 'Marseille', icon: '⚓', desc: 'Provence-Alpes-Côte d\'Azur' },
    { name: 'Nice', icon: '🌊', desc: 'Côte d\'Azur' },
    { name: 'Bordeaux', icon: '🍷', desc: 'Nouvelle-Aquitaine' },
    { name: 'Nantes', icon: '🎡', desc: 'Pays de la Loire' },
    { name: 'Lille', icon: '🧇', desc: 'Hauts-de-France' },
    { name: 'Rennes', icon: '🏰', desc: 'Bretagne' },
    { name: 'Strasbourg', icon: '🥨', desc: 'Grand Est' },
    { name: 'Clermont-Ferrand', icon: '🌋', desc: 'Auvergne-Rhône-Alpes' },
];

const steps = [
    { n: '01', title: 'Choisissez votre ville', desc: 'Sélectionnez l\'adresse dans la ville de votre choix parmi nos 10 villes disponibles.' },
    { n: '02', title: 'Sélectionnez votre offre', desc: 'Choisissez la formule adaptée à vos besoins : domiciliation simple, avec scan ou envoi physique.' },
    { n: '03', title: 'Signez en ligne', desc: 'Signez votre contrat de domiciliation 100% en ligne. Aucun déplacement nécessaire.' },
    { n: '04', title: 'Recevez vos documents', desc: 'Attestation de domiciliation envoyée immédiatement pour l\'immatriculation de votre entreprise.' },
];

const testimonials = [
    { name: 'Marie L.', role: 'Consultante indépendante', city: 'Lyon', text: 'Service impeccable, tarif imbattable. J\'ai pu immatriculer ma société en 24h. Je recommande vivement !' },
    { name: 'Thomas B.', role: 'Fondateur startup', city: 'Paris', text: 'La domiciliation avec scan est idéale pour moi qui suis souvent en déplacement. Tout dans l\'appli.' },
    { name: 'Sophie M.', role: 'Auto-entrepreneuse', city: 'Marseille', text: 'Ultra simple à mettre en place. Le support répond rapidement. Très bonne expérience.' },
];

function useAnimateOnScroll() {
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
            { threshold: 0.12 }
        );
        const els = ref.current?.querySelectorAll('.animate-in') || [];
        els.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
    return ref;
}

export default function Home() {
    const pageRef = useAnimateOnScroll();

    return (
        <main ref={pageRef}>
            {/* ── Hero ── */}
            <section className="hero" id="hero">
                <div className="hero-bg">
                    <img src="/hero-bg.png" alt="" className="hero-bg-img" />
                    <div className="hero-overlay" />
                    <div className="hero-particles">
                        {[...Array(6)].map((_, i) => (
                            <span key={i} className={`particle particle-${i + 1}`} />
                        ))}
                    </div>
                </div>

                <div className="container hero-content">
                    <div className="hero-badge animate-in">
                        <span className="badge badge-gold">
                            🏆 N°1 Domiciliation pas chère en France
                        </span>
                    </div>

                    <h1 className="hero-title animate-in">
                        Domiciliez votre<br />
                        <span className="hero-gradient-text">entreprise en France</span><br />
                        dès <span className="hero-price">23€ HT/mois</span>
                    </h1>

                    <p className="hero-subtitle animate-in">
                        Lancez-vous en 5 minutes. Adresse juridique professionnelle dans 10 grandes villes françaises. Déjà <strong>+3 000 entreprises</strong> nous font confiance.
                    </p>

                    <div className="hero-actions animate-in">
                        <Link to="/tarifs" className="btn btn-white btn-lg" id="hero-cta-primary">
                            Commencer maintenant
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/services" className="btn btn-outline-white btn-lg" id="hero-cta-secondary">
                            Découvrir nos services
                        </Link>
                    </div>

                    <div className="hero-trust animate-in">
                        <div className="trust-items">
                            {['✅ Sans engagement', '✅ 100% légal', '✅ Éligible aide à la création', '✅ Déduction fiscale'].map(item => (
                                <span key={item} className="trust-item">{item}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="hero-scroll-indicator">
                    <div className="scroll-dot" />
                </div>
            </section>

            {/* ── Stats Bar ── */}
            <section className="stats-bar" id="stats">
                <div className="container">
                    <div className="stats-grid">
                        {stats.map((s, i) => (
                            <div key={i} className="stat-item animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <span className="stat-icon">{s.icon}</span>
                                <span className="stat-value">{s.value}</span>
                                <span className="stat-label">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="section" id="features">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Nos services</div>
                        <h2 className="section-title">Tout ce dont votre entreprise<br /><span>a besoin</span></h2>
                        <p className="section-subtitle">Une solution complète pour créer et gérer votre entreprise à distance, à un tarif imbattable.</p>
                    </div>
                    <div className="grid-3">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card animate-in card" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="feature-icon-wrap">
                                    {f.icon}
                                </div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section className="section how-it-works" id="how-it-works">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Comment ça marche</div>
                        <h2 className="section-title">Domiciliez votre entreprise<br /><span>en 4 étapes simples</span></h2>
                        <p className="section-subtitle">Un processus 100% en ligne, rapide et simplifié pour les entrepreneurs.</p>
                    </div>
                    <div className="steps-grid">
                        {steps.map((s, i) => (
                            <div key={i} className="step-card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="step-connector" />
                                <div className="step-number">{s.n}</div>
                                <h3 className="step-title">{s.title}</h3>
                                <p className="step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Pricing ── */}
            <section className="cta-pricing section-sm animate-in" id="cta-pricing">
                <div className="container">
                    <div className="cta-pricing-inner">
                        <div className="cta-pricing-text">
                            <span className="badge badge-gold">Prix transparent</span>
                            <h2>La domiciliation la plus compétitive<br />de France</h2>
                            <p>À partir de <strong>23€ HT/mois</strong> — pas de frais cachés, pas de mauvaises surprises.</p>
                            <Link to="/tarifs" className="btn btn-white btn-lg" id="cta-pricing-btn">
                                Voir tous les tarifs →
                            </Link>
                        </div>
                        <div className="cta-pricing-cards">
                            <div className="pricing-preview-card">
                                <div className="pp-badge">Le plus populaire</div>
                                <div className="pp-name">Essentiel</div>
                                <div className="pp-price"><span>23€</span> HT/mois</div>
                                <ul className="pp-features">
                                    <li>✓ Adresse juridique</li>
                                    <li>✓ Réception courrier</li>
                                    <li>✓ Attestation domiciliation</li>
                                    <li>✓ Espace client en ligne</li>
                                </ul>
                            </div>
                            <div className="pricing-preview-card featured">
                                <div className="pp-badge">Recommandé</div>
                                <div className="pp-name">Scan+</div>
                                <div className="pp-price"><span>28€</span> HT/mois</div>
                                <ul className="pp-features">
                                    <li>✓ Tout l'Essentiel</li>
                                    <li>✓ Scan de vos courriers</li>
                                    <li>✓ Accès numérique immédiat</li>
                                    <li>✓ Archivage électronique</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Cities ── */}
            <section className="section cities-section" id="cities">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Implantation nationale</div>
                        <h2 className="section-title">Présents dans<br /><span>10 grandes villes</span></h2>
                        <p className="section-subtitle">Basés à Toulouse, nous vous offrons une adresse professionnelle dans les principales métropoles françaises.</p>
                    </div>
                    <div className="cities-grid">
                        {cities.map((city, i) => (
                            <div key={city.name} className="city-card animate-in" style={{ animationDelay: `${i * 0.06}s` }}>
                                <span className="city-emoji">{city.icon}</span>
                                <div className="city-info">
                                    <span className="city-name">{city.name}</span>
                                    <span className="city-region">{city.desc}</span>
                                </div>
                                <svg className="city-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '40px' }} className="animate-in">
                        <Link to="/villes" className="btn btn-outline" id="all-cities-btn">
                            Explorer toutes nos villes →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Meeting Room ── */}
            <section className="section meeting-section" id="meeting">
                <div className="container">
                    <div className="meeting-grid">
                        <div className="meeting-text animate-in">
                            <div className="section-label" style={{ justifyContent: 'flex-start' }}>Services premium</div>
                            <h2 className="section-title" style={{ textAlign: 'left' }}>Salle de réunion &amp;<br /><span>Bureau à louer</span></h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '17px', lineHeight: '1.7', marginTop: '16px' }}>
                                Impressionnez vos clients et partenaires dans nos espaces professionnels modernes. Disponibles à la demi-journée ou à la journée.
                            </p>
                            <div className="meeting-prices">
                                <div className="meeting-price-item">
                                    <div className="mp-amount">40€ <span>HT</span></div>
                                    <div className="mp-label">La journée complète</div>
                                </div>
                                <div className="meeting-price-divider" />
                                <div className="meeting-price-item">
                                    <div className="mp-amount">20€ <span>HT</span></div>
                                    <div className="mp-label">La demi-journée</div>
                                </div>
                            </div>
                            <div className="meeting-features-list">
                                {['Vidéoprojecteur inclus', 'Connexion WiFi haut débit', 'Accueil et café offerts', 'Capacité jusqu\'à 10 personnes'].map(f => (
                                    <div key={f} className="meeting-feature">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {f}
                                    </div>
                                ))}
                            </div>
                            <Link to="/services" className="btn btn-primary" id="meeting-cta-btn" style={{ marginTop: '12px' }}>
                                Réserver un espace
                            </Link>
                        </div>
                        <div className="meeting-image animate-in">
                            <img src="/meeting-room.png" alt="Salle de réunion professionnelle" />
                            <div className="meeting-badge">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                <span>Jusqu'à 10 personnes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="section testimonials-section" id="testimonials">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Témoignages</div>
                        <h2 className="section-title">Ils nous font <span>confiance</span></h2>
                        <p className="section-subtitle">Rejoignez plus de 3 000 entrepreneurs qui ont choisi DomiciliationPasCher.fr</p>
                    </div>
                    <div className="grid-3">
                        {testimonials.map((t, i) => (
                            <div key={i} className="testimonial-card card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="stars">{'★'.repeat(5)}</div>
                                <p className="testimonial-text">"{t.text}"</p>
                                <div className="testimonial-author">
                                    <div className="author-avatar">{t.name.charAt(0)}</div>
                                    <div>
                                        <div className="author-name">{t.name}</div>
                                        <div className="author-meta">{t.role} · {t.city}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="final-cta section-sm" id="final-cta">
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>Prêt à domicilier<br />votre entreprise ?</h2>
                        <p>Rejoignez +3 000 entrepreneurs. Démarrez en 5 minutes, dès 23€ HT/mois.</p>
                        <div className="final-cta-actions">
                            <Link to="/tarifs" className="btn btn-white btn-lg" id="final-cta-btn">
                                Commencer maintenant
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
