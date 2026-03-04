import React, { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { fichesData } from '../../data/fichesData';

const FicheDetail = () => {
    const { slug } = useParams();
    const fiche = fichesData[slug];

    // Remonter en haut au changement de slug
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    if (!fiche) {
        return <Navigate to="/fiches-pratiques" replace />;
    }

    // Articles suggérés (tous sauf l'actuel)
    const otherFiches = Object.entries(fichesData)
        .filter(([key]) => key !== slug)
        .slice(0, 5);

    return (
        <div className="page-wrapper" style={{ background: '#FAFBFF' }}>
            <header style={{
                background: 'white',
                borderBottom: '1px solid #E2E8F0',
                padding: '60px 0 40px'
            }}>
                <div className="container" style={{ maxWidth: '1000px' }}>
                    <Link to="/fiches-pratiques" style={{
                        color: 'var(--primary)',
                        fontSize: '14px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '24px',
                        textDecoration: 'none'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        Retour aux fiches pratiques
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <span style={{
                            background: 'rgba(37, 99, 235, 0.1)',
                            color: 'var(--primary)',
                            padding: '6px 14px',
                            borderRadius: '99px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {fiche.category}
                        </span>
                    </div>
                    <h1 style={{
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: 'clamp(28px, 5vw, 48px)',
                        fontWeight: 800,
                        color: '#0F172A',
                        lineHeight: 1.2,
                        margin: 0
                    }}>
                        {fiche.title}
                    </h1>
                </div>
            </header>

            <section className="section">
                <div className="container" style={{ maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '60px' }}>
                    {/* Main Content */}
                    <article style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '24px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                        minHeight: '500px'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '24px' }}>{fiche.icon}</div>
                        <div style={{
                            fontSize: '20px',
                            lineHeight: 1.8,
                            color: '#334155',
                            fontWeight: 400
                        }}>
                            <p style={{ marginBottom: '24px' }}>{fiche.content}</p>
                            <p>L'entrepreneuriat est un voyage complexe mais passionnant. Chez <strong>DomiciliationPasCher</strong>, notre mission est de vous simplifier la vie administrative pour que vous puissiez vous concentrer sur ce qui compte vraiment : votre croissance.</p>

                            <div style={{
                                margin: '48px 0',
                                padding: '32px',
                                background: '#F8FAFF',
                                borderRadius: '16px',
                                borderLeft: '4px solid var(--primary)'
                            }}>
                                <h3 style={{ marginTop: 0, color: '#1E3A8A' }}>💡 Conseil d'expert</h3>
                                <p style={{ marginBottom: 0 }}>N'attendez pas d'être submergé pour structurer vos démarches. Une bonne domiciliation est le socle d'une entreprise solide et crédible face au marché.</p>
                            </div>

                            <p>Chaque situation étant unique, nous vous recommandons de consulter régulièrement nos fiches pratiques ou de contacter notre support pour un accompagnement personnalisé adapté à votre structure juridique.</p>
                        </div>
                    </article>

                    {/* Sidebar */}
                    <aside>
                        <div style={{
                            position: 'sticky',
                            top: '100px'
                        }}>
                            <div style={{
                                background: '#1e293b',
                                padding: '32px',
                                borderRadius: '24px',
                                color: 'white',
                                marginBottom: '32px'
                            }}>
                                <h3 style={{ marginTop: 0, fontSize: '20px' }}>Besoin d'aide ?</h3>
                                <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.5 }}>Nos conseillers vous accompagnent dans toutes vos démarches de domiciliation.</p>
                                <Link to="/tarifs" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                                    Voir nos offres
                                </Link>
                            </div>

                            <h4 style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#0F172A',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                Articles similaires
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {otherFiches.map(([s, f]) => (
                                    <Link
                                        key={s}
                                        to={`/fiches-pratiques/${s}`}
                                        style={{
                                            textDecoration: 'none',
                                            background: 'white',
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid #E2E8F0',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                            e.currentTarget.style.transform = 'translateX(4px)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = '#E2E8F0';
                                            e.currentTarget.style.transform = 'none';
                                        }}
                                    >
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{f.category}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155', lineHeight: 1.3 }}>{f.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
};

export default FicheDetail;
