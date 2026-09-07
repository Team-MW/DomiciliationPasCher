import React from 'react';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function ComptePro({ clientData }) {
    const { t } = useTranslation();
    const perksRaw = t('espaceClient.proAccount.perks');
    const perks = Array.isArray(perksRaw) ? perksRaw : [];
    const company = clientData?.company || t('espaceClient.proAccount.companyFallback');

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Header */}
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--ec-text-main)', letterSpacing: '-0.02em' }}>
                        {t('espaceClient.proAccount.title')}
                    </h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '15px', marginTop: '6px' }}>
                        {t('espaceClient.proAccount.subtitle')}
                    </p>
                </div>
            </div>

            {/* Hero Partner Banner */}
            <div className="ec-content-card" style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e293b 100%)',
                color: 'white',
                padding: '36px',
                borderRadius: '18px',
                border: '1px solid #4338ca',
                boxShadow: '0 12px 36px rgba(49, 46, 129, 0.25)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ maxWidth: '640px', position: 'relative', zIndex: 2 }}>
                    <span style={{ display: 'inline-block', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a5b4fc', marginBottom: '16px' }}>
                        {t('espaceClient.proAccount.badge')}
                    </span>
                    <h3 style={{ fontSize: '30px', fontWeight: '900', color: 'white', letterSpacing: '-0.02em', margin: '0 0 12px 0', lineHeight: '1.2' }}>
                        {t('espaceClient.proAccount.heroTitle')}
                    </h3>
                    <p style={{ fontSize: '16px', color: '#e0e7ff', lineHeight: '1.6', margin: '0 0 28px 0' }}>
                        {t('espaceClient.proAccount.heroHint').split('{company}')[0]}<strong>{company}</strong>{t('espaceClient.proAccount.heroHint').split('{company}')[1]}
                    </p>

                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <a
                            href="https://shine.fr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ec-btn-primary"
                            style={{ background: '#4f46e5', border: 'none', padding: '14px 28px', fontSize: '15px', fontWeight: '800', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'white' }}
                        >
                            {t('espaceClient.proAccount.cta')}
                        </a>
                    </div>
                </div>

                <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.15, fontSize: '220px', pointerEvents: 'none', userSelect: 'none' }}>
                    💳
                </div>
            </div>

            {/* Perks Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {perks.map((p, idx) => (
                    <div key={idx} className="ec-content-card" style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid var(--ec-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '32px' }}>{p.icon}</div>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: 0 }}>{p.title}</h4>
                        <p style={{ fontSize: '14px', color: 'var(--ec-text-sub)', lineHeight: '1.5', margin: 0 }}>{p.desc}</p>
                    </div>
                ))}
            </div>

            {/* Info FAQ */}
            <div className="ec-content-card" style={{ background: '#f8fafc', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 8px 0' }}>
                    {t('espaceClient.proAccount.faqTitle')}
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--ec-text-sub)', lineHeight: '1.6', margin: 0 }}>
                    <strong>{t('espaceClient.proAccount.faqYes')}</strong>{t('espaceClient.proAccount.faqBody')}
                </p>
            </div>
        </div>
    );
}
