import { adminDataService } from '../../../services/adminDataService';
import { resolveClientStatusFromStripe } from '../../../utils/stripeClientStatus';
import { useTranslation } from '../../../i18n/LanguageContext';
import { appAlert } from '../../../components/AppDialog/dialogApi';
import { useState, useEffect } from 'react';

const interpolate = (template, vars) =>
    Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);

export default function Factures({ clientData, setClientData }) {
    const { t, lang } = useTranslation();
    const [realPayments, setRealPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isPortalLoading, setIsPortalLoading] = useState(false);

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
            await appAlert(t('espaceClient.invoices.portalError'));
            return;
        }

        try {
            const url = await adminDataService.createStripePortalSession(currentStripeId);
            if (url) {
                window.location.href = url;
            } else {
                await appAlert(t('espaceClient.invoices.portalOpenError'));
            }
        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes('No such customer')) {
                await appAlert(t('espaceClient.invoices.staleId'));
                try {
                    const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, { stripe_customer_id: null });
                    if (setClientData) {
                        setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
                    }
                } catch (e) {
                    console.error("Erreur réinitialisation Stripe ID:", e);
                }
            } else {
                await appAlert(interpolate(t('espaceClient.invoices.stripeConnectError'), { message: err.message }));
            }
        } finally {
            setIsPortalLoading(false);
        }
    };

    useEffect(() => {
        if (!clientData?.id) return;

        const fetchPayments = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                let currentStripeId = null;
                if (clientData.extra_info) {
                    try {
                        let extraInfo = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info;
                        if (typeof extraInfo === 'string') extraInfo = JSON.parse(extraInfo);
                        currentStripeId = extraInfo?.stripe_customer_id || null;
                    } catch (e) {
                        console.error("Error parsing clientData.extra_info:", e);
                    }
                }

                const syncData = await adminDataService.syncStripePayments(clientData.email, currentStripeId, clientData.since);
                const stripePayments = syncData.payments || [];

                if (!currentStripeId && syncData.foundCustomerId && setClientData) {
                    try {
                        const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, { stripe_customer_id: syncData.foundCustomerId });
                        setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
                    } catch (e) {
                        console.error("Erreur auto-save stripeCustomerId:", e);
                    }
                }

                // Uniquement les factures Stripe (in_…), jamais les lignes locales du logiciel.
                const formattedStripe = stripePayments
                    .filter(sp => sp.id && sp.id.startsWith('in_'))
                    .map(sp => ({
                        ...sp,
                        invoice_ref: sp.invoice_ref || `STRIPE-${sp.id.substring(3, 10)}`
                    }));
                setRealPayments(formattedStripe.sort((a, b) => new Date(b.date) - new Date(a.date)));

                if (syncData.subscriptionStatus) {
                    const newClientStatus = resolveClientStatusFromStripe(clientData.status, syncData.subscriptionStatus);
                    if (newClientStatus !== clientData.status) {
                        await adminDataService.updateClientStatus(clientData.id, newClientStatus);
                        if (setClientData) {
                            setClientData(prev => ({ ...prev, status: newClientStatus }));
                        }
                    }
                }
            } catch (err) {
                console.error("Erreur chargement/sync factures:", err);
                setLoadError(t('espaceClient.invoices.stripeError'));
                setRealPayments([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPayments();
    }, [clientData?.id, clientData?.email, clientData?.since]);

    if (!clientData || !clientData.since) {
        return (
            <div className="ec-tab-animate">
                <div className="ec-content-card">
                    <div className="ec-card-header"><h2>{t('espaceClient.invoices.title')}</h2></div>
                    <div className="ec-card-body" style={{ padding: '24px' }}>
                        <p>{t('espaceClient.invoices.noData')}</p>
                    </div>
                </div>
            </div>
        );
    }

    const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-GB' : 'fr-FR';

    const factures = realPayments.map(p => {
        const amountTTC = parseFloat(p.amount);
        const amountHT = amountTTC / 1.2;
        const stripeUrl = p.status === 'payé'
            ? (p.invoice_pdf || p.invoice_url || p.hosted_invoice_url || p.receipt_url)
            : (p.hosted_invoice_url || p.invoice_url || p.invoice_pdf);
        return {
            id: p.id,
            ref: p.invoice_ref,
            dateStr: new Date(p.date).toLocaleDateString(locale),
            amountTTC,
            amountHT,
            status: p.status,
            stripeUrl,
        };
    });

    const openStripeInvoice = (facture) => {
        if (!facture.stripeUrl) return;
        window.open(facture.stripeUrl, '_blank', 'noopener,noreferrer');
    };

    const statusLabel = (status) => {
        if (status === 'payé') return t('espaceClient.invoices.paid');
        if (status === 'en attente') return t('espaceClient.invoices.pending');
        return t('espaceClient.invoices.unpaid');
    };

    return (
        <div className="ec-tab-animate">
            <div className="tab-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ec-text-main)' }}>{t('espaceClient.invoices.title')}</h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '14px', marginTop: '4px' }}>{t('espaceClient.invoices.subtitle')}</p>
                </div>
                <button
                    className="ec-btn-primary"
                    onClick={handleManagePaymentMethods}
                    disabled={isPortalLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: isPortalLoading ? 0.7 : 1, cursor: isPortalLoading ? 'not-allowed' : 'pointer', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}
                >
                    {isPortalLoading ? (
                        <>
                            <svg className="spinner" viewBox="0 0 24 24" width="16" height="16" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                            </svg>
                            {t('espaceClient.invoices.loading')}
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                            {t('espaceClient.invoices.managePayment')}
                        </>
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--ec-border)' }}>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '16px', fontWeight: '600' }}>{t('espaceClient.invoices.loadingInvoices')}</p>
                </div>
            ) : loadError ? (
                <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--ec-border)' }}>
                    <p style={{ color: '#991b1b', fontSize: '16px', fontWeight: '600' }}>{loadError}</p>
                </div>
            ) : factures.length > 0 ? (
                <div className="cards-grid">
                    {factures.map((fac) => (
                        <div key={fac.id} className="case-card">
                            <div className="case-card-header">
                                <span className={`case-badge ${fac.status === 'payé' ? 'badge-success' : 'badge-danger'}`} style={{ backgroundColor: fac.status === 'payé' ? '#dcfce7' : '#fee2e2', color: fac.status === 'payé' ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600' }}>
                                    {statusLabel(fac.status)}
                                </span>
                                <span className="case-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    {fac.dateStr}
                                </span>
                            </div>

                            <div className="case-card-body">
                                <h3 className="case-title">{fac.ref}</h3>
                                <p className="case-client-name" style={{ marginTop: '8px', fontSize: '18px', fontWeight: '800', color: 'var(--ec-text-main)' }}>{fac.amountTTC.toFixed(2)} € {t('espaceClient.invoices.ttc')}</p>
                                <p style={{ fontSize: '12px', color: 'var(--ec-text-sub)', marginTop: '2px' }}>{interpolate(t('espaceClient.invoices.htVat'), { ht: fac.amountHT.toFixed(2) })}</p>
                            </div>

                            <div className="case-card-footer">
                                <button
                                    className={fac.status === 'payé' ? "ec-btn-primary" : "ec-btn-primary danger"}
                                    onClick={() => fac.stripeUrl ? openStripeInvoice(fac) : handleManagePaymentMethods()}
                                    disabled={isPortalLoading || (fac.status === 'payé' && !fac.stripeUrl)}
                                    title={fac.status === 'payé' && !fac.stripeUrl ? t('espaceClient.invoices.unavailableHint') : undefined}
                                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: (isPortalLoading || (fac.status === 'payé' && !fac.stripeUrl)) ? 0.6 : 1, cursor: (isPortalLoading || (fac.status === 'payé' && !fac.stripeUrl)) ? 'not-allowed' : 'pointer', backgroundColor: fac.status === 'payé' ? '' : '#ef4444' }}
                                >
                                    {fac.status === 'payé' ? (
                                        fac.stripeUrl ? (
                                            <>
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="7 10 12 15 17 10"></polyline>
                                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                                </svg>
                                                {t('espaceClient.invoices.stripeInvoice')}
                                            </>
                                        ) : t('espaceClient.invoices.unavailable')
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                                <line x1="1" y1="10" x2="23" y2="10"></line>
                                            </svg>
                                            {t('espaceClient.invoices.payUnpaid')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--ec-border)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--ec-text-sub)', opacity: 0.5, marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '16px', fontWeight: '600' }}>{t('espaceClient.invoices.empty')}</p>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
