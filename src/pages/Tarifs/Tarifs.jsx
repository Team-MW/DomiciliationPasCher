import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import './Tarifs.css';

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const CrossIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default function Tarifs() {
    const { tr } = useTranslation();

    useEffect(() => {
        document.title = tr.tarifs.pageTitle;
    }, [tr.tarifs.pageTitle]);

    return (
        <main className="page-wrapper">

            {/* Header */}
            <section className="page-header">
                <div className="container">
                    <div className="page-header-content">
                        <div className="section-eyebrow">{tr.tarifs.header.eyebrow}</div>
                        <h1 className="section-title" style={{ marginTop: '12px' }}>
                            {tr.tarifs.header.title}<br /><span>{tr.tarifs.header.titleHighlight}</span>
                        </h1>
                        <p className="section-subtitle">
                            {tr.tarifs.header.subtitle}
                        </p>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="section" style={{ paddingTop: '56px' }}>
                <div className="container">
                    <div className="pricing-grid">
                        {tr.tarifs.plans.map(plan => (
                            <div key={plan.id} className={`pricing-card ${plan.popular ? 'featured' : ''}`} id={`plan-${plan.id}`}>
                                {plan.popular && (
                                    <div className="pricing-badge">{plan.badge}</div>
                                )}
                                <div className="pricing-header">
                                    <div className="pricing-name">{plan.name}</div>
                                    <div className="pricing-sub">{plan.subtitle}</div>
                                    <div className="pricing-amount">
                                        <span className="pricing-currency">€</span>
                                        <span className="pricing-value">{plan.price}</span>
                                        <span className="pricing-period">{plan.period}</span>
                                    </div>
                                </div>
                                <ul className="pricing-features">
                                    {plan.features.map(f => (
                                        <li key={f.text} className={f.ok ? 'ok' : 'no'}>
                                            {f.ok ? <CheckIcon /> : <CrossIcon />}
                                            <span>{f.text}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to={`/souscription?plan=${plan.id}`}
                                    className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    id={`cta-${plan.id}`}
                                >
                                    {plan.cta} →
                                </Link>
                                <p className="pricing-note">{plan.note}</p>
                            </div>
                        ))}
                    </div>

                    {/* Trust indicators */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '40px', flexWrap: 'wrap' }}>
                        {tr.tarifs.trust.items.map(item => (
                            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--gray-600)' }}>
                                <span>{item.icon}</span>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Stripe Trust Badges */}
                    <div className="pricing-payment-trust">
                        <span>{tr.tarifs.trust.payment}</span>
                        <div className="pricing-payment-logos">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Google Pay" loading="lazy" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Options */}
            <section className="section-sm" style={{ background: 'var(--off-white)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="section-eyebrow">{tr.tarifs.options.eyebrow}</div>
                        <h2 className="section-title" style={{ marginTop: '12px' }}>{tr.tarifs.options.title} <span>{tr.tarifs.options.titleHighlight}</span></h2>
                        <p className="section-subtitle">{tr.tarifs.options.subtitle}</p>
                    </div>
                    <div className="options-grid">
                        {tr.tarifs.options.items.map(opt => (
                            <div key={opt.name} className="option-card">
                                <div className="option-icon">{opt.icon}</div>
                                <div className="option-info">
                                    <div className="option-name">{opt.name}</div>
                                    <div className="option-desc">{opt.desc}</div>
                                </div>
                                <div className="option-price">
                                    <span>{opt.price}</span>
                                    <small>{opt.period}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Spaces */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <div className="section-eyebrow">{tr.tarifs.spaces.eyebrow}</div>
                        <h2 className="section-title" style={{ marginTop: '12px' }}>{tr.tarifs.spaces.title} <span>{tr.tarifs.spaces.titleHighlight}</span></h2>
                        <p className="section-subtitle">{tr.tarifs.spaces.subtitle}</p>
                    </div>
                    <div className="grid-2">
                        {tr.tarifs.spaces.items.map(space => (
                            <div key={space.name} className="space-card">
                                <div className="space-header">
                                    <span className="space-icon">{space.icon}</span>
                                    <h3 className="space-name">{space.name}</h3>
                                </div>
                                <div className="space-prices">
                                    {space.prices.map(p => (
                                        <div key={p.duration} className="space-price-row">
                                            <span className="sp-duration">{p.duration}</span>
                                            <span className="sp-amount">{p.amount}</span>
                                        </div>
                                    ))}
                                </div>
                                <ul className="space-features">
                                    {space.features.map(f => (
                                        <li key={f}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/services" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                                    {tr.tarifs.spaces.reserveCta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="section" style={{ background: 'var(--off-white)', borderTop: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="section-eyebrow">{tr.tarifs.faqs.eyebrow}</div>
                        <h2 className="section-title" style={{ marginTop: '12px' }}>{tr.tarifs.faqs.title} <span>{tr.tarifs.faqs.titleHighlight}</span></h2>
                    </div>
                    <div className="faq-list">
                        {tr.tarifs.faqs.items.map((faq, i) => (
                            <details key={i} className="faq-item" id={`faq-${i}`}>
                                <summary className="faq-question">
                                    {faq.q}
                                    <svg className="faq-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </summary>
                                <div className="faq-answer">{faq.a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="final-cta section-sm">
                <div className="container">
                    <div className="final-cta-inner">
                        <h2>{tr.tarifs.cta.title}</h2>
                        <p>{tr.tarifs.cta.subtitle}</p>
                        <div className="final-cta-actions">
                            <Link to="/" className="btn btn-white btn-lg" id="tarifs-final-cta">
                                {tr.tarifs.cta.primary}
                            </Link>
                            <Link to="/services" className="btn btn-lg" style={{ color: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-full)', padding: '16px 32px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex' }}>
                                {tr.tarifs.cta.secondary}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
