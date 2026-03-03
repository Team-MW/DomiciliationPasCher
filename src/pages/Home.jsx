import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const stats = [
    { value: '+3 000', label: 'Entreprises domiciliées' },
    { value: '+50', label: 'Nouvelles créations / semaine' },
    { value: '10', label: 'Métropoles françaises' },
    { value: '23€', label: 'HT / mois seulement' },
];

const features = [
    {
        icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>),
        title: 'Adresse juridique officielle',
        desc: 'Une adresse de siège social valide dans la ville de votre choix, utilisable sur votre Kbis et tous vos documents officiels.',
    },
    {
        icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>),
        title: 'Gestion du courrier',
        desc: 'Réception, tri et notification de chaque courrier reçu. Consultez vos lettres scannées depuis votre espace client sécurisé.',
    },
    {
        icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="3" /></svg>),
        title: 'Salle de réunion',
        desc: 'Espace professionnel équipé (vidéoprojecteur, WiFi fibre, café) pour accueillir vos clients et partenaires dans les meilleures conditions.',
    },
    {
        icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>),
        title: 'Location de bureau',
        desc: 'Bureau privatif calme à la demi-journée ou à la journée. WiFi inclus, sans engagement de durée.',
    },
    {
        icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
        title: 'Centre agréé loi Dutreil',
        desc: 'Domiciliation 100% conforme au cadre légal français. Centre officiellement agréé, tous vos droits sont garantis.',
    },
    {
        icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
        title: 'Attestation sous 24h',
        desc: 'Souscription 100% en ligne en moins de 5 minutes. Votre attestation de domiciliation est émise sous 24 heures ouvrées.',
    },
];

const steps = [
    { n: '01', title: 'Choisissez votre adresse', desc: 'Sélectionnez la ville et la formule adaptés à votre activité parmi nos 10 métropoles.' },
    { n: '02', title: 'Complétez votre dossier', desc: 'Renseignez votre formulaire en ligne et téléchargez vos pièces justificatives en quelques minutes.' },
    { n: '03', title: 'Signez votre contrat', desc: 'Signez électroniquement votre contrat de domiciliation conforme à la loi Dutreil, sans vous déplacer.' },
    { n: '04', title: 'Recevez votre attestation', desc: 'Votre attestation officielle de domiciliation est émise sous 24h, prête pour votre immatriculation.' },
];

const cities = [
    { name: 'Paris', icon: '🗼', desc: 'Île-de-France' },
    { name: 'Lyon', icon: '🦁', desc: 'Auvergne-Rhône-Alpes' },
    { name: 'Marseille', icon: '⚓', desc: 'Provence-Alpes-Côte d\'Azur' },
    { name: 'Nice', icon: '🌊', desc: 'Côte d\'Azur' },
    { name: 'Bordeaux', icon: '🍷', desc: 'Nouvelle-Aquitaine' },
    { name: 'Nantes', icon: '🎡', desc: 'Pays de la Loire' },
    { name: 'Lille', icon: '🏙️', desc: 'Hauts-de-France' },
    { name: 'Rennes', icon: '🏰', desc: 'Bretagne' },
    { name: 'Strasbourg', icon: '🥨', desc: 'Grand Est' },
    { name: 'Toulouse', icon: '🌸', desc: 'Occitanie' },
];

const testimonials = [
    { name: 'Marie L.', role: 'Consultante indépendante', city: 'Lyon', rating: 5, text: 'Service impeccable, tarif imbattable. J\'ai pu immatriculer ma société en 24h. Je recommande vivement !' },
    { name: 'Thomas B.', role: 'Fondateur startup', city: 'Paris', rating: 5, text: 'La domiciliation avec scan est idéale pour moi qui suis souvent en déplacement. Tout est géré en ligne, zéro stress.' },
    { name: 'Sophie M.', role: 'Auto-entrepreneuse', city: 'Marseille', rating: 5, text: 'Ultra simple à mettre en place. Le support répond rapidement et avec professionnalisme. Très bonne expérience.' },
];

const faqs = [
    { q: 'Qu\'est-ce que la domiciliation d\'entreprise ?', a: 'La domiciliation consiste à attribuer une adresse administrative et juridique à votre entreprise. Elle est obligatoire pour l\'immatriculation de votre société et l\'obtention de votre Kbis.' },
    { q: 'Combien de temps pour recevoir l\'attestation ?', a: 'Votre attestation de domiciliation vous est envoyée sous 24h ouvrées après la signature électronique de votre contrat en ligne.' },
    { q: 'La domiciliation est-elle légale ?', a: 'Oui, totalement. Nous sommes un centre de domiciliation officiellement agréé, conforme à la loi Dutreil du 1er août 2003 et à toutes les obligations légales françaises.' },
    { q: 'Puis-je changer d\'adresse ou résilier ?', a: 'Oui. Vous pouvez changer de ville ou résilier votre contrat à tout moment, sans frais. Un simple préavis d\'un mois suffit.' },
    { q: 'Quels documents sont nécessaires ?', a: 'Une pièce d\'identité en cours de validité et un justificatif de domicile à votre nom. Tout se fait en ligne, aucun déplacement requis.' },
    { q: 'Comment fonctionne la gestion du courrier ?', a: 'Nous réceptionnons tous vos courriers, vous notifions par email à chaque arrivée et mettons à disposition un scan numérique en option (+5€/mois).' },
];

function useAnimateOnScroll() {
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        const els = ref.current?.querySelectorAll('.animate-in') || [];
        els.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
    return ref;
}

function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`faq-item ${open ? 'open' : ''}`}>
            <button className="faq-question" onClick={() => setOpen(!open)}>
                <span>{q}</span>
                <span className="faq-chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>
            <div className="faq-answer">
                <div className="faq-answer-inner">{a}</div>
            </div>
        </div>
    );
}

export default function Home() {
    const pageRef = useAnimateOnScroll();

    return (
        <main ref={pageRef} style={{ paddingTop: '68px' }}>

            {/* ══════════ HERO ══════════ */}
            <section className="hero" id="hero">
                <div className="container">
                    <div className="hero-layout">

                        {/* Left — Content */}
                        <div className="hero-content animate-in">

                            <h1 className="hero-title">
                                Domiciliez votre entreprise<br />
                                <span>en France dès <em>23€ HT/mois</em></span>
                            </h1>

                            <p className="hero-subtitle">
                                Obtenez une adresse juridique officielle dans 10 grandes villes françaises. Inscription 100&nbsp;% en ligne, attestation émise sous 24&nbsp;h.
                            </p>

                            <div className="hero-ctas">
                                <Link to="/tarifs" className="btn btn-primary btn-xl" id="hero-cta-primary">
                                    Commencer maintenant
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </Link>
                                <Link to="/services" className="hero-link" id="hero-cta-secondary">
                                    Découvrir nos services
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </Link>
                            </div>

                            <div className="hero-guarantees">
                                {[
                                    { icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>), text: 'Sans engagement' },
                                    { icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>), text: '100 % légal' },
                                    { icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>), text: 'Attestation 24h' },
                                    { icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>), text: 'Déductible fiscalement' },
                                ].map(g => (
                                    <div key={g.text} className="guarantee-item">
                                        <span className="guarantee-icon">{g.icon}</span>
                                        {g.text}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — Visual */}
                        <div className="hero-visual animate-in" style={{ animationDelay: '0.15s' }}>

                            {/* Main card */}
                            <div className="hero-card-main">
                                <div className="hcm-header">
                                    <div className="hcm-avatar">🏢</div>
                                    <div>
                                        <div className="hcm-title">Votre adresse professionnelle</div>
                                        <div className="hcm-sub">Activée sous 24 heures</div>
                                    </div>
                                    <span className="hcm-badge">Actif</span>
                                </div>
                                <div className="hcm-divider" />
                                <div className="hcm-cities">
                                    {['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes'].map(c => (
                                        <span key={c} className="hcm-city-pill">{c}</span>
                                    ))}
                                    <span className="hcm-city-pill hcm-city-more">+4</span>
                                </div>
                                <div className="hcm-divider" />
                                <div className="hcm-price-row">
                                    <span className="hcm-price-label">À partir de</span>
                                    <span className="hcm-price-val">23 <small>€ HT/mois</small></span>
                                </div>
                            </div>

                            {/* Floating badges */}
                            <div className="hero-float hero-float-1">
                                <div className="hf-icon green">✅</div>
                                <div>
                                    <div className="hf-title">Durée d'inscription</div>
                                    <div className="hf-val">Moins de 5 minutes</div>
                                </div>
                            </div>

                            <div className="hero-float hero-float-2">
                                <div className="hf-icon blue">🔒</div>
                                <div>
                                    <div className="hf-title">Conforme</div>
                                    <div className="hf-val">Loi Dutreil 2003</div>
                                </div>
                            </div>

                            {/* Social proof */}
                            <div className="hero-social-proof">
                                <div className="hsp-avatars">
                                    {['M', 'T', 'S', 'A'].map((l, i) => (
                                        <div key={i} className="hsp-avatar" style={{ background: ['#1A56DB', '#0EA5E9', '#10B981', '#F59E0B'][i] }}>{l}</div>
                                    ))}
                                </div>
                                <div className="hsp-text">
                                    <span className="hsp-count">+3 000</span> entrepreneurs nous font confiance
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ TRUST BAR ══════════ */}
            <div className="trust-bar">
                <div className="container">
                    <div className="trust-bar-inner">
                        <span className="trust-bar-label">Reconnu et certifié</span>
                        <div className="trust-bar-sep" />
                        <div className="trust-logos">
                            {['Centre agréé', 'Loi Dutreil 2003', '100 % légal', 'Eligible ACRE', 'Charge déductible'].map(l => (
                                <span key={l} className="trust-logo-item">{l}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════ STATS ══════════ */}
            <section className="stats-section" id="stats">
                <div className="container">
                    <div className="stats-grid">
                        {stats.map((s, i) => (
                            <div key={i} className="stat-item animate-in" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="stat-value">{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ FEATURES ══════════ */}
            <section className="section features-section" id="features">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Nos prestations</div>
                        <h2 className="section-title">Une solution complète<br /><span>pour votre entreprise</span></h2>
                        <p className="section-subtitle">De la domiciliation légale à la location d'espaces professionnels — tout ce dont vous avez besoin, au meilleur prix.</p>
                    </div>
                    <div className="features-grid">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card animate-in" style={{ animationDelay: `${i * 0.06}s` }}>
                                <div className="feature-icon-wrap">{f.icon}</div>
                                <div className="feature-body">
                                    <h3 className="feature-title">{f.title}</h3>
                                    <p className="feature-desc">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ HOW IT WORKS ══════════ */}
            <section className="how-section section" id="how-it-works">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Processus simplifié</div>
                        <h2 className="section-title">Domiciliez-vous<br /><span>en 4 étapes</span></h2>
                        <p className="section-subtitle">Un parcours 100 % en ligne, pensé pour vous faire gagner du temps dès le premier jour.</p>
                    </div>
                    <div className="steps-row">
                        {steps.map((s, i) => (
                            <div key={i} className="step-item animate-in" style={{ animationDelay: `${i * 0.09}s` }}>
                                <div className="step-num">{s.n}</div>
                                {i < steps.length - 1 && <div className="step-connector" />}
                                <h3 className="step-title">{s.title}</h3>
                                <p className="step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ PRICING STRIP ══════════ */}
            <section className="pricing-strip section-sm" id="cta-pricing">
                <div className="container">
                    <div className="pricing-strip-inner">
                        <div className="ps-text animate-in">
                            <div className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>Tarification transparente</div>
                            <h2>La domiciliation<br />la plus compétitive</h2>
                            <p>Pas de frais cachés, pas de mauvaise surprise. <strong>À partir de 23&nbsp;€ HT/mois</strong>, résiliable à tout moment.</p>
                            <Link to="/tarifs" className="btn btn-white btn-lg" id="cta-pricing-btn">
                                Voir tous les tarifs
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </Link>
                        </div>
                        <div className="ps-cards animate-in" style={{ animationDelay: '0.15s' }}>
                            <div className="ps-card">
                                <div className="psc-label">Essentiel</div>
                                <div className="psc-price">23 <span>€ HT/mois</span></div>
                                <ul className="psc-list">
                                    <li>Adresse juridique officielle</li>
                                    <li>Réception du courrier</li>
                                    <li>Attestation de domiciliation</li>
                                    <li>Espace client sécurisé</li>
                                </ul>
                            </div>
                            <div className="ps-card ps-card-featured">
                                <div className="psc-badge">Recommandé</div>
                                <div className="psc-label">Scan+</div>
                                <div className="psc-price">28 <span>€ HT/mois</span></div>
                                <ul className="psc-list">
                                    <li>Tout l'offre Essentiel</li>
                                    <li>Scan numérique du courrier</li>
                                    <li>Accès immédiat en ligne</li>
                                    <li>Archivage électronique</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ CITIES ══════════ */}
            <section className="section cities-section" id="cities">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Présence nationale</div>
                        <h2 className="section-title">Une adresse dans<br /><span>10 grandes villes</span></h2>
                        <p className="section-subtitle">Basés à Toulouse, nous couvrons les principales métropoles économiques françaises.</p>
                    </div>
                    <div className="cities-grid">
                        {cities.map((city, i) => (
                            <div key={city.name} className="city-card animate-in" style={{ animationDelay: `${i * 0.04}s` }}>
                                <span className="city-emoji">{city.icon}</span>
                                <div className="city-info">
                                    <span className="city-name">{city.name}</span>
                                    <span className="city-region">{city.desc}</span>
                                </div>
                                <svg className="city-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
                        ))}
                    </div>
                    <div className="cities-cta animate-in">
                        <Link to="/villes" className="btn btn-outline" id="all-cities-btn">
                            Explorer toutes nos villes
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══════════ TESTIMONIALS ══════════ */}
            <section className="testimonials-section section" id="testimonials">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Avis clients</div>
                        <h2 className="section-title">Ils nous font <span>confiance</span></h2>
                        <p className="section-subtitle">Plus de 3 000 entrepreneurs ont choisi DomiciliationPasCher.fr pour leur adresse professionnelle.</p>
                    </div>
                    <div className="testimonials-grid">
                        {testimonials.map((t, i) => (
                            <div key={i} className="testimonial-card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="tc-top">
                                    <div className="tc-stars">
                                        {'★'.repeat(t.rating)}
                                    </div>
                                </div>
                                <p className="tc-text">"{t.text}"</p>
                                <div className="tc-author">
                                    <div className="tc-avatar">{t.name.charAt(0)}</div>
                                    <div>
                                        <div className="tc-name">{t.name}</div>
                                        <div className="tc-meta">{t.role} · {t.city}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '40px', flexWrap: 'wrap' }} className="animate-in">
                        <div className="review-platform">
                            <div className="review-stars">★★★★★</div>
                            <div className="review-score">4.8 / 5</div>
                            <div className="review-platform-name">Trustpilot</div>
                        </div>
                        <div className="review-sep" />
                        <div className="review-platform">
                            <div className="review-stars">★★★★★</div>
                            <div className="review-score">4.7 / 5</div>
                            <div className="review-platform-name">Google Avis</div>
                        </div>
                        <div className="review-sep" />
                        <div className="review-platform">
                            <div className="review-stars">★★★★★</div>
                            <div className="review-score">4.6 / 5</div>
                            <div className="review-platform-name">Avis Vérifiés</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ FAQ ══════════ */}
            <section className="faq-section section" id="faq">
                <div className="container">
                    <div className="faq-layout">
                        <div className="faq-header animate-in">
                            <div className="section-eyebrow">FAQ</div>
                            <h2 className="section-title" style={{ textAlign: 'left' }}>
                                Questions<br /><span>fréquentes</span>
                            </h2>
                            <p style={{ color: 'var(--gray-500)', fontSize: '15px', lineHeight: 1.7, marginTop: '12px' }}>
                                Tout ce que vous devez savoir sur la domiciliation d'entreprise en France.
                            </p>
                            <Link to="/tarifs" className="btn btn-primary" style={{ marginTop: '24px', width: 'fit-content' }}>
                                Voir nos offres
                            </Link>
                        </div>
                        <div className="faq-list animate-in" style={{ animationDelay: '0.1s' }}>
                            {faqs.map((faq, i) => <FaqItem key={i} {...faq} />)}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ FINAL CTA ══════════ */}
            <section className="final-cta section" id="final-cta">
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>Prêt à franchir le pas ?</h2>
                        <p>Rejoignez plus de 3 000 entrepreneurs. Démarrez en 5 minutes, dès 23 € HT/mois.</p>
                        <div className="final-cta-actions">
                            <Link to="/tarifs" className="btn btn-white btn-xl" id="final-cta-btn">
                                Commencer maintenant
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </Link>
                            <Link to="/services" className="final-cta-link">Découvrir nos services →</Link>
                        </div>
                        <div className="final-cta-badges">
                            {['Sans engagement', 'Attestation 24h', 'Support réactif', '100 % légal'].map(b => (
                                <div key={b} className="final-cta-badge">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    {b}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
