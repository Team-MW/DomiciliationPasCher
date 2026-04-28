import { SignIn } from '@clerk/clerk-react';
import './Auth.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

export default function ConnexionPage() {
    return (
        <main className="auth-page">
            <div className="auth-left">
                <div className="auth-grid-pattern"></div>
                <div className="auth-brand">
                    <img src={logoSvg} alt="DomiciliationPasCher" className="auth-logo-img" />
                </div>

                <div className="auth-left-content">
                    <h1>Bienvenue dans<br />votre espace client</h1>
                    <p>Gérez votre domiciliation, consultez vos courriers et accédez à tous vos documents depuis un seul endroit.</p>

                    <div className="auth-features">
                        {[
                            { icon: '📬', title: 'Courrier numérisé', desc: 'Consultez vos lettres en ligne, à tout moment' },
                            { icon: '📄', title: 'Vos documents', desc: 'Attestations, contrats, factures centralisés' },
                            { icon: '📅', title: 'Réservations', desc: 'Salles de réunion et bureaux privatifs' },
                        ].map((f, i) => (
                            <div key={i} className="auth-feature">
                                <div className="auth-feature-icon">{f.icon}</div>
                                <div>
                                    <div className="auth-feature-title">{f.title}</div>
                                    <div className="auth-feature-desc">{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="auth-left-footer">
                    <span>Centre agréé · Loi Dutreil 2003 · 100% sécurisé</span>
                </div>
            </div>

            <div className="auth-right">
                <SignIn
                    fallbackRedirectUrl="/app/espace-client"
                    forceRedirectUrl="/app/espace-client"
                    appearance={{
                        elements: {
                            rootBox: 'clerk-root',
                            card: 'clerk-card',
                            headerTitle: 'clerk-header-title',
                            headerSubtitle: 'clerk-header-subtitle',
                            socialButtonsBlockButton: 'clerk-social-btn',
                            formButtonPrimary: 'clerk-submit-btn',
                            footerActionLink: 'clerk-footer-link',
                        },
                        variables: {
                            colorPrimary: '#1A56DB',
                            colorText: '#0F172A',
                            colorTextSecondary: '#64748B',
                            colorBackground: '#ffffff',
                            colorInputBackground: '#F8FAFF',
                            colorInputText: '#0F172A',
                            borderRadius: '10px',
                            fontFamily: 'Inter, sans-serif',
                        },
                    }}
                />
            </div>
        </main>
    );
}
