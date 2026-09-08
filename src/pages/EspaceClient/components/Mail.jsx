import React, { useEffect, useMemo, useState } from 'react';
import { Icons } from './Icons';
import { useTranslation } from '../../../i18n/LanguageContext';
import { canRequestPhysicalForward } from '../../../data/plans';
import { parseExtraInfo, resolveForwardingAddress, resolvePersonalAddress } from '../../../utils/contractLegalFields';
import { adminDataService } from '../../../services/adminDataService';
import { appAlert } from '../../../components/AppDialog/dialogApi';

const STATUS_LABEL = {
    en_attente: 'statusPending',
    expediee: 'statusSent',
    refusee: 'statusRefused',
};

export default function Mail({ mail = [], clientData, setActiveTab, onMailRead }) {
    const { t } = useTranslation();
    const extra = useMemo(() => parseExtraInfo(clientData?.extra_info), [clientData?.extra_info]);
    const canForward = canRequestPhysicalForward(clientData?.plan, extra);
    const personalAddress = resolvePersonalAddress(clientData, extra);
    const forwardingAddress = resolveForwardingAddress(extra);

    const [filter, setFilter] = useState('all');
    const [reexpModalOpen, setReexpModalOpen] = useState(false);
    const [reexpSuccess, setReexpSuccess] = useState(false);
    const [destAddress, setDestAddress] = useState(forwardingAddress);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        setDestAddress(forwardingAddress);
    }, [forwardingAddress]);

    useEffect(() => {
        if (!clientData?.id) return;
        let cancelled = false;
        adminDataService.getClientReexpeditions(clientData.id).then((rows) => {
            if (!cancelled) setRequests(Array.isArray(rows) ? rows : []);
        }).catch(() => {
            if (!cancelled) setRequests([]);
        });
        return () => { cancelled = true; };
    }, [clientData?.id]);

    const filteredMail = mail.filter(m => {
        if (filter === 'unread') return m.status === 'non lu';
        if (filter === 'read') return m.status === 'lu';
        return true;
    });

    const unreadCount = mail.filter(m => m.status === 'non lu').length;

    const handleOpenScan = (item) => {
        if (item.status === 'non lu' && onMailRead) {
            onMailRead(item.id);
        }

        if (item.preview) {
            if (item.preview.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = item.preview;
                link.download = `Courrier_${item.date}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                window.open(item.preview, '_blank');
            }
        } else {
            appAlert(t('espaceClient.mail.noScan'));
        }
    };

    const handleRequestReexp = async (e) => {
        e.preventDefault();
        if (!canForward || submitting) return;
        const address = destAddress.trim();
        if (!address) {
            setFormError(t('espaceClient.mail.destRequired'));
            return;
        }
        setSubmitting(true);
        setFormError('');
        try {
            const created = await adminDataService.addReexpeditionRequest(clientData.id, {
                address,
                notes: notes.trim(),
            });
            setRequests((prev) => [created, ...prev]);
            try {
                await adminDataService.addMessage(clientData.id, {
                    sender: 'client',
                    content: t('espaceClient.mail.chatMessage')
                        .replace('{address}', address)
                        .replace('{notes}', notes.trim() || t('espaceClient.mail.noNotes')),
                });
            } catch (msgErr) {
                console.error(msgErr);
            }
            import('../../../utils/emailService').then(({ sendReexpeditionRequestEmail }) => {
                sendReexpeditionRequestEmail({
                    email: clientData.email,
                    nom: clientData.clientName || clientData.name || clientData.company,
                    company: clientData.company,
                    address,
                    notes: notes.trim(),
                });
            }).catch((err) => console.error(err));
            setReexpSuccess(true);
            setNotes('');
            setTimeout(() => {
                setReexpSuccess(false);
                setReexpModalOpen(false);
            }, 2200);
        } catch (err) {
            setFormError(err.message || t('espaceClient.mail.reexpError'));
        } finally {
            setSubmitting(false);
        }
    };

    const statusLabel = (status) => t(`espaceClient.mail.${STATUS_LABEL[status] || 'statusPending'}`);

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--ec-text-main)', letterSpacing: '-0.02em' }}>
                        {t('espaceClient.mail.title')}
                    </h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '15px', marginTop: '6px' }}>
                        {t('espaceClient.mail.subtitle')}
                    </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <button
                        type="button"
                        disabled={!canForward}
                        onClick={() => {
                            if (!canForward) return;
                            setFormError('');
                            setReexpSuccess(false);
                            setReexpModalOpen(true);
                        }}
                        className="ec-btn-primary"
                        title={!canForward ? t('espaceClient.mail.forwardLocked') : undefined}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            borderRadius: '10px',
                            opacity: canForward ? 1 : 0.45,
                            cursor: canForward ? 'pointer' : 'not-allowed',
                            filter: canForward ? 'none' : 'grayscale(0.4)',
                        }}
                    >
                        <Icons.Mail style={{ width: 16, height: 16 }} />
                        {t('espaceClient.mail.requestForward')}
                    </button>
                    {!canForward && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', maxWidth: '280px', textAlign: 'right' }}>
                            {t('espaceClient.mail.forwardLockedHint')}{' '}
                            <button
                                type="button"
                                onClick={() => setActiveTab?.('abonnement')}
                                style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                            >
                                {t('espaceClient.mail.upgradeCta')}
                            </button>
                        </p>
                    )}
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="ec-stat-card" style={{ padding: '20px', background: 'white', borderRadius: '14px', border: '1px solid var(--ec-border)' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ec-text-sub)', fontWeight: '700' }}>{t('espaceClient.mail.totalLabel')}</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{mail.length}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t('espaceClient.mail.totalHint')}</div>
                </div>

                <div className="ec-stat-card" style={{ padding: '20px', background: 'white', borderRadius: '14px', border: '1px solid var(--ec-border)' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ea580c', fontWeight: '700' }}>{t('espaceClient.mail.unreadLabel')}</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#ea580c', marginTop: '4px' }}>{unreadCount}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t('espaceClient.mail.unreadHint')}</div>
                </div>

                <div className="ec-stat-card" style={{ padding: '20px', background: 'white', borderRadius: '14px', border: '1px solid var(--ec-border)' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669', fontWeight: '700' }}>{t('espaceClient.mail.scanLabel')}</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#059669', marginTop: '4px' }}>100%</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t('espaceClient.mail.scanHint')}</div>
                </div>
            </div>

            {requests.length > 0 && (
                <div style={{ background: 'white', borderRadius: '14px', border: '1px solid var(--ec-border)', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800 }}>{t('espaceClient.mail.myRequests')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {requests.map((r) => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{r.address}</div>
                                    {r.notes ? <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.notes}</div> : null}
                                </div>
                                <span style={{
                                    alignSelf: 'flex-start',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    background: r.status === 'en_attente' ? '#FEF3C7' : r.status === 'expediee' ? '#D1FAE5' : '#FEE2E2',
                                    color: r.status === 'en_attente' ? '#D97706' : r.status === 'expediee' ? '#059669' : '#DC2626',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {statusLabel(r.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <button
                    onClick={() => setFilter('all')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: filter === 'all' ? '#0f172a' : 'transparent',
                        color: filter === 'all' ? 'white' : '#64748b',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    {t('espaceClient.mail.filterAll').replace('{n}', mail.length)}
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: filter === 'unread' ? '#0f172a' : 'transparent',
                        color: filter === 'unread' ? 'white' : '#64748b',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {t('espaceClient.mail.filterUnread')} {unreadCount > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{unreadCount}</span>}
                </button>
                <button
                    onClick={() => setFilter('read')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: filter === 'read' ? '#0f172a' : 'transparent',
                        color: filter === 'read' ? 'white' : '#64748b',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    {t('espaceClient.mail.filterRead').replace('{n}', mail.length - unreadCount)}
                </button>
            </div>

            {/* Mail Items Grid */}
            {filteredMail.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '16px', padding: '60px 24px', textAlign: 'center', border: '1px solid var(--ec-border)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#94a3b8' }}>
                        <Icons.Mail style={{ width: 32, height: 32 }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 6px 0' }}>
                        {t('espaceClient.mail.emptyTitle')}
                    </h3>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        {t('espaceClient.mail.emptyHint')}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {filteredMail.map(m => (
                        <div key={m.id} className="ec-content-card" style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid var(--ec-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        background: m.status === 'non lu' ? '#fef2f2' : '#f0fdf4',
                                        color: m.status === 'non lu' ? '#ef4444' : '#16a34a'
                                    }}>
                                        {m.status === 'non lu' ? t('espaceClient.mail.unreadBadge') : t('espaceClient.mail.readBadge')}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                                        {m.date}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ec-text-main)', margin: '0 0 6px 0' }}>
                                    {m.from || t('espaceClient.mail.defaultFrom')}
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--ec-text-sub)', margin: 0 }}>
                                    {t('espaceClient.mail.typePrefix')} <strong>{m.type || t('espaceClient.mail.defaultType')}</strong>
                                </p>
                            </div>

                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => handleOpenScan(m)}
                                    className="ec-btn-primary"
                                    style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <Icons.Docs style={{ width: 14, height: 14 }} />
                                    {t('espaceClient.mail.openScan')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {reexpModalOpen && canForward && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{t('espaceClient.mail.reexpTitle')}</h3>
                            <button onClick={() => setReexpModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>✕</button>
                        </div>

                        {reexpSuccess ? (
                            <div style={{ padding: '30px 0', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                                <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', margin: '0 0 6px 0' }}>{t('espaceClient.mail.reexpSuccessTitle')}</h4>
                                <p style={{ fontSize: '14px', color: '#64748b' }}>{t('espaceClient.mail.reexpSuccessHint')}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestReexp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                                    {t('espaceClient.mail.reexpIntro')}
                                </p>

                                {formError && (
                                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}>{formError}</div>
                                )}

                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                        {t('espaceClient.mail.destLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={destAddress}
                                        onChange={(e) => setDestAddress(e.target.value)}
                                        placeholder={t('espaceClient.mail.destPlaceholder')}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0' }}>
                                        {t('espaceClient.mail.destHint')}
                                    </p>
                                    {(forwardingAddress || personalAddress) && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                            {forwardingAddress ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setDestAddress(forwardingAddress)}
                                                    style={{
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        border: destAddress === forwardingAddress ? '1px solid #16a34a' : '1px solid #cbd5e1',
                                                        background: destAddress === forwardingAddress ? '#f0fdf4' : '#fff',
                                                        color: '#334155',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {t('espaceClient.mail.useSavedForward')}
                                                </button>
                                            ) : null}
                                            {personalAddress && personalAddress !== forwardingAddress ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setDestAddress(personalAddress)}
                                                    style={{
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        border: destAddress === personalAddress ? '1px solid #16a34a' : '1px solid #cbd5e1',
                                                        background: destAddress === personalAddress ? '#f0fdf4' : '#fff',
                                                        color: '#334155',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {t('espaceClient.mail.usePersonalOnce')}
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                        {t('espaceClient.mail.notesLabel')}
                                    </label>
                                    <textarea
                                        rows="3"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t('espaceClient.mail.notesPlaceholder')}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                    ></textarea>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    <button type="submit" disabled={submitting} className="ec-btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '10px', opacity: submitting ? 0.7 : 1 }}>
                                        {submitting ? t('espaceClient.mail.sending') : t('espaceClient.mail.confirmSend')}
                                    </button>
                                    <button type="button" onClick={() => setReexpModalOpen(false)} className="btn-outline" style={{ padding: '12px 20px', borderRadius: '10px' }}>
                                        {t('espaceClient.mail.cancel')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
