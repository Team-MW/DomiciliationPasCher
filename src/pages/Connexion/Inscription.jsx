import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { adminDataService } from '../../services/adminDataService';
import { appAlert } from '../../components/AppDialog/dialogApi';
import usePageMeta from '../../components/Seo/usePageMeta';
import './Auth.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

export default function InscriptionPage() {
    const navigate = useNavigate();
    usePageMeta({ title: 'Créer votre espace client — Domiciliation Pas Cher', path: '/inscription', noindex: true });
    const [isAllowed, setIsAllowed] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const [fallbackEmail, setFallbackEmail] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    // Email du lien reçu par email (?email=) : prérempli dans le formulaire de création d'accès.
    const [prefillEmail] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get('email') || '';
        return /^\S+@\S+\.\S+$/.test(raw.trim()) ? raw.trim().toLowerCase() : '';
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasTicket = urlParams.has('__clerk_ticket');
        let canRegister = null;
        try { canRegister = localStorage.getItem('allow_registration'); } catch { /* stockage indisponible */ }

        if (canRegister === 'true' || hasTicket) {
            setIsAllowed(true);
            return undefined;
        }
        // Lien des emails de bienvenue / validation, souvent ouvert sur un autre appareil (téléphone) :
        // on vérifie le paiement de cet email : plus besoin d'ouvrir le lien sur l'appareil du paiement.
        if (!prefillEmail) return undefined;
        let cancelled = false;
        setIsChecking(true);
        adminDataService.checkPaymentStatus(prefillEmail)
            .then((paid) => {
                if (cancelled) return;
                if (paid) {
                    try { localStorage.setItem('allow_registration', 'true'); } catch { /* */ }
                    setIsAllowed(true);
                } else {
                    setFallbackEmail(prefillEmail);
                    setShowFallback(true);
                }
            })
            .catch(() => { if (!cancelled) { setFallbackEmail(prefillEmail); setShowFallback(true); } })
            .finally(() => { if (!cancelled) setIsChecking(false); });
        return () => { cancelled = true; };
    }, [prefillEmail]);

    const handleVerifyPayment = async (e) => {
        e.preventDefault();
        setIsChecking(true);
        try {
            const paid = await adminDataService.checkPaymentStatus(fallbackEmail);
            if (paid) {
                try { localStorage.setItem('allow_registration', 'true'); } catch { /* navigation privée : on autorise quand même cette session */ }
                setIsAllowed(true);
                setShowFallback(false);
            } else {
                await appAlert("Aucun paiement validé trouvé pour cet e-mail. Vérifiez l'adresse ou contactez le support.");
            }
        } catch (err) {
            await appAlert("La vérification a échoué. Réessayez dans quelques instants ou contactez le support.");
        } finally {
            setIsChecking(false);
        }
    };

    if (!isAllowed && isChecking && !showFallback) {
        return (
            <main className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <p role="status" style={{ color: '#475569', fontWeight: 600 }}>Vérification de votre souscription…</p>
            </main>
        );
    }

    if (!isAllowed) {
        return (
            <main className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="ec-pending-card" style={{ maxWidth: '450px', width: '90%' }}>
                    <div className="pending-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>Accès réservé</h2>
                    <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>
                        Cette page sert à créer l’accès des clients ayant souscrit. Indiquez l’adresse e-mail utilisée lors de votre paiement pour continuer.
                    </p>
                    
                    {!showFallback ? (
                        <>
                            <button className="btn-primary" onClick={() => navigate('/souscription')} style={{ width: '100%', marginBottom: '12px', padding: '12px' }}>
                                Choisir un forfait
                            </button>
                            <button className="btn-outline" onClick={() => setShowFallback(true)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer' }}>
                                J'ai déjà payé : vérifier mon e-mail
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleVerifyPayment}>
                            <input 
                                type="email" 
                                placeholder="Votre adresse e-mail de paiement" 
                                required
                                value={fallbackEmail}
                                onChange={e => setFallbackEmail(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '12px' }}
                            />
                            <button type="submit" disabled={isChecking} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                                {isChecking ? 'Vérification…' : 'Vérifier et accéder'}
                            </button>
                            <button type="button" onClick={() => setShowFallback(false)} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}>
                                Retour
                            </button>
                        </form>
                    ) }
                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
                        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#1A56DB', fontWeight: '600', cursor: 'pointer' }}>
                            ← Retour au site
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="auth-page">
            <div className="auth-left">
                <div className="auth-grid-pattern"></div>
                <div className="auth-brand">
                    <img src={logoSvg} alt="DomiciliationPasCher" className="auth-logo-img" />
                </div>

                <div className="auth-left-content">
                    <h1>Créez votre<br />espace client</h1>
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
                <SignUp
                    initialValues={prefillEmail ? { emailAddress: prefillEmail } : undefined}
                    signInUrl="/connexion"
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
