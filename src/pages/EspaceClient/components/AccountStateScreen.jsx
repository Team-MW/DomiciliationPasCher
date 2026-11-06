import React from 'react';
import logo from '../../../assets/DomiciliationPasCher-Logo-11.svg';
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_HREF } from '../../../constants/contact';
import { DOMICILIATION_ADDRESS, AGREMENT_NUMBER } from '../../../../shared/company.js';
import './AccountStateScreen.css';

/**
 * Écran plein page pour les états du compte où l'espace client ne peut pas s'afficher :
 * aucun dossier, dossier en validation, compte suspendu (impayé), compte résilié.
 * Un seul composant pour garder la même mise en page et la même aide partout.
 */

const ICONS = {
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
            <path d="M8.5 11h5" />
        </svg>
    ),
    clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </svg>
    ),
    card: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="M2.5 10h19" />
            <path d="M6.5 15h4" />
        </svg>
    ),
    closed: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 21V8l8-5 8 5v13" />
            <path d="M9 21v-6h6v6" />
            <path d="m3 3 18 18" />
        </svg>
    ),
};

const Check = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

/**
 * @param {object} props
 * @param {'info'|'warning'|'danger'|'neutral'} props.tone
 * @param {keyof ICONS} props.icon
 * @param {string} props.kicker - petite ligne au-dessus du titre
 * @param {string} props.title
 * @param {React.ReactNode} props.body
 * @param {string} [props.accountEmail] - email du compte connecté (affiché en pastille)
 * @param {string} [props.accountLabel] - libellé devant l'email
 * @param {{ title: string, items: { text: string, action?: React.ReactNode }[] }} [props.reasons]
 * @param {{ title: string, steps: { label: string, state: 'done'|'current'|'todo' }[] }} [props.timeline]
 * @param {React.ReactNode} [props.notice] - encadré d'information
 * @param {React.ReactNode} props.actions - boutons principaux
 * @param {object} props.labels - textes du panneau et de l'aide (traduits)
 */
export default function AccountStateScreen({ tone = 'info', icon = 'search', kicker, title, body, accountEmail, accountLabel, reasons, timeline, notice, actions, labels }) {
    const { street, building, postalCode, city } = DOMICILIATION_ADDRESS;
    return (
        <div className={`ecs-screen ecs-tone-${tone}`}>
            <aside className="ecs-brand" aria-label={labels.brandAria}>
                <img src={logo} alt="Domiciliation Pas Cher" className="ecs-brand-logo" />
                <div className="ecs-brand-body">
                    <p className="ecs-brand-kicker">{labels.brandKicker}</p>
                    <p className="ecs-brand-title">{labels.brandTitle}</p>
                    <ul className="ecs-brand-points">
                        {labels.brandPoints.map((point) => (
                            <li key={point}><span className="ecs-brand-check"><Check /></span>{point}</li>
                        ))}
                    </ul>
                </div>
                <address className="ecs-brand-address">
                    {street}<br />{building}<br />{postalCode} {city}
                    <span className="ecs-brand-agrement">{labels.agrement.replace('{n}', AGREMENT_NUMBER)}</span>
                </address>
            </aside>

            <main className="ecs-main">
                <section className="ecs-card" aria-labelledby="ecs-title">
                    <div className="ecs-icon">{ICONS[icon]}</div>
                    {kicker && <p className="ecs-kicker">{kicker}</p>}
                    <h1 id="ecs-title" className="ecs-title">{title}</h1>
                    <div className="ecs-body">{body}</div>

                    {accountEmail && (
                        <div className="ecs-account">
                            <span className="ecs-account-avatar" aria-hidden="true">{accountEmail.charAt(0).toUpperCase()}</span>
                            <span className="ecs-account-text">
                                <span className="ecs-account-label">{accountLabel}</span>
                                <span className="ecs-account-email">{accountEmail}</span>
                            </span>
                        </div>
                    )}

                    {timeline && (
                        <div className="ecs-block">
                            <p className="ecs-block-title">{timeline.title}</p>
                            <ol className="ecs-timeline">
                                {timeline.steps.map((step) => (
                                    <li key={step.label} className={`ecs-step is-${step.state}`}>
                                        <span className="ecs-step-dot">{step.state === 'done' ? <Check /> : null}</span>
                                        <span className="ecs-step-label">{step.label}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {reasons && (
                        <div className="ecs-block">
                            <p className="ecs-block-title">{reasons.title}</p>
                            <ul className="ecs-reasons">
                                {reasons.items.map((item, index) => (
                                    <li key={item.text} className="ecs-reason">
                                        <span className="ecs-reason-num">{index + 1}</span>
                                        <span className="ecs-reason-text">{item.text}</span>
                                        {item.action && <span className="ecs-reason-action">{item.action}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {notice && <div className="ecs-notice">{notice}</div>}

                    <div className="ecs-actions">{actions}</div>

                    <footer className="ecs-help">
                        <p className="ecs-help-title">{labels.helpTitle}</p>
                        <div className="ecs-help-links">
                            <a href={CONTACT_PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>
                            <span aria-hidden="true">·</span>
                            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                        </div>
                        <p className="ecs-help-hours">{labels.helpHours}</p>
                    </footer>
                </section>
            </main>
        </div>
    );
}
