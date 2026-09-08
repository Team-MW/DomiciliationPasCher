import { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { fichesData } from '../../data/fichesData';
import { useTranslation } from '../../i18n/LanguageContext';
import './FicheDetail.css';

const FicheDetail = () => {
    const { slug } = useParams();
    const { tr } = useTranslation();
    const t = tr.fichesPratiques;
    const base = fichesData[slug];
    const fiche = base ? (t.fiches?.[slug] || base) : null;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    useEffect(() => {
        if (fiche?.title) {
            document.title = `${fiche.title} — DomiciliationPasCher`;
        }
    }, [fiche?.title]);

    if (!fiche) {
        return <Navigate to="/fiches-pratiques" replace />;
    }

    const otherFiches = Object.entries(fichesData)
        .filter(([key]) => key !== slug)
        .slice(0, 5)
        .map(([s, data]) => ({ slug: s, ...(t.fiches?.[s] || data) }));

    return (
        <div className="page-wrapper" style={{ background: '#FAFBFF' }}>
            <header className="fd-header">
                <div className="container">
                    <Link to="/fiches-pratiques" className="fd-back">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        {t.backLink}
                    </Link>
                    <div className="fd-meta">
                        <span className="fd-badge">{fiche.category}</span>
                    </div>
                    <h1>{fiche.title}</h1>
                </div>
            </header>

            <section className="section fd-body">
                <div className="container fd-layout">
                    <article className="fd-article">
                        <div className="fd-icon">{fiche.icon || base.icon}</div>
                        <div className="fd-prose">
                            <p>{fiche.content}</p>
                            <p>{t.genericContent}</p>
                            <div className="fd-tip">
                                <h3>{t.expertTip}</h3>
                                <p>{t.expertTipText}</p>
                            </div>
                            <p>{t.genericContent2}</p>
                        </div>
                    </article>

                    <aside className="fd-aside">
                        <div className="fd-help">
                            <h3>{t.sidebar.needHelp}</h3>
                            <p>{t.sidebar.helpDesc}</p>
                            <Link to="/tarifs" className="btn btn-primary">
                                {t.sidebar.helpCta}
                            </Link>
                        </div>

                        <h4 className="fd-similar-title">{t.sidebar.similarArticles}</h4>
                        <div className="fd-similar">
                            {otherFiches.map((f) => (
                                <Link key={f.slug} to={`/fiches-pratiques/${f.slug}`} className="fd-similar-link">
                                    <span className="fd-similar-cat">{f.category}</span>
                                    <span className="fd-similar-title-link">{f.title}</span>
                                </Link>
                            ))}
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
};

export default FicheDetail;
