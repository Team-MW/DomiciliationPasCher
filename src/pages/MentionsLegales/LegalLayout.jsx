import './LegalLayout.css';
/** Mise en page commune aux pages légales (mentions légales, CGV, confidentialité). */

const h2Style = { color: '#1E3A8A', fontSize: '24px', marginTop: '32px', marginBottom: '16px' };
const h3Style = { color: '#0F172A', fontSize: '18px', marginTop: '20px', marginBottom: '8px' };

export function LegalH2({ children, first = false }) {
    return <h2 style={first ? { ...h2Style, marginTop: 0 } : h2Style}>{children}</h2>;
}

export function LegalH3({ children }) {
    return <h3 style={h3Style}>{children}</h3>;
}

/** Valeur manquante à compléter : bien visible pour la relecture. */
export function Todo({ children }) {
    return (
        <mark style={{ background: '#FEF3C7', color: '#92400E', padding: '0 4px', borderRadius: '4px', fontWeight: 600 }}>
            {children}
        </mark>
    );
}

export function DraftBanner() {
    return (
        <div
            role="note"
            style={{
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                color: '#92400E',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '24px',
                fontWeight: 600,
                lineHeight: 1.5,
            }}
        >
            Projet — à faire valider par un juriste. Ce document est un brouillon de travail : il ne constitue pas
            une version contractuelle définitive.
        </div>
    );
}

export default function LegalLayout({ title, subtitle, draft = false, children }) {
    return (
        <div className="page-wrapper" style={{ paddingBottom: '80px' }}>
            <section className="section" style={{ background: '#F8FAFF' }}>
                <div className="container" style={{ maxWidth: '900px' }}>
                    <header style={{ marginBottom: '48px', textAlign: 'center' }}>
                        <h1 style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 'clamp(30px, 6vw, 42px)',
                            fontWeight: 800,
                            color: '#0F172A',
                            marginBottom: '16px'
                        }}>{title}</h1>
                        {subtitle && <p style={{ color: '#64748B', fontSize: '18px' }}>{subtitle}</p>}
                    </header>

                    {draft && <DraftBanner />}

                    <div className="legal-content" style={{
                        background: 'white',
                        padding: 'clamp(20px, 5vw, 40px)',
                        borderRadius: '24px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                        lineHeight: '1.7',
                        color: '#334155',
                        overflowWrap: 'anywhere',
                    }}>
                        {children}
                    </div>
                </div>
            </section>
        </div>
    );
}
