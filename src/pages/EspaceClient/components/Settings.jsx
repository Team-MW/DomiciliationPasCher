import React, { useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function Settings({ clientData, setClientData }) {
    const [formData, setFormData] = useState({
        name: clientData?.name || '',
        email: clientData?.email || '',
        company: clientData?.company || '',
        address: clientData?.address || '',
        phone: clientData?.phone || ''
    });
    
    // Mettre à jour le formulaire quand les données arrivent
    React.useEffect(() => {
        if (clientData) {
            setFormData({
                name: clientData.name || '',
                email: clientData.email || '',
                company: clientData.company || '',
                address: clientData.address || '',
                phone: clientData.phone || ''
            });
        }
    }, [clientData]);

    let extra = {};
    if (clientData && clientData.extra_info) {
        try {
            extra = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info;
        } catch (e) {}
    }

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            const updatedClient = await adminDataService.updateClientProfile(clientData.id, formData);
            if (setClientData) {
                setClientData(prev => ({ ...prev, ...updatedClient }));
            }
            setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ec-tab-animate">
            <div className="ec-content-card">
                <div className="ec-card-header">
                    <h2>Paramètres du compte</h2>
                </div>
                <div className="ec-card-body" style={{ padding: '32px' }}>
                    
                    <form onSubmit={handleSubmit} className="ec-settings-form">
                        {message.text && (
                            <div style={{
                                padding: '16px',
                                borderRadius: '12px',
                                marginBottom: '24px',
                                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                                color: message.type === 'success' ? '#065f46' : '#991b1b',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}>
                                {message.text}
                            </div>
                        )}
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                            <div className="ec-form-group">
                                <label style={labelStyle}>Nom complet</label>
                                <input name="name" value={formData.name} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div className="ec-form-group">
                                <label style={labelStyle}>Email (contact)</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div className="ec-form-group">
                                <label style={labelStyle}>Numéro de téléphone</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="ex: 06 12 34 56 78" style={inputStyle} />
                            </div>
                            <div className="ec-form-group">
                                <label style={labelStyle}>Nom de l'entreprise</label>
                                <input name="company" value={formData.company} onChange={handleChange} required style={inputStyle} />
                            </div>
                        </div>

                        <div className="ec-form-group" style={{ marginBottom: '32px' }}>
                            <label style={labelStyle}>Adresse personnelle</label>
                            <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Votre adresse personnelle..." style={{...inputStyle, minHeight: '100px', resize: 'vertical'}} />
                        </div>

                        {/* Informations Légales (Lecture seule) */}
                        <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--ec-border)', marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', color: '#0F172A' }}>Informations de l'entreprise & Dirigeant (Lecture seule)</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Forme juridique</label>
                                    <input value={extra.formeJuridique || 'Non renseigné'} readOnly style={readOnlyInputStyle} />
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Numéro SIREN</label>
                                    <input value={extra.siren || 'En cours d\'immatriculation'} readOnly style={readOnlyInputStyle} />
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Type de projet</label>
                                    <input value={extra.typeProjet === 'creation' ? 'Création d\'entreprise' : (extra.typeProjet === 'transfert' ? 'Transfert de siège' : (extra.typeProjet === 'domiciliation' ? 'Domiciliation seule' : 'Non renseigné'))} readOnly style={readOnlyInputStyle} />
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Nationalité du dirigeant</label>
                                    <input value={extra.nationalite || 'Non renseigné'} readOnly style={readOnlyInputStyle} />
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Date de naissance</label>
                                    <input value={extra.dateNaissance ? new Date(extra.dateNaissance).toLocaleDateString('fr-FR') : 'Non renseigné'} readOnly style={readOnlyInputStyle} />
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Lieu de naissance</label>
                                    <input value={extra.lieuNaissance || 'Non renseigné'} readOnly style={readOnlyInputStyle} />
                                </div>
                            </div>
                            <div className="ec-form-group" style={{ marginTop: '24px' }}>
                                <label style={labelStyle}>Activité principale</label>
                                <textarea value={extra.activite || 'Non renseigné'} readOnly style={{...readOnlyInputStyle, minHeight: '80px', resize: 'vertical'}} />
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>ℹ️</span> Ces informations sont utilisées pour vos documents légaux. Pour les modifier, veuillez nous contacter.
                            </p>
                        </div>

                        <button type="submit" className="ec-btn-primary" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1, padding: '12px 24px', fontSize: '14px' }}>
                            {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--ec-text-main)'
};

const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid var(--ec-border)',
    background: '#f8fafc',
    fontSize: '15px',
    color: 'var(--ec-text-main)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    boxSizing: 'border-box'
};

const readOnlyInputStyle = {
    ...inputStyle,
    background: '#e2e8f0',
    cursor: 'not-allowed',
    color: '#64748b'
};
