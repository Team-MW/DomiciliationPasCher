import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { adminDataService } from '../../services/adminDataService';
import './Auth.css';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

export default function InscriptionPage() {
    const navigate = useNavigate();
    const [isAllowed, setIsAllowed] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const [fallbackEmail, setFallbackEmail] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        const canRegister = localStorage.getItem('allow_registration');
        if (canRegister === 'true') {
            setIsAllowed(true);
        }
    }, []);

    const handleVerifyPayment = async (e) => {
        e.preventDefault();
        setIsChecking(true);
        try {
            const paid = await adminDataService.checkPaymentStatus(fallbackEmail);
            if (paid) {
                localStorage.setItem('allow_registration', 'true');
                setIsAllowed(true);
                setShowFallback(false);
            } else {
                alert("Aucun paiement validé trouvé pour cet e-mail. Vérifiez l'adresse ou contactez le support.");
            }
        } catch (err) {
            alert("Erreur lors de la vérification.");
        } finally {
            setIsChecking(false);
        }
    };

    if (!isAllowed) {
        return (
            <main className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="ec-pending-card" style={{ maxWidth: '450px', width: '90%' }}>
                    <div className="pending-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>Accès Réservé</h2>
                    <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>
                        Cette page est réservée aux clients ayant validé leur paiement. Si vous venez de payer, assurez-vous d'utiliser le même navigateur.
                    </p>
                    
                    {!showFallback ? (
                        <>
                            <button className="btn-primary" onClick={() => navigate('/souscription')} style={{ width: '100%', marginBottom: '12px', padding: '12px' }}>
                                Choisir un forfait
                            </button>
                            <button className="btn-outline" onClick={() => setShowFallback(true)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer' }}>
                                J'ai déjà payé (Vérifier mon email)
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
                                {isChecking ? 'Vérification...' : 'Vérifier et accéder'}
                            </button>
                            <button type="button" onClick={() => setShowFallback(false)} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}>
                                Retour
                            </button>
                        </form>
                    ) }
                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
                        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#6366F1', fontWeight: '600', cursor: 'pointer' }}>
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
                <SignUp
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
