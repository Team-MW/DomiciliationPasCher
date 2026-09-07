import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import './RendezVous.css';

const CALENDLY_URL = 'https://calendly.com/dev-microdidact/30min';
const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';

export default function RendezVous() {
    const { tr } = useTranslation();
    const widgetRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        document.title = tr.rendezVous.pageTitle;
    }, [tr.rendezVous.pageTitle]);

    useEffect(() => {
        const container = widgetRef.current;
        if (!container) return;

        const initWidget = () => {
            if (!window.Calendly || !widgetRef.current) return;
            widgetRef.current.innerHTML = '';
            window.Calendly.initInlineWidget({
                url: CALENDLY_URL,
                parentElement: widgetRef.current,
            });
            setIsReady(true);
        };

        if (window.Calendly) {
            initWidget();
            return;
        }

        let script = document.querySelector(`script[src="${CALENDLY_SCRIPT}"]`);
        if (!script) {
            script = document.createElement('script');
            script.src = CALENDLY_SCRIPT;
            script.async = true;
            document.body.appendChild(script);
        }
        script.addEventListener('load', initWidget);
        return () => script.removeEventListener('load', initWidget);
    }, []);

    return (
        <main className="page-wrapper rdv-page">
            <section className="rdv-hero">
                <div className="container">
                    <div className="rdv-hero-inner">
                        <div className="section-eyebrow">{tr.rendezVous.eyebrow}</div>
                        <h1 className="section-title" style={{ marginTop: '12px' }}>
                            {tr.rendezVous.title}<br /><span>{tr.rendezVous.titleHighlight}</span>
                        </h1>
                        <p className="section-subtitle">{tr.rendezVous.subtitle}</p>

                        <div className="rdv-benefits">
                            {tr.rendezVous.benefits.map(b => (
                                <div key={b.title} className="rdv-benefit">
                                    <span className="rdv-benefit-icon">{b.icon}</span>
                                    <div>
                                        <div className="rdv-benefit-title">{b.title}</div>
                                        <div className="rdv-benefit-desc">{b.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rdv-calendar-section">
                <div className="container">
                    <div className="rdv-calendar-card">
                        {!isReady && (
                            <div className="rdv-calendar-loading">{tr.rendezVous.loading}</div>
                        )}
                        <div
                            ref={widgetRef}
                            className="calendly-inline-widget"
                            data-url={CALENDLY_URL}
                            style={{ minWidth: '320px', height: '700px' }}
                        />
                    </div>

                    <div className="rdv-footer-links">
                        <Link to="/tarifs" className="rdv-back-link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            {tr.rendezVous.backLink}
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
