import { Link } from 'react-router-dom';
import './Villes.css';

const cities = [
    {
        name: 'Paris',
        emoji: '🗼',
        region: 'Île-de-France',
        desc: 'La capitale française vous offre une adresse de prestige au cœur des affaires. Idéale pour rayonner à l\'international.',
        avantages: ['Adresse capitale', 'Rayonnement national', 'Réseau d\'affaires unique'],
        zip: '75',
    },
    {
        name: 'Lyon',
        emoji: '🦁',
        region: 'Auvergne-Rhône-Alpes',
        desc: 'Deuxième métropole économique de France, Lyon est le hub idéal pour les entreprises du secteur industriel et technologique.',
        avantages: ['2e hub économique', 'Vitalité startup', 'Position géographique centrale'],
        zip: '69',
    },
    {
        name: 'Marseille',
        emoji: '⚓',
        region: 'Provence-Alpes-Côte d\'Azur',
        desc: 'Premier port méditerranéen d\'Europe. Marseille est incontournable pour les activités liées au commerce et à la logistique.',
        avantages: ['Premier port EU', 'Commerce méditerranéen', 'Rayonnement Sud'],
        zip: '13',
    },
    {
        name: 'Nice',
        emoji: '🌊',
        region: 'Côte d\'Azur',
        desc: 'Ville du tourisme et de l\'innovation, Nice attire de nombreuses entreprises dans les secteurs du luxe et du numérique.',
        avantages: ['Pôle innovation', 'Tourisme & luxe', 'Proximité Monaco'],
        zip: '06',
    },
    {
        name: 'Bordeaux',
        emoji: '🍷',
        region: 'Nouvelle-Aquitaine',
        desc: 'Métropole en plein essor, Bordeaux conjugue qualité de vie et dynamisme économique. Parfaite pour les entreprises du vin et du digital.',
        avantages: ['Qualité de vie N°1', 'Secteur vin & luxe', 'Croissance rapide'],
        zip: '33',
    },
    {
        name: 'Nantes',
        emoji: '🎡',
        region: 'Pays de la Loire',
        desc: 'Élue plusieurs fois ville la plus agréable de France, Nantes est un vivier de talents pour les startups et PME innovantes.',
        avantages: ['Capitale des startups', 'Talents numériques', 'Attractivité forte'],
        zip: '44',
    },
    {
        name: 'Lille',
        emoji: '🧇',
        region: 'Hauts-de-France',
        desc: 'Porte d\'entrée du nord de l\'Europe, Lille est stratégique pour les entreprises ayant des activités avec la Belgique et le Royaume-Uni.',
        avantages: ['Carrefour Nord-Europe', 'Accès Belgique & UK', 'Hub logistique'],
        zip: '59',
    },
    {
        name: 'Rennes',
        emoji: '🏰',
        region: 'Bretagne',
        desc: 'Capitale de la Bretagne, Rennes est l\'une des villes les plus dynamiques de France avec un fort tissu numérique et technologique.',
        avantages: ['Pôle numérique', 'Ville étudiante', 'Innovation tech'],
        zip: '35',
    },
    {
        name: 'Strasbourg',
        emoji: '🥨',
        region: 'Grand Est',
        desc: 'Siège des institutions européennes, Strasbourg offre une adresse à dimension internationale, idéale pour tout dossier européen.',
        avantages: ['Siège institutions EU', 'Rayonnement international', 'Proximité Allemagne'],
        zip: '67',
    },
    {
        name: 'Clermont-Ferrand',
        emoji: '🌋',
        region: 'Auvergne-Rhône-Alpes',
        desc: 'Berceau des grandes entreprises industrielles françaises, Clermont-Ferrand est la référence pour l\'industrie et l\'innovation locale.',
        avantages: ['Hub industriel', 'Coût immobilier bas', 'Réseau PME fort'],
        zip: '63',
    },
];

const cityBenefits = [
    { icon: '📍', title: 'Adresse Officielle', desc: 'Adresse légalement valide pour votre immatriculation Kbis.' },
    { icon: '⚡', title: 'Activation rapide', desc: 'Votre adresse est activée sous 24h, sans déplacement.' },
    { icon: '🔄', title: 'Changement possible', desc: 'Changez de ville facilement si vos besoins évoluent.' },
    { icon: '🌐', title: 'Multi-villes', desc: 'Besoin de plusieurs adresses ? Tarifs dégressifs disponibles.' },
];

export default function Villes() {
    return (
        <main className="page-wrapper" style={{ background: '#FAFBFF' }}>
            {/* Hero Section */}
            <section className="villes-hero section">
                <div className="container">
                    <div className="villes-hero-inner animate-in">
                        <div className="section-eyebrow">Domination Nationale</div>
                        <h1 className="hero-main-title">
                            Nos adresses dans les plus<br /><span>grandes métropoles</span>
                        </h1>
                        <p className="hero-desc">
                            Une présence stratégique pour votre siège social. Choisissez parmi nos <strong>10 villes clés</strong> et bénéficiez d'une adresse de prestige activée en 24h.
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
                                <span className="pill-emoji">{city.emoji}</span>
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
                                            <span className="map-glass-emoji">{city.emoji}</span>
                                            <div className="map-glass-info">
                                                <div className="mgi-city">{city.name}</div>
                                                <div className="mgi-zip">{city.zip}000</div>
                                            </div>
                                            <div className="map-glass-pulse" />
                                        </div>
                                    </div>
                                    {/* Image de fond pour chaque ville (placeholder stylisé) */}
                                    <div className="cwc-city-bg" />
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
                                            <div className="cwc-price-value">23€<span> HT/mois</span></div>
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
