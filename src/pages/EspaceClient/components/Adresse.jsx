import React, { useState } from 'react';
import { Icons } from './Icons';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function Adresse({ clientData, setActiveTab }) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const companyName = clientData?.company || t('espaceClient.address.companyFallback');
    const city = clientData?.city || "Toulouse";
    const addressLine1 = "150 Rue Nicolas Louis Vauquelin";
    const addressLine2 = "31100 Toulouse";
    const country = "FRANCE";

    const fullAddressText = `${companyName}\n${addressLine1}\n${addressLine2}\n${country}`;

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(fullAddressText);
        } else {
            const ta = document.createElement('textarea');
            ta.value = fullAddressText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Header */}
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--ec-text-main)', letterSpacing: '-0.02em' }}>
{t('espaceClient.address.title')}
                    </h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '15px', marginTop: '6px' }}>
{t('espaceClient.address.subtitle')}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={handleCopy}
                        className="ec-btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px' }}
                    >
                        {copied ? <Icons.Check style={{ width: 16, height: 16 }} /> : <Icons.Copy style={{ width: 16, height: 16 }} />}
                        {copied ? t('espaceClient.address.copied') : t('espaceClient.address.copyFull')}
                    </button>
                    {setActiveTab && (
                        <button 
                            onClick={() => setActiveTab('docs')}
                            className="btn-outline" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', background: 'white' }}
                        >
                            <Icons.Docs style={{ width: 16, height: 16 }} />
{t('espaceClient.address.attestation')}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Hero Card */}
            <div className="ec-content-card" style={{
                background: '#09090b',
                backgroundImage: `linear-gradient(to bottom, rgba(9, 9, 11, 0.4), rgba(9, 9, 11, 0.96)), url('/toulouse-capitole.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                            <Icons.Pin style={{ width: 22, height: 22 }} />
                        </div>
                        <div>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: '800' }}>{t('espaceClient.address.centreLabel')}</span>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: 0 }}>{t('espaceClient.address.centreName').replace('{city}', city)}</h3>
                        </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
{t('espaceClient.address.approval')}
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '28px', marginTop: '28px' }}>
                    <div>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: '700', marginBottom: '8px' }}>
{t('espaceClient.address.companyLabel')}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                            {companyName}
                        </div>
                        <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>
{t('espaceClient.address.representative').replace('{name}', clientData?.name || t('espaceClient.address.managerFallback'))}
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: '700', marginBottom: '8px' }}>
{t('espaceClient.address.postalLabel')}
                        </div>
                        <div style={{ fontSize: '17px', lineHeight: '1.6', color: '#f1f5f9', fontWeight: '600' }}>
                            {addressLine1}<br />
                            {addressLine2}<br />
                            {country}
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: '700', marginBottom: '8px' }}>
{t('espaceClient.address.hoursLabel')}
                        </div>
                        <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6' }}>
                            {t('espaceClient.address.hours')} <strong>{t('espaceClient.address.hoursRange')}</strong><br />
                            {t('espaceClient.address.hoursHint')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Information Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div className="ec-content-card" style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid var(--ec-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icons.Docs style={{ width: 18, height: 18 }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: 0 }}>{t('espaceClient.address.useTitle')}</h3>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--ec-text-sub)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✔</span> <strong>{t('espaceClient.address.useGreffe')}</strong> {t('espaceClient.address.useGreffeDesc')}
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✔</span> <strong>{t('espaceClient.address.useTax')}</strong> {t('espaceClient.address.useTaxDesc')}
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✔</span> <strong>{t('espaceClient.address.useBank')}</strong> {t('espaceClient.address.useBankDesc')}
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✔</span> <strong>{t('espaceClient.address.useBiz')}</strong> {t('espaceClient.address.useBizDesc')}
                        </li>
                    </ul>
                </div>

                <div className="ec-content-card" style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid var(--ec-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icons.Check style={{ width: 18, height: 18 }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: 0 }}>{t('espaceClient.address.normsTitle')}</h3>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--ec-text-sub)', lineHeight: '1.6', margin: '0 0 12px 0' }}>
{t('espaceClient.address.normsText')}
                    </p>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#475569', border: '1px solid #e2e8f0' }}>
                        <strong>{t('espaceClient.address.recos')}</strong> {t('espaceClient.address.recosHint')}
                    </div>
                </div>
            </div>
        </div>
    );
}
