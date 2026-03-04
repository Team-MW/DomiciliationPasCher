import React from 'react';
import { Link } from 'react-router-dom';
import { fichesData } from '../data/fichesData';

const FichesPratiques = () => {
    // Grouper par catégorie
    const categories = {};
    Object.entries(fichesData).forEach(([slug, data]) => {
        if (!categories[data.category]) categories[data.category] = [];
        categories[data.category].push({ slug, ...data });
    });

    return (
        <div className="page-wrapper" style={{ background: '#FAFBFF' }}>
            <section className="section" style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '100px 0 60px' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                        <div className="section-eyebrow">Centre de ressources</div>
                        <h1 style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '48px',
                            fontWeight: 800,
                            color: '#0F172A',
                            marginBottom: '20px'
                        }}>
                            Fiches <span>pratiques</span>
                        </h1>
                        <p className="section-subtitle" style={{ fontSize: '20px' }}>
                            Tout ce dont vous avez besoin pour créer, gérer et développer votre entreprise sereinement.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '40px' }}>
                        {Object.entries(categories).map(([cat, fiches]) => (
                            <div key={cat} style={{
                                background: 'white',
                                borderRadius: '24px',
                                padding: '32px',
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                            }}>
                                <h3 style={{
                                    fontFamily: 'Outfit, sans-serif',
                                    fontSize: '22px',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    marginBottom: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <span style={{
                                        display: 'block',
                                        width: '4px',
                                        height: '24px',
                                        background: 'var(--primary)',
                                        borderRadius: '2px'
                                    }} />
                                    {cat}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {fiches.map(f => (
                                        <Link
                                            key={f.slug}
                                            to={`/fiches-pratiques/${f.slug}`}
                                            style={{
                                                textDecoration: 'none',
                                                color: '#475569',
                                                fontSize: '15px',
                                                fontWeight: 500,
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: '#F8FAFF'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)';
                                                e.currentTarget.style.color = 'var(--primary)';
                                                e.currentTarget.style.transform = 'translateX(6px)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = '#F8FAFF';
                                                e.currentTarget.style.color = '#475569';
                                                e.currentTarget.style.transform = 'none';
                                            }}
                                        >
                                            <span>{f.title}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="section-sm" style={{ paddingBottom: '100px' }}>
                <div className="container">
                    <div style={{
                        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
                        borderRadius: '32px',
                        padding: '60px 40px',
                        textAlign: 'center',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Prêt à lancer votre activité ?</h2>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px', maxWidth: '600px', margin: '0 auto 32px' }}>
                                Rejoignez les milliers d'entrepreneurs qui nous font confiance pour leur domiciliation.
                            </p>
                            <Link to="/tarifs" className="btn btn-primary btn-lg">
                                Découvrir nos offres
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FichesPratiques;
