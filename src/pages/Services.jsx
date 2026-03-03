import { Link } from 'react-router-dom';
import './Services.css';

const mainServices = [
    {
        id: 'domiciliation',
        icon: (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
        title: 'Domiciliation Commerciale',
        desc: 'Obtenez une adresse juridique officielle dans la ville de votre choix. Utilisez cette adresse pour votre siège social, vos documents officiels et votre Kbis.',
        items: [
            'Adresse siège social légale',
            'Kbis et documents officiels',
            'Attestation domiciliation sous 24h',
            'Espace client sécurisé',
            'Contrat conforme loi Dutreil',
            'Résiliation sans frais',
        ],
        price: 'dès 23€ HT/mois',
        cta: 'Domicilier mon entreprise',
        color: '#002D58',
    },
    {
        id: 'courrier',
        icon: (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
        ),
        title: 'Gestion du Courrier',
        desc: 'Votre courrier est réceptionné, trié et géré par notre équipe. Consultez vos lettres scannées depuis votre espace client ou recevez-les physiquement.',
        items: [
            'Réception de tout votre courrier',
            'Notification par email à chaque arrivée',
            'Scan numérique en option (+5€)',
            'Transfert physique en option (+30€)',
            'Archives disponibles en ligne',
            'Réponse rapide en cas de besoin',
        ],
        price: '+5€ HT/mois (scan)',
        cta: 'Gérer mon courrier',
        color: '#0066CC',
    },
    {
        id: 'reunion',
        icon: (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="3" />
            </svg>
        ),
        title: 'Salle de Réunion',
        desc: 'Recevez vos clients et partenaires dans un cadre professionnel. Notre salle de réunion est équipée pour accueillir jusqu\'à 10 personnes dans les meilleures conditions.',
        items: [
            'Capacité jusqu\'à 10 personnes',
            'Vidéoprojecteur et écran inclus',
            'Connexion WiFi haut débit',
            'Café, eau et accueil offerts',
            'Disponible en demi-journée',
            'Réservation en ligne simple',
        ],
        price: '20€ HT/demi-journée',
        cta: 'Réserver la salle',
        color: '#1A4A8A',
    },
    {
        id: 'bureau',
        icon: (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
            </svg>
        ),
        title: 'Location de Bureau',
        desc: 'Besoin d\'un espace de travail privatif pour votre journée de rendez-vous ? Louez un bureau individuel calme et professionnel à la demi-journée ou à la journée.',
        items: [
            'Bureau privatif individuel',
            'Connexion WiFi incluse',
            'Environnement calme garanti',
            'Climatisé en été',
            'Imprimante disponible',
            'Disponible sans engagement',
        ],
        price: '20€ HT/demi-journée',
        cta: 'Louer un bureau',
        color: '#003080',
    },
];

const processSteps = [
    { n: '1', title: 'Choisissez votre formule', desc: 'Domiciliation + options selon vos besoins.', icon: '🎯' },
    { n: '2', title: 'Inscription en ligne', desc: 'Formulaire en 3 minutes, signature électronique.', icon: '✍️' },
    { n: '3', title: 'Attestation immédiate', desc: 'Document officiel envoyé sous 24h.', icon: '📄' },
    { n: '4', title: 'Gestion simplifiée', desc: 'Espace client pour gérer tout en ligne.', icon: '💻' },
];

export default function Services() {
    return (
        <main style={{ paddingTop: '80px' }}>
            {/* Header */}
            <section className="services-header section-sm" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Nos prestations</div>
                        <h1 className="section-title">Tous nos services<br /><span>pour votre entreprise</span></h1>
                        <p className="section-subtitle">
                            De la domiciliation simple à la gestion complète de votre courrier, en passant par la location d'espaces professionnels — tout ce qu'il vous faut.
                        </p>
                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="section">
                <div className="container">
                    <div className="services-list">
                        {mainServices.map((svc, i) => (
                            <div
                                key={svc.id}
                                className={`service-detail animate-in ${i % 2 === 1 ? 'reverse' : ''}`}
                                id={`service-${svc.id}`}
                            >
                                <div className="sd-visual" style={{ '--svc-color': svc.color }}>
                                    <div className="sd-icon-wrap">
                                        {svc.icon}
                                    </div>
                                    <div className="sd-price-badge">{svc.price}</div>
                                </div>
                                <div className="sd-content">
                                    <h2 className="sd-title">{svc.title}</h2>
                                    <p className="sd-desc">{svc.desc}</p>
                                    <ul className="sd-list">
                                        {svc.items.map(item => (
                                            <li key={item}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link to="/tarifs" className="btn btn-primary" id={`cta-svc-${svc.id}`}>
                                        {svc.cta}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process */}
            <section className="section" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Notre processus</div>
                        <h2 className="section-title">Simple et rapide,<br /><span>100% en ligne</span></h2>
                    </div>
                    <div className="process-grid">
                        {processSteps.map((s, i) => (
                            <div key={i} className="process-step animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="ps-num">{s.n}</div>
                                <div className="ps-icon">{s.icon}</div>
                                <h3 className="ps-title">{s.title}</h3>
                                <p className="ps-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="final-cta section-sm" style={{ background: 'var(--primary)' }}>
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>Démarrez votre domiciliation<br />dès aujourd'hui</h2>
                        <p>Inscription en ligne · Attestation sous 24h · Dès 23€ HT/mois</p>
                        <Link to="/tarifs" className="btn btn-white btn-lg" id="services-final-cta">
                            Voir les tarifs →
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
