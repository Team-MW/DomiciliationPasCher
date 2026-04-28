import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CityIcons } from '../../utils/cityIcons';
import './Villes.css';

const cities = [
    {
        name: 'Toulouse',
        icon: CityIcons.Toulouse,
        region: 'Occitanie',
        desc: 'Surnommée la "Ville Rose", Toulouse est le fleuron de l\'industrie aéronautique européenne. Une adresse dynamique et stratégique.',
        avantages: ['Capitale aéronautique', 'Bassin d\'emploi tech', 'Dynamisme insolent'],
        zip: '31',
        image: 'https://images.unsplash.com/photo-1596431760416-ed40d89f5bc5?q=80&w=2070&auto=format&fit=crop',
    },
];

const cityBenefits = [
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
        ),
        title: 'Adresse Officielle',
        desc: 'Adresse légalement valide pour votre immatriculation Kbis.'
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
        ),
        title: 'Activation rapide',
        desc: 'Votre adresse est activée sous 24h, sans déplacement.'
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
        ),
        title: 'Changement possible',
        desc: 'Changez de ville facilement si vos besoins évoluent.'
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
        ),
        title: 'Multi-villes',
        desc: 'Besoin de plusieurs adresses ? Tarifs dégressifs disponibles.'
    },
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

export default function Villes() {
    useEffect(() => {
        document.title = "Notre Ville : Adresse de prestige à Toulouse — DomiciliationPasCher";
    }, []);

    const pageRef = useAnimateOnScroll();

    return (
        <main ref={pageRef} className="page-wrapper" style={{ background: '#FAFBFF' }}>
            {/* Hero Section */}
            <section className="villes-hero section">
                <div className="container">
                    <div className="villes-hero-inner animate-in">
                        <div className="section-eyebrow">Présence Locale</div>
                        <h1 className="hero-main-title">
                            Notre adresse à<br /><span>Toulouse</span>
                        </h1>
                        <p className="hero-desc">
                            Une présence stratégique pour votre siège social. Bénéficiez d'une adresse de prestige activée en 24h.
                        </p>
                    </div>

                    {/* Quick Jump Grid */}
                    <div className="city-quick-nav animate-in" style={{ animationDelay: '0.15s' }}>
                        {cities.map(city => (
                            <a
                                key={city.name}
                                href={`#ville-${city.name.toLowerCase().replace('-', '')}`}
                                className="quick-city-pill"
                            >
                                <span className="pill-icon">{city.icon}</span>
                                <span className="pill-name">{city.name}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Banner */}
            <section className="city-benefits-bar">
                <div className="container">
                    <div className="benefits-bar-grid">
                        {cityBenefits.map((b, i) => (
                            <div key={i} className="benefit-bar-item animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="benefit-bar-icon">{b.icon}</div>
                                <div className="benefit-bar-content">
                                    <h4>{b.title}</h4>
                                    <p>{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Cities Detailed List */}
            <section className="section cities-detailed-section">
                <div className="container">
                    <div className="cities-full-list">
                        {cities.map((city, i) => (
                            <div
                                key={city.name}
                                className={`city-wide-card animate-in ${i % 2 === 1 ? 'is-reversed' : ''}`}
                                id={`ville-${city.name.toLowerCase().replace('-', '')}`}
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="cwc-image-side">
                                    <div className="cwc-map-overlay">
                                        <div className="map-glass">
                                            <span className="map-glass-icon">{city.icon}</span>
                                            <div className="map-glass-info">
                                                <div className="mgi-city">{city.name}</div>
                                                <div className="mgi-zip">{city.zip}000</div>
                                            </div>
                                            <div className="map-glass-pulse" />
                                        </div>
                                    </div>
                                    {/* Image de fond pour chaque ville */}
                                    <div
                                        className="cwc-city-bg"
                                        style={{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.2)), url(${city.image})` }}
                                    />
                                </div>

                                <div className="cwc-content-side">
                                    <div className="cwc-header">
                                        <div className="cwc-badge-city">{city.region}</div>
                                        <h2 className="cwc-title">{city.name}</h2>
                                    </div>

                                    <p className="cwc-description">{city.desc}</p>

                                    <div className="cwc-features">
                                        {city.avantages.map(a => (
                                            <div key={a} className="cwc-feature-item">
                                                <svg className="cwc-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                {a}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="cwc-footer">
                                        <div className="cwc-price-block">
                                            <div className="cwc-price-label">À partir de</div>
                                            <div className="cwc-price-value">20€<span> HT/mois</span></div>
                                        </div>
                                        <Link to="/tarifs" className="btn btn-primary cwc-btn" id={`cta-${city.name.toLowerCase()}`}>
                                            Choisir {city.name}
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Help CTA */}
            <section className="city-help-section section">
                <div className="container">
                    <div className="city-help-card animate-in">
                        <div className="ch-content">
                            <h2 className="ch-title">Votre ville ne figure pas dans la liste ?</h2>
                            <p className="ch-desc">Nous étendons notre réseau chaque mois. Contactez nos conseillers pour discuter de vos besoins spécifiques.</p>
                        </div>
                        <div className="ch-actions">
                            <Link to="/tarifs" className="btn btn-white btn-lg">Parler à un conseiller</Link>
                            <div className="ch-trust">Réponse en moins de 2h</div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
