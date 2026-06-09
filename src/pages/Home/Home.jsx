import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CityIcons } from '../../utils/cityIcons';
import { sendWelcomeEmail } from '../../utils/emailService';
import { adminDataService } from '../../services/adminDataService';
import { useTranslation } from '../../i18n/LanguageContext';
import './Home.css';

const FEATURE_ICONS = [
    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>),
    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>),
    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="3" /></svg>),
    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>),
    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
];

const EXTRA_SERVICE_ICONS = [
    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 7l3 3m0 0l-3 3m3-3H6m15-3v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8l8 5z" /></svg>),
    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2zM7 14v-4M17 14v-4M12 12h.01" /></svg>),
    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 13a19.79 19.79 0 01-3.07-8.67A2 2 0 013.6 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>),
    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m11-10a4 4 0 11-8 0 4 4 0 018 0zM23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>),
];

const STEP_ICONS = [
    (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
    ),
    (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    ),
    (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" />
            <polygon points="18 2 22 6 12 16 8 16 8 12 18 2" />
        </svg>
    ),
    (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.5-1 1-4c2 1 3 3 4 4z" />
            <path d="M15 15v5c-1 2-3 3-4 4s1-3 1-4z" />
        </svg>
    ),
];

const GUARANTEE_ICON = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

function renderPlanFeature(feature) {
    if (typeof feature === 'string') return feature;
    const { text, bold, suffix } = feature;
    if (bold && suffix) {
        return <><strong>{text}</strong>{suffix}</>;
    }
    if (bold) {
        return <strong>{text}</strong>;
    }
    return text;
}

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
    const { tr } = useTranslation();
    const pageRef = useAnimateOnScroll();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const features = tr.home.features.items.map((item, i) => ({
        ...item,
        icon: FEATURE_ICONS[i],
    }));

    const extraServices = tr.home.extraServices.map((item, i) => ({
        ...item,
        icon: EXTRA_SERVICE_ICONS[i],
    }));

    const steps = tr.home.steps.items.map((item, i) => ({
        ...item,
        icon: STEP_ICONS[i],
    }));

    const cities = tr.home.cities.items.map((city) => ({
        name: city.name,
        desc: city.region,
        icon: CityIcons.Toulouse,
    }));

    useEffect(() => {
        document.title = tr.home.pageTitle;
    }, [tr.home.pageTitle]);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 600);
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // --- EMAIL JS ON PAYMENT SUCCESS ---
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            const sessionId = params.get('session_id');
            const pendingDemandeId = localStorage.getItem('pending_demande_id');

            const verifyAndConfirm = async () => {
                let isValid = true;
                let stripeData = null;
                
                // Si on a un session_id, on demande au serveur de vérifier VRAIMENT chez Stripe
                if (sessionId) {
                    try {
                        const res = await fetch(`/api/verify-session?session_id=${sessionId}`);
                        stripeData = await res.json();
                        isValid = stripeData.success;
                    } catch (err) {
                        console.error("Erreur verification Stripe:", err);
                        isValid = false; 
                    }
                }

                if (isValid) {
                    setShowSuccessModal(true);
                    const pendingEmail = localStorage.getItem('pending_emailjs');
                    const pendingName = localStorage.getItem('pending_namejs');
                    const stripeCustomerId = stripeData?.customer_id || null;

                    const demandIdToConfirm = pendingDemandeId || stripeData?.metadata?.demande_id;

                    if (demandIdToConfirm) {
                        await adminDataService.confirmDemandePayment(demandIdToConfirm, sessionId, stripeCustomerId);
                        
                        const emailToUse = pendingEmail || stripeData?.metadata?.email || stripeData?.customer_email;
                        const nameToUse = pendingName || stripeData?.metadata?.clientName;
                        if (emailToUse) {
                            sendWelcomeEmail(emailToUse, nameToUse || '');
                        }
                        
                        localStorage.setItem('last_successful_session', sessionId);
                        localStorage.removeItem('pending_demande_id');
                        localStorage.removeItem('pending_emailjs');
                        localStorage.removeItem('pending_namejs');
                        localStorage.setItem('allow_registration', 'true');
                    }
                } else {
                    console.error("Paiement non valide selon Stripe.");
                }
            };

            verifyAndConfirm();
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
                                {tr.home.hero.title}<br />
                                <span>{tr.home.hero.titleHighlight}</span>
                            </h1>

                            <p className="hero-subtitle">
                                {tr.home.hero.subtitle}
                            </p>

                            <div className="hero-ctas">
                                <Link to="/tarifs" className="btn btn-primary btn-xl" id="hero-cta-primary">
                                    {tr.home.hero.ctaPrimary}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </Link>
                                <Link to="/services" className="hero-link" id="hero-cta-secondary">
                                    {tr.home.hero.ctaSecondary}
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </Link>
                            </div>

                            <div className="hero-guarantees">
                                {tr.home.guarantees.map(text => (
                                    <div key={text} className="guarantee-item">
                                        <span className="guarantee-icon">{GUARANTEE_ICON}</span>
                                        {text}
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
                                        <div className="hcm-title">{tr.home.heroCard.title}</div>
                                        <div className="hcm-sub">{tr.home.heroCard.subtitle}</div>
                                    </div>
                                    <span className="hcm-badge">{tr.home.heroCard.badge}</span>
                                </div>
                                <div className="hcm-divider" />
                                <div className="hcm-cities">
                                    {tr.home.heroCard.cities.map(c => (
                                        <span key={c} className="hcm-city-pill">{c}</span>
                                    ))}
                                </div>
                                <div className="hcm-divider" />
                                <div className="hcm-price-row">
                                    <span className="hcm-price-label">{tr.home.heroCard.priceLabel}</span>
                                    <span className="hcm-price-val">{tr.home.heroCard.priceValue} <small>{tr.home.heroCard.priceUnit}</small></span>
                                </div>
                            </div>

                            {/* Floating badges */}
                            <div className="hero-float hero-float-1">
                                <div className="hf-icon green">✅</div>
                                <div>
                                    <div className="hf-title">{tr.home.heroCard.float1.title}</div>
                                    <div className="hf-val">{tr.home.heroCard.float1.value}</div>
                                </div>
                            </div>

                            <div className="hero-float hero-float-2">
                                <div className="hf-icon blue">🔒</div>
                                <div>
                                    <div className="hf-title">{tr.home.heroCard.float2.title}</div>
                                    <div className="hf-val">{tr.home.heroCard.float2.value}</div>
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
                                    <span className="hsp-count">{tr.home.heroCard.socialProof}</span> {tr.home.heroCard.socialProofText}
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
                        <span className="trust-bar-label">{tr.home.trustBar.label}</span>
                        <div className="trust-bar-sep" />
                        <div className="trust-logos">
                            {tr.home.trustBar.items.map(l => (
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
                        {tr.home.stats.map((s, i) => (
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
                        <div className="section-eyebrow">{tr.home.features.eyebrow}</div>
                        <h2 className="section-title">{tr.home.features.title}<br /><span>{tr.home.features.titleHighlight}</span></h2>
                        <p className="section-subtitle">{tr.home.features.subtitle}</p>
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
                        <h4 className="extra-services-title">{tr.home.features.extraServicesTitle}</h4>
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
                        <div className="section-eyebrow">{tr.home.steps.eyebrow}</div>
                        <h2 className="section-title">{tr.home.steps.title}<br /><span>{tr.home.steps.titleHighlight}</span></h2>
                        <p className="section-subtitle">{tr.home.steps.subtitle}</p>
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
                            <div className="ps-eyebrow-white">{tr.home.pricing.eyebrow}</div>
                            <h2 className="ps-main-title">{tr.home.pricing.title}<br /><span>{tr.home.pricing.titleHighlight}</span></h2>
                            <p className="ps-main-desc">{tr.home.pricing.desc} <br /><strong>{tr.home.pricing.descHighlight}</strong>{tr.home.pricing.descSuffix}</p>

                            <div className="ps-cta-wrapper">
                                <Link to="/tarifs" className="btn-ps-cta" id="cta-pricing-btn">
                                    {tr.home.pricing.cta}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </Link>
                                <div className="ps-cta-trust">
                                    {tr.home.pricing.trust.map((item, i) => (
                                        <span key={item}>
                                            {i > 0 && <span className="ps-trust-sep" />}
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="ps-cards animate-in" style={{ animationDelay: '0.15s' }}>
                            {tr.home.pricing.plans.map((plan) => (
                                <div key={plan.name} className={`ps-card${plan.badge ? ' ps-card-featured' : ''}`}>
                                    {plan.badge && <div className="psc-badge">{plan.badge}</div>}
                                    <div className="psc-header">
                                        <div className="psc-label">{plan.name}</div>
                                        <div className="psc-price">{plan.price} <span>{plan.period}</span></div>
                                        <p className="psc-desc">{plan.desc}</p>
                                    </div>
                                    <ul className="psc-list">
                                        {plan.features.map((feature, i) => (
                                            <li key={i}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                {typeof feature === 'string' ? feature : <span>{renderPlanFeature(feature)}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                    {plan.cta && (
                                        <Link to="/souscription" className="psc-btn-featured">{plan.cta}</Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ CITIES ══════════ */}
            <section className="section cities-section" id="cities">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.home.cities.eyebrow}</div>
                        <h2 className="section-title">{tr.home.cities.title}<br /><span>{tr.home.cities.titleHighlight}</span></h2>
                        <p className="section-subtitle">{tr.home.cities.subtitle}</p>
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
                            {tr.home.cities.cta}
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══════════ TESTIMONIALS ══════════ */}
            <section className="testimonials-section section" id="testimonials">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.home.testimonials.eyebrow}</div>
                        <h2 className="section-title">{tr.home.testimonials.title}</h2>
                        <p className="section-subtitle">{tr.home.testimonials.subtitle}</p>
                    </div>
                    <div className="testimonials-grid">
                        {tr.home.testimonials.items.map((t, i) => (
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
                        {tr.home.testimonials.platforms.flatMap((platform, i) => [
                            ...(i > 0 ? [<div key={`sep-${i}`} className="review-sep" />] : []),
                            <div key={platform.name} className="review-platform">
                                <div className="review-stars">★★★★★</div>
                                <div className="review-score">{platform.score}</div>
                                <div className="review-platform-name">{platform.name}</div>
                            </div>,
                        ])}
                    </div>
                </div>
            </section>

            {/* ══════════ FAQ ══════════ */}
            <section className="faq-section section" id="faq">
                <div className="container">
                    <div className="faq-layout">
                        <div className="faq-header animate-in">
                            <div className="section-eyebrow">{tr.home.faqs.eyebrow}</div>
                            <h2 className="section-title faq-title">
                                {tr.home.faqs.title}<br /><span>{tr.home.faqs.titleHighlight}</span>
                            </h2>
                            <p className="faq-intro-text">
                                {tr.home.faqs.intro}
                            </p>
                            <Link to="/tarifs" className="btn btn-primary faq-cta-btn">
                                {tr.home.faqs.cta}
                            </Link>
                        </div>
                        <div className="faq-list animate-in" style={{ animationDelay: '0.1s' }}>
                            {tr.home.faqs.items.map((faq, i) => <FaqItem key={i} {...faq} />)}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ FINAL CTA ══════════ */}
            <section className="final-cta section" id="final-cta">
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>{tr.home.finalCta.title}</h2>
                        <p>{tr.home.finalCta.subtitle}</p>
                        <div className="final-cta-actions">
                            <Link to="/tarifs" className="btn btn-white btn-xl" id="final-cta-btn">
                                {tr.home.finalCta.ctaPrimary}
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </Link>
                            <Link to="/services" className="final-cta-link">{tr.home.finalCta.ctaSecondary}</Link>
                        </div>
                        <div className="final-cta-badges">
                            {tr.home.finalCta.badges.map(b => (
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
                aria-label={tr.common.backToTop}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
            </button>
            
            {showSuccessModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(8, 12, 24, 0.95)',
                    backdropFilter: 'blur(15px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    padding: '20px',
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        maxWidth: '500px',
                        width: '100%',
                        borderRadius: '28px',
                        padding: '44px 40px',
                        textAlign: 'center',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        position: 'relative',
                    }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            background: '#ECFDF5',
                            color: '#10B981',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 28px auto',
                            fontSize: '32px',
                            boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
                            animation: 'pulse 2s infinite'
                        }}>
                            ✅
                        </div>
                        
                        <h2 style={{
                            fontSize: '26px',
                            fontWeight: '900',
                            color: '#0F172A',
                            marginBottom: '16px',
                            letterSpacing: '-0.03em',
                            lineHeight: '1.2'
                        }}>
                            {tr.home.successModal.title}<br/>
                            <span style={{ color: '#10B981', fontSize: '20px', fontWeight: '800' }}>{tr.home.successModal.subtitle}</span>
                        </h2>
                        
                        <div style={{
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            borderRadius: '16px',
                            padding: '18px',
                            marginBottom: '28px',
                            textAlign: 'left',
                        }}>
                            <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {tr.home.successModal.warningTitle}
                            </h3>
                            <p style={{ fontSize: '13.5px', color: '#78350F', lineHeight: '1.5', margin: 0 }}>
                                {tr.home.successModal.warningText}
                            </p>
                        </div>
                        
                        <p style={{
                            fontSize: '14.5px',
                            color: '#64748B',
                            lineHeight: '1.6',
                            marginBottom: '32px'
                        }}>
                            {tr.home.successModal.info}
                        </p>
                        
                        <Link 
                            to="/inscription"
                            onClick={() => setShowSuccessModal(false)}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '18px',
                                background: '#10B981',
                                color: '#FFFFFF',
                                borderRadius: '14px',
                                fontSize: '16px',
                                fontWeight: '800',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                                border: 'none',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {tr.home.successModal.cta}
                        </Link>
                    </div>
                </div>
            )}
        </main>
    );
}
