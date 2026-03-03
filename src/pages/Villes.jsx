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
        <main style={{ paddingTop: '80px' }}>
            {/* Hero */}
            <section className="villes-hero section-sm">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Couverture nationale</div>
                        <h1 className="section-title">Vos adresses dans<br /><span>10 métropoles françaises</span></h1>
                        <p className="section-subtitle">
                            Basés à Toulouse, nous vous proposons une adresse professionnelle dans les principales métropoles de France, à partir de <strong>23€ HT/mois</strong>.
                        </p>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="section-sm" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="grid-4">
                        {cityBenefits.map((b, i) => (
                            <div key={i} className="city-benefit animate-in" style={{ animationDelay: `${i * 0.08}s` }}>
                                <span className="city-benefit-icon">{b.icon}</span>
                                <h3 className="city-benefit-title">{b.title}</h3>
                                <p className="city-benefit-desc">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Cities List */}
            <section className="section">
                <div className="container">
                    <div className="cities-list">
                        {cities.map((city, i) => (
                            <div
                                key={city.name}
                                className={`city-detail-card animate-in ${i % 2 === 1 ? 'reverse' : ''}`}
                                id={`ville-${city.name.toLowerCase().replace('-', '')}`}
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="cdc-content">
                                    <div className="cdc-header">
                                        <span className="cdc-emoji">{city.emoji}</span>
                                        <div>
                                            <h2 className="cdc-name">{city.name}</h2>
                                            <span className="cdc-region">{city.region} · {city.zip}xxx</span>
                                        </div>
                                        <div className="cdc-price">
                                            dès <strong>23€</strong><span> HT/mois</span>
                                        </div>
                                    </div>
                                    <p className="cdc-desc">{city.desc}</p>
                                    <div className="cdc-avantages">
                                        {city.avantages.map(a => (
                                            <span key={a} className="cdc-tag">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                    <Link to="/tarifs" className="btn btn-primary" id={`cta-${city.name.toLowerCase()}`}>
                                        Domicilier à {city.name}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </Link>
                                </div>
                                <div className="cdc-map">
                                    <div className="map-placeholder">
                                        <span className="map-emoji">{city.emoji}</span>
                                        <div className="map-city">{city.name}</div>
                                        <div className="map-region">{city.region}</div>
                                        <div className="map-pin-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta section-sm" style={{ background: 'var(--primary)' }}>
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>Votre ville n'est<br />pas dans la liste ?</h2>
                        <p>Contactez-nous, nous élargissons régulièrement notre réseau de villes partenaires.</p>
                        <div className="final-cta-actions">
                            <Link to="/tarifs" className="btn btn-white btn-lg" id="villes-final-cta">
                                Voir nos tarifs →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
