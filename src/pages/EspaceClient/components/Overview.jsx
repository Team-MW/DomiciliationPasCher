import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { useTranslation } from '../../../i18n/LanguageContext';
import { appAlert } from '../../../components/AppDialog/dialogApi';
import { parseExtraInfo } from '../../../utils/contractLegalFields';
import { PLAN_CATALOG, clientPlanPricing, scanQuotaFor, currentQuotaPeriodStart } from '../../../data/plans';
import { computeMissingDocuments } from '../../../../shared/documentRequest.js';

import { DOMICILIATION_ADDRESS, postalAddressFor } from '../../../../shared/company.js';

export default function Overview({ mail = [], documents = [], bookings = [], clientData, setActiveTab, welcomeName = '' }) {
    const { t, lang } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [coach, setCoach] = useState(null);
    const unreadMailCount = mail.filter(m => m.status === 'non lu').length;
    const company = clientData?.company || t('espaceClient.overview.companyFallback');

    const mailValue = unreadMailCount > 0
        ? t(unreadMailCount > 1 ? 'espaceClient.overview.unreadPlural' : 'espaceClient.overview.unread').replace('{n}', unreadMailCount)
        : t(mail.length > 1 ? 'espaceClient.overview.mailCountPlural' : 'espaceClient.overview.mailCount').replace('{n}', mail.length);

    const handleCopyAddress = async () => {
        const text = postalAddressFor(company);
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
        } else if (status === 'actif' && !extra.procurationSigned && extra.kbisUrl) {
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
        } catch { /* stockage indisponible : on ignore */ }
        setCoach(next);
    }, [clientData, t]);

    // ── Données du tableau de bord ──
    const extra = parseExtraInfo(clientData?.extra_info);
    const pricing = clientPlanPricing(clientData?.plan, extra);
    const planName = PLAN_CATALOG[pricing.id]?.name || clientData?.plan || '';
    const scanQuota = scanQuotaFor(clientData?.plan, extra);
    const periodStart = currentQuotaPeriodStart(clientData?.since);
    const scansThisPeriod = mail.filter((m) => m?.preview && new Date(m.date) >= periodStart).length;
    const scanValue = scanQuota === 0
        ? t('espaceClient.overview.scanNone')
        : scanQuota === null
            ? t('espaceClient.overview.scanIncluded')
            : t('espaceClient.overview.scanUsed').replace('{used}', scansThisPeriod).replace('{quota}', scanQuota);

    // « Finalisez votre dossier » : ce qu'il reste à faire, dans l'ordre.
    const docsMissing = computeMissingDocuments(['statuts', 'kbis'], { extra, documents });
    const checklist = [
        { key: 'paid', label: t('espaceClient.overview.itemPaid'), done: extra.payment_status !== 'pending', tab: 'paiement' },
        { key: 'contract', label: t('espaceClient.overview.itemContract'), done: Boolean(extra.contractSigned), tab: 'docs' },
        { key: 'procuration', label: t('espaceClient.overview.itemProcuration'), done: Boolean(extra.procurationSigned), tab: 'docs' },
        { key: 'docs', label: t('espaceClient.overview.itemDocs'), done: docsMissing.length === 0, tab: 'docs' },
    ];
    const doneCount = checklist.filter((c) => c.done).length;
    const showChecklist = clientData?.status !== 'en_attente_validation' && doneCount < checklist.length;

    const locale = lang === 'en' ? 'en-GB' : lang === 'ru' ? 'ru-RU' : 'fr-FR';
    const formatDate = (value) => {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? (value || '') : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    };
    const recentMail = [...mail].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="ec-tab-animate ecd">
            <header className="ecd-hero">
                <div>
                    <p className="ecd-hero-date">{today}</p>
                    <h1 className="ecd-hero-title">
                        {welcomeName ? t('espaceClient.shell.welcome').replace('{name}', welcomeName) : t('espaceClient.shell.welcomeNoName')}
                    </h1>
                    <p className="ecd-hero-sub">{t('espaceClient.overview.heroSub').replace('{company}', company)}</p>
                </div>
            </header>

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


            {showChecklist && (
                <section className="ecd-card ecd-checklist" aria-labelledby="ecd-checklist-title">
                    <div className="ecd-card-head">
                        <h2 id="ecd-checklist-title" className="ecd-card-title">{t('espaceClient.overview.checklistTitle')}</h2>
                        <span className="ecd-muted">{t('espaceClient.overview.checklistProgress').replace('{done}', doneCount).replace('{total}', checklist.length)}</span>
                    </div>
                    <div className="ecd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={doneCount}>
                        <span style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                    </div>
                    <ol className="ecd-steps">
                        {checklist.map((item) => (
                            <li key={item.key} className={`ecd-step ${item.done ? 'is-done' : ''}`}>
                                <span className="ecd-step-check" aria-hidden="true">{item.done && <Icons.Check style={{ width: 13, height: 13 }} />}</span>
                                <span className="ecd-step-label">{item.label}</span>
                                {!item.done && setActiveTab && (
                                    <button type="button" className="ecd-step-action" onClick={() => go(item.tab)}>
                                        {t('espaceClient.overview.actionGo')}
                                        <Icons.ArrowRight style={{ width: 13, height: 13 }} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            <div className="ecd-kpis">
                <button type="button" className="ecd-kpi" onClick={() => go('mail')}>
                    <span className="ecd-kpi-icon is-blue"><Icons.Mail style={{ width: 18, height: 18 }} /></span>
                    <span className="ecd-kpi-label">{t('espaceClient.overview.mailLabel')}</span>
                    <span className={`ecd-kpi-value ${unreadMailCount > 0 ? 'is-alert' : ''}`}>{mailValue}</span>
                </button>
                <button type="button" className="ecd-kpi" onClick={() => go('mail')}>
                    <span className="ecd-kpi-icon is-green"><Icons.Docs style={{ width: 18, height: 18 }} /></span>
                    <span className="ecd-kpi-label">{t('espaceClient.overview.scanLabel')}</span>
                    <span className="ecd-kpi-value">{scanValue}</span>
                </button>
                <button type="button" className="ecd-kpi" onClick={() => go('docs')}>
                    <span className="ecd-kpi-icon is-violet"><Icons.Folder style={{ width: 18, height: 18 }} /></span>
                    <span className="ecd-kpi-label">{t('espaceClient.overview.docsLabel')}</span>
                    <span className="ecd-kpi-value">{documents.length}</span>
                </button>
                <button type="button" className="ecd-kpi" onClick={() => go('meeting')}>
                    <span className="ecd-kpi-icon is-amber"><Icons.Calendar style={{ width: 18, height: 18 }} /></span>
                    <span className="ecd-kpi-label">{t('espaceClient.overview.bookingsLabel')}</span>
                    <span className="ecd-kpi-value">{bookings.length}</span>
                </button>
            </div>

            <div className="ecd-grid">
                <section className="ecd-card" aria-labelledby="ecd-recent-title">
                    <div className="ecd-card-head">
                        <h2 id="ecd-recent-title" className="ecd-card-title">{t('espaceClient.overview.recentTitle')}</h2>
                        {mail.length > 0 && setActiveTab && (
                            <button type="button" className="ecd-link" onClick={() => go('mail')}>
                                {t('espaceClient.overview.seeAll')} <Icons.ArrowRight style={{ width: 13, height: 13 }} />
                            </button>
                        )}
                    </div>
                    {recentMail.length === 0 ? (
                        <div className="ecd-empty">
                            <span className="ecd-empty-icon"><Icons.Mail style={{ width: 22, height: 22 }} /></span>
                            <p>{t('espaceClient.overview.recentEmpty')}</p>
                        </div>
                    ) : (
                        <ul className="ecd-mail-list">
                            {recentMail.map((m) => {
                                const isParcel = /colis/i.test(m.type || '');
                                return (
                                    <li key={m.id}>
                                        <button type="button" className="ecd-mail-row" onClick={() => go('mail')}>
                                            <span className={`ecd-mail-icon ${isParcel ? 'is-parcel' : ''}`} aria-hidden="true">
                                                {isParcel ? <Icons.Folder style={{ width: 16, height: 16 }} /> : <Icons.Mail style={{ width: 16, height: 16 }} />}
                                            </span>
                                            <span className="ecd-mail-main">
                                                <span className="ecd-mail-from">{m.from || t('espaceClient.mail.defaultFrom')}</span>
                                                <span className="ecd-mail-meta">
                                                    {m.type || t('espaceClient.mail.defaultType')} · {m.preview ? t('espaceClient.overview.scanned') : (isParcel ? t('espaceClient.overview.parcel') : t('espaceClient.overview.envelopeOnly'))}
                                                </span>
                                            </span>
                                            <span className="ecd-mail-side">
                                                {m.status === 'non lu' && <span className="ecd-badge-new">{t('espaceClient.overview.newBadge')}</span>}
                                                <span className="ecd-mail-date">{formatDate(m.date)}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <div className="ecd-side">
                    <section className="ecd-address" aria-labelledby="ecd-address-title">
                        <div className="ecd-address-head">
                            <span className="ecd-address-pin"><Icons.Pin style={{ width: 16, height: 16 }} /></span>
                            <h2 id="ecd-address-title">{t('espaceClient.overview.addressTitle')}</h2>
                        </div>
                        <p className="ecd-address-company">{company}</p>
                        <p className="ecd-address-lines">
                            {DOMICILIATION_ADDRESS.street}<br />
                            {DOMICILIATION_ADDRESS.building}<br />
                            {DOMICILIATION_ADDRESS.postalCode} {DOMICILIATION_ADDRESS.city}
                        </p>
                        <div className="ecd-address-foot">
                            <span className="ecd-address-approval"><Icons.Shield style={{ width: 13, height: 13 }} /> {t('espaceClient.overview.approval')}</span>
                            <button type="button" className={`ecd-copy ${copied ? 'is-copied' : ''}`} onClick={handleCopyAddress}>
                                {copied ? <Icons.Check style={{ width: 13, height: 13 }} /> : <Icons.Copy style={{ width: 13, height: 13 }} />}
                                {copied ? t('espaceClient.overview.copied') : t('espaceClient.overview.copy')}
                            </button>
                        </div>
                    </section>

                    {setActiveTab && (
                        <section className="ecd-card" aria-labelledby="ecd-quick-title">
                            <h2 id="ecd-quick-title" className="ecd-card-title">{t('espaceClient.overview.quickTitle')}</h2>
                            <div className="ecd-quick">
                                <button type="button" onClick={() => go('factures')}><span className="is-blue"><Icons.Invoice style={{ width: 16, height: 16 }} /></span>{t('espaceClient.overview.invoices')}</button>
                                <button type="button" onClick={() => go('paiement')}><span className="is-violet"><Icons.CreditCard style={{ width: 16, height: 16 }} /></span>{t('espaceClient.overview.payment')}</button>
                                <button type="button" onClick={() => go('messages')}><span className="is-amber"><Icons.Chat style={{ width: 16, height: 16 }} /></span>{t('espaceClient.overview.support')}</button>
                                <button type="button" onClick={() => go('aide')}><span className="is-green"><Icons.Help style={{ width: 16, height: 16 }} /></span>{t('espaceClient.overview.help')}</button>
                            </div>
                        </section>
                    )}

                    {setActiveTab && (
                        <button type="button" className="ecd-promo" onClick={() => go('compte-pro')}>
                            <span className="ecd-promo-badge">{t('espaceClient.overview.proBadge')}</span>
                            <span className="ecd-promo-title">{t('espaceClient.overview.proTitle')}</span>
                            <span className="ecd-promo-cta">{t('espaceClient.overview.discover')} <Icons.ArrowRight style={{ width: 13, height: 13 }} /></span>
                        </button>
                    )}
                </div>
            </div>

            {coach && typeof document !== 'undefined' && createPortal(
                <div className="ec-coach-overlay" role="presentation" onClick={() => setCoach(null)}>
                    <div
                        className="ec-coach"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ec-coach-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="ec-coach-close"
                            onClick={() => setCoach(null)}
                            aria-label="Fermer"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <div className="ec-coach-top-row">
                            <div className="ec-coach-badge-icon">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                            </div>
                            <div className="ec-coach-header-text">
                                <p className="ec-coach-kicker">{t('espaceClient.overview.coachKicker')}</p>
                                <h3 id="ec-coach-title">{coach.title}</h3>
                            </div>
                        </div>
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
                </div>,
                document.body
            )}
        </div>
    );
}
