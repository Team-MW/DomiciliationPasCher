import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Services.css';

/* ─── Data ─────────────────────────────────────────── */

const domiciSteps = [
    {
        n: '1',
        title: 'Répondez à notre questionnaire en ligne',
        desc: 'Définissez l\'adresse de domiciliation et l\'option courrier qui vous convient le mieux. Vous pourrez également ajouter d\'autres options comme la gestion des formalités juridiques.',
        cta: { label: 'Commencer maintenant', to: '/tarifs' },
    },
    {
        n: '2',
        title: 'Complétez votre dossier',
        desc: 'Après le paiement en ligne sur notre plateforme 100% sécurisée, complétez votre dossier et joignez les pièces justificatives demandées.',
    },
    {
        n: '3',
        title: 'Recevez votre attestation de domiciliation',
        desc: 'Après une vérification de votre dossier, vous recevrez votre attestation de domiciliation nécessaire à l\'obtention de votre Kbis.',
    },
    {
        n: '4',
        title: 'Finalisez votre dossier',
        desc: 'Finissez de compléter votre profil après l\'obtention de votre Kbis. Cette étape est indispensable pour finaliser votre domiciliation.',
    },
];

const courrierSteps = [
    { n: '1', title: 'Réception', desc: 'Nous réceptionnons votre courrier à l\'adresse de domiciliation choisie, en toute sécurité.' },
    { n: '2', title: 'Identification', desc: 'Chaque courrier est identifié et enregistré dans notre système sous 24h ouvrées.' },
    { n: '3', title: 'Notification', desc: 'Vous recevez immédiatement une notification par email à l\'arrivée de chaque courrier.' },
    { n: '4', title: 'Numérisation', desc: 'Avec l\'option Scan+, votre courrier est numérisé et disponible depuis votre espace client.' },
    { n: '5', title: 'Réexpédition', desc: 'Sur demande, votre courrier physique est réexpédié à l\'adresse de votre choix (option +30€/mois).' },
];

const creationSteps = [
    {
        n: '1',
        title: 'Répondez à notre questionnaire en ligne',
        desc: 'Définissez l\'adresse de domiciliation et l\'option courrier qui vous convient le mieux. Vous pourrez également ajouter d\'autres options comme la gestion des formalités juridiques.',
    },
    {
        n: '2',
        title: 'Effectuez le paiement en ligne',
        desc: 'Finalisez votre demande en effectuant le paiement sur notre plateforme sécurisée.',
    },
    {
        n: '3',
        title: 'Signez votre contrat de domiciliation',
        desc: 'Le contrat est impératif pour le dossier de création ou transfert de votre société. Votre signature active le service de gestion de vos courriers.',
    },
    {
        n: '4',
        title: 'Recevez votre Kbis et vos statuts',
        desc: 'Votre Kbis et vos statuts vous seront envoyés par mail à l\'adresse renseignée.',
    },
    {
        n: '5',
        title: 'Finalisez votre domiciliation',
        desc: 'Nous recevrons automatiquement votre Kbis et vos statuts. Votre domiciliation sera alors complète et conforme.',
    },
];

const formes = [
    {
        id: 'sasu',
        label: 'SASU',
        color: '#1A56DB',
        sections: [
            {
                title: 'Définition',
                text: 'Une SASU (société par actions simplifiée unipersonnelle) est une société commerciale disposant d\'une personnalité juridique propre, à la différence des entreprises individuelles.',
            },
            {
                title: 'Imposition',
                text: 'Une SASU est imposée à l\'IS (impôt sur les sociétés) par défaut lors de sa création. L\'entrepreneur peut opter librement pour une imposition à l\'IR (impôt sur le revenu) pendant 5 exercices fiscaux maximum.',
            },
            {
                title: 'Pour qui ?',
                text: 'Une SASU est adaptée pour l\'exercice de nombreuses activités commerciales, civiles, artisanales et agricoles. Elle est particulièrement adaptée aux entrepreneurs souhaitant exercer une activité commerciale à leur propre compte, sans s\'installer en nom propre.',
            },
            {
                title: 'Avantages',
                text: 'Une SASU est particulièrement simple à gérer au quotidien car toute décision ne relève que de la volonté de l\'associé unique. La rédaction des statuts confère une grande liberté à l\'entrepreneur pour définir l\'organisation et le fonctionnement interne de l\'entreprise !',
            },
            {
                title: 'Le capital',
                text: 'Une SASU ne comporte qu\'un seul associé et ne nécessite aucun capital social minimum en numéraire ni en nature. Au moins la moitié des apports en numéraire doivent être libérés lors de la création de la société.',
            },
        ],
    },
    {
        id: 'sarl',
        label: 'SARL',
        color: '#0EA5E9',
        sections: [
            {
                title: 'Définition',
                text: 'La SARL (société à responsabilité limitée) est une forme juridique très répandue en France. Elle peut être constituée de 2 à 100 associés dont la responsabilité est limitée au montant de leurs apports.',
            },
            {
                title: 'Imposition',
                text: 'La SARL est soumise à l\'IS (impôt sur les sociétés) par défaut. Sous conditions, les SARL de famille peuvent opter pour l\'IR (impôt sur le revenu).',
            },
            {
                title: 'Pour qui ?',
                text: 'La SARL convient aux petites et moyennes entreprises avec plusieurs associés souhaitant encadrer strictement les droits et devoirs de chacun via les statuts et la loi.',
            },
            {
                title: 'Avantages',
                text: 'Cadre juridique solide et rassurant pour les partenaires et créanciers. Les associés ne sont responsables qu\'à hauteur de leurs apports. Régime social favorable pour le gérant majoritaire.',
            },
            {
                title: 'Le capital',
                text: 'Pas de capital minimum légal (1€ symbolique possible). En pratique, un capital suffisant crédibilise l\'entreprise auprès des banques et partenaires.',
            },
        ],
    },
    {
        id: 'eurl',
        label: 'EURL',
        color: '#10B981',
        sections: [
            {
                title: 'Définition',
                text: 'L\'EURL (entreprise unipersonnelle à responsabilité limitée) est une SARL ne comportant qu\'un seul associé. Elle offre la protection de la responsabilité limitée à un entrepreneur individuel.',
            },
            {
                title: 'Imposition',
                text: 'L\'EURL est imposée par défaut à l\'IR (impôt sur le revenu) si l\'associé unique est une personne physique. Elle peut opter pour l\'IS sur option.',
            },
            {
                title: 'Pour qui ?',
                text: 'Idéale pour les entrepreneurs souhaitant exercer seuls tout en protégeant leur patrimoine personnel, avec un cadre juridique plus structuré qu\'une entreprise individuelle.',
            },
            {
                title: 'Avantages',
                text: 'Protection du patrimoine personnel, possibilité d\'évoluer vers une SARL en cas d\'entrée d\'associés, statut social du gérant, crédibilité auprès des partenaires.',
            },
            {
                title: 'Le capital',
                text: 'Aucun capital minimum légal requis. Un capital adapté à l\'activité est cependant recommandé pour rassurer les partenaires commerciaux et bancaires.',
            },
        ],
    },
    {
        id: 'ei',
        label: 'Auto-entrepreneur / EI',
        color: '#F59E0B',
        sections: [
            {
                title: 'Définition',
                text: 'L\'entreprise individuelle (EI) est la forme la plus simple pour exercer une activité en son nom propre. Depuis 2022, le statut unique protège le patrimoine personnel de l\'entrepreneur.',
            },
            {
                title: 'Imposition',
                text: 'L\'EI est imposée à l\'IR (impôt sur le revenu) dans la catégorie BIC, BNC ou BA selon l\'activité. L\'option pour l\'IS est possible sous conditions.',
            },
            {
                title: 'Pour qui ?',
                text: 'Idéale pour démarrer rapidement une activité sans formalités complexes. Recommandée pour les activités à faible risque financier et les auto-entrepreneurs.',
            },
            {
                title: 'Avantages',
                text: 'Création rapide et peu coûteuse, gestion administrative simplifiée, aucune obligation de capital. Depuis 2022, le patrimoine personnel est protégé par défaut.',
            },
            {
                title: 'Le capital',
                text: 'Aucun capital requis. L\'entrepreneur engage ses apports personnels dans l\'activité, mais son patrimoine personnel est désormais protégé grâce à la réforme de 2022.',
            },
        ],
    },
    {
        id: 'sas',
        label: 'SAS',
        color: '#8B5CF6',
        sections: [
            {
                title: 'Définition',
                text: 'La SAS (société par actions simplifiée) est une société commerciale qui offre une grande souplesse aux associés. Elle doit être constituée d\'au moins deux associés.',
            },
            {
                title: 'Imposition',
                text: 'La SAS est soumise par défaut à l\'IS (impôt sur les sociétés). Elle peut opter pour l\'IR sous certaines conditions (pour une durée de 5 ans maximum).',
            },
            {
                title: 'Pour qui ?',
                text: 'Elle est idéale pour les projets ambitieux, les startups ou les entreprises prévoyant d\'accueillir des investisseurs, grâce à la flexibilité de ses statuts.',
            },
            {
                title: 'Avantages',
                text: 'Une très grande liberté statutaire qui permet d\'organiser la gouvernance sur mesure. Le dirigeant (Président) bénéficie du statut d\'assimilé salarié, offrant une meilleure protection sociale.',
            },
            {
                title: 'Le capital',
                text: 'Aucun capital social minimum n\'est exigé, 1€ symbolique suffit pour la constituer. Le capital peut être variable et composé d\'apports en numéraire ou en nature.',
            },
        ],
    },
    {
        id: 'sci',
        label: 'SCI',
        color: '#EC4899',
        sections: [
            {
                title: 'Définition',
                text: 'La SCI (société civile immobilière) est une société civile permettant à plusieurs personnes de détenir, gérer et transmettre un patrimoine immobilier commun.',
            },
            {
                title: 'Imposition',
                text: 'Par défaut, la SCI est transparente fiscalement et soumise à l\'IR au niveau des associés. Elle peut opter pour l\'IS selon la stratégie fiscale souhaitée.',
            },
            {
                title: 'Pour qui ?',
                text: 'Parfaite pour les familles souhaitant gérer un patrimoine immobilier ensemble ou pour les entrepreneurs séparant leur immobilier d\'entreprise de leur activité commerciale.',
            },
            {
                title: 'Avantages',
                text: 'Facilite la gestion et la transmission d\'un patrimoine immobilier (abattements successifs). Permet d\'éviter la situation d\'indivision et ses blocages.',
            },
            {
                title: 'Le capital',
                text: 'Capital libre, constitué d\'apports en numéraire ou en nature (biens immobiliers). Aucun montant minimum n\'est imposé par la loi.',
            },
        ],
    },
    {
        id: 'association',
        label: 'Association',
        color: '#F97316',
        sections: [
            {
                title: 'Définition',
                text: 'Une association loi 1901 est le groupement d\'au moins deux personnes qui mettent en commun leurs connaissances ou leur activité dans un but autre que de partager des bénéfices.',
            },
            {
                title: 'Imposition',
                text: 'En principe, l\'association n\'est pas soumise aux impôts commerciaux (IS, TVA, CET) si sa gestion est désintéressée et qu\'elle ne concurrence pas le secteur privé.',
            },
            {
                title: 'Pour qui ?',
                text: 'Pour les projets à but non lucratif : clubs sportifs, activités culturelles, actions caritatives, syndicats ou rassemblements de professionnels.',
            },
            {
                title: 'Avantages',
                text: 'Simplicité de création et de fonctionnement. Possibilité de recevoir des dons, des cotisations et des subventions publiques. Cadre très souple.',
            },
            {
                title: 'Le capital',
                text: 'Pas de capital social. L\'association fonctionne avec les cotisations de ses membres, des dons, des subventions et les revenus de ses éventuelles activités.',
            },
        ],
    },
];

const serviceFaqs = [
    {
        q: 'Puis-je commencer ma domiciliation sans avoir créé mon statut au préalable ?',
        a: 'Oui. Pour cela, il suffit de renseigner un statut juridique parmi ceux proposés dans le formulaire d\'inscription. Si votre choix n\'est pas encore arrêté, vous pourrez le modifier ultérieurement dans votre espace client en ligne : il suffit de joindre un exemplaire des statuts déposés auprès du greffe du tribunal de commerce ainsi que votre Kbis à jour.',
    },
    {
        q: 'Est-il possible de changer le nom de ma société ?',
        a: 'Oui. Une entreprise individuelle ou une société peuvent décider de changer de raison sociale ou de nom commercial à tout moment. Cette démarche obéit à une procédure administrative encadrée par la loi française. Pour actualiser votre attestation de domiciliation, il suffit d\'indiquer le changement de nom dans votre espace personnel puis de joindre un exemplaire des statuts et de l\'extrait Kbis actualisés.',
    },
    {
        q: 'Comment fonctionne la gestion de mon courrier ?',
        a: 'Votre courrier est numérisé et disponible sur votre espace client sans limite de temps. Vous recevez une notification dès réception. Le courrier physique est stocké dans notre centre de gestion et non à l\'adresse de domiciliation. Il sera détruit au bout d\'un mois si aucune réexpédition n\'est demandée. Vous pouvez recevoir votre courrier physique à votre adresse de manière quotidienne, mensuelle ou à la carte en souscrivant à une option.',
    },
    {
        q: 'Est-il possible de réserver une salle de réunion ?',
        a: 'Oui. Il est possible de réserver simplement une salle de réunion dans l\'un de nos centres d\'affaires entièrement équipés. Contactez notre support clients qui vérifiera les disponibilités du centre désiré. Chaque salle de réunion peut être louée à l\'heure, à la demi-journée ou à la journée selon vos besoins.',
    },
];

/* ─── Sub-components ────────────────────────────────── */

function StepCard({ step, index, last }) {
    return (
        <div className="svc-step" id={`step-${step.n}`}>
            <div className="svc-step-left">
                <div className="svc-step-num">{step.n}</div>
                {!last && <div className="svc-step-line" />}
            </div>
            <div className="svc-step-body">
                <h3 className="svc-step-title">{step.title}</h3>
                <p className="svc-step-desc">{step.desc}</p>
                {step.cta && (
                    <Link to={step.cta.to} className="btn btn-primary svc-step-cta" style={{ marginTop: '16px', width: 'fit-content' }}>
                        {step.cta.label}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Link>
                )}
            </div>
        </div>
    );
}

function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`faq-item ${open ? 'open' : ''}`}>
            <button className="faq-question" onClick={() => setOpen(!open)}>
                <span>{q}</span>
                <span className="faq-chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>
            <div className="faq-answer">
                <div className="faq-answer-inner">{a}</div>
            </div>
        </div>
    );
}

function useAnimateOnScroll() {
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
            { threshold: 0.08 }
        );
        const els = ref.current?.querySelectorAll('.animate-in') || [];
        els.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
    return ref;
}

/* ─── Page ──────────────────────────────────────────── */

export default function Services() {
    useEffect(() => {
        document.title = "Nos Services : Domiciliation & Création d'Entreprise — DomiciliationPasCher";
    }, []);

    const pageRef = useAnimateOnScroll();
    const [activeStatut, setActiveStatut] = useState('sasu');
    const currentForme = formes.find(f => f.id === activeStatut);

    return (
        <main ref={pageRef} style={{ paddingTop: '68px' }}>

            {/* ══ HEADER ══ */}
            <section className="page-header">
                <div className="container">
                    <div className="page-header-content animate-in">
                        <div className="section-eyebrow">Nos services</div>
                        <h1 className="section-title" style={{ marginTop: '12px' }}>
                            Nos services adaptés à<br /><span>chaque étape de votre projet</span>
                        </h1>
                        <p className="section-subtitle">
                            De la domiciliation légale à la création complète de votre entreprise — nous vous accompagnons à chaque étape.
                        </p>
                        <div className="svc-header-links animate-in">
                            <a href="#domiciliation" className="svc-nav-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                Tout savoir sur la domiciliation
                            </a>
                            <a href="#creation" className="svc-nav-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                Tout savoir sur la création d'entreprise
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ DOMICILIATION PROCESS ══ */}
            <section className="section" id="domiciliation">
                <div className="container">
                    <div className="svc-two-col animate-in">
                        <div className="svc-col-text">
                            <div className="section-eyebrow">Étape par étape</div>
                            <h2 className="section-title" style={{ textAlign: 'left', marginTop: '10px' }}>
                                Comment obtenir<br /><span>votre domiciliation ?</span>
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.7, marginTop: '14px' }}>
                                Un processus simple, 100&nbsp;% en ligne, conçu pour vous faire gagner du temps dès le premier jour.
                            </p>
                            <div className="svc-process-steps" style={{ marginTop: '32px' }}>
                                {domiciSteps.map((step, i) => (
                                    <StepCard key={i} step={step} index={i} last={i === domiciSteps.length - 1} />
                                ))}
                            </div>
                        </div>
                        <div className="svc-col-visual animate-in" style={{ animationDelay: '0.15s' }}>
                            <div className="svc-visual-card svc-vc-blue">
                                <div className="svc-vc-icon">🏢</div>
                                <div className="svc-vc-title">Domiciliation officielle</div>
                                <div className="svc-vc-sub">Adresse juridique valide pour votre Kbis</div>
                                <div className="svc-vc-divider" />
                                <div className="svc-vc-items">
                                    {['Inscription 100% en ligne', 'Attestation sous 24h', 'Centre agréé loi Dutreil', 'Sans engagement', 'Dès 23€ HT/mois'].map(t => (
                                        <div key={t} className="svc-vc-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {t}
                                        </div>
                                    ))}
                                </div>
                                <Link to="/tarifs" className="svc-vc-btn">
                                    Commencer maintenant →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ COURRIER ══ */}
            <section className="section" style={{ background: '#F8FAFF', borderTop: '1px solid var(--border)' }} id="courrier">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Gestion du courrier</div>
                        <h2 className="section-title" style={{ marginTop: '10px' }}>
                            Comment fonctionne<br /><span>le courrier ?</span>
                        </h2>
                        <p className="section-subtitle">
                            Découvrez le fonctionnement de notre service courrier en 5 étapes.
                        </p>
                    </div>
                    <div className="courrier-steps animate-in">
                        {courrierSteps.map((s, i) => (
                            <div key={i} className="courrier-step">
                                <div className="cs-num">{s.n}</div>
                                {i < courrierSteps.length - 1 && <div className="cs-connector" />}
                                <div className="cs-content">
                                    <h3 className="cs-title">{s.title}</h3>
                                    <p className="cs-desc">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="courrier-options animate-in">
                        <div className="co-card">
                            <div className="co-icon">📬</div>
                            <div>
                                <div className="co-name">Option Scan</div>
                                <div className="co-desc">Numérisez et consultez votre courrier à distance</div>
                            </div>
                            <div className="co-price">+5€ <span>HT/mois</span></div>
                        </div>
                        <div className="co-card">
                            <div className="co-icon">📦</div>
                            <div>
                                <div className="co-name">Réexpédition physique</div>
                                <div className="co-desc">Courrier envoyé à l'adresse de votre choix</div>
                            </div>
                            <div className="co-price">+30€ <span>HT/mois</span></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ CREATION ══ */}
            <section className="section" id="creation" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="svc-two-col animate-in">
                        <div className="svc-col-visual svc-col-visual-left animate-in">
                            <div className="svc-visual-card svc-vc-dark">
                                <div className="svc-vc-icon">🚀</div>
                                <div className="svc-vc-title">Créez votre entreprise</div>
                                <div className="svc-vc-sub">Accompagnement complet de A à Z</div>
                                <div className="svc-vc-divider" />
                                <div className="svc-vc-items">
                                    {[
                                        { icon: '✅', t: 'Démarches simples et 100% en ligne' },
                                        { icon: '✅', t: 'Pas de frais cachés' },
                                        { icon: '✅', t: 'Accompagnement sur mesure' },
                                    ].map(({ icon, t }) => (
                                        <div key={t} className="svc-vc-item-row">
                                            <span>{icon}</span> {t}
                                        </div>
                                    ))}
                                </div>
                                <Link to="/tarifs" className="svc-vc-btn">
                                    Démarrer la création →
                                </Link>
                            </div>
                        </div>
                        <div className="svc-col-text">
                            <div className="section-eyebrow">Création d'entreprise</div>
                            <h2 className="section-title" style={{ textAlign: 'left', marginTop: '10px' }}>
                                Créez votre entreprise<br /><span>en 5 étapes</span>
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.7, marginTop: '14px' }}>
                                Un accompagnement complet depuis votre questionnaire jusqu'à la réception de votre Kbis.
                            </p>
                            <div className="svc-process-steps" style={{ marginTop: '32px' }}>
                                {creationSteps.map((step, i) => (
                                    <StepCard key={i} step={step} index={i} last={i === creationSteps.length - 1} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FORMES JURIDIQUES ══ */}
            <section className="section" style={{ background: '#F8FAFF', borderTop: '1px solid var(--border)' }} id="formes">
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Guide pratique</div>
                        <h2 className="section-title" style={{ marginTop: '10px' }}>
                            Les formes <span>juridiques</span>
                        </h2>
                        <p className="section-subtitle">
                            Vous êtes perdu(e) sur les formes juridiques ? On vous explique tout !
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="statuts-tabs">
                        {formes.map(f => (
                            <button
                                key={f.id}
                                className={`statut-tab ${activeStatut === f.id ? 'active' : ''}`}
                                onClick={() => setActiveStatut(f.id)}
                                style={{ '--tab-color': f.color }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    {currentForme && (
                        <div className="statut-content">
                            <div className="statut-header" style={{ borderLeft: `4px solid ${currentForme.color}` }}>
                                <span className="statut-badge" style={{ background: `${currentForme.color}15`, color: currentForme.color }}>
                                    {currentForme.label}
                                </span>
                                <p className="statut-intro">
                                    Découvrez tout ce que vous devez savoir sur la {currentForme.label} pour choisir la bonne structure pour votre projet.
                                </p>
                            </div>
                            <div className="statut-sections">
                                {currentForme.sections.map((s, i) => (
                                    <div key={i} className="statut-section">
                                        <h3 className="ss-title">
                                            <span className="ss-icon" style={{ background: `${currentForme.color}15`, color: currentForme.color }}>
                                                {['📋', '💰', '👤', '⭐', '🏦'][i]}
                                            </span>
                                            {s.title}
                                        </h3>
                                        <p className="ss-text">{s.text}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="statut-cta-row">
                                <Link to="/tarifs" className="btn btn-primary">
                                    Domicilier ma {currentForme.label} →
                                </Link>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                    Attestation officielle sous 24h · Dès 23€ HT/mois
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="section" id="faq-services" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="section-header animate-in">
                        <div className="section-eyebrow">Questions fréquentes</div>
                        <h2 className="section-title" style={{ marginTop: '10px' }}>
                            Vos questions, <span>nos réponses</span>
                        </h2>
                    </div>
                    <div className="faq-grid animate-in">
                        {serviceFaqs.map((faq, i) => (
                            <FaqItem key={i} {...faq} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA ══ */}
            <section className="final-cta section-sm">
                <div className="container">
                    <div className="final-cta-inner animate-in">
                        <h2>Démarrez votre domiciliation dès aujourd'hui</h2>
                        <p>Inscription en ligne · Attestation sous 24h · Dès 23€ HT/mois</p>
                        <div className="final-cta-actions">
                            <Link to="/tarifs" className="btn btn-white btn-lg" id="services-final-cta">
                                Voir les tarifs →
                            </Link>
                            <Link to="/about" className="final-cta-link">En savoir plus sur nous →</Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
