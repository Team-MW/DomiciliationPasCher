import React from 'react';

const MentionsLegales = () => {
    return (
        <div className="page-wrapper" style={{ paddingBottom: '80px' }}>
            <section className="section" style={{ background: '#F8FAFF' }}>
                <div className="container" style={{ maxWidth: '900px' }}>
                    <header style={{ marginBottom: '48px', textAlign: 'center' }}>
                        <h1 style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '42px',
                            fontWeight: 800,
                            color: '#0F172A',
                            marginBottom: '16px'
                        }}>Mentions Légales</h1>
                        <p style={{ color: '#64748B', fontSize: '18px' }}>En vigueur au {new Date().toLocaleDateString('fr-FR')}</p>
                    </header>

                    <div className="legal-content" style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '24px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                        lineHeight: '1.7',
                        color: '#334155'
                    }}>
                        <h2 style={{ color: '#1E3A8A', fontSize: '24px', marginTop: '0', marginBottom: '16px' }}>1. Édition du site</h2>
                        <p>
                            Le présent site, accessible à l’URL <strong>domiciliation-pas-cher.com</strong>, est édité par :<br />
                            L'entreprise <strong>DomiciliationPasCher</strong>, société au capital de xxxx €, dont le siège social est situé au 150 Rue Nicolas Louis Vauquelin, 3ème étage, Lot 308, 31100 Toulouse.
                        </p>

                        <h2 style={{ color: '#1E3A8A', fontSize: '24px', marginTop: '32px', marginBottom: '16px' }}>2. Hébergement</h2>
                        <p>
                            Le Site est hébergé par la société <strong>Vercel Inc.</strong>, situé 340 S Lemon Ave #4133 Walnut, CA 91789.
                        </p>

                        <h2 style={{ color: '#1E3A8A', fontSize: '24px', marginTop: '32px', marginBottom: '16px' }}>3. Directeur de publication</h2>
                        <p>
                            Le Directeur de la publication du Site est l'équipe DomiciliationPasCher.
                        </p>

                        <h2 style={{ color: '#1E3A8A', fontSize: '24px', marginTop: '32px', marginBottom: '16px' }}>4. Propriété intellectuelle</h2>
                        <p>
                            L’ensemble de ce site relève de la législation française et internationale sur le droit d’auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                        </p>

                        <h2 style={{ color: '#1E3A8A', fontSize: '24px', marginTop: '32px', marginBottom: '16px' }}>5. Données personnelles</h2>
                        <p>
                            Le traitement de vos données à caractère personnel est régi par notre Politique de Confidentialité, disponible sur le Site, conformément au Règlement Général sur la Protection des Données 2016/679 du 27 avril 2016 («RGPD»).
                        </p>

                        <h2 style={{ color: '#1E3A8A', fontSize: '24px', marginTop: '32px', marginBottom: '16px' }}>6. Contact</h2>
                        <p>
                            Par mail : contact@domiciliation-pas-cher.com<br />
                            Par téléphone : +33 7 45 04 00 26
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MentionsLegales;
