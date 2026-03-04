import { Link } from 'react-router-dom';
import './About.css';

const values = [
    { icon: '💡', title: 'Accessibilité', desc: 'Domiciliation professionnelle accessible à tous les entrepreneurs, sans barrière de prix.' },
    { icon: '🔒', title: 'Fiabilité', desc: 'Centre de domiciliation agréé, conforme à toutes les obligations légales françaises.' },
    { icon: '⚡', title: 'Rapidité', desc: 'Inscription en ligne en 5 minutes, attestation sous 24h. Zéro paperasse inutile.' },
    { icon: '🤝', title: 'Proximité', desc: 'Une équipe disponible et réactive pour accompagner chaque entrepreneur.' },
];

const teamMembers = [
    { name: 'Alexandre M.', role: 'Fondateur & CEO', emoji: '👨‍💼', desc: 'Expert en création d\'entreprise avec 10 ans d\'expérience dans les services aux professionnels.' },
    { name: 'Sophie L.', role: 'Responsable Opérations', emoji: '👩‍💻', desc: 'Spécialiste de la gestion administrative, elle supervise toutes les opérations de domiciliation.' },
    { name: 'Karim B.', role: 'Responsable Relations Clients', emoji: '👨‍🤝‍👨', desc: 'Votre interlocuteur principal pour toute question concernant votre contrat ou votre courrier.' },
];

const milestones = [
    { year: '2019', title: 'Fondation à Toulouse', desc: 'Création de DomiciliationPasCher avec 50 premiers clients.' },
    { year: '2021', title: 'Expansion nationale', desc: 'Ouverture dans 5 nouvelles villes françaises.' },
    { year: '2023', title: '+1 000 entreprises', desc: 'Cap des 1 000 entreprises domiciliées franchi.' },
    { year: '2025', title: '+3 000 entreprises', desc: 'Leader de la domiciliation abordable en France.' },
];

export default function About() {
    return (
        <main className="page-wrapper">
            {/* Hero */}
            <section className="about-hero">
                <div className="container">
                    <div className="about-hero-content animate-in">
                        <div className="section-eyebrow">Notre histoire</div>
                        <h1 className="section-title">Votre partenaire de confiance<br /><span>depuis Toulouse</span></h1>
                        <p className="section-subtitle">
                            Fondée à Toulouse, DomiciliationPasCher.fr est née d'une conviction simple : créer une entreprise ne doit pas coûter une fortune. Nous proposons les meilleures adresses de France au meilleur prix.
                        </p>
                    </div>
                    <div className="about-stats-row animate-in">
                        {[
                            { v: '2019', l: 'Année de création' },
                            { v: '+3 000', l: 'Entreprises domiciliées' },
                            { v: '+50/sem', l: 'Nouvelles créations' },
                            { v: '10', l: 'Villes partenaires' },
                            { v: '23€', l: 'À partir de HT/mois' },
                        ].map(s => (
                            <div key={s.l} className="astat">
                                <div className="astat-value">{s.v}</div>
                                <div className="astat-label">{s.l}</div>
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
                            <div className="section-eyebrow" style={{ justifyContent: 'flex-start' }}>Notre mission</div>
                            <h2 className="section-title" style={{ textAlign: 'left' }}>Simplifier la création<br /><span>d'entreprise en France</span></h2>
                            <p>Nous croyons que chaque entrepreneur mérite une adresse professionnelle de qualité, sans se ruiner. C'est pourquoi nous avons créé une plateforme 100% en ligne qui rend la domiciliation accessible, rapide et sans contrainte.</p>
                            <p>Basés à Toulouse, nous avons développé un réseau de partenaires dans 10 grandes villes françaises pour offrir à nos clients une flexibilité maximale dans leur implantation.</p>
                            <div className="mission-numbers">
                                <div className="mn-item">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                    Centre de domiciliation agréé
                                </div>
                                <div className="mn-item">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                    Conforme à la loi Dutreil 2003
                                </div>
                                <div className="mn-item">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                    100% éligible aide à la création
                                </div>
                                <div className="mn-item">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                    Déductible des charges fiscales
                                </div>
                            </div>
                        </div>
                        <div className="mission-visual">
                            <div className="mission-card-stack">
                                <div className="mcard mcard-1">📍 Toulouse, siège historique</div>
                                <div className="mcard mcard-2">🇫🇷 10 villes à travers la France</div>
                                <div className="mcard mcard-3">⚡ +50 créations / semaine</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="section" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Ce qui nous définit</div>
                        <h2 className="section-title">Nos <span>valeurs</span></h2>
                    </div>
                    <div className="grid-4">
                        {values.map((v, i) => (
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
                        <div className="section-eyebrow">Notre parcours</div>
                        <h2 className="section-title">Une croissance <span>constante</span></h2>
                    </div>
                    <div className="timeline animate-in">
                        {milestones.map((m, i) => (
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
                        <div className="section-eyebrow">L'équipe</div>
                        <h2 className="section-title">Des personnes <span>passionnées</span></h2>
                    </div>
                    <div className="grid-3">
                        {teamMembers.map((m, i) => (
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
                        <h2>Rejoignez notre communauté<br />d'entrepreneurs</h2>
                        <p>+3 000 entreprises nous font déjà confiance. À votre tour !</p>
                        <Link to="/tarifs" className="btn btn-white btn-lg" id="about-final-cta">
                            Démarrer maintenant →
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
