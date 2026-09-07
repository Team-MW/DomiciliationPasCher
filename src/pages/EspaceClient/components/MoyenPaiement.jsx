import React, { useState, useEffect } from 'react';
import { adminDataService } from '../../../services/adminDataService';
import { Icons } from './Icons';
import { useTranslation } from '../../../i18n/LanguageContext';
import { appAlert } from '../../../components/AppDialog/dialogApi';

export default function MoyenPaiement({ clientData, setClientData }) {
        const { t } = useTranslation();
        const [isPortalLoading, setIsPortalLoading] = useState(false);
    const [cardDetails, setCardDetails] = useState(null);

    useEffect(() => {
        const fetchCard = async () => {
            try {
                let currentStripeId = clientData?.stripeCustomerId;
                if (!currentStripeId && clientData?.extra_info) {
                    try {
                        const extra = JSON.parse(clientData.extra_info);
                        currentStripeId = extra.stripe_customer_id;
                    } catch(e){}
                }
                if (currentStripeId) {
                    const res = await fetch(`/api/get-payment-method?customerId=${currentStripeId}`);
                    const data = await res.json();
                    if (data.last4) {
                        setCardDetails(data);
                    }
                }
            } catch (error) {
                console.error("Erreur récupération carte:", error);
            }
        };
        fetchCard();
    }, [clientData]);

    let stripeCustomerId = null;
    if (clientData?.extra_info) {
        try {
            let extraInfo = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info;
            if (typeof extraInfo === 'string') extraInfo = JSON.parse(extraInfo);
            stripeCustomerId = extraInfo?.stripe_customer_id || null;
        } catch (e) { }
    }

    const handleManagePaymentMethods = async () => {
        let currentStripeId = stripeCustomerId;
        setIsPortalLoading(true);

        if (!currentStripeId) {
            try {
                const res = await fetch('/api/ensure-stripe-customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: clientData.email,
                        name: clientData.name || clientData.company,
                        company: clientData.company
                    })
                });
                const data = await res.json();
                if (data.customerId) {
                    currentStripeId = data.customerId;
                    const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, { stripe_customer_id: currentStripeId });
                    if (setClientData) {
                        setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
                    }
                }
            } catch (err) {
                console.error("Erreur création client Stripe:", err);
            }
        }

        if (!currentStripeId) {
            setIsPortalLoading(false);
            await appAlert(t('espaceClient.payment.portalError'));
            return;
        }

        try {
            const url = await adminDataService.createStripePortalSession(currentStripeId);
            if (url) {
                window.location.href = url;
            } else {
                await appAlert(t('espaceClient.payment.portalOpenError'));
            }
        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes('No such customer')) {
                await appAlert(t('espaceClient.payment.staleId'));
                try {
                    const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, { stripe_customer_id: null });
                    if (setClientData) {
                        setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
                    }
                } catch (e) {
                    console.error("Erreur réinitialisation Stripe ID:", e);
                }
            } else {
                await appAlert(t('espaceClient.payment.stripeError').replace('{message}', err.message));
            }
        } finally {
            setIsPortalLoading(false);
        }
    };

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Header */}
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--ec-text-main)', letterSpacing: '-0.02em' }}>
                        {t('espaceClient.payment.title')}
                    </h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '15px', marginTop: '6px' }}>
                        {t('espaceClient.payment.subtitle')}
                    </p>
                </div>
            </div>

            {/* Main Payment Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <div className="ec-content-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid var(--ec-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icons.CreditCard style={{ width: 24, height: 24 }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ec-text-main)', margin: 0 }}>
                                    {t('espaceClient.payment.cardTitle')}
                                </h3>
                                <span style={{ fontSize: '13px', color: 'var(--ec-text-sub)' }}>
                                    {t('espaceClient.payment.cardHint')}
                                </span>
                            </div>
                        </div>

                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
                            {t('espaceClient.payment.body')}
                        </p>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>{t('espaceClient.payment.statusLabel')}</span>
                                <strong style={{ color: '#10b981' }}>{t('espaceClient.payment.statusOk')}</strong>
                            </div>
                            {cardDetails ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>{t('espaceClient.payment.cardUsed')}</span>
                                    <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>
                                        {t('espaceClient.payment.ending').replace('{brand}', cardDetails.brand).replace('{last4}', cardDetails.last4)}
                                    </strong>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>{t('espaceClient.payment.provider')}</span>
                                    <strong style={{ color: '#0f172a' }}>{t('espaceClient.payment.providerValue')}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '28px' }}>
                        <button
                            onClick={handleManagePaymentMethods}
                            disabled={isPortalLoading}
                            className="ec-btn-primary"
                            style={{ width: '100%', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px' }}
                        >
                            <Icons.CreditCard style={{ width: 18, height: 18 }} />
                            {isPortalLoading ? t('espaceClient.payment.connecting') : t('espaceClient.payment.updateCard')}
                        </button>
                        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>
                            {t('espaceClient.payment.redirect')}
                        </p>
                    </div>
                </div>

                {/* Security info card */}
                <div className="ec-content-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid var(--ec-border)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 16px 0' }}>
                        {t('espaceClient.payment.securityTitle')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#10b981', fontSize: '18px', lineHeight: 1 }}>🛡️</span>
                            <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                                <strong>{t('espaceClient.payment.noStore')}</strong>{t('espaceClient.payment.noStoreHint')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#3b82f6', fontSize: '18px', lineHeight: 1 }}>⚡</span>
                            <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                                <strong>{t('espaceClient.payment.continuity')}</strong>{t('espaceClient.payment.continuityHint')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#f59e0b', fontSize: '18px', lineHeight: 1 }}>🧾</span>
                            <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                                <strong>{t('espaceClient.payment.autoInvoice')}</strong>{t('espaceClient.payment.autoInvoiceHint')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
