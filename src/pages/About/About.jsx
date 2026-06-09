import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import './About.css';

export default function About() {
    const { tr } = useTranslation();

    useEffect(() => {
        document.title = tr.about.pageTitle;
    }, [tr.about.pageTitle]);

    return (
        <main className="page-wrapper">
            {/* Hero */}
            <section className="about-hero">
                <div className="container">
                    <div className="about-hero-content animate-in">
                        <div className="section-eyebrow">{tr.about.hero.eyebrow}</div>
                        <h1 className="section-title">{tr.about.hero.title}<br /><span>{tr.about.hero.titleHighlight}</span></h1>
                        <p className="section-subtitle">
                            {tr.about.hero.subtitle}
                        </p>
                    </div>
                    <div className="about-stats-row animate-in">
                        {tr.about.stats.map(s => (
                            <div key={s.label} className="astat">
                                <div className="astat-value">{s.value}</div>
                                <div className="astat-label">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission */}
            <section className="section">
                <div className="container">
                    <div className="mission-grid animate-in">
                        <div className="mission-text">
                            <div className="section-eyebrow" style={{ justifyContent: 'flex-start' }}>{tr.about.mission.eyebrow}</div>
                            <h2 className="section-title" style={{ textAlign: 'left' }}>{tr.about.mission.title}<br /><span>{tr.about.mission.titleHighlight}</span></h2>
                            {tr.about.mission.paragraphs.map((p, i) => (
                                <p key={i}>{p}</p>
                            ))}
                            <div className="mission-numbers">
                                {tr.about.mission.highlights.map(h => (
                                    <div key={h} className="mn-item">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                        {h}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mission-visual">
                            <div className="mission-card-stack">
                                {tr.about.mission.cards.map((card, i) => (
                                    <div key={i} className={`mcard mcard-${i + 1}`}>{card}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="section" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.about.values.eyebrow}</div>
                        <h2 className="section-title">{tr.about.values.title} <span>{tr.about.values.titleHighlight}</span></h2>
                    </div>
                    <div className="grid-4">
                        {tr.about.values.items.map((v, i) => (
                            <div key={i} className="value-card card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <span className="value-icon">{v.icon}</span>
                                <h3 className="value-title">{v.title}</h3>
                                <p className="value-desc">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Timeline */}
            <section className="section">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.about.milestones.eyebrow}</div>
                        <h2 className="section-title">{tr.about.milestones.title} <span>{tr.about.milestones.titleHighlight}</span></h2>
                    </div>
                    <div className="timeline animate-in">
                        {tr.about.milestones.items.map((m, i) => (
                            <div key={i} className="timeline-item">
                                <div className="timeline-year">{m.year}</div>
                                <div className="timeline-dot" />
                                <div className="timeline-content">
                                    <h3>{m.title}</h3>
                                    <p>{m.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="section" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">{tr.about.team.eyebrow}</div>
                        <h2 className="section-title">{tr.about.team.title} <span>{tr.about.team.titleHighlight}</span></h2>
                    </div>
                    <div className="grid-3">
                        {tr.about.team.items.map((m, i) => (
                            <div key={i} className="team-card card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="team-avatar">{m.emoji}</div>
                                <h3 className="team-name">{m.name}</h3>
                                <div className="team-role">{m.role}</div>
                                <p className="team-desc">{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="final-cta section-sm" style={{ background: 'var(--primary)' }}>
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>{tr.about.cta.title}</h2>
                        <p>{tr.about.cta.subtitle}</p>
                        <Link to="/tarifs" className="btn btn-white btn-lg" id="about-final-cta">
                            {tr.about.cta.button}
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
