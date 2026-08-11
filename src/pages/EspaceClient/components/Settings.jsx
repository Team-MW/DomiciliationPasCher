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
    const [extraFormData, setExtraFormData] = useState({});

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

            let extraInfos = {};
            if (clientData.extra_info) {
                try {
                    extraInfos = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info;
                } catch (e) {}
            }
            setExtraFormData({
                formeJuridique: extraInfos.formeJuridique || '',
                siren: extraInfos.siren || '',
                siret: extraInfos.siret || '',
                typeProjet: extraInfos.typeProjet || '',
                nationalite: extraInfos.nationalite || '',
                qualite: extraInfos.qualite || '',
                dateNaissance: extraInfos.dateNaissance || '',
                lieuNaissance: extraInfos.lieuNaissance || '',
                activite: extraInfos.activite || ''
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

    const handleChangeExtra = (e) => {
        setExtraFormData({ ...extraFormData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            const updatedClient = await adminDataService.updateClientProfile(clientData.id, formData);
            
            // Collect only changed extra info
            const extraToUpdate = {};
            for (const key in extraFormData) {
                if (extraFormData[key] && !extra[key]) {
                    extraToUpdate[key] = extraFormData[key];
                }
            }

            let updatedExtra = extra;
            if (Object.keys(extraToUpdate).length > 0) {
                updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, extraToUpdate);
            }

            if (setClientData) {
                setClientData(prev => ({ ...prev, ...updatedClient, extra_info: JSON.stringify(updatedExtra) }));
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

                        {/* Informations Légales */}
                        <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--ec-border)', marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', color: '#0F172A' }}>Informations de l'entreprise & Dirigeant</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Forme juridique</label>
                                    {extra.formeJuridique ? (
                                        <input value={extra.formeJuridique} readOnly style={readOnlyInputStyle} />
                                    ) : (
                                        <input name="formeJuridique" value={extraFormData.formeJuridique} onChange={handleChangeExtra} style={inputStyle} placeholder="Ex: SAS, SASU, EURL..." />
                                    )}
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Numéro SIREN</label>
                                    {extra.siren || extra.siret ? (
                                        <input value={extra.siren || extra.siret} readOnly style={readOnlyInputStyle} />
                                    ) : (
                                        <input name="siren" value={extraFormData.siren} onChange={handleChangeExtra} style={inputStyle} placeholder="Votre SIREN" />
                                    )}
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Type de projet</label>
                                    {extra.typeProjet ? (
                                        <input value={extra.typeProjet === 'creation' ? 'Création d\'entreprise' : (extra.typeProjet === 'transfert' ? 'Transfert de siège' : (extra.typeProjet === 'domiciliation' ? 'Domiciliation seule' : extra.typeProjet))} readOnly style={readOnlyInputStyle} />
                                    ) : (
                                        <select name="typeProjet" value={extraFormData.typeProjet} onChange={handleChangeExtra} style={inputStyle}>
                                            <option value="">Sélectionnez un projet</option>
                                            <option value="creation">Création d'entreprise</option>
                                            <option value="transfert">Transfert de siège</option>
                                            <option value="domiciliation">Domiciliation seule</option>
                                        </select>
                                    )}
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Nationalité du dirigeant</label>
                                    {extra.nationalite ? (
                                        <input value={extra.nationalite} readOnly style={readOnlyInputStyle} />
                                    ) : (
                                        <input name="nationalite" value={extraFormData.nationalite} onChange={handleChangeExtra} style={inputStyle} placeholder="Ex: Française" />
                                    )}
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Qualité du signataire</label>
                                    {extra.qualite ? (
                                        <input value={extra.qualite} readOnly style={readOnlyInputStyle} />
                                    ) : (
                                        <input name="qualite" value={extraFormData.qualite} onChange={handleChangeExtra} style={inputStyle} placeholder="Ex: Président, Gérant..." />
                                    )}
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Date de naissance</label>
                                    {extra.dateNaissance ? (
                                        <input value={new Date(extra.dateNaissance).toLocaleDateString('fr-FR')} readOnly style={readOnlyInputStyle} />
                                    ) : (
                                        <input type="date" name="dateNaissance" value={extraFormData.dateNaissance} onChange={handleChangeExtra} style={inputStyle} />
                                    )}
                                </div>
                                <div className="ec-form-group">
                                    <label style={labelStyle}>Lieu de naissance</label>
                                    {extra.lieuNaissance ? (
                                        <input value={extra.lieuNaissance} readOnly style={readOnlyInputStyle} />
                                    ) : (
                                        <input name="lieuNaissance" value={extraFormData.lieuNaissance} onChange={handleChangeExtra} style={inputStyle} placeholder="Ville (et Pays si étranger)" />
                                    )}
                                </div>
                            </div>
                            <div className="ec-form-group" style={{ marginTop: '24px' }}>
                                <label style={labelStyle}>Activité principale</label>
                                {extra.activite ? (
                                    <textarea value={extra.activite} readOnly style={{...readOnlyInputStyle, minHeight: '80px', resize: 'vertical'}} />
                                ) : (
                                    <textarea name="activite" value={extraFormData.activite} onChange={handleChangeExtra} style={{...inputStyle, minHeight: '80px', resize: 'vertical'}} placeholder="Description de l'activité..." />
                                )}
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>ℹ️</span> Complétez ces informations pour vos documents légaux. Une fois enregistrées, elles ne seront modifiables que par le support.
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
