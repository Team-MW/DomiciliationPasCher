import { Link } from 'react-router-dom';
import './Footer.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

const cities = ['Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'Nantes', 'Lille', 'Rennes', 'Strasbourg', 'Clermont-Ferrand'];

export default function Footer() {
    return (
        <footer className="footer" id="footer">
            <div className="footer-top">
                <div className="container footer-grid">
                    {/* Brand */}
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <img src={logoSvg} alt="DomiciliationPasCher" className="footer-logo-img" />
                        </Link>
                        <p className="footer-desc">
                            La solution de domiciliation la plus compétitive de France. Basés à Toulouse, nous accompagnons les entrepreneurs dans plus de 10 grandes villes françaises.
                        </p>
                        <div className="footer-stats">
                            <div className="footer-stat">
                                <span className="footer-stat-value">+3 000</span>
                                <span className="footer-stat-label">Entreprises</span>
                            </div>
                            <div className="footer-stat">
                                <span className="footer-stat-value">+50</span>
                                <span className="footer-stat-label">Créations/semaine</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">Nos Services</h4>
                        <ul className="footer-links">
                            <li><Link to="/services">Domiciliation commerciale</Link></li>
                            <li><Link to="/services">Gestion du courrier</Link></li>
                            <li><Link to="/services">Scan &amp; numérisation</Link></li>
                            <li><Link to="/services">Salle de réunion</Link></li>
                            <li><Link to="/services">Location de bureau</Link></li>
                        </ul>
                    </div>

                    {/* Villes */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">Nos Villes</h4>
                        <ul className="footer-links footer-cities">
                            {cities.map(city => (
                                <li key={city}><Link to="/villes">{city}</Link></li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">Contact</h4>
                        <ul className="footer-contact-list">
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                <span>Toulouse, Haute-Garonne<br />31000</span>
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                <span>05 xx xx xx xx</span>
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                <span>contact@domiciliation-pas-cher.fr</span>
                            </li>
                        </ul>

                        <div className="footer-cta-box">
                            <p>Prêt à vous lancer ?</p>
                            <Link to="/tarifs" className="btn btn-white" style={{ fontSize: '13px', padding: '10px 20px' }}>
                                Voir les tarifs
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="container footer-bottom-inner">
                    <div className="footer-copyright-legal">
                        <div className="footer-copy-credits">
                            <p>© {new Date().getFullYear()} DomiciliationPasCher.fr — Tous droits réservés</p>
                            <p className="footer-credits">Réalisé par <a href="https://microdidact.com/" target="_blank" rel="noopener noreferrer">microdidact</a></p>
                        </div>
                        <div className="footer-legal">
                            <Link to="/mentions-legales">Mentions légales</Link>
                            <Link to="#">CGV</Link>
                            <Link to="#">Politique de confidentialité</Link>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="footer-payments">
                        <div className="payment-badge" title="Visa">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" />
                        </div>
                        <div className="payment-badge" title="Mastercard">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" />
                        </div>
                        <div className="payment-badge" title="American Express">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" />
                        </div>
                        <div className="payment-badge" title="Apple Pay">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" />
                        </div>
                        <div className="payment-badge" title="Google Pay">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Google Pay" />
                        </div>
                        <div className="payment-badge" title="UnionPay">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/UnionPay_logo.svg" alt="UnionPay" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
