import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import './RendezVous.css';

const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';
const DEFAULT_CALENDLY = 'https://calendly.com/dev-microdidact/30min';
const CALENDLY_URL = (import.meta.env.VITE_CALENDLY_URL || DEFAULT_CALENDLY).trim();

export default function RendezVous() {
    const { tr } = useTranslation();
    const widgetRef = useRef(null);
    const readyRef = useRef(false);
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        document.title = tr.rendezVous.pageTitle;
    }, [tr.rendezVous.pageTitle]);

    useEffect(() => {
        const container = widgetRef.current;
        if (!container) return;

        let cancelled = false;
        let timeoutId;

        const initWidget = () => {
            if (cancelled || !window.Calendly || !widgetRef.current) return;
            try {
                widgetRef.current.innerHTML = '';
                window.Calendly.initInlineWidget({
                    url: CALENDLY_URL,
                    parentElement: widgetRef.current,
                });
                if (!cancelled) {
                    readyRef.current = true;
                    setIsReady(true);
                }
            } catch (err) {
                console.error('Calendly init error:', err);
                if (!cancelled) setHasError(true);
            }
        };

        timeoutId = window.setTimeout(() => {
            if (!cancelled && !readyRef.current) setHasError(true);
        }, 10000);

        if (window.Calendly) {
            initWidget();
            return () => {
                cancelled = true;
                window.clearTimeout(timeoutId);
            };
        }

        let script = document.querySelector(`script[src="${CALENDLY_SCRIPT}"]`);
        if (!script) {
            script = document.createElement('script');
            script.src = CALENDLY_SCRIPT;
            script.async = true;
            document.body.appendChild(script);
        }

        const onLoad = () => {
            script.setAttribute('data-calendly-ready', '1');
            initWidget();
        };
        const onError = () => {
            if (!cancelled) setHasError(true);
        };

        // Script déjà chargé (navigation retour) : l'événement 'load' ne se rejoue pas.
        if (script.getAttribute('data-calendly-ready') === '1') {
            initWidget();
        } else {
            script.addEventListener('load', onLoad);
            script.addEventListener('error', onError);
        }

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
            script.removeEventListener('load', onLoad);
            script.removeEventListener('error', onError);
        };
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
                        {hasError ? (
                            <div className="rdv-calendar-fallback">
                                <h3>{tr.rendezVous.errorTitle}</h3>
                                <p>{tr.rendezVous.errorBody}</p>
                                <div className="rdv-fallback-actions">
                                    <a
                                        href={CALENDLY_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        {tr.rendezVous.openCalendly}
                                    </a>
                                    <a
                                        href="mailto:contact@domiciliation-pas-cher.com?subject=Prise%20de%20rendez-vous"
                                        className="btn btn-outline"
                                    >
                                        {tr.rendezVous.contactCta}
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <>
                                {!isReady && (
                                    <div className="rdv-calendar-loading">{tr.rendezVous.loading}</div>
                                )}
                                <div
                                    ref={widgetRef}
                                    className="calendly-inline-widget"
                                    data-url={CALENDLY_URL}
                                    style={{ minWidth: '320px', height: '700px' }}
                                />
                            </>
                        )}
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
