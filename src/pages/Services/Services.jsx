import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import './Services.css';

/* ─── Sub-components ────────────────────────────────── */

function StepCard({ step, index, last }) {
    return (
        <div className="svc-step" id={`step-${step.n}`}>
            <div className="svc-step-left">
                <div className="svc-step-num">{step.n}</div>
                {!last && <div className="svc-step-line" />}
            </div>
            <div className="svc-step-body">
                <h3 className="svc-step-title">{step.title}</h3>
                <p className="svc-step-desc">{step.desc}</p>
                {step.cta && (
                    <Link to={step.cta.to} className="btn btn-primary svc-step-cta" style={{ marginTop: '16px', width: 'fit-content' }}>
                        {step.cta.label}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Link>
                )}
            </div>
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

function useAnimateOnScroll() {
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
            { threshold: 0.08 }
        );
        const els = ref.current?.querySelectorAll('.animate-in') || [];
        els.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
    return ref;
}

/* ─── Page ──────────────────────────────────────────── */

export default function Services() {
    const { tr } = useTranslation();
    const formes = tr.services.formes.items;
    const domiciSteps = tr.services.domiciliation.steps;
    const courrierSteps = tr.services.courrier.steps;
    const creationSteps = tr.services.creation.steps;
    const serviceFaqs = tr.services.faqs.items;

    useEffect(() => {
        document.title = tr.services.pageTitle;
    }, [tr.services.pageTitle]);

    const pageRef = useAnimateOnScroll();
    const [activeStatut, setActiveStatut] = useState('sasu');
    const currentForme = formes.find(f => f.id === activeStatut);

    return (
        <main ref={pageRef} style={{ paddingTop: '68px' }}>

            {/* ══ HEADER ══ */}
            <section className="page-header">
                <div className="container">
                    <div className="page-header-content animate-in">
                        <div className="section-eyebrow">{tr.services.header.eyebrow}</div>
                        <h1 className="section-title" style={{ marginTop: '12px' }}>
                            {tr.services.header.title}<br /><span>{tr.services.header.titleHighlight}</span>
                        </h1>
                        <p className="section-subtitle">
                            {tr.services.header.subtitle}
                        </p>
                        <div className="svc-header-links animate-in">
                            <a href="#domiciliation" className="svc-nav-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                {tr.services.header.links.domiciliation}
                            </a>
                            <a href="#creation" className="svc-nav-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                {tr.services.header.links.creation}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ DOMICILIATION PROCESS ══ */}
            <section className="section" id="domiciliation">
                <div className="container">
                    <div className="svc-two-col animate-in">
                        <div className="svc-col-text">
                            <div className="section-eyebrow">{tr.services.domiciliation.eyebrow}</div>
                            <h2 className="section-title" style={{ textAlign: 'left', marginTop: '10px' }}>
                                {tr.services.domiciliation.title}<br /><span>{tr.services.domiciliation.titleHighlight}</span>
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.7, marginTop: '14px' }}>
                                {tr.services.domiciliation.subtitle}
                            </p>
                            <div className="svc-process-steps" style={{ marginTop: '32px' }}>
                                {domiciSteps.map((step, i) => (
                                    <StepCard key={i} step={step} index={i} last={i === domiciSteps.length - 1} />
                                ))}
                            </div>
                        </div>
                        <div className="svc-col-visual animate-in" style={{ animationDelay: '0.15s' }}>
                            <div className="svc-visual-card svc-vc-blue">
                                <div className="svc-vc-icon">🏢</div>
                                <div className="svc-vc-title">{tr.services.domiciliation.card.title}</div>
                                <div className="svc-vc-sub">{tr.services.domiciliation.card.subtitle}</div>
                                <div className="svc-vc-divider" />
                                <div className="svc-vc-items">
                                    {tr.services.domiciliation.card.items.map(t => (
                                        <div key={t} className="svc-vc-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {t}
                                        </div>
                                    ))}
                                </div>
                                <Link to="/tarifs" className="svc-vc-btn">
                                    {tr.services.domiciliation.card.cta}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ COURRIER ══ */}
            <section className="section" style={{ background: '#F8FAFF', borderTop: '1px solid var(--border)' }} id="courrier">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.services.courrier.eyebrow}</div>
                        <h2 className="section-title" style={{ marginTop: '10px' }}>
                            {tr.services.courrier.title}<br /><span>{tr.services.courrier.titleHighlight}</span>
                        </h2>
                        <p className="section-subtitle">
                            {tr.services.courrier.subtitle}
                        </p>
                    </div>
                    <div className="courrier-steps animate-in">
                        {courrierSteps.map((s, i) => (
                            <div key={i} className="courrier-step">
                                <div className="cs-num">{s.n}</div>
                                {i < courrierSteps.length - 1 && <div className="cs-connector" />}
                                <div className="cs-content">
                                    <h3 className="cs-title">{s.title}</h3>
                                    <p className="cs-desc">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="courrier-options animate-in">
                        {tr.services.courrier.options.map(opt => (
                            <div key={opt.name} className="co-card">
                                <div className="co-icon">{opt.icon}</div>
                                <div>
                                    <div className="co-name">{opt.name}</div>
                                    <div className="co-desc">{opt.desc}</div>
                                </div>
                                <div className="co-price">{opt.price} <span>{opt.period}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CREATION ══ */}
            <section className="section" id="creation" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="svc-two-col animate-in">
                        <div className="svc-col-visual svc-col-visual-left animate-in">
                            <div className="svc-visual-card svc-vc-dark">
                                <div className="svc-vc-icon">🚀</div>
                                <div className="svc-vc-title">{tr.services.creation.card.title}</div>
                                <div className="svc-vc-sub">{tr.services.creation.card.subtitle}</div>
                                <div className="svc-vc-divider" />
                                <div className="svc-vc-items">
                                    {tr.services.creation.card.items.map(t => (
                                        <div key={t} className="svc-vc-item-row">
                                            <span>✅</span> {t}
                                        </div>
                                    ))}
                                </div>
                                <Link to="/tarifs" className="svc-vc-btn">
                                    {tr.services.creation.card.cta}
                                </Link>
                            </div>
                        </div>
                        <div className="svc-col-text">
                            <div className="section-eyebrow">{tr.services.creation.eyebrow}</div>
                            <h2 className="section-title" style={{ textAlign: 'left', marginTop: '10px' }}>
                                {tr.services.creation.title}<br /><span>{tr.services.creation.titleHighlight}</span>
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.7, marginTop: '14px' }}>
                                {tr.services.creation.subtitle}
                            </p>
                            <div className="svc-process-steps" style={{ marginTop: '32px' }}>
                                {creationSteps.map((step, i) => (
                                    <StepCard key={i} step={step} index={i} last={i === creationSteps.length - 1} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FORMES JURIDIQUES ══ */}
            <section className="section" style={{ background: '#F8FAFF', borderTop: '1px solid var(--border)' }} id="formes">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.services.formes.eyebrow}</div>
                        <h2 className="section-title" style={{ marginTop: '10px' }}>
                            {tr.services.formes.title} <span>{tr.services.formes.titleHighlight}</span>
                        </h2>
                        <p className="section-subtitle">
                            {tr.services.formes.subtitle}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="statuts-tabs">
                        {formes.map(f => (
                            <button
                                key={f.id}
                                className={`statut-tab ${activeStatut === f.id ? 'active' : ''}`}
                                onClick={() => setActiveStatut(f.id)}
                                style={{ '--tab-color': f.color }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    {currentForme && (
                        <div className="statut-content">
                            <div className="statut-header" style={{ borderLeft: `4px solid ${currentForme.color}` }}>
                                <span className="statut-badge" style={{ background: `${currentForme.color}15`, color: currentForme.color }}>
                                    {currentForme.label}
                                </span>
                                <p className="statut-intro">
                                    {tr.services.formes.intro.replace('{label}', currentForme.label)}
                                </p>
                            </div>
                            <div className="statut-sections">
                                {currentForme.sections.map((s, i) => (
                                    <div key={i} className="statut-section">
                                        <h3 className="ss-title">
                                            <span className="ss-icon" style={{ background: `${currentForme.color}15`, color: currentForme.color }}>
                                                {['📋', '💰', '👤', '⭐', '🏦'][i]}
                                            </span>
                                            {s.title}
                                        </h3>
                                        <p className="ss-text">{s.text}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="statut-cta-row">
                                <Link to="/tarifs" className="btn btn-primary">
                                    {tr.services.formes.cta.replace('{label}', currentForme.label)}
                                </Link>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                    {tr.services.formes.ctaNote}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="section" id="faq-services" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.services.faqs.eyebrow}</div>
                        <h2 className="section-title" style={{ marginTop: '10px' }}>
                            {tr.services.faqs.title} <span>{tr.services.faqs.titleHighlight}</span>
                        </h2>
                    </div>
                    <div className="faq-grid animate-in">
                        {serviceFaqs.map((faq, i) => (
                            <FaqItem key={i} {...faq} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA ══ */}
            <section className="final-cta section-sm">
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>{tr.services.cta.title}</h2>
                        <p>{tr.services.cta.subtitle}</p>
                        <div className="final-cta-actions">
                            <Link to="/tarifs" className="btn btn-white btn-lg" id="services-final-cta">
                                {tr.services.cta.primary}
                            </Link>
                            <Link to="/about" className="final-cta-link">{tr.services.cta.secondary}</Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
