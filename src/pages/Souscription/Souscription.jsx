import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { handleCheckout } from '../../utils/stripe';
import { adminDataService } from '../../services/adminDataService';
import { uploadFile } from '../../utils/cloudinary';
import { sendSouscriptionLeadEmail } from '../../utils/emailService';
import usePageMeta from '../../components/Seo/usePageMeta';
import { PLAN_CATALOG, annualHt, planAmountTtc, EXTRA_FEES_HT } from '../../data/plans';
import { DOMICILIATION_ADDRESS_ONE_LINE, AGREMENT_NUMBER } from '../../../shared/company.js';
import { NO_DOCUMENT_FILES, REQUIRED_DOCUMENTS, missingDocumentErrors } from './souscriptionDocuments.js';
import { normalizeFrenchPhone, isValidFrenchPhone } from './souscriptionPhone.js';
import './Souscription.css';

/* ─── 3 phases lisibles pour le client (les 8 écrans restent inchangés) ─── */
const PHASES = [
    { id: 'situation', label: 'Votre situation', short: 'Situation' },
    { id: 'offre', label: 'Votre offre', short: 'Offre' },
    { id: 'validation', label: 'Documents & paiement', short: 'Paiement' },
];

const PHASE_COACH = [
    {
        kicker: 'Étape 1 sur 3',
        title: 'Votre situation',
        body: 'On commence simplement : qui vous êtes et votre entreprise. Rien n’est débité maintenant.',
    },
    {
        kicker: 'Étape 2 sur 3',
        title: 'Votre offre',
        body: 'Votre adresse de siège, votre formule et la périodicité (mensuelle ou annuelle, −20 %).',
    },
    {
        kicker: 'Étape 3 sur 3',
        title: 'Documents & paiement',
        body: 'Dernière ligne droite. Justificatifs, puis paiement sécurisé Stripe.',
    },
];

const STEPS = [
    { id: 'projet', label: 'Votre projet', phase: 0, title: 'Quel est votre projet ?', hint: 'On commence simplement. Vous pouvez revenir en arrière à tout moment, rien n’est débité pour l’instant.' },
    { id: 'coordonnees', label: 'Coordonnées', phase: 0, title: 'Vos informations personnelles', hint: 'Elles figurent sur le contrat de domiciliation. Cette étape n’engage aucun paiement.' },
    { id: 'entreprise', label: 'Entreprise', phase: 0, title: 'Votre entreprise', hint: 'Quelques infos pour préparer votre attestation de siège social.' },
    { id: 'domiciliation', label: 'Adresse', phase: 1, title: 'Où domicilier votre entreprise ?', hint: 'Adresse officielle, acceptée au greffe, aux impôts et en banque.' },
    { id: 'courrier', label: 'Formule', phase: 1, title: 'Choisissez votre formule', hint: 'Elle détermine ce que nous faisons de votre courrier. Vous pourrez en changer plus tard depuis votre espace client.' },
    { id: 'frequence', label: 'Fréquence', phase: 1, title: 'Mensuel ou annuel ?', hint: 'Engagement légal de 3 mois, puis résiliable en ligne avec 1 mois de préavis.' },
    { id: 'documents', label: 'Justificatifs', phase: 2, title: 'Vos justificatifs', hint: 'Pièce d’identité et justificatif de domicile de moins de 3 mois. Transmission sécurisée, utilisés uniquement pour votre dossier de domiciliation.' },
    { id: 'recapitulatif', label: 'Paiement', phase: 2, title: 'Vérifiez et payez', hint: 'Dernière étape. Paiement sécurisé par Stripe. Nous vérifions votre dossier et vous envoyons votre attestation sous 24 h.' },
];

const VILLES = ['Toulouse (31)'];
const FORMES_JURIDIQUES = ['SASU', 'SAS', 'SARL', 'EURL', 'SCI', 'Auto-entrepreneur / EI', 'Association', 'Autre'];
const TYPES_PROJET = [
    { id: 'transfert', icon: '🔄', label: 'Transfert de siège', desc: "Je transfère l'adresse de ma société existante" },
    { id: 'domiciliation', icon: '📍', label: 'Domiciliation seule', desc: "J'ai déjà une société et je veux juste une adresse" },
];
// Prix, noms et quotas : uniquement depuis PLAN_CATALOG (shared/plans.js).
const fmtEuro = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2).replace('.', ','));
const OFFRES_COURRIER = [
    { id: 'notification', icon: '📄', label: PLAN_CATALOG.essentiel.name, price: `${fmtEuro(PLAN_CATALOG.essentiel.ht)}€ HT/mois`, desc: "Adresse officielle, réception du courrier et notification avec photo de l'enveloppe", note: 'Numérisation du courrier non incluse' },
    { id: 'scan', icon: '📦', label: PLAN_CATALOG['scan-plus'].name, price: `${fmtEuro(PLAN_CATALOG['scan-plus'].ht)}€ HT/mois`, desc: `Numérisation de ${PLAN_CATALOG['scan-plus'].scanQuota} plis par mois dans votre espace client` },
    { id: 'reexpedition', icon: '📬', label: PLAN_CATALOG.physique.name, price: `${fmtEuro(PLAN_CATALOG.physique.ht)}€ HT/mois`, desc: `${PLAN_CATALOG.physique.scanQuota} plis numérisés par mois, ${PLAN_CATALOG.physique.forwardsIncluded} réexpéditions par mois et colis inclus` },
];
const PLANS = Object.fromEntries(Object.entries(PLAN_CATALOG).map(([id, p]) => [id, { name: p.name, price: String(p.ht) }]));

const STORAGE_KEY = 'dpc_souscription_draft';
const STORAGE_STEP_KEY = 'dpc_souscription_step';
const OFFRE_TO_PLAN = { notification: 'essentiel', scan: 'scan-plus', reexpedition: 'physique' };

function leadTokenFor(email) {
    const key = `dpc_lead_token_${email.toLowerCase()}`;
    let token = localStorage.getItem(key);
    if (!token) {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(key, token);
    }
    return { key, token };
}

function AddressAutocomplete({ onSelectAddress, value, onChange, error }) {
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const fetchAddresses = async (query) => {
        onChange(query);
        if (query.length < 3) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        try {
            const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            setSuggestions(data.features || []);
            setIsOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelect = (feature) => {
        const p = feature.properties;
        onChange(p.name);
        setIsOpen(false);
        onSelectAddress({
            adresse: p.name,
            codePostal: p.postcode,
            ville: p.city
        });
    };

    return (
        <div style={{ position: 'relative' }}>
            <input 
                className={`sous-input ${error ? 'error' : ''}`}
                value={value}
                onChange={e => fetchAddresses(e.target.value)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder="Entrez votre adresse (ex: 10 Rue de la Paix)"
            />
            {isOpen && suggestions.length > 0 && (
                <ul className="address-suggestions" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                    listStyle: 'none', margin: '4px 0 0', padding: 0, zIndex: 50,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}>
                    {suggestions.map(s => (
                        <li key={s.properties.id} 
                            onClick={() => handleSelect(s)}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#f8fafc'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            {s.properties.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}


export default function Souscription() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    usePageMeta({ title: 'Souscription — Domiciliation Pas Cher', path: '/souscription', noindex: true });
    const planId = searchParams.get('plan') || 'essentiel';

    const defaultData = {
        typeProjet: '',
        formeJuridique: '',
        // Coordonnées
        nom: '', prenom: '', email: '', telephone: '',
        dateNaissance: '', lieuNaissance: '',
        // Entreprise
        nomSociete: '', siren: '', activite: '', nationalite: 'Française', qualite: 'Gérant',
        // Domiciliation
        ville: 'Toulouse (31)',
        // Courrier
        offre: planId === 'scan-plus' ? 'scan' : (planId === 'physique' ? 'reexpedition' : 'notification'),
        // Fréquence
        frequence: searchParams.get('frequence') === 'annuel' ? 'annuel' : 'mensuel',
        // Documents
        justificatifDomicile: '',
        pieceIdentiteRecto: '',
        pieceIdentiteVerso: '',
        // CGV
        cgv: false,
        adresse: '',
        complement: '',
        codePostal: '',
        villePerso: '',
        pays: 'France',
    };

    const [data, setData] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Le choix fait sur Tarifs / l'accueil (?plan, ?frequence) l'emporte sur un ancien brouillon.
                const fromUrl = {};
                if (searchParams.has('plan')) fromUrl.offre = defaultData.offre;
                if (searchParams.has('frequence')) fromUrl.frequence = defaultData.frequence;
                return {
                    ...defaultData,
                    ...parsed,
                    ...fromUrl,
                    ...NO_DOCUMENT_FILES,
                };
            }
        } catch { /* JSON invalide : on garde la valeur par défaut */ }
        return defaultData;
    });

    const CURRENT_STEPS = STEPS;

    const [step, setStep] = useState(() => {
        try {
            const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
            if (savedStep !== null) {
                const s = parseInt(savedStep, 10);
                if (!isNaN(s) && s >= 0 && s < 8) return s;
            }
        } catch { /* stockage indisponible : on ignore */ }
        return 0;
    });

    const currentStepId = CURRENT_STEPS[step]?.id || 'projet';
    const repriseToken = searchParams.get('reprise');

    // Lien « Reprendre mon inscription » des emails de relance : on recharge le brouillon et l'écran.
    useEffect(() => {
        if (!repriseToken) return;
        let cancelled = false;
        (async () => {
            try {
                const lead = await adminDataService.getSouscriptionLeadByToken(repriseToken);
                if (cancelled || !lead) return;
                setData(d => ({ ...d, ...lead.draft, ...NO_DOCUMENT_FILES }));
                setStep(Math.min(Math.max(Number(lead.step) || 0, 0), CURRENT_STEPS.length - 1));
                if (lead.email) localStorage.setItem(`dpc_lead_token_${lead.email}`, repriseToken);
            } catch (err) {
                console.error('Reprise inscription:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [repriseToken]);

    const persistLead = async (nextStep) => {
        try {
            const email = (data.email || '').trim();
            if (!/\S+@\S+\.\S+/.test(email)) return;
            const { key, token } = leadTokenFor(email);
            const draft = Object.fromEntries(Object.entries(data).filter(([k, v]) =>
                !k.endsWith('File') && !(typeof v === 'string' && v.length > 2000)));
            const saved = await adminDataService.saveSouscriptionLead({
                email,
                token,
                firstName: data.prenom,
                plan: OFFRE_TO_PLAN[data.offre] || planId,
                step: nextStep,
                draft,
            });
            if (saved && saved !== token) localStorage.setItem(key, saved);
        } catch (err) {
            console.error('Sauvegarde inscription:', err);
        }
    };

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [payError, setPayError] = useState('');
    const [success] = useState(false);
    const [coachOpen, setCoachOpen] = useState(false);
    const lastCoachedPhase = useRef(null);

    // Sauvegarde automatique des données dans localStorage à chaque modification
    useEffect(() => {
        try {
            const toSave = { ...data };
            delete toSave.pieceIdentiteFile;
            delete toSave.pieceIdentiteVersoFile;
            delete toSave.justificatifDomicileFile;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch { /* stockage indisponible : on ignore */ }
    }, [data]);

    // Sauvegarde de l'étape active
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_STEP_KEY, step.toString());
        } catch { /* stockage indisponible : on ignore */ }
    }, [step]);

    useEffect(() => {
        const phase = CURRENT_STEPS[step]?.phase ?? 0;
        if (lastCoachedPhase.current === phase) return;
        const key = `dpc_coach_phase_${phase}`;
        try {
            if (sessionStorage.getItem(key)) {
                lastCoachedPhase.current = phase;
                return;
            }
            sessionStorage.setItem(key, '1');
        } catch { /* stockage indisponible : on ignore */ }
        lastCoachedPhase.current = phase;
        setCoachOpen(true);
    }, [step]);

    const set = (key, val) => setData(d => ({ ...d, [key]: val }));

    /* Validation par étape */
    const validate = () => {
        const e = {};
        if (currentStepId === 'projet') {
            if (!data.typeProjet) e.typeProjet = 'Veuillez choisir un type de projet';
            if (!data.formeJuridique) e.formeJuridique = 'Veuillez choisir une forme juridique';
        }
        if (currentStepId === 'coordonnees') {
            if (!data.nom.trim()) e.nom = 'Requis';
            if (!data.prenom.trim()) e.prenom = 'Requis';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) e.email = 'Adresse email invalide';
            const phoneDigits = data.telephone.replace(/\D/g, '');
            if (!phoneDigits) e.telephone = 'Requis';
            else if (!isValidFrenchPhone(phoneDigits)) e.telephone = 'Numéro invalide : 10 chiffres, par exemple 06 12 34 56 78';
            if (!data.adresse.trim()) e.adresse = 'Requis';
            if (!data.codePostal.trim()) e.codePostal = 'Requis';
            else if (/^france$/i.test(data.pays.trim()) && !/^\d{5}$/.test(data.codePostal.trim())) e.codePostal = 'Code postal à 5 chiffres';
            if (!data.villePerso.trim()) e.villePerso = 'Requis';
            if (!data.pays.trim()) e.pays = 'Requis';
            if (!data.dateNaissance) e.dateNaissance = 'Requis';
            else {
                const birth = new Date(data.dateNaissance);
                const adult = new Date();
                adult.setFullYear(adult.getFullYear() - 18);
                if (Number.isNaN(birth.getTime()) || birth > adult || birth.getFullYear() < 1900) e.dateNaissance = 'Le dirigeant doit être majeur';
            }
            if (!data.lieuNaissance.trim()) e.lieuNaissance = 'Requis';
        }
        if (currentStepId === 'entreprise') {
            if (!data.nomSociete.trim()) e.nomSociete = 'Requis';
            if (!data.activite.trim()) e.activite = 'Requis';
            const sirenDigits = data.siren.replace(/\s/g, '');
            if (sirenDigits && !/^(\d{9}|\d{14})$/.test(sirenDigits)) e.siren = 'SIREN à 9 chiffres (ou SIRET à 14 chiffres)';
        }
        if (currentStepId === 'domiciliation') {
            if (!data.ville) e.ville = 'Veuillez choisir une ville';
        }
        if (currentStepId === 'documents') {
            Object.assign(e, missingDocumentErrors(data));
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const goToStep = (id) => {
        const index = CURRENT_STEPS.findIndex((s) => s.id === id);
        if (index >= 0) { setErrors({}); setStep(index); }
    };

    const next = () => {
        if (!validate()) {
            // Amène le client directement au premier champ à corriger (utile sur mobile).
            requestAnimationFrame(() => {
                document.querySelector('.sous-step .field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            return;
        }
        if (currentStepId === 'coordonnees') {
            const emailKey = (data.email || '').trim().toLowerCase();
            const leadFlag = emailKey ? `dpc_lead_sent_${emailKey}` : null;
            let alreadySent = false;
            try {
                alreadySent = leadFlag ? sessionStorage.getItem(leadFlag) === '1' : false;
            } catch { /* stockage indisponible : on ignore */ }
            if (leadFlag && !alreadySent) {
                const adressePerso = `${data.adresse}${data.complement ? `, ${data.complement}` : ''}, ${data.codePostal} ${data.villePerso}, ${data.pays}`.replace(/\s+/g, ' ').trim();
                sendSouscriptionLeadEmail({
                    nom: `${data.prenom} ${data.nom}`.trim(),
                    email: data.email.trim(),
                    telephone: data.telephone,
                    address: adressePerso,
                    dateNaissance: data.dateNaissance,
                    lieuNaissance: data.lieuNaissance,
                    nationalite: data.nationalite,
                    qualite: data.qualite,
                    typeProjet: data.typeProjet,
                    formeJuridique: data.formeJuridique,
                    plan: planId,
                }).then(() => {
                    try { sessionStorage.setItem(leadFlag, '1'); } catch { /* stockage indisponible : on ignore */ }
                }).catch((err) => console.error('Lead email:', err));
            }
        }
        const nextStep = Math.min(step + 1, CURRENT_STEPS.length - 1);
        if (step >= CURRENT_STEPS.findIndex(s => s.id === 'coordonnees')) persistLead(nextStep);
        setStep(nextStep);
    };
    const prev = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)); };

    const handleBackClick = (e) => {
        e.preventDefault();
        if (step > 0) {
            prev();
        } else {
            if (window.history.length > 1) navigate(-1);
            else navigate('/offre');
        }
    };

    const currentPlan = PLAN_CATALOG[OFFRE_TO_PLAN[data.offre] || 'essentiel'];
    const currentPlanName = currentPlan.name;
    const currentPlanPrice = fmtEuro(currentPlan.ht);
    const currentMeta = CURRENT_STEPS[step] || CURRENT_STEPS[0];
    const currentPhase = currentMeta.phase ?? 0;
    const nextStepLabel = CURRENT_STEPS[step + 1]?.label;

    const stepHint = currentStepId === 'entreprise'
        ? (data.typeProjet === 'creation'
            ? 'Renseignez les informations de votre future société. Rien n’est débité à cette étape.'
            : 'Renseignez les informations de votre société. Rien n’est débité à cette étape.')
        : currentMeta.hint;

    const renderStepHeader = () => (
        <div className="sous-step-header">
            <div className="sous-phases" aria-label={`Phase ${currentPhase + 1} sur 3`}>
                {PHASES.map((phase, i) => (
                    <React.Fragment key={phase.id}>
                        {i > 0 && <div className={`sous-phase-line ${i <= currentPhase ? 'is-on' : ''}`} aria-hidden="true" />}
                        <div className={`sous-phase-chip ${i === currentPhase ? 'is-current' : ''} ${i < currentPhase ? 'is-done' : ''}`}>
                            <span className="sous-phase-n">
                                {i < currentPhase ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : (
                                    i + 1
                                )}
                            </span>
                            <strong>{phase.short}</strong>
                        </div>
                    </React.Fragment>
                ))}
            </div>
            <div className="sous-step-num">{PHASES[currentPhase].label} · écran {step + 1}/{CURRENT_STEPS.length}</div>
            <h2>{currentMeta.title}</h2>
            <p>{stepHint}</p>
        </div>
    );

    // Annuel = 12 mois − 20 % (contrat de novembre 2026). Le montant réel est recalculé par le serveur.
    const getHT = () => (data.frequence === 'annuel' ? annualHt(currentPlan.ht) : currentPlan.ht);
    const getTTC = () => planAmountTtc(currentPlan.ht, data.frequence === 'annuel' ? 'year' : 'month');

    const money = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;
    const perPeriod = data.frequence === 'annuel' ? '/an' : '/mois';
    const prixTotal = () => `${money(getHT())}${perPeriod}`;
    const prixTotalTTC = () => `${money(getTTC())}${perPeriod}`;

    if (success) {
        return (
            <div className="souscription-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="success-message">
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#10B981' }}>Demande envoyée !</h1>
                    <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '1rem' }}>Nous avons bien reçu votre demande de consultation pour la création de votre entreprise.</p>
                    <p style={{ fontSize: '1.1rem', color: '#475569' }}>Un conseiller va vous contacter très prochainement pour faire le point sur votre projet.</p>
                    <Link to="/" className="sous-pay-btn" style={{ marginTop: '2.5rem', display: 'inline-block', textDecoration: 'none' }}>Retour à l'accueil</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="souscription-layout">

            {/* ── Sidebar ── */}
            <aside className="sous-sidebar">
                <div className="sous-sidebar-top">
                    <button 
                        onClick={handleBackClick} 
                        className="sous-back"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                        {step > 0 ? 'Étape précédente' : 'Retour'}
                    </button>

                    <div className="sous-plan-badge">
                        <span className="spb-label">Forfait choisi</span>
                        <span className="spb-name">{currentPlanName}</span>
                        <span className="spb-price">{data.frequence === 'annuel' ? `${fmtEuro(annualHt(currentPlan.ht))}€ HT/an` : `${currentPlanPrice}€ HT/mois`}</span>
                    </div>
                </div>

                <nav className="sous-steps-nav" aria-label="Étapes de souscription">
                    {PHASES.map((phase, pi) => (
                        <div key={phase.id} className={`sous-phase-group ${currentPhase === pi ? 'is-current' : ''} ${currentPhase > pi ? 'is-done' : ''}`}>
                            <div className="sous-phase-heading">
                                <span>{pi + 1}</span>
                                {phase.label}
                            </div>
                            {CURRENT_STEPS.map((s, i) => s.phase !== pi ? null : (
                                <div
                                    key={s.id}
                                    className={`sous-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                                    onClick={() => {
                                        if (i < step) setStep(i);
                                    }}
                                    style={{ cursor: i < step ? 'pointer' : 'default' }}
                                    title={i < step ? `Revenir à l'étape : ${s.label}` : ''}
                                >
                                    <div className="ssi-dot">
                                        {i < step
                                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            : <span>{i + 1}</span>
                                        }
                                    </div>
                                    <span className="ssi-label">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sous-sidebar-footer">
                    <div className="sous-reassure">
                        Rien n’est débité avant la dernière étape.
                    </div>
                    <div className="sous-secure">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        Formulaire sécurisé SSL
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="sous-main">

                {/* Progress bar */}
                <div className="sous-progress-bar">
                    <div className="sous-progress-fill" style={{ width: `${((step + 1) / CURRENT_STEPS.length) * 100}%` }} />
                </div>

                <div className="sous-mobile-bar">
                    <button type="button" onClick={handleBackClick} className="sous-mobile-back" aria-label={step > 0 ? 'Étape précédente' : 'Retour'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                    </button>
                    <div className="sous-mobile-meta">
                        <span>Étape {currentPhase + 1} / 3 · {PHASES[currentPhase].short}</span>
                        <strong>{currentMeta.label}</strong>
                    </div>
                    <span className="sous-mobile-plan">{currentPlanName}</span>
                </div>

                <div className="sous-content">

                    {/* ══ ÉTAPE 0 — Choix du projet ══ */}
                    {currentStepId === 'projet' && (
                        <div className="sous-step">
                            {renderStepHeader()}

                            <div className="type-projet-grid">
                                {TYPES_PROJET.map(t => (
                                    <button
                                        key={t.id}
                                        className={`type-projet-card ${data.typeProjet === t.id ? 'selected' : ''}`}
                                        onClick={() => set('typeProjet', t.id)}
                                    >
                                        <div className="tpc-icon">{t.icon}</div>
                                        <div className="tpc-label">{t.label}</div>
                                        <div className="tpc-desc">{t.desc}</div>
                                        <div className="tpc-check">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {errors.typeProjet && <div className="field-error">{errors.typeProjet}</div>}

                            <div className="sous-field-group" style={{ marginTop: '32px' }}>
                                <label className="sous-label">Forme juridique *</label>
                                <div className="forme-grid">
                                    {FORMES_JURIDIQUES.map(f => (
                                        <button
                                            key={f}
                                            className={`forme-btn ${data.formeJuridique === f ? 'selected' : ''}`}
                                            onClick={() => set('formeJuridique', f)}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                {errors.formeJuridique && <div className="field-error">{errors.formeJuridique}</div>}
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 1 — Coordonnées ══ */}
                    {currentStepId === 'coordonnees' && (
                        <div className="sous-step">
                            {renderStepHeader()}

                            <div className="sous-form-grid">
                                <div className="sous-field">
                                    <label className="sous-label">Nom de famille *</label>
                                    <input className={`sous-input ${errors.nom ? 'error' : ''}`} placeholder="Duran" value={data.nom} onChange={e => set('nom', e.target.value)} />
                                    {errors.nom && <div className="field-error">{errors.nom}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Prénom *</label>
                                    <input className={`sous-input ${errors.prenom ? 'error' : ''}`} placeholder="Camille" value={data.prenom} onChange={e => set('prenom', e.target.value)} />
                                    {errors.prenom && <div className="field-error">{errors.prenom}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">E-mail *</label>
                                    <input className={`sous-input ${errors.email ? 'error' : ''}`} type="email" autoComplete="email" inputMode="email" placeholder="exemple@gmail.com" value={data.email} onChange={e => set('email', e.target.value)} />
                                    {errors.email && <div className="field-error">{errors.email}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Téléphone *</label>
                                    <div className="phone-field">
                                        <span className="phone-flag">🇫🇷 +33</span>
                                        <input 
                                            className={`sous-input phone-input ${errors.telephone ? 'error' : ''}`}
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel-national"
                                            placeholder="06 XX XX XX XX"
                                            value={data.telephone} 
                                            onChange={e => set('telephone', normalizeFrenchPhone(e.target.value))}
                                        />
                                    </div>
                                    {errors.telephone && <div className="field-error">{errors.telephone}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Date de naissance *</label>
                                    <input className={`sous-input ${errors.dateNaissance ? 'error' : ''}`} type="date" value={data.dateNaissance} onChange={e => set('dateNaissance', e.target.value)} />
                                    {errors.dateNaissance && <div className="field-error">{errors.dateNaissance}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Lieu de naissance *</label>
                                    <input className={`sous-input ${errors.lieuNaissance ? 'error' : ''}`} placeholder="Ville, Pays" value={data.lieuNaissance} onChange={e => set('lieuNaissance', e.target.value)} />
                                    {errors.lieuNaissance && <div className="field-error">{errors.lieuNaissance}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Nationalité *</label>
                                    <select className="sous-input" value={data.nationalite} onChange={e => set('nationalite', e.target.value)}>
                                        <option>Française</option>
                                        <option>Autre (UE)</option>
                                        <option>Hors UE</option>
                                    </select>
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Qualité *</label>
                                    <select className="sous-input" value={data.qualite} onChange={e => set('qualite', e.target.value)}>
                                        <option>Gérant</option>
                                        <option>Président</option>
                                        <option>Auto-entrepreneur</option>
                                        <option>Fondateur</option>
                                        <option>Directeur Général</option>
                                        <option>Autre</option>
                                    </select>
                                    <div className="field-hint">Votre fonction dans l’entreprise, telle qu’elle figurera au contrat.</div>
                                </div>
                                <div className="sous-field sous-field-full">
                                    <label className="sous-label">Adresse personnelle *</label>
                                    <AddressAutocomplete 
                                        value={data.adresse}
                                        onChange={val => set('adresse', val)}
                                        onSelectAddress={({adresse, codePostal, ville}) => {
                                            setData(d => ({ ...d, adresse, codePostal, villePerso: ville }));
                                        }}
                                        error={errors.adresse}
                                    />
                                    {errors.adresse && <div className="field-error">{errors.adresse}</div>}
                                </div>
                                <div className="sous-field sous-field-full">
                                    <label className="sous-label">Complément d'adresse (Optionnel)</label>
                                    <input className="sous-input" placeholder="Bâtiment, Étage, Appartement..." value={data.complement} onChange={e => set('complement', e.target.value)} />
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Code postal *</label>
                                    <input className={`sous-input ${errors.codePostal ? 'error' : ''}`} placeholder="31000" value={data.codePostal} onChange={e => set('codePostal', e.target.value)} />
                                    {errors.codePostal && <div className="field-error">{errors.codePostal}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Ville *</label>
                                    <input className={`sous-input ${errors.villePerso ? 'error' : ''}`} placeholder="Toulouse" value={data.villePerso} onChange={e => set('villePerso', e.target.value)} />
                                    {errors.villePerso && <div className="field-error">{errors.villePerso}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Pays *</label>
                                    <input className={`sous-input ${errors.pays ? 'error' : ''}`} placeholder="France" value={data.pays} onChange={e => set('pays', e.target.value)} />
                                    {errors.pays && <div className="field-error">{errors.pays}</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 2 — Votre entreprise ══ */}
                    {currentStepId === 'entreprise' && (
                        <div className="sous-step">
                            {renderStepHeader()}

                            <div className="sous-form-grid">
                                <div className="sous-field sous-field-full">
                                    <label className="sous-label">
                                        {data.typeProjet === 'creation' ? 'Nom envisagé pour la société' : 'Nom de la société *'}
                                    </label>
                                    <input
                                        className={`sous-input ${errors.nomSociete ? 'error' : ''}`}
                                        placeholder="Ex: Ma Super SASU"
                                        value={data.nomSociete}
                                        onChange={e => set('nomSociete', e.target.value)}
                                    />
                                    {errors.nomSociete && <div className="field-error">{errors.nomSociete}</div>}
                                </div>

                                {data.typeProjet !== 'creation' && (
                                    <div className="sous-field">
                                        <label className="sous-label">Numéro SIREN</label>
                                        <input className={`sous-input ${errors.siren ? 'error' : ''}`} inputMode="numeric" placeholder="123 456 789" maxLength={17} value={data.siren} onChange={e => set('siren', e.target.value)} />
                                        {errors.siren
                                            ? <div className="field-error">{errors.siren}</div>
                                            : <div className="field-hint">9 chiffres, en haut de votre Kbis. Il apparaîtra sur votre contrat et votre attestation.</div>}
                                    </div>
                                )}

                                <div className="sous-field sous-field-full">
                                    <label className="sous-label">Activité principale *</label>
                                    <textarea
                                        className={`sous-input sous-textarea ${errors.activite ? 'error' : ''}`}
                                        placeholder="Décrivez brièvement l'activité de votre entreprise…"
                                        rows={3}
                                        value={data.activite}
                                        onChange={e => set('activite', e.target.value)}
                                    />
                                    {errors.activite && <div className="field-error">{errors.activite}</div>}
                                </div>


                                <div className="sous-field">
                                    <label className="sous-label">Forme juridique</label>
                                    <input className="sous-input" value={data.formeJuridique} readOnly style={{ opacity: 0.7 }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 3 — Domiciliation ══ */}
                    {currentStepId === 'domiciliation' && (
                        <div className="sous-step">
                            {renderStepHeader()}

                            <div className="villes-grid">
                                {VILLES.map(v => {
                                    const img = v.includes('Toulouse') ? '/toulouse-capitole.jpg' : 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2070&auto=format&fit=crop';
                                    return (
                                        <button
                                            key={v}
                                            className={`ville-card-fancy ${data.ville === v ? 'selected' : ''}`}
                                            onClick={() => set('ville', v)}
                                        >
                                            <div className="vcf-image" style={{ backgroundImage: `url('${img}')` }}>
                                                <div className="vcf-overlay"></div>
                                                <div className="vcf-check">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                </div>
                                            </div>
                                            <div className="vcf-content">
                                                <span className="vcf-icon">📍</span>
                                                <span className="vcf-title">{v}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.ville && <div className="field-error" style={{ marginTop: '12px' }}>{errors.ville}</div>}

                            <div className="domi-info-card is-info">
                                <span className="dic-icon">ℹ️</span>
                                <div>
                                    <div className="dic-title">Votre future adresse de siège</div>
                                    <div className="dic-text">{DOMICILIATION_ADDRESS_ONE_LINE}. Centre agréé par la préfecture (n° {AGREMENT_NUMBER}) : adresse acceptée au greffe, aux impôts et par les banques.</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 4 — Offre courrier ══ */}
                    {currentStepId === 'courrier' && (
                        <div className="sous-step">
                            {renderStepHeader()}

                            <div className="courrier-options">
                                {OFFRES_COURRIER.map(o => (
                                    <button
                                        key={o.id}
                                        className={`courrier-card ${data.offre === o.id ? 'selected' : ''}`}
                                        onClick={() => set('offre', o.id)}
                                    >
                                        <div className="cc-left">
                                            <div className="cc-icon">{o.icon}</div>
                                            <div>
                                                <div className="cc-label">
                                                    {o.label}
                                                    {o.id === 'scan' && <span className="formule-badge">Recommandé</span>}
                                                </div>
                                                <div className="cc-desc">{o.desc}</div>
                                                {o.note && <div className="cc-note">{o.note}</div>}
                                            </div>
                                        </div>
                                        <div className="cc-right">
                                            <div className="cc-price">{o.price}</div>
                                            <div className={`cc-radio ${data.offre === o.id ? 'on' : ''}`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="courrier-common">
                                <strong>Dans toutes les formules :</strong> adresse officielle, attestation de domiciliation,
                                notification avec photo de l’enveloppe, retrait sur place sur rendez-vous. À la demande :
                                réexpédition ({fmtEuro(EXTRA_FEES_HT.forward)} € HT + affranchissement) et salle de réunion
                                ({fmtEuro(EXTRA_FEES_HT.meetingRoomHour)} € HT/h).
                            </p>
                        </div>
                    )}

                    {/* ══ ÉTAPE 5 — Fréquence ══ */}
                    {currentStepId === 'frequence' && (
                        <div className="sous-step">
                            {renderStepHeader()}

                            <div className="freq-options">
                                <button
                                    className={`freq-card ${data.frequence === 'mensuel' ? 'selected' : ''}`}
                                    onClick={() => set('frequence', 'mensuel')}
                                >
                                    <div className="fc-left">
                                        <div className="fc-title">Mensuel</div>
                                        <div className="fc-sub">Après 3 mois, résiliable avec 1 mois de préavis</div>
                                    </div>
                                    <div className="fc-right">
                                        <div className="fc-amount">
                                            <div className="fc-price">{currentPlanPrice}€ <small>HT/mois</small></div>
                                            <div className="fc-ttc">{money(planAmountTtc(currentPlan.ht, 'month'))} TTC</div>
                                        </div>
                                        <div className={`fc-radio ${data.frequence === 'mensuel' ? 'on' : ''}`} />
                                    </div>
                                </button>
                                
                                <button
                                    className={`freq-card ${data.frequence === 'annuel' ? 'selected' : ''}`}
                                    onClick={() => set('frequence', 'annuel')}
                                >
                                    <div className="fc-badge">🎁 −20 %</div>
                                    <div className="fc-left">
                                        <div className="fc-title">Annuel</div>
                                        <div className="fc-sub">Soit {fmtEuro(Math.round((annualHt(currentPlan.ht) / 12) * 100) / 100)}€ HT/mois, au lieu de {fmtEuro(currentPlan.ht * 12)}€ HT/an</div>
                                    </div>
                                    <div className="fc-right">
                                        <div className="fc-amount">
                                            <div className="fc-price">{fmtEuro(annualHt(currentPlan.ht))}€ <small>HT/an</small></div>
                                            <div className="fc-ttc">{money(planAmountTtc(currentPlan.ht, 'year'))} TTC</div>
                                        </div>
                                        <div className={`fc-radio ${data.frequence === 'annuel' ? 'on' : ''}`} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 6 — Documents ══ */}
                    {currentStepId === 'documents' && (
                        <div className="sous-step">
                            {renderStepHeader()}
                            
                            <div className="sous-form-grid">

                                {/* Pièce d'identité Recto */}
                                <div className="sous-field doc-upload-field">
                                    <label className="sous-label">Pièce d'identité — Recto *</label>
                                    <label className={`doc-upload-btn ${errors.pieceIdentiteRecto ? 'error' : ''} ${data.pieceIdentiteRecto ? 'uploaded' : ''}`}>
                                        <input 
                                            type="file" 
                                            accept="image/*,.pdf"
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    set('pieceIdentiteFile', file);
                                                    set('pieceIdentiteRecto', file.name);
                                                }
                                            }} 
                                        />
                                        <div className="doc-upload-inner">
                                            {data.pieceIdentiteRecto ? (
                                                <>
                                                    <div className="doc-upload-icon doc-upload-icon--done">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                    </div>
                                                    <div className="doc-upload-text">
                                                        <span className="doc-upload-title" style={{color:'#10B981'}}>Fichier chargé ✓</span>
                                                        <span className="doc-upload-sub">{data.pieceIdentiteRecto}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="doc-upload-icon">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="14" rx="2"/><line x1="7" y1="9" x2="9" y2="9"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="15" x2="13" y2="15"/></svg>
                                                    </div>
                                                    <div className="doc-upload-text">
                                                        <span className="doc-upload-title">Charger le Recto</span>
                                                        <span className="doc-upload-sub">JPG, PNG ou PDF</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                    {errors.pieceIdentiteRecto && <div className="field-error">{errors.pieceIdentiteRecto}</div>}
                                </div>

                                {/* Pièce d'identité Verso */}
                                <div className="sous-field doc-upload-field">
                                    <label className="sous-label">Pièce d'identité — Verso *</label>
                                    <label className={`doc-upload-btn ${errors.pieceIdentiteVerso ? 'error' : ''} ${data.pieceIdentiteVerso ? 'uploaded' : ''}`}>
                                        <input 
                                            type="file" 
                                            accept="image/*,.pdf"
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    set('pieceIdentiteVersoFile', file);
                                                    set('pieceIdentiteVerso', file.name);
                                                }
                                            }} 
                                        />
                                        <div className="doc-upload-inner">
                                            {data.pieceIdentiteVerso ? (
                                                <>
                                                    <div className="doc-upload-icon doc-upload-icon--done">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                    </div>
                                                    <div className="doc-upload-text">
                                                        <span className="doc-upload-title" style={{color:'#10B981'}}>Fichier chargé ✓</span>
                                                        <span className="doc-upload-sub">{data.pieceIdentiteVerso}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="doc-upload-icon">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="14" rx="2"/><line x1="7" y1="9" x2="9" y2="9"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="15" x2="13" y2="15"/></svg>
                                                    </div>
                                                    <div className="doc-upload-text">
                                                        <span className="doc-upload-title">Charger le Verso</span>
                                                        <span className="doc-upload-sub">JPG, PNG ou PDF</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                    {errors.pieceIdentiteVerso && <div className="field-error">{errors.pieceIdentiteVerso}</div>}
                                </div>

                                {/* Justificatif de domicile */}
                                <div className="sous-field sous-field-full doc-upload-field">
                                    <label className="sous-label">Justificatif de domicile (de moins de 3 mois) *</label>
                                    <label className={`doc-upload-btn ${errors.justificatifDomicile ? 'error' : ''} ${data.justificatifDomicile ? 'uploaded' : ''}`}>
                                        <input 
                                            type="file" 
                                            accept="image/*,.pdf"
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    set('justificatifDomicileFile', file);
                                                    set('justificatifDomicile', file.name);
                                                }
                                            }} 
                                        />
                                        <div className="doc-upload-inner">
                                            {data.justificatifDomicile ? (
                                                <>
                                                    <div className="doc-upload-icon doc-upload-icon--done">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                    </div>
                                                    <div className="doc-upload-text">
                                                        <span className="doc-upload-title" style={{color:'#10B981'}}>Fichier chargé ✓</span>
                                                        <span className="doc-upload-sub">{data.justificatifDomicile}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="doc-upload-icon">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                    </div>
                                                    <div className="doc-upload-text">
                                                        <span className="doc-upload-title">Charger le justificatif</span>
                                                        <span className="doc-upload-sub">Facture EDF, quittance de loyer... JPG, PNG ou PDF</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                    {errors.justificatifDomicile && <div className="field-error">{errors.justificatifDomicile}</div>}
                                </div>

                            </div>

                            <div className="domi-info-card is-info">
                                <span className="dic-icon">🔒</span>
                                <div>
                                    <div className="dic-title">Pourquoi ces documents ?</div>
                                    <div className="dic-text">
                                        La loi oblige tout domiciliataire à vérifier l’identité et l’adresse du dirigeant
                                        (Code de commerce et lutte anti-blanchiment). Le Kbis et les statuts pourront être
                                        ajoutés plus tard depuis votre espace client.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 7 — Récapitulatif ══ */}
                    {currentStepId === 'recapitulatif' && (
                        <div className="sous-step">
                            {renderStepHeader()}

                            <div className="recap-grid">
                                <div className="recap-card">
                                    <h3>Choix du projet <button type="button" className="rc-edit" onClick={() => goToStep('projet')}>Modifier</button></h3>
                                    <div className="rc-row"><span>Type</span><strong>{TYPES_PROJET.find(t => t.id === data.typeProjet)?.label || '—'}</strong></div>
                                    <div className="rc-row"><span>Forme juridique</span><strong>{data.formeJuridique || '—'}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <h3>Coordonnées <button type="button" className="rc-edit" onClick={() => goToStep('coordonnees')}>Modifier</button></h3>
                                    <div className="rc-row"><span>Nom</span><strong>{data.prenom} {data.nom}</strong></div>
                                    <div className="rc-row"><span>Email</span><strong>{data.email}</strong></div>
                                    <div className="rc-row"><span>Téléphone</span><strong>{data.telephone}</strong></div>
                                    <div className="rc-row"><span>Adresse perso.</span><strong>{data.adresse}{data.complement ? `, ${data.complement}` : ''} {data.codePostal} {data.villePerso}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <h3>Entreprise <button type="button" className="rc-edit" onClick={() => goToStep('entreprise')}>Modifier</button></h3>
                                    <div className="rc-row"><span>Nom</span><strong>{data.nomSociete || '—'}</strong></div>
                                    <div className="rc-row"><span>SIREN</span><strong>{data.siren || '—'}</strong></div>
                                    <div className="rc-row"><span>Activité</span><strong>{data.activite || '—'}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <h3>Formule <button type="button" className="rc-edit" onClick={() => goToStep('courrier')}>Modifier</button></h3>
                                    <div className="rc-row"><span>Adresse</span><strong>{data.ville}</strong></div>
                                    <div className="rc-row"><span>Formule</span><strong>{OFFRES_COURRIER.find(o => o.id === data.offre)?.label}</strong></div>
                                    <div className="rc-row"><span>Fréquence</span><strong>{data.frequence === 'annuel' ? 'Annuelle' : 'Mensuelle'}</strong></div>
                                </div>
                            </div>

                            <div className="recap-total" style={{ flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <div className="rt-label" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>Total HT</div>
                                    <div className="rt-value" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>{prixTotal()}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <div className="rt-label" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>TVA (20%)</div>
                                    <div className="rt-value" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>{money(getTTC() - getHT())}{perPeriod}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                                    <div className="rt-label">Total TTC</div>
                                    <div className="rt-value">{prixTotalTTC()}</div>
                                </div>
                            </div>

                            <label className="cgv-field">
                                <input type="checkbox" checked={data.cgv} onChange={e => set('cgv', e.target.checked)} />
                                <span>J'accepte les <Link to="/cgv" target="_blank" rel="noopener noreferrer" className="cgv-link">Conditions générales de vente</Link> et la <Link to="/confidentialite" target="_blank" rel="noopener noreferrer" className="cgv-link">politique de confidentialité</Link></span>
                            </label>

                            <p className="sous-commitment-note">
                                {data.frequence === 'annuel'
                                    ? 'Paiement annuel non remboursable en cas de résiliation anticipée.'
                                    : 'Engagement de 3 mois, puis résiliation avec un préavis d’un mois.'}
                            </p>

                            <div style={{ marginTop: '2.5rem' }}>
                                <button
                                    className="sous-pay-btn"
                                    disabled={!data.cgv || loading}
                                    onClick={async () => {
                                        setPayError('');
                                        // Filet de sécurité : jamais de dossier créé sans les 3 justificatifs.
                                        const docErrors = missingDocumentErrors(data);
                                        if (Object.keys(docErrors).length > 0) {
                                            goToStep('documents');
                                            setErrors(docErrors);
                                            return;
                                        }
                                        setLoading(true);
                                        try {
                                            const uploadDocument = async (file, label) => {
                                                try {
                                                    let fileToUpload = file;
                                                    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                                                        // Chargé à la demande : le lecteur PDF pèse ~1,5 Mo, inutile pour une photo.
                                                        const { convertPdfToPng } = await import('../../utils/pdfConverter');
                                                        fileToUpload = await convertPdfToPng(file);
                                                    }
                                                    const res = await uploadFile(fileToUpload, { folder: 'demandes' });
                                                    if (!res?.secure_url) throw new Error('réponse sans URL');
                                                    return res.secure_url;
                                                } catch (err) {
                                                    console.error(`Téléversement ${label} :`, err);
                                                    throw new Error(`Le téléversement de votre ${label} a échoué. Vérifiez votre connexion puis réessayez.`);
                                                }
                                            };
                                            let pieceUrl;
                                            let pieceVersoUrl;
                                            let justificatifUrl;
                                            try {
                                                pieceUrl = await uploadDocument(data.pieceIdentiteFile, REQUIRED_DOCUMENTS[0].label);
                                                pieceVersoUrl = await uploadDocument(data.pieceIdentiteVersoFile, REQUIRED_DOCUMENTS[1].label);
                                                justificatifUrl = await uploadDocument(data.justificatifDomicileFile, REQUIRED_DOCUMENTS[2].label);
                                            } catch (uploadErr) {
                                                // Aucun dossier créé, aucun paiement lancé : le client réessaie.
                                                setPayError(uploadErr.message);
                                                return;
                                            }

                                            const adressePerso = `${data.adresse}${data.complement ? `, ${data.complement}` : ''}${data.codePostal ? `, ${data.codePostal}` : ''}${data.villePerso ? ` ${data.villePerso}` : ''}${data.pays ? ` - ${data.pays}` : ''}`.replace(/\s+/g, ' ').trim();
                                            const finalData = {
                                                ...data,
                                                pieceIdentiteUrl: pieceUrl,
                                                pieceIdentiteVersoUrl: pieceVersoUrl,
                                                justificatifDomicileUrl: justificatifUrl,
                                                adressePerso,
                                                adresseComplete: adressePerso,
                                                date: new Date().toLocaleDateString('fr-FR')
                                            };
                                            delete finalData.pieceIdentiteFile;
                                            delete finalData.pieceIdentiteVersoFile;
                                            delete finalData.justificatifDomicileFile;

                                            const demande = await adminDataService.addDemande({
                                                clientName: `${data.prenom} ${data.nom} - 📞 ${data.telephone}`,
                                                email: data.email,
                                                company: data.nomSociete || 'En cours de création',
                                                city: data.ville,
                                                plan: currentPlanName,
                                                amount: getTTC().toFixed(2),
                                                extra_info: finalData
                                            });

                                            // Stocker l'ID pour confirmation au retour de Stripe
                                            localStorage.setItem('pending_demande_id', demande.id);

                                            let productName = `Forfait ${currentPlanName} - ${data.ville} (${data.frequence})`;

                                            // Stocker les infos pour Email sur la page de succès
                                            localStorage.setItem('pending_emailjs', data.email);
                                            localStorage.setItem('pending_namejs', `${data.prenom} ${data.nom}`);

                                            // Ne pas effacer le localStorage ici pour permettre le retour en arrière
                                            // localStorage.removeItem(STORAGE_KEY);
                                            // localStorage.removeItem(STORAGE_STEP_KEY);

                                            const actualPlanId = data.offre === 'scan' ? 'scan-plus' : (data.offre === 'reexpedition' ? 'physique' : 'essentiel');
                                            await handleCheckout(
                                                actualPlanId,
                                                getTTC(),
                                                productName,
                                                data.frequence,
                                                null,
                                                `${window.location.origin}/souscription`,
                                                data.email,
                                                `${data.prenom} ${data.nom}`,
                                                { demande_id: demande.id }
                                            );
                                        } catch (err) {
                                            // Dossier non créé ou paiement non lancé : le client doit le savoir et pouvoir réessayer.
                                            console.error('Paiement :', err);
                                            setPayError(`${err?.message || 'Une erreur est survenue.'} Si le problème continue, contactez-nous au 09 60 39 69 07.`);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                >
                                    {loading ? 'Envoi de vos documents et redirection vers le paiement…' : (!data.cgv ? 'Acceptez les CGV pour continuer' : `Payer ${prixTotalTTC()} de façon sécurisée ->`)}
                                </button>
                                {payError && <p className="field-error" role="alert" style={{ textAlign: 'center', marginTop: '0.75rem' }}>{payError}</p>}
                                <div className="stripe-badge" style={{ justifyContent: 'center', marginTop: '1rem', borderTop: 'none' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                    <span>Paiement sécurisé via Stripe · SSL 256-bit</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Navigation ── */}
                    <div className={`sous-nav-buttons ${step === CURRENT_STEPS.length - 1 ? 'is-last' : ''}`}>
                        {step > 0 && (
                            <button type="button" className="sous-btn-prev" onClick={prev}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 5l-7 7 7 7" />
                                </svg>
                                Précédent
                            </button>
                        )}
                        {step < CURRENT_STEPS.length - 1 && (
                            <div className="sous-nav-next-wrap">
                                {nextStepLabel && <span className="sous-next-hint">Ensuite : {nextStepLabel}</span>}
                                <button type="button" className="sous-btn-next" onClick={next}>
                                    Suivant
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {coachOpen && (
                <div className="sous-coach-overlay" role="presentation" onClick={() => setCoachOpen(false)}>
                    <div
                        className="sous-coach"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sous-coach-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="sous-coach-kicker">{PHASE_COACH[currentPhase]?.kicker}</p>
                        <h3 id="sous-coach-title">{PHASE_COACH[currentPhase]?.title}</h3>
                        <p className="sous-coach-body">{PHASE_COACH[currentPhase]?.body}</p>
                        <div className="sous-coach-next">
                            <span>À faire maintenant</span>
                            <strong>{currentMeta.label}</strong>
                            {nextStepLabel && <em>Ensuite : {nextStepLabel}</em>}
                            {!nextStepLabel && <em>Ensuite : votre attestation, juste après le paiement</em>}
                        </div>
                        <button type="button" className="sous-coach-btn" onClick={() => setCoachOpen(false)}>
                            C'est compris
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
