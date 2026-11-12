import { SignIn, ClerkLoading } from '@clerk/clerk-react';
import AuthLoading from '../../components/AuthLoading/AuthLoading';
import usePageMeta from '../../components/Seo/usePageMeta';
import { LoginLinkRequest } from './LoginLink';
import { useTicketSignIn } from './useTicketSignIn';
import './Auth.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

function postLoginUrl() {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect;
    return '/app/espace-client';
}

export default function ConnexionPage() {
    const afterAuth = postLoginUrl();
    // Lien « Activer mon accès » de nos emails : adresse préremplie.
    const prefillEmail = (() => { const raw = String(new URLSearchParams(window.location.search).get('email') || '').trim().toLowerCase(); return /^\S+@\S+\.\S+$/.test(raw) ? raw : ''; })();
    usePageMeta({ title: 'Connexion à votre espace client — Domiciliation Pas Cher', path: '/connexion', noindex: true });
    // Lien de connexion reçu par email : connexion directe, sans mot de passe ni code.
    const ticket = String(new URLSearchParams(window.location.search).get('ticket') || '');
    const ticketState = useTicketSignIn(ticket, afterAuth);

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
                            { icon: '📬', title: 'Votre courrier en ligne', desc: 'Notification avec photo de chaque enveloppe, scan inclus en Confort et Premium' },
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
                    <span>Centre agréé par la préfecture · Loi Dutreil 2003 · Paiement sécurisé</span>
                </div>
            </div>

            <div className="auth-right">
                {ticketState === 'working' && (
                    <p className="auth-first-login" role="status"><strong>Connexion en cours…</strong> Votre espace client s’ouvre dans un instant.</p>
                )}
                {ticketState === 'failed' && (
                    <p className="auth-link-error auth-link-expired" role="alert">
                        Ce lien de connexion a expiré ou a déjà servi. Recevez-en un nouveau ci-dessous, ou connectez-vous avec votre mot de passe.
                    </p>
                )}
                <p className="auth-first-login">
                    <strong>Première connexion après votre souscription ?</strong>{' '}
                    Créez d’abord votre accès avec l’adresse e-mail utilisée lors du paiement :{' '}
                    <a href="/inscription">créer mon accès</a>.
                </p>
                <ClerkLoading><AuthLoading /></ClerkLoading>
                <SignIn
                    initialValues={prefillEmail ? { emailAddress: prefillEmail } : undefined}
                    signUpUrl="/inscription"
                    fallbackRedirectUrl={afterAuth}
                    forceRedirectUrl={afterAuth}
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
                <LoginLinkRequest defaultEmail={prefillEmail} defaultOpen={ticketState === 'failed'} key={ticketState} />
            </div>
        </main>
    );
}
