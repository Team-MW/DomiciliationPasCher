import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Tarifs.css';

const plans = [
    {
        id: 'essentiel',
        popular: false,
        name: 'Essentiel',
        price: '20',
        period: 'HT/mois',
        subtitle: 'La domiciliation simple et efficace',
        cta: 'Choisir Essentiel',
        features: [
            { ok: true, text: 'Adresse juridique officielle' },
            { ok: true, text: 'Réception du courrier' },
            { ok: true, text: 'Notification d\'arrivée par email' },
            { ok: true, text: 'Attestation de domiciliation' },
            { ok: true, text: 'Espace client 24h/24' },
            { ok: true, text: 'Contrat legale conforme Dutreil' },
            { ok: false, text: 'Scan des courriers' },
            { ok: false, text: 'Transfert physique' },
        ],
    },
    {
        id: 'scan-plus',
        popular: true,
        name: 'Scan+',
        price: '24',
        period: 'HT/mois',
        subtitle: 'Gérez votre courrier de n\'importe où',
        cta: 'Choisir Scan+',
        features: [
            { ok: true, text: 'Adresse juridique officielle' },
            { ok: true, text: 'Réception du courrier' },
            { ok: true, text: 'Notification d\'arrivée par email' },
            { ok: true, text: 'Attestation de domiciliation' },
            { ok: true, text: 'Espace client 24h/24' },
            { ok: true, text: 'Contrat legale conforme Dutreil' },
            { ok: true, text: 'Scan numérique de vos courriers' },
            { ok: false, text: 'Transfert physique' },
        ],
    },
    {
        id: 'physique',
        popular: false,
        name: 'Physique+',
        price: '38',
        period: 'HT/mois',
        subtitle: 'Courrier transféré directement chez vous',
        cta: 'Choisir Physique+',
        features: [
            { ok: true, text: 'Adresse juridique officielle' },
            { ok: true, text: 'Réception du courrier' },
            { ok: true, text: 'Notification d\'arrivée par email' },
            { ok: true, text: 'Attestation de domiciliation' },
            { ok: true, text: 'Espace client 24h/24' },
            { ok: true, text: 'Contrat legale conforme Dutreil' },
            { ok: true, text: 'Scan numérique de vos courriers' },
            { ok: true, text: 'Réexpédition physique mensuelle' },
        ],
    },
];

const options = [
    { icon: '📬', name: 'Option Scan', price: '+4€', period: 'HT/mois', desc: 'Scannez et consultez vos courriers depuis votre espace client, où que vous soyez dans le monde.' },
    { icon: '📦', name: 'Transfert Physique', price: '+18€', period: 'HT/mois', desc: 'Votre courrier vous est renvoyé à l\'adresse de votre choix, sous enveloppe, une fois par mois.' },
];

const spaces = [
    {
        icon: '🤝',
        name: 'Salle de Réunion',
        prices: [
            { duration: 'Demi-journée (4h)', amount: '20€ HT' },
            { duration: 'Journée complète (8h)', amount: '40€ HT' },
        ],
        features: ['Jusqu\'à 10 personnes', 'Vidéoprojecteur & écran', 'WiFi fibre haut débit', 'Café & eau offerts', 'Accueil professionnel'],
    },
    {
        icon: '💼',
        name: 'Bureau Privatif',
        prices: [
            { duration: 'Demi-journée (4h)', amount: '20€ HT' },
            { duration: 'Journée complète (8h)', amount: '40€ HT' },
        ],
        features: ['Bureau individuel privatif', 'Connexion WiFi incluse', 'Environnement calme garanti', 'Climatisé en été', 'Imprimante disponible'],
    },
];

const faqs = [
    { q: 'Qu\'est-ce que la domiciliation d\'entreprise ?', a: 'La domiciliation consiste à fixer le siège social ou l\'adresse administrative de votre entreprise à une adresse qui n\'est pas nécessairement votre lieu de résidence ou de travail.' },
    { q: 'La domiciliation est-elle légale ?', a: 'Oui, parfaitement légale en vertu de la loi Dutreil de 2003. Nous sommes un centre de domiciliation agréé, et vous pouvez utiliser notre adresse pour l\'immatriculation de votre société.' },
    { q: 'Où est située l\'adresse ?', a: 'Notre adresse prestigieuse est située à Toulouse, le fleuron de l\'industrie aéronautique européenne.' },
    { q: 'Combien de temps pour recevoir mon attestation ?', a: 'Votre attestation de domiciliation est envoyée sous 24h après la signature de votre contrat en ligne.' },
    { q: 'Y a-t-il un engagement de durée ?', a: 'Non. Vous pouvez résilier à tout moment avec un préavis d\'un mois, sans frais de résiliation.' },
];

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const CrossIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default function Tarifs() {
    useEffect(() => {
        document.title = "Tarifs Domiciliation — À partir de 20€ HT/mois — DomiciliationPasCher";
    }, []);

    return (
        <main className="page-wrapper">

            {/* Header */}
            <section className="page-header">
                <div className="container">
                    <div className="page-header-content">
                        <div className="section-eyebrow">Tarifs transparents</div>
                        <h1 className="section-title" style={{ marginTop: '12px' }}>
                            Des prix clairs,<br /><span>sans mauvaise surprise</span>
                        </h1>
                        <p className="section-subtitle">
                            Choisissez la formule adaptée à vos besoins. Engagement mensuel, résiliable à tout moment.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="section" style={{ paddingTop: '56px' }}>
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
                                            {f.ok ? <CheckIcon /> : <CrossIcon />}
                                            <span>{f.text}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to={`/souscription?plan=${plan.id}`}
                                    className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    id={`cta-${plan.id}`}
                                >
                                    {plan.cta} →
                                </Link>
                                <p className="pricing-note">Sans engagement · Résiliation à tout moment</p>
                            </div>
                        ))}
                    </div>

                    {/* Trust indicators */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '40px', flexWrap: 'wrap' }}>
                        {[
                            { icon: '🔒', text: '100% sécurisé' },
                            { icon: '📄', text: 'Attestation sous 24h' },
                            { icon: '✅', text: 'Conforme loi Dutreil' },
                            { icon: '↩️', text: 'Résiliable à tout moment' },
                        ].map(item => (
                            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--gray-600)' }}>
                                <span>{item.icon}</span>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Stripe Trust Badges */}
                    <div className="pricing-payment-trust">
                        <span>Paiements sécurisés par <strong>Stripe</strong></span>
                        <div className="pricing-payment-logos">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" loading="lazy" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Google Pay" loading="lazy" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Options */}
            <section className="section-sm" style={{ background: 'var(--off-white)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="section-eyebrow">À la carte</div>
                        <h2 className="section-title" style={{ marginTop: '12px' }}>Options <span>complémentaires</span></h2>
                        <p className="section-subtitle">Ajoutez des services à votre formule de base selon vos besoins.</p>
                    </div>
                    <div className="options-grid">
                        {options.map(opt => (
                            <div key={opt.name} className="option-card">
                                <div className="option-icon">{opt.icon}</div>
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
                    <div className="section-header">
                        <div className="section-eyebrow">Espaces professionnels</div>
                        <h2 className="section-title" style={{ marginTop: '12px' }}>Location d'espaces de <span>travail</span></h2>
                        <p className="section-subtitle">Accédez à nos espaces pour vos réunions et rendez-vous clients, sans abonnement.</p>
                    </div>
                    <div className="grid-2">
                        {spaces.map(space => (
                            <div key={space.name} className="space-card">
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
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/services" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                                    Réserver →
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="section" style={{ background: 'var(--off-white)', borderTop: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="section-eyebrow">Questions fréquentes</div>
                        <h2 className="section-title" style={{ marginTop: '12px' }}>Tout ce que vous devez <span>savoir</span></h2>
                    </div>
                    <div className="faq-list">
                        {faqs.map((faq, i) => (
                            <details key={i} className="faq-item" id={`faq-${i}`}>
                                <summary className="faq-question">
                                    {faq.q}
                                    <svg className="faq-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <section className="final-cta section-sm">
                <div className="container">
                    <div className="final-cta-inner">
                        <h2>Prêt à démarrer ?</h2>
                        <p>Inscrivez-vous en ligne en 5 minutes. Aucun déplacement requis.</p>
                        <div className="final-cta-actions">
                            <Link to="/" className="btn btn-white btn-lg" id="tarifs-final-cta">
                                Choisir mon adresse →
                            </Link>
                            <Link to="/services" className="btn btn-lg" style={{ color: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-full)', padding: '16px 32px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex' }}>
                                Nos services
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
