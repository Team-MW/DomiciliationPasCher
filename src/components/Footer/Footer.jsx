import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import './Footer.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

export default function Footer() {
    const { tr } = useTranslation();
    const { footer } = tr;

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
                            {footer.desc}
                        </p>
                        <div className="footer-stats">
                            <div className="footer-stat">
                                <span className="footer-stat-value">{footer.stats.entreprises.value}</span>
                                <span className="footer-stat-label">{footer.stats.entreprises.label}</span>
                            </div>
                            <div className="footer-stat">
                                <span className="footer-stat-value">{footer.stats.creations.value}</span>
                                <span className="footer-stat-label">{footer.stats.creations.label}</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">{footer.columns.services.title}</h4>
                        <ul className="footer-links">
                            {footer.columns.services.links.map((label) => (
                                <li key={label}><Link to="/services">{label}</Link></li>
                            ))}
                        </ul>
                    </div>

                    {/* Villes */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">{footer.columns.villes.title}</h4>
                        <ul className="footer-links footer-cities">
                            {footer.columns.villes.cities.map((city) => (
                                <li key={city}><Link to="/villes">{city}</Link></li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">{footer.contact.title}</h4>
                        <ul className="footer-contact-list">
                            <li>
                                <span>{footer.contact.address.split('\n').map((line, i, arr) => (
                                    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                                ))}</span>
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                <span>{footer.contact.phone}</span>
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                <span>{footer.contact.email}</span>
                            </li>
                        </ul>

                        <div className="footer-cta-box">
                            <p>{footer.cta.text}</p>
                            <Link to="/tarifs" className="btn btn-white" style={{ fontSize: '13px', padding: '10px 20px' }}>
                                {footer.cta.button}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="container footer-bottom-inner">
                    <div className="footer-copyright-legal">
                        <div className="footer-copy-credits">
                            <p>{footer.copyright.replace('{year}', new Date().getFullYear())}</p>
                            <p className="footer-credits">
                                {footer.credits.split('microdidact')[0]}
                                <a href="https://microdidact.com/" target="_blank" rel="noopener noreferrer">microdidact</a>
                                {footer.credits.split('microdidact')[1] || ''}
                            </p>
                        </div>
                        <div className="footer-legal">
                            <Link to="/mentions-legales">{footer.legal.mentionsLegales}</Link>
                            <Link to="#">{footer.legal.cgv}</Link>
                            <Link to="#">{footer.legal.confidentialite}</Link>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="footer-payments">
                        <div className="payment-badge" title="Visa">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" loading="lazy" />
                        </div>
                        <div className="payment-badge" title="Mastercard">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" loading="lazy" />
                        </div>
                        <div className="payment-badge" title="American Express">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" loading="lazy" />
                        </div>
                        <div className="payment-badge" title="Apple Pay">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" loading="lazy" />
                        </div>
                        <div className="payment-badge" title="Google Pay">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Google Pay" loading="lazy" />
                        </div>
                        <div className="payment-badge" title="UnionPay">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/UnionPay_logo.svg" alt="UnionPay" loading="lazy" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
