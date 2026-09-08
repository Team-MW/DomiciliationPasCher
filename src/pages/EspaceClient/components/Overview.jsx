import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { useTranslation } from '../../../i18n/LanguageContext';
import { appAlert } from '../../../components/AppDialog/dialogApi';
import { parseExtraInfo } from '../../../utils/contractLegalFields';

const ADDRESS_LINES = [
    '150 Rue Nicolas Louis Vauquelin',
    '31100 Toulouse',
    'FRANCE',
];

export default function Overview({ mail = [], documents = [], bookings = [], clientData, setActiveTab }) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [coach, setCoach] = useState(null);
    const unreadMailCount = mail.filter(m => m.status === 'non lu').length;
    const company = clientData?.company || t('espaceClient.overview.companyFallback');

    const mailValue = unreadMailCount > 0
        ? t(unreadMailCount > 1 ? 'espaceClient.overview.unreadPlural' : 'espaceClient.overview.unread').replace('{n}', unreadMailCount)
        : t(mail.length > 1 ? 'espaceClient.overview.mailCountPlural' : 'espaceClient.overview.mailCount').replace('{n}', mail.length);

    const handleCopyAddress = async () => {
        const text = `${company}\n${ADDRESS_LINES.join('\n')}`;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        } catch {
            appAlert(t('espaceClient.overview.copiedAlert') + text);
        }
    };

    const go = (tab) => setActiveTab && setActiveTab(tab);

    useEffect(() => {
        if (!clientData?.id) return;
        const extra = parseExtraInfo(clientData.extra_info);
        const status = clientData.status;
        let next = null;
        if (status === 'en_attente_validation') {
            next = {
                key: 'wait',
                title: t('espaceClient.overview.coachWaitTitle'),
                body: t('espaceClient.overview.coachWaitBody'),
                next: t('espaceClient.overview.coachWaitNext'),
                tab: null,
                cta: t('espaceClient.overview.coachGotIt'),
            };
        } else if (status === 'actif' && !extra.contractSigned) {
            next = {
                key: 'sign',
                title: t('espaceClient.overview.coachSignTitle'),
                body: t('espaceClient.overview.coachSignBody'),
                next: t('espaceClient.overview.coachSignNext'),
                tab: 'docs',
                cta: t('espaceClient.overview.coachGoSign'),
            };
        } else if (status === 'actif' && !extra.procurationSigned) {
            next = {
                key: 'proc',
                title: t('espaceClient.overview.coachProcTitle'),
                body: t('espaceClient.overview.coachProcBody'),
                next: t('espaceClient.overview.coachProcNext'),
                tab: 'docs',
                cta: t('espaceClient.overview.coachGoSign'),
            };
        }
        if (!next) return;
        const storageKey = `dpc_ec_coach_${clientData.id}_${next.key}`;
        try {
            if (sessionStorage.getItem(storageKey)) return;
            sessionStorage.setItem(storageKey, '1');
        } catch {}
        setCoach(next);
    }, [clientData, t]);

    return (
        <div className="ec-tab-animate ec-dash">
            {clientData?.status === 'en_attente_validation' && (
                <div className="ec-dash-progress">
                    <h2>{t('espaceClient.overview.progressTitle')}</h2>
                    <p>{t('espaceClient.overview.progressHint')}</p>

                    <div className="ec-dash-steps">
                        <div className="ec-dash-steps-line" />
                        <div className="ec-dash-steps-line is-active" />

                        <div className="ec-dash-step is-done">
                            <div className="ec-dash-step-dot"><Icons.Check style={{ width: 18, height: 18 }} /></div>
                            <div className="ec-dash-step-title">{t('espaceClient.overview.stepPay')}</div>
                            <div className="ec-dash-step-hint">{t('espaceClient.overview.stepPayHint')}</div>
                        </div>
                        <div className="ec-dash-step is-current">
                            <div className="ec-dash-step-dot">
                                <span className="spinner" style={{ width: 18, height: 18, border: '3px solid rgba(59, 130, 246, 0.3)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                            <div className="ec-dash-step-title">{t('espaceClient.overview.stepCheck')}</div>
                            <div className="ec-dash-step-hint">{t('espaceClient.overview.stepCheckHint')}</div>
                        </div>
                        <div className="ec-dash-step">
                            <div className="ec-dash-step-dot">3</div>
                            <div className="ec-dash-step-title">{t('espaceClient.overview.stepValid')}</div>
                            <div className="ec-dash-step-hint">{t('espaceClient.overview.stepValidHint')}</div>
                        </div>
                        <div className="ec-dash-step">
                            <div className="ec-dash-step-dot">4</div>
                            <div className="ec-dash-step-title">{t('espaceClient.overview.stepSign')}</div>
                            <div className="ec-dash-step-hint">{t('espaceClient.overview.stepSignHint')}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="ec-stats-row">
                <button type="button" className="ec-stat-card ec-dash-stat ec-dash-stat--mail" onClick={() => go('mail')}>
                    <div className="ec-dash-stat-top">
                        <span className="ec-dash-stat-icon"><Icons.Mail style={{ width: 20, height: 20 }} /></span>
                        {unreadMailCount > 0 && <span className="ec-dash-stat-badge">{unreadMailCount}</span>}
                    </div>
                    <div>
                        <div className="ec-stat-label">{t('espaceClient.overview.mailLabel')}</div>
                        <div className="ec-stat-value" style={{ color: unreadMailCount > 0 ? '#c2410c' : undefined }}>{mailValue}</div>
                    </div>
                    <div className="ec-stat-footer">{t('espaceClient.overview.mailFooter')}</div>
                </button>

                <button type="button" className="ec-stat-card ec-dash-stat ec-dash-stat--docs" onClick={() => go('docs')}>
                    <div className="ec-dash-stat-top">
                        <span className="ec-dash-stat-icon"><Icons.Docs style={{ width: 20, height: 20 }} /></span>
                    </div>
                    <div>
                        <div className="ec-stat-label">{t('espaceClient.overview.docsLabel')}</div>
                        <div className="ec-stat-value">{documents.length}</div>
                    </div>
                    <div className="ec-stat-footer">{t('espaceClient.overview.docsFooter')}</div>
                </button>

                <button type="button" className="ec-stat-card ec-dash-stat ec-dash-stat--plan" onClick={() => go('abonnement')}>
                    <div className="ec-dash-stat-top">
                        <span className="ec-dash-stat-icon"><Icons.Subscription style={{ width: 20, height: 20 }} /></span>
                    </div>
                    <div>
                        <div className="ec-stat-label">{t('espaceClient.overview.planLabel')}</div>
                        <div className="ec-stat-value" style={{ fontSize: '26px' }}>{clientData?.plan || 'Essentiel'}</div>
                    </div>
                    <div className="ec-stat-footer ec-dash-stat-live">
                        <Icons.Check style={{ width: 12, height: 12 }} />
                        {t('espaceClient.overview.planActive')}
                    </div>
                </button>

                <button type="button" className="ec-stat-card ec-dash-stat ec-dash-stat--book" onClick={() => go('meeting')}>
                    <div className="ec-dash-stat-top">
                        <span className="ec-dash-stat-icon"><Icons.Calendar style={{ width: 20, height: 20 }} /></span>
                    </div>
                    <div>
                        <div className="ec-stat-label">{t('espaceClient.overview.bookingsLabel')}</div>
                        <div className="ec-stat-value">{bookings.length}</div>
                    </div>
                    <div className="ec-stat-footer">{t('espaceClient.overview.bookingsFooter')}</div>
                </button>
            </div>

            <div className="ec-dash-main">
                <div className="ec-dash-address">
                    <div className="ec-dash-address-photo" />
                    <div className="ec-dash-address-shade" />
                    <div className="ec-dash-address-top">
                        <div className="ec-dash-address-kicker">
                            <Icons.Pin style={{ width: 14, height: 14 }} />
                            {t('espaceClient.overview.cityKicker')}
                        </div>
                        <button type="button" className={`ec-dash-copy ${copied ? 'is-copied' : ''}`} onClick={handleCopyAddress}>
                            {copied ? <Icons.Check style={{ width: 13, height: 13 }} /> : <Icons.Copy style={{ width: 13, height: 13 }} />}
                            {copied ? t('espaceClient.overview.copied') : t('espaceClient.overview.copy')}
                        </button>
                    </div>
                    <div className="ec-dash-address-glass">
                        <div className="ec-dash-address-label">{t('espaceClient.overview.officialAddress')}</div>
                        <div className="ec-dash-address-company">{company}</div>
                        <div className="ec-dash-address-lines">
                            {ADDRESS_LINES[0]}<br />
                            {ADDRESS_LINES[1]} — {ADDRESS_LINES[2]}
                        </div>
                        <div className="ec-dash-approval">
                            <Icons.Shield style={{ width: 14, height: 14 }} />
                            {t('espaceClient.overview.approval')}
                        </div>
                    </div>
                </div>

                <div className="ec-dash-side">
                    <div className="ec-dash-pro">
                        <div className="ec-dash-pro-glow" />
                        <div className="ec-dash-pro-row">
                            <div>
                                <span className="ec-dash-pro-badge">{t('espaceClient.overview.proBadge')}</span>
                                <h4>{t('espaceClient.overview.proTitle')}</h4>
                                <p>{t('espaceClient.overview.proHint')}</p>
                            </div>
                            <div className="ec-dash-card-visual" aria-hidden="true">
                                <span className="ec-dash-card-chip" />
                                <span className="ec-dash-card-num">FR76 ••••</span>
                            </div>
                        </div>
                        {setActiveTab && (
                            <button type="button" className="ec-dash-pro-cta" onClick={() => go('compte-pro')}>
                                {t('espaceClient.overview.discover')}
                                <Icons.ArrowRight style={{ width: 14, height: 14 }} />
                            </button>
                        )}
                    </div>

                    <div className="ec-dash-shortcuts">
                        {setActiveTab && (
                            <>
                                <button type="button" className="ec-dash-shortcut" onClick={() => go('factures')}>
                                    <span className="ec-dash-shortcut-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Icons.Invoice style={{ width: 18, height: 18 }} /></span>
                                    {t('espaceClient.overview.invoices')}
                                </button>
                                <button type="button" className="ec-dash-shortcut" onClick={() => go('paiement')}>
                                    <span className="ec-dash-shortcut-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Icons.CreditCard style={{ width: 18, height: 18 }} /></span>
                                    {t('espaceClient.overview.payment')}
                                </button>
                                <button type="button" className="ec-dash-shortcut" onClick={() => go('aide')}>
                                    <span className="ec-dash-shortcut-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Icons.Help style={{ width: 18, height: 18 }} /></span>
                                    {t('espaceClient.overview.help')}
                                </button>
                                <button type="button" className="ec-dash-shortcut" onClick={() => go('messages')}>
                                    <span className="ec-dash-shortcut-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><Icons.Chat style={{ width: 18, height: 18 }} /></span>
                                    {t('espaceClient.overview.support')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {coach && (
                <div className="ec-coach-overlay" role="presentation" onClick={() => setCoach(null)}>
                    <div
                        className="ec-coach"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ec-coach-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="ec-coach-kicker">{t('espaceClient.overview.coachKicker')}</p>
                        <h3 id="ec-coach-title">{coach.title}</h3>
                        <p className="ec-coach-body">{coach.body}</p>
                        <div className="ec-coach-next">
                            <span>{t('espaceClient.overview.coachNow')}</span>
                            <strong>{coach.next}</strong>
                        </div>
                        <button
                            type="button"
                            className="ec-coach-btn"
                            onClick={() => {
                                const tab = coach.tab;
                                setCoach(null);
                                if (tab) go(tab);
                            }}
                        >
                            {coach.cta}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
