import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fichesData } from '../../data/fichesData';
import { useTranslation } from '../../i18n/LanguageContext';
import './FichesPratiques.css';

const FichesPratiques = () => {
    const { tr } = useTranslation();
    const t = tr.fichesPratiques;

    useEffect(() => {
        document.title = t.pageTitle;
    }, [t.pageTitle]);

    const categories = {};
    Object.entries(fichesData).forEach(([slug, data]) => {
        const fiche = t.fiches?.[slug] || data;
        const cat = fiche.category;
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ slug, ...fiche, icon: fiche.icon || data.icon });
    });

    return (
        <div className="page-wrapper" style={{ background: '#FAFBFF' }}>
            <section className="fp-hero">
                <div className="container">
                    <div className="fp-hero-inner">
                        <div className="section-eyebrow">{t.eyebrow}</div>
                        <h1>
                            {t.title} <span>{t.titleHighlight}</span>
                        </h1>
                        <p className="section-subtitle">{t.subtitle}</p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="fp-grid">
                        {Object.entries(categories).map(([cat, fiches]) => (
                            <div key={cat} className="fp-card">
                                <h3>
                                    <span className="fp-card-bar" />
                                    {cat}
                                </h3>
                                <div className="fp-links">
                                    {fiches.map((f) => (
                                        <Link key={f.slug} to={`/fiches-pratiques/${f.slug}`} className="fp-link">
                                            <span>{f.title}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section-sm" style={{ paddingBottom: '100px' }}>
                <div className="container">
                    <div className="fp-cta">
                        <div className="fp-cta-inner">
                            <h2>{t.cta.title}</h2>
                            <p>{t.cta.subtitle}</p>
                            <Link to="/tarifs" className="btn btn-primary btn-lg">
                                {t.cta.button}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FichesPratiques;
