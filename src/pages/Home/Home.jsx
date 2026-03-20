import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CityIcons } from '../../utils/cityIcons';
import { sendWelcomeEmail } from '../../utils/emailService';
import './Home.css';

const stats = [
    { prefix: '+', target: 3000, suffix: '', label: 'Entreprises domiciliées' },
    { prefix: '+', target: 50, suffix: '', label: 'Nouvelles créations / semaine' },
    { prefix: '', target: 10, suffix: '', label: 'Métropoles françaises' },
    { prefix: '', target: 23, suffix: '€', label: 'HT / mois seulement' },
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

const extraServices = [
    { label: 'Assistance juridique', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 7l3 3m0 0l-3 3m3-3H6m15-3v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8l8 5z" /></svg>) },
    { label: 'Salles de réunion', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2zM7 14v-4M17 14v-4M12 12h.01" /></svg>) },
    { label: 'Standard téléphonique', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 13a19.79 19.79 0 01-3.07-8.67A2 2 0 013.6 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>) },
    { label: 'Accès offres partenaires', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m11-10a4 4 0 11-8 0 4 4 0 018 0zM23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>) },
];

const steps = [
    {
        n: '01',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
        ),
        tag: 'Choix libre',
        title: 'Choisissez votre adresse',
        desc: 'Sélectionnez la ville et la formule adaptés à votre activité parmi nos 10 métropoles.'
    },
    {
        n: '02',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
        ),
        tag: '100% Digital',
        title: 'Complétez votre dossier',
        desc: 'Renseignez votre formulaire en ligne et téléchargez vos pièces justificatives en quelques secondes.'
    },
    {
        n: '03',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" />
                <polygon points="18 2 22 6 12 16 8 16 8 12 18 2" />
            </svg>
        ),
        tag: 'Légal & Sûr',
        title: 'Signez votre contrat',
        desc: 'Signez électroniquement votre contrat conforme à la loi Dutreil, sans aucun déplacement.'
    },
    {
        n: '04',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.5-1 1-4c2 1 3 3 4 4z" />
                <path d="M15 15v5c-1 2-3 3-4 4s1-3 1-4z" />
            </svg>
        ),
        tag: 'Prêt en 24h',
        title: 'Recevez votre attestation',
        desc: 'Votre attestation officielle est émise sous 24h, prête pour votre immatriculation immédiate.'
    },
];

const cities = [
    { name: 'Paris', icon: CityIcons.Paris, desc: 'Île-de-France' },
    { name: 'Lyon', icon: CityIcons.Lyon, desc: 'Auvergne-Rhône-Alpes' },
    { name: 'Marseille', icon: CityIcons.Marseille, desc: 'Provence-Alpes-Côte d\'Azur' },
    { name: 'Nice', icon: CityIcons.Nice, desc: 'Côte d\'Azur' },
    { name: 'Bordeaux', icon: CityIcons.Bordeaux, desc: 'Nouvelle-Aquitaine' },
    { name: 'Nantes', icon: CityIcons.Nantes, desc: 'Pays de la Loire' },
    { name: 'Lille', icon: CityIcons.Lille, desc: 'Hauts-de-France' },
    { name: 'Rennes', icon: CityIcons.Rennes, desc: 'Bretagne' },
    { name: 'Strasbourg', icon: CityIcons.Strasbourg, desc: 'Grand Est' },
    { name: 'Toulouse', icon: CityIcons.Toulouse, desc: 'Occitanie' },
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

/* ── Hook compteur animé ── */
function useCountUp(target, duration = 1800) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
            { threshold: 0.4 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started) return;
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // easeOutQuart
            const ease = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(ease * target));
            if (progress < 1) requestAnimationFrame(step);
            else setCount(target);
        };
        requestAnimationFrame(step);
    }, [started, target, duration]);

    return { count, ref };
}

/* ── Composant stat avec comptage ── */
function StatItem({ prefix, target, suffix, label, delay = 0 }) {
    const { count, ref } = useCountUp(target, 1600 + delay * 200);
    // Formatage : espace pour les milliers
    const formatted = count >= 1000
        ? count.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0')
        : String(count);
    return (
        <div ref={ref} className="stat-item animate-in" style={{ animationDelay: `${delay * 0.08}s` }}>
            <div className="stat-value">{prefix}{formatted}{suffix}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

/* ── Stepper interactif et auto-animé ── */
function StepsAnimator({ steps }) {
    const [activeStep, setActiveStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    // Détecte quand la section est visible pour commencer le cycle
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
            { threshold: 0.4 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Cycle automatique toutes les 2.8s
    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setActiveStep(prev => (prev + 1) % steps.length);
        }, 2800);
        return () => clearInterval(interval);
    }, [isVisible, steps.length]);

    return (
        <div ref={ref} className="steps-row animate-in">
            <div className="steps-progress-bg">
                <div
                    className="steps-progress-fill"
                    style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                />
            </div>
            {steps.map((s, i) => {
                const isActive = i <= activeStep;
                return (
                    <div
                        key={i}
                        className={`step-item ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveStep(i)}
                        onMouseEnter={() => setActiveStep(i)}
                    >
                        <div className="step-num">
                            <span className="step-count">{s.n}</span>
                            <span className="step-icon-float">{s.icon}</span>
                        </div>
                        <h3 className="step-title">{s.title}</h3>
                        <p className="step-desc">{s.desc}</p>
                        <div className="step-tag-wrapper">
                            <span className="step-tag">{s.tag}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
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
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        document.title = "Domiciliation d'entreprise pas chère — Dès 23€ HT/mois — Domiciliation-Pas-Cher.com";
    }, []);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 600);
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // --- EMAIL JS ON PAYMENT SUCCESS ---
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            const pendingEmail = localStorage.getItem('pending_emailjs');
            const pendingName = localStorage.getItem('pending_namejs');
            if (pendingEmail) {
                sendWelcomeEmail(pendingEmail, pendingName);
                localStorage.removeItem('pending_emailjs');
                localStorage.removeItem('pending_namejs');
            }
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <main ref={pageRef} className="page-wrapper">

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
                            <StatItem
                                key={i}
                                prefix={s.prefix}
                                target={s.target}
                                suffix={s.suffix}
                                label={s.label}
                                delay={i}
                            />
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

                    {/* BARRE SERVICES COMPLÉMENTAIRES */}
                    <div className="extra-services-wrapper animate-in" style={{ animationDelay: '0.4s' }}>
                        <h4 className="extra-services-title">Nos services complémentaires</h4>
                        <div className="extra-services-bar">
                            {extraServices.map((s, i) => (
                                <div key={i} className="extra-service-pill">
                                    <span className="extra-pill-icon">{s.icon}</span>
                                    <span className="extra-pill-label">{s.label}</span>
                                </div>
                            ))}
                        </div>
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
                    <StepsAnimator steps={steps} />
                </div>
            </section>

            {/* ══════════ PRICING STRIP ══════════ */}
            <section className="pricing-strip section" id="cta-pricing">
                {/* Éléments décoratifs d'arrière-plan */}
                <div className="ps-decor-1"></div>
                <div className="ps-decor-2"></div>
                <div className="ps-grid-pattern"></div>

                <div className="container">
                    <div className="pricing-strip-inner">
                        <div className="ps-text animate-in">
                            <div className="ps-eyebrow-white">Tarification transparente</div>
                            <h2 className="ps-main-title">La domiciliation<br /><span>la plus compétitive</span></h2>
                            <p className="ps-main-desc">Pas de frais cachés, pas de mauvaise surprise. <br /><strong>À partir de 23&nbsp;€ HT/mois</strong>, résiliable à tout moment.</p>

                            <div className="ps-cta-wrapper">
                                <Link to="/tarifs" className="btn-ps-cta" id="cta-pricing-btn">
                                    Découvrir toutes nos offres
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </Link>
                                <div className="ps-cta-trust">
                                    <span>Sans engagement</span>
                                    <span className="ps-trust-sep"></span>
                                    <span>Activation sous 24h</span>
                                    <span className="ps-trust-sep"></span>
                                    <span>Satisfait ou remboursé</span>
                                </div>
                            </div>
                        </div>

                        <div className="ps-cards animate-in" style={{ animationDelay: '0.15s' }}>
                            {/* Carte Essentiel */}
                            <div className="ps-card">
                                <div className="psc-header">
                                    <div className="psc-label">Essentiel</div>
                                    <div className="psc-price">23 <span>€ HT / mois</span></div>
                                    <p className="psc-desc">Idéal pour le lancement de votre activité.</p>
                                </div>
                                <ul className="psc-list">
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        <span>Adresse juridique <strong>officielle</strong></span>
                                    </li>
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        Réception du courrier simple
                                    </li>
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        Attestation de domiciliation immédiate
                                    </li>
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        Espace client 100% sécurisé
                                    </li>
                                </ul>
                            </div>

                            {/* Carte Recommandée */}
                            <div className="ps-card ps-card-featured">
                                <div className="psc-badge">Le plus populaire</div>
                                <div className="psc-header">
                                    <div className="psc-label">Scan+</div>
                                    <div className="psc-price">28 <span>€ HT / mois</span></div>
                                    <p className="psc-desc">Gérez tout en ligne, où que vous soyez.</p>
                                </div>
                                <ul className="psc-list">
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        Tout l'offre Essentiel
                                    </li>
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        <strong>Scan numérique</strong> quotidien
                                    </li>
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        Notification en temps réel
                                    </li>
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        Archivage à vie des scans
                                    </li>
                                </ul>
                                <Link to="/souscription" className="psc-btn-featured">Commencer ici</Link>
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
                                <span className="city-icon-wrap">{city.icon}</span>
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
                        <p className="section-subtitle">Plus de 3 000 entrepreneurs ont choisi Domiciliation-Pas-Cher.com pour leur adresse professionnelle.</p>
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
                    <div className="review-platforms animate-in">
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
                            <h2 className="section-title faq-title">
                                Questions<br /><span>fréquentes</span>
                            </h2>
                            <p className="faq-intro-text">
                                Tout ce que vous devez savoir sur la domiciliation d'entreprise en France.
                            </p>
                            <Link to="/tarifs" className="btn btn-primary faq-cta-btn">
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

            {/* Back to top button */}
            <button
                className={`back-to-top ${showScrollTop ? 'visible' : ''}`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Retour en haut"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
            </button>
        </main>
    );
}
