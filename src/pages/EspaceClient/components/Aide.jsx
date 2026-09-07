import React, { useState } from 'react';
import { Icons } from './Icons';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function Aide({ clientData, setActiveTab }) {
    const { t } = useTranslation();
    const [openFaq, setOpenFaq] = useState(0);
    const faqsRaw = t('espaceClient.help.faqs');
    const faqs = Array.isArray(faqsRaw) ? faqsRaw : [];

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Header */}
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--ec-text-main)', letterSpacing: '-0.02em' }}>
{t('espaceClient.help.title')}
                    </h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '15px', marginTop: '6px' }}>
{t('espaceClient.help.subtitle')}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {setActiveTab && (
                        <button 
                            onClick={() => setActiveTab('messages')}
                            className="ec-btn-primary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px' }}
                        >
                            <Icons.Chat style={{ width: 16, height: 16 }} />
{t('espaceClient.help.openChat')}
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Contact Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div className="ec-content-card" style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid var(--ec-border)', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Chat style={{ width: 22, height: 22 }} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 4px 0' }}>{t('espaceClient.help.chatTitle')}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--ec-text-sub)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
{t('espaceClient.help.chatHint')}
                        </p>
                        {setActiveTab && (
                            <button onClick={() => setActiveTab('messages')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '700', fontSize: '13px', padding: 0, cursor: 'pointer' }}>
{t('espaceClient.help.write')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="ec-content-card" style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid var(--ec-border)', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Mail style={{ width: 22, height: 22 }} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 4px 0' }}>{t('espaceClient.help.emailTitle')}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--ec-text-sub)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
{t('espaceClient.help.emailHint')}
                        </p>
                        <a href="mailto:contact@domiciliation-pas-cher.fr" style={{ color: '#16a34a', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
                            contact@domiciliation-pas-cher.fr
                        </a>
                    </div>
                </div>

                <div className="ec-content-card" style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid var(--ec-border)', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Calendar style={{ width: 22, height: 22 }} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 4px 0' }}>{t('espaceClient.help.hoursTitle')}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--ec-text-sub)', margin: '0 0 6px 0', lineHeight: '1.4' }}>
{t('espaceClient.help.hoursHint')}
                        </p>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ec-text-main)' }}>
{t('espaceClient.help.hours')}
                        </span>
                    </div>
                </div>
            </div>

            {/* FAQ Accordion */}
            <div className="ec-content-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid var(--ec-border)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 20px 0' }}>
{t('espaceClient.help.faqTitle')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {faqs.map((faq, idx) => {
                        const isOpen = openFaq === idx;
                        return (
                            <div 
                                key={idx} 
                                style={{ 
                                    border: '1px solid', 
                                    borderColor: isOpen ? '#93c5fd' : '#e2e8f0', 
                                    borderRadius: '12px', 
                                    overflow: 'hidden', 
                                    transition: 'all 0.2s ease',
                                    background: isOpen ? '#f8fafc' : 'white'
                                }}
                            >
                                <button
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    style={{
                                        width: '100%',
                                        padding: '18px 20px',
                                        background: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        color: isOpen ? '#1d4ed8' : 'var(--ec-text-main)'
                                    }}
                                >
                                    <span>{faq.q}</span>
                                    <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease', fontSize: '14px', color: '#64748b' }}>
                                        ▼
                                    </span>
                                </button>
                                {isOpen && (
                                    <div style={{ padding: '0 20px 18px 20px', fontSize: '14px', color: '#475569', lineHeight: '1.6', borderTop: '1px solid #f1f5f9' }}>
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
