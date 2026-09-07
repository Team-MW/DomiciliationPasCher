import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { useTranslation } from '../../../i18n/LanguageContext';
import { PLAN_CATALOG, resolvePlanId } from '../../../data/plans.js';
import { appConfirm } from '../../../components/AppDialog/dialogApi';

const PLAN_I18N_KEY = {
    essentiel: 'essential',
    'scan-plus': 'scan',
    physique: 'forward',
};

export default function Abonnement({ clientData, setActiveTab, setClientData }) {
    const { t } = useTranslation();
    const [switchingId, setSwitchingId] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showPicker, setShowPicker] = useState(false);

    const plan = clientData?.plan || 'Essentiel';
    const status = clientData?.status || 'actif';
    const currentPlanId = resolvePlanId(plan);
    const canSwitch = Boolean(clientData?.id && clientData?.email && status !== 'echec_paiement' && status !== 'impayé');
    const renewalDate = clientData?.renewal || t('espaceClient.subscription.autoRenew');
    let sinceDate = clientData?.since || 'Non spécifié';

    if (sinceDate !== 'Non spécifié') {
        const parsedDate = new Date(sinceDate);
        if (!isNaN(parsedDate.getTime())) {
            sinceDate = parsedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    } else {
        sinceDate = t('espaceClient.subscription.unspecified');
    }

    const getPlanDetails = (p) => {
        const id = resolvePlanId(p);
        const catalog = PLAN_CATALOG[id];
        const i18nKey = PLAN_I18N_KEY[id];
        const copy = t(`espaceClient.subscription.${i18nKey}`);
        return {
            title: copy?.title || catalog.name,
            price: `${catalog.ht} €`,
            period: t('espaceClient.subscription.periodMonthHt'),
            badge: copy?.badge || '',
            features: Array.isArray(copy?.features) ? copy.features : [],
        };
    };

    const planInfo = getPlanDetails(plan);

    if (clientData?.amount) {
        planInfo.price = `${clientData.amount} €`;
        try {
            const extra = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : (clientData.extra_info || {});
            planInfo.period = extra?.frequence === 'annuel' ? t('espaceClient.subscription.periodYearTtc') : t('espaceClient.subscription.periodMonthTtc');
        } catch (e) {
            planInfo.period = t('espaceClient.subscription.periodTtc');
        }
    }

    const handleSwitch = async (planId) => {
        if (!canSwitch || switchingId || planId === currentPlanId) return;
        const catalog = PLAN_CATALOG[planId];
        const ok = await appConfirm(
            t('espaceClient.subscription.confirmSwitch')
                .replace('{plan}', catalog.name)
                .replace('{price}', String(catalog.ht)),
            {
                title: t('espaceClient.subscription.confirmTitle'),
                confirmText: t('espaceClient.subscription.confirmOk'),
                cancelText: t('espaceClient.subscription.confirmCancel'),
            }
        );
        if (!ok) return;

        setSwitchingId(planId);
        setFeedback(null);
        try {
            const res = await fetch('/api/change-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: clientData.id,
                    email: clientData.email,
                    planId,
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.message || data.error || t('espaceClient.subscription.switchError'));
            }
            if (data.unchanged) {
                setFeedback({ type: 'ok', text: t('espaceClient.subscription.switchUnchanged') });
                return;
            }
            if (setClientData) {
                setClientData((prev) => ({
                    ...prev,
                    plan: data.plan,
                    extra_info: JSON.stringify(data.extra_info || {}),
                }));
            }
            setFeedback({ type: 'ok', text: t('espaceClient.subscription.switchSuccess') });
            setShowPicker(false);
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'err', text: err.message || t('espaceClient.subscription.switchError') });
        } finally {
            setSwitchingId(null);
        }
    };

    const renderPlanCards = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {Object.values(PLAN_CATALOG).map((catalog) => {
                const copy = t(`espaceClient.subscription.${PLAN_I18N_KEY[catalog.id]}`);
                const isCurrent = catalog.id === currentPlanId;
                const busy = switchingId === catalog.id;
                return (
                    <div
                        key={catalog.id}
                        className="ec-content-card"
                        style={{
                            background: 'white',
                            padding: '22px',
                            borderRadius: '14px',
                            border: isCurrent ? '2px solid #3b82f6' : '1px solid var(--ec-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ec-text-main)', margin: 0 }}>
                                {copy?.title || catalog.name}
                            </h4>
                            {isCurrent && (
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                                    {t('espaceClient.subscription.currentBadge')}
                                </span>
                            )}
                        </div>
                        <div>
                            <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>{catalog.ht} €</span>
                            <span style={{ fontSize: '13px', color: 'var(--ec-text-sub)', fontWeight: 600, marginLeft: '4px' }}>
                                {t('espaceClient.subscription.periodMonthHt')}
                            </span>
                        </div>
                        <button
                            type="button"
                            disabled={!canSwitch || isCurrent || !!switchingId}
                            onClick={() => handleSwitch(catalog.id)}
                            className={isCurrent ? 'btn-outline' : 'ec-btn-primary'}
                            style={{
                                width: '100%',
                                padding: '11px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '13px',
                                opacity: (!canSwitch || isCurrent || switchingId) && !busy ? 0.55 : 1,
                                cursor: (!canSwitch || isCurrent || switchingId) ? 'default' : 'pointer',
                            }}
                        >
                            {busy
                                ? t('espaceClient.subscription.switching')
                                : isCurrent
                                    ? t('espaceClient.subscription.currentBadge')
                                    : t('espaceClient.subscription.switchTo')}
                        </button>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--ec-text-main)', letterSpacing: '-0.02em' }}>
                        {t('espaceClient.subscription.title')}
                    </h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '15px', marginTop: '6px' }}>
                        {t('espaceClient.subscription.subtitle')}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {setActiveTab && (
                        <button
                            onClick={() => setActiveTab('paiement')}
                            className="btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', background: 'white' }}
                        >
                            <Icons.CreditCard style={{ width: 16, height: 16 }} />
                            {t('espaceClient.subscription.managePayment')}
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <div className="ec-content-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid var(--ec-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6', background: '#eff6ff', padding: '6px 12px', borderRadius: '20px' }}>
                                {planInfo.badge}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: status === 'actif' ? '#ecfdf5' : '#fff7ed', color: status === 'actif' ? '#059669' : '#d97706', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'actif' ? '#10b981' : '#f59e0b', display: 'inline-block' }}></span>
                                {status === 'actif' ? t('espaceClient.subscription.active') : status}
                            </span>
                        </div>

                        <h3 style={{ fontSize: '28px', fontWeight: '850', color: 'var(--ec-text-main)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                            {planInfo.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
                            <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{planInfo.price}</span>
                            <span style={{ fontSize: '15px', color: 'var(--ec-text-sub)', fontWeight: '600' }}>{planInfo.period}</span>
                        </div>

                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--ec-text-sub)' }}>{t('espaceClient.subscription.since')}</span>
                                <strong style={{ color: 'var(--ec-text-main)' }}>{sinceDate}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--ec-text-sub)' }}>{t('espaceClient.subscription.next')}</span>
                                <strong style={{ color: 'var(--ec-text-main)' }}>{renewalDate}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--ec-text-sub)' }}>{t('espaceClient.subscription.commitment')}</span>
                                <strong style={{ color: '#10b981' }}>{t('espaceClient.subscription.noCommitment')}</strong>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '28px' }}>
                        <button
                            type="button"
                            onClick={() => { setFeedback(null); setShowPicker(true); }}
                            className="ec-btn-primary"
                            style={{ width: '100%', padding: '14px', borderRadius: '10px', textAlign: 'center' }}
                        >
                            {t('espaceClient.subscription.changeOffer')}
                        </button>
                    </div>
                </div>

                <div className="ec-content-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid var(--ec-border)' }}>
                    <h4 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 20px 0' }}>
                        {t('espaceClient.subscription.included')}
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {planInfo.features.map((feat, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', flexShrink: 0, marginTop: '2px' }}>
                                    <Icons.Check style={{ width: 13, height: 13 }} />
                                </span>
                                <span>{feat}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 6px 0' }}>
                    {t('espaceClient.subscription.chooseTitle')}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--ec-text-sub)', margin: '0 0 16px 0' }}>
                    {canSwitch ? t('espaceClient.subscription.chooseHint') : t('espaceClient.subscription.pendingHint')}
                </p>
                {feedback && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        background: feedback.type === 'ok' ? '#ecfdf5' : '#fef2f2',
                        color: feedback.type === 'ok' ? '#047857' : '#b91c1c',
                        border: `1px solid ${feedback.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
                    }}>
                        {feedback.text}
                    </div>
                )}
                {renderPlanCards()}
            </div>

            {showPicker && typeof document !== 'undefined' && createPortal(
                <div
                    onClick={() => setShowPicker(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{t('espaceClient.subscription.chooseTitle')}</h3>
                                <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b' }}>
                                    {canSwitch ? t('espaceClient.subscription.chooseHint') : t('espaceClient.subscription.pendingHint')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPicker(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '22px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
                                aria-label={t('espaceClient.subscription.close')}
                            >
                                ×
                            </button>
                        </div>
                        {feedback && (
                            <div style={{
                                margin: '16px 0',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                background: feedback.type === 'ok' ? '#ecfdf5' : '#fef2f2',
                                color: feedback.type === 'ok' ? '#047857' : '#b91c1c',
                                border: `1px solid ${feedback.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
                            }}>
                                {feedback.text}
                            </div>
                        )}
                        <div style={{ marginTop: '20px' }}>
                            {renderPlanCards()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
