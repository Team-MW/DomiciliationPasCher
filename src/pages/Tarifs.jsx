import { Link } from 'react-router-dom';
import './Tarifs.css';

const plans = [
    {
        id: 'essentiel',
        popular: false,
        name: 'Essentiel',
        price: '23',
        period: 'HT/mois',
        subtitle: 'La domiciliation simple et efficace',
        cta: 'Choisir Essentiel',
        features: [
            { ok: true, text: 'Adresse juridique officielle' },
            { ok: true, text: 'Réception du courrier' },
            { ok: true, text: 'Notification d\'arrivée du courrier' },
            { ok: true, text: 'Attestation de domiciliation' },
            { ok: true, text: 'Espace client en ligne' },
            { ok: true, text: 'Contrat de domiciliation conforme' },
            { ok: false, text: 'Scan des courriers' },
            { ok: false, text: 'Transfert physique' },
        ],
    },
    {
        id: 'scan-plus',
        popular: true,
        name: 'Scan+',
        price: '28',
        period: 'HT/mois',
        subtitle: 'Gérez votre courrier depuis n\'importe où',
        cta: 'Choisir Scan+',
        features: [
            { ok: true, text: 'Adresse juridique officielle' },
            { ok: true, text: 'Réception du courrier' },
            { ok: true, text: 'Notification d\'arrivée du courrier' },
            { ok: true, text: 'Attestation de domiciliation' },
            { ok: true, text: 'Espace client en ligne' },
            { ok: true, text: 'Contrat de domiciliation conforme' },
            { ok: true, text: 'Scan des courriers (+5€/mois)' },
            { ok: false, text: 'Transfert physique' },
        ],
    },
    {
        id: 'physique',
        popular: false,
        name: 'Physique+',
        price: '53',
        period: 'HT/mois',
        subtitle: 'Courrier transféré directement chez vous',
        cta: 'Choisir Physique+',
        features: [
            { ok: true, text: 'Adresse juridique officielle' },
            { ok: true, text: 'Réception du courrier' },
            { ok: true, text: 'Notification d\'arrivée du courrier' },
            { ok: true, text: 'Attestation de domiciliation' },
            { ok: true, text: 'Espace client en ligne' },
            { ok: true, text: 'Contrat de domiciliation conforme' },
            { ok: true, text: 'Scan des courriers' },
            { ok: true, text: 'Transfert physique (+30€/mois)' },
        ],
    },
];

const options = [
    { icon: '📬', name: 'Option Scan', price: '+5€', period: 'HT/mois', desc: 'Scannez et consultez vos courriers depuis votre espace client, où que vous soyez.' },
    { icon: '📦', name: 'Transfert Physique', price: '+30€', period: 'HT/mois', desc: 'Votre courrier vous est renvoyé à l\'adresse de votre choix, sous enveloppe.' },
];

const spaces = [
    {
        icon: '🤝',
        name: 'Salle de Réunion',
        prices: [
            { duration: 'Demi-journée', amount: '20€ HT' },
            { duration: 'Journée complète', amount: '40€ HT' },
        ],
        features: ['Jusqu\'à 10 personnes', 'Vidéoprojecteur', 'WiFi haut débit', 'Café & eau offerts'],
    },
    {
        icon: '💼',
        name: 'Bureau Privatif',
        prices: [
            { duration: 'Demi-journée', amount: '20€ HT' },
            { duration: 'Journée complète', amount: '40€ HT' },
        ],
        features: ['Bureau individuel', 'Connexion WiFi', 'Calme garanti', 'Disponible sur réservation'],
    },
];

const faqs = [
    { q: 'Qu\'est-ce que la domiciliation d\'entreprise ?', a: 'La domiciliation consiste à fixer le siège social ou l\'adresse administrative de votre entreprise à une adresse qui n\'est pas nécessairement votre lieu de résidence ou de travail.' },
    { q: 'La domiciliation est-elle légale ?', a: 'Oui, parfaitement légale en vertu de la loi Dutreil de 2003. Nous sommes un centre de domiciliation agréé, et vous pouvez utiliser notre adresse pour l\'immatriculation de votre société.' },
    { q: 'Puis-je choisir n\'importe quelle ville ?', a: 'Oui, vous pouvez choisir une adresse dans n\'importe laquelle de nos 10 villes partenaires, quelle que soit votre lieu de résidence.' },
    { q: 'Combien de temps pour obtenir mon attestation ?', a: 'Votre attestation de domiciliation est envoyée sous 24h après la signature de votre contrat en ligne.' },
    { q: 'Y a-t-il un engagement de durée ?', a: 'Non. Vous pouvez résilier votre contrat à tout moment avec un préavis d\'un mois. Aucuns frais de résiliation ne sont à prévoir.' },
];

export default function Tarifs() {
    return (
        <main style={{ paddingTop: '80px' }}>
            {/* Header */}
            <section className="tarifs-header section-sm">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Tarifs transparents</div>
                        <h1 className="section-title">Des prix clairs,<br /><span>sans mauvaise surprise</span></h1>
                        <p className="section-subtitle">Choisissez la formule adaptée à vos besoins. Engagement mensuel, sans frais cachés.</p>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="section" style={{ paddingTop: '0' }}>
                <div className="container">
                    <div className="pricing-grid">
                        {plans.map(plan => (
                            <div key={plan.id} className={`pricing-card ${plan.popular ? 'featured' : ''}`} id={`plan-${plan.id}`}>
                                {plan.popular && (
                                    <div className="pricing-badge">⭐ Plus populaire</div>
                                )}
                                <div className="pricing-header">
                                    <div className="pricing-name">{plan.name}</div>
                                    <div className="pricing-sub">{plan.subtitle}</div>
                                    <div className="pricing-amount">
                                        <span className="pricing-currency">€</span>
                                        <span className="pricing-value">{plan.price}</span>
                                        <span className="pricing-period">{plan.period}</span>
                                    </div>
                                </div>
                                <ul className="pricing-features">
                                    {plan.features.map(f => (
                                        <li key={f.text} className={f.ok ? 'ok' : 'no'}>
                                            {f.ok ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            )}
                                            <span>{f.text}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/tarifs" className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'center' }}>
                                    {plan.cta}
                                </Link>
                                <p className="pricing-note">Sans engagement · Résiliation à tout moment</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Options */}
            <section className="section-sm" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">À la carte</div>
                        <h2 className="section-title">Options <span>complémentaires</span></h2>
                    </div>
                    <div className="options-grid">
                        {options.map(opt => (
                            <div key={opt.name} className="option-card card animate-in">
                                <span className="option-icon">{opt.icon}</span>
                                <div className="option-info">
                                    <div className="option-name">{opt.name}</div>
                                    <div className="option-desc">{opt.desc}</div>
                                </div>
                                <div className="option-price">
                                    <span>{opt.price}</span>
                                    <small>{opt.period}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Spaces */}
            <section className="section">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">Espaces professionnels</div>
                        <h2 className="section-title">Location d'espaces de <span>travail</span></h2>
                        <p className="section-subtitle">Accédez à nos espaces professionnels pour vos réunions et rendez-vous clients.</p>
                    </div>
                    <div className="grid-2">
                        {spaces.map(space => (
                            <div key={space.name} className="space-card card animate-in">
                                <div className="space-header">
                                    <span className="space-icon">{space.icon}</span>
                                    <h3 className="space-name">{space.name}</h3>
                                </div>
                                <div className="space-prices">
                                    {space.prices.map(p => (
                                        <div key={p.duration} className="space-price-row">
                                            <span className="sp-duration">{p.duration}</span>
                                            <span className="sp-amount">{p.amount}</span>
                                        </div>
                                    ))}
                                </div>
                                <ul className="space-features">
                                    {space.features.map(f => (
                                        <li key={f}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/services" className="btn btn-outline" style={{ marginTop: '8px', justifyContent: 'center' }}>
                                    Réserver
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="section faq-section" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-label">FAQ</div>
                        <h2 className="section-title">Questions <span>fréquentes</span></h2>
                    </div>
                    <div className="faq-list animate-in">
                        {faqs.map((faq, i) => (
                            <details key={i} className="faq-item" id={`faq-${i}`}>
                                <summary className="faq-question">
                                    {faq.q}
                                    <svg className="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </summary>
                                <div className="faq-answer">{faq.a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="final-cta section-sm" style={{ background: 'var(--primary)' }}>
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>Prêt à démarrer ?</h2>
                        <p>Inscrivez-vous en ligne en 5 minutes. Aucun déplacement requis.</p>
                        <div className="final-cta-actions">
                            <Link to="/" className="btn btn-white btn-lg" id="tarifs-final-cta">
                                Choisir mon adresse →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
