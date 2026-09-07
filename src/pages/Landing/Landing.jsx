import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoSvg from '../../assets/DomiciliationPasCher-Logo-11.svg';

export default function Landing() {
    const navigate = useNavigate();

    const handleCTA = () => {
        navigate('/souscription');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', background: '#F8FAFC' }}>
            
            {/* Minimalist Header */}
            <header style={{ padding: '24px 48px', display: 'flex', justifyContent: 'center', background: 'white', borderBottom: '1px solid #E2E8F0' }}>
                <img src={logoSvg} alt="DomiciliationPasCher" style={{ height: '32px' }} />
            </header>

            {/* Hero Section */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
                
                <div style={{ background: '#DBEAFE', color: '#1E40AF', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '700', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)' }}>
                    🔥 Offre Spéciale Créateurs — À partir de 20€/mois HT
                </div>

                <h1 style={{ fontSize: '56px', fontWeight: '900', color: '#0F172A', maxWidth: '900px', lineHeight: '1.1', margin: '0 0 24px 0', letterSpacing: '-0.03em' }}>
                    Votre domiciliation d'entreprise en <span style={{ color: '#2563EB', textDecoration: 'underline', textDecorationColor: '#93C5FD', textUnderlineOffset: '8px' }}>5 minutes chrono</span>
                </h1>

                <p style={{ fontSize: '22px', color: '#475569', maxWidth: '700px', lineHeight: '1.6', margin: '0 0 48px 0', fontWeight: '500' }}>
                    Obtenez immédiatement votre attestation de siège social. <br/>100% en ligne, sécurisé, sans paperasse et sans engagement.
                </p>

                {/* Primary Call to Action */}
                <button 
                    onClick={handleCTA}
                    style={{ 
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        color: 'white', 
                        border: 'none', 
                        padding: '20px 56px', 
                        borderRadius: '16px', 
                        fontSize: '22px', 
                        fontWeight: '800', 
                        cursor: 'pointer',
                        boxShadow: '0 20px 25px -5px rgba(37, 99, 235, 0.3), 0 8px 10px -6px rgba(37, 99, 235, 0.2)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 25px 30px -5px rgba(37, 99, 235, 0.4), 0 10px 15px -6px rgba(37, 99, 235, 0.3)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(37, 99, 235, 0.3), 0 8px 10px -6px rgba(37, 99, 235, 0.2)';
                    }}
                >
                    Domicilier mon entreprise ➔
                </button>

                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '16px', fontWeight: '600' }}>
                    Déjà + de 2000 entrepreneurs nous font confiance.
                </p>

                {/* Trust Badges */}
                <div style={{ display: 'flex', gap: '48px', marginTop: '64px', flexWrap: 'wrap', justifyContent: 'center', background: 'white', padding: '32px 64px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#334155', fontWeight: '700', fontSize: '16px' }}>
                        <span style={{ fontSize: '36px', background: '#F1F5F9', padding: '16px', borderRadius: '50%' }}>🏛️</span> 
                        <span>Agréé Préfecture</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#334155', fontWeight: '700', fontSize: '16px' }}>
                        <span style={{ fontSize: '36px', background: '#F1F5F9', padding: '16px', borderRadius: '50%' }}>⚡</span> 
                        <span>Attestation Immédiate</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#334155', fontWeight: '700', fontSize: '16px' }}>
                        <span style={{ fontSize: '36px', background: '#F1F5F9', padding: '16px', borderRadius: '50%' }}>🤝</span> 
                        <span>Sans engagement</span>
                    </div>
                </div>

            </main>
        </div>
    );
}
