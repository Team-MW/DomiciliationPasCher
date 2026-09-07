import React, { useEffect, useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';
import { useTranslation } from '../../../i18n/LanguageContext';
import AddressAutocomplete from '../../../components/AddressAutocomplete/AddressAutocomplete';
import { parseExtraInfo, resolvePersonalAddress } from '../../../utils/contractLegalFields';

const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' },
    { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺', short: 'RU' },
];

export default function Settings({ clientData, setClientData }) {
    const { t, lang, setLang } = useTranslation();
    const [address, setAddress] = useState(clientData?.address || '');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isWindows, setIsWindows] = useState(false);

    useEffect(() => {
        setIsWindows(navigator.userAgent.indexOf('Windows') !== -1);
    }, []);

    const extra = parseExtraInfo(clientData?.extra_info);
    const resolvedAddress = resolvePersonalAddress(clientData, extra);

    useEffect(() => {
        setAddress(resolvePersonalAddress(clientData, parseExtraInfo(clientData?.extra_info)));
    }, [clientData]);

    const hasChanged = address.trim() !== resolvedAddress.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hasChanged) return;
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const updated = await adminDataService.updateClientAddress(clientData.id, address.trim());
            if (setClientData) {
                setClientData(prev => ({ ...prev, address: updated.address }));
            }
            setMessage({ type: 'success', text: t('espaceClient.settings.saveSuccess') });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: t('espaceClient.settings.saveError') });
        } finally {
            setIsLoading(false);
        }
    };

    const ReadOnlyField = ({ label, value, isTextarea = false }) => (
        <div className="ec-form-group">
            <label style={labelStyle}>{label}</label>
            {isTextarea ? (
                <textarea value={value || t('espaceClient.settings.notProvided')} readOnly tabIndex={-1} style={{ ...readOnlyInputStyle, minHeight: '80px', resize: 'none' }} />
            ) : (
                <input value={value || t('espaceClient.settings.notProvided')} readOnly tabIndex={-1} style={readOnlyInputStyle} />
            )}
        </div>
    );

    const formatDate = (value) => {
        if (!value) return '';
        const d = new Date(value);
        const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-GB' : 'fr-FR';
        return isNaN(d.getTime()) ? value : d.toLocaleDateString(locale);
    };

    const projectType = extra.typeProjet
        ? t(`espaceClient.settings.projectTypes.${extra.typeProjet}`)
        : extra.typeProjet;
    const projectTypeLabel = projectType && !String(projectType).startsWith('espaceClient.')
        ? projectType
        : extra.typeProjet;

    return (
        <div className="ec-tab-animate">
            <div className="ec-content-card" style={{ marginBottom: '24px' }}>
                <div className="ec-card-header">
                    <h2>{t('espaceClient.settings.languageTitle')}</h2>
                </div>
                <div className="ec-card-body" style={{ padding: '24px 32px' }}>
                    <label style={labelStyle}>{t('espaceClient.settings.languageLabel')}</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {LANGUAGES.map(l => {
                            const isActive = lang === l.code;
                            return (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => setLang(l.code)}
                                    aria-pressed={isActive}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 18px',
                                        borderRadius: '12px',
                                        border: isActive ? '2px solid #16a34a' : '1px solid var(--ec-border)',
                                        background: isActive ? '#f0fdf4' : '#f8fafc',
                                        color: isActive ? '#166534' : 'var(--ec-text-main)',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }} aria-hidden="true">{isWindows ? l.short : l.flag}</span>
                                    {l.label}
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--ec-text-sub)', marginTop: '14px' }}>
                        {t('espaceClient.settings.languageHint')}
                    </p>
                </div>
            </div>

            <div className="ec-content-card" style={{ marginBottom: '24px' }}>
                <div className="ec-card-header">
                    <h2>{t('espaceClient.settings.addressTitle')}</h2>
                </div>
                <div className="ec-card-body" style={{ padding: '24px 32px' }}>
                    <form onSubmit={handleSubmit}>
                        {message.text && (
                            <div style={{
                                padding: '16px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                                color: message.type === 'success' ? '#065f46' : '#991b1b',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}>
                                {message.text}
                            </div>
                        )}

                        <div className="ec-form-group" style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>{t('espaceClient.settings.addressLabel')}</label>
                            <AddressAutocomplete
                                value={address}
                                onChange={setAddress}
                                placeholder={t('espaceClient.settings.addressPlaceholder')}
                                inputStyle={inputStyle}
                                noResultsLabel={t('espaceClient.settings.addressNoResults')}
                            />
                            <p style={{ fontSize: '13px', color: 'var(--ec-text-sub)', marginTop: '8px' }}>
                                {t('espaceClient.settings.addressSearchHint')}
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--ec-text-sub)', marginTop: '4px' }}>
                                {t('espaceClient.settings.addressHint')}
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="ec-btn-primary"
                            disabled={isLoading || !hasChanged}
                            style={{ opacity: (isLoading || !hasChanged) ? 0.6 : 1, cursor: (isLoading || !hasChanged) ? 'not-allowed' : 'pointer', padding: '12px 24px', fontSize: '14px' }}
                        >
                            {isLoading ? t('espaceClient.settings.saving') : t('espaceClient.settings.save')}
                        </button>
                    </form>
                </div>
            </div>

            <div className="ec-content-card">
                <div className="ec-card-header">
                    <h2>{t('espaceClient.settings.infoTitle')}</h2>
                </div>
                <div className="ec-card-body" style={{ padding: '24px 32px' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: '#1e3a8a', display: 'flex', gap: '10px' }}>
                        <span aria-hidden="true">ℹ️</span>
                        <span>{t('espaceClient.settings.infoNotice')}</span>
                    </div>

                    <div className="form-grid" style={{ marginBottom: '24px' }}>
                        <ReadOnlyField label={t('espaceClient.settings.fullName')} value={clientData?.name} />
                        <ReadOnlyField label={t('espaceClient.settings.email')} value={clientData?.email} />
                        <ReadOnlyField label={t('espaceClient.settings.phone')} value={clientData?.phone} />
                        <ReadOnlyField label={t('espaceClient.settings.company')} value={clientData?.company} />
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px', color: '#0F172A' }}>
                        {t('espaceClient.settings.companySection')}
                    </h3>
                    <div className="form-grid">
                        <ReadOnlyField label={t('espaceClient.settings.legalForm')} value={extra.formeJuridique} />
                        <ReadOnlyField label={t('espaceClient.settings.siren')} value={extra.siren || extra.siret} />
                        <ReadOnlyField label={t('espaceClient.settings.projectType')} value={projectTypeLabel} />
                        <ReadOnlyField label={t('espaceClient.settings.nationality')} value={extra.nationalite} />
                        <ReadOnlyField label={t('espaceClient.settings.quality')} value={extra.qualite} />
                        <ReadOnlyField label={t('espaceClient.settings.birthDate')} value={formatDate(extra.dateNaissance)} />
                        <ReadOnlyField label={t('espaceClient.settings.birthPlace')} value={extra.lieuNaissance} />
                    </div>
                    <div style={{ marginTop: '24px' }}>
                        <ReadOnlyField label={t('espaceClient.settings.activity')} value={extra.activite} isTextarea />
                    </div>
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
