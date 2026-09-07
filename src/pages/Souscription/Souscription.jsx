import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { handleCheckout } from '../../utils/stripe';
import { adminDataService } from '../../services/adminDataService';
import { uploadFile } from '../../utils/cloudinary';
import { convertPdfToPng } from '../../utils/pdfConverter';
import './Souscription.css';

/* ─── Config des étapes ─── */
const STEPS = [
    { id: 'projet', label: 'Choix du projet' },
    { id: 'coordonnees', label: 'Coordonnées' },
    { id: 'entreprise', label: 'Votre entreprise' },
    { id: 'domiciliation', label: 'Domiciliation' },
    { id: 'courrier', label: 'Offre courrier' },
    { id: 'frequence', label: 'Fréquence' },
    { id: 'documents', label: 'Documents justificatifs' },
    { id: 'recapitulatif', label: 'Récapitulatif & Paiement' },
];

const VILLES = ['Toulouse (31)'];
const FORMES_JURIDIQUES = ['SASU', 'SAS', 'SARL', 'EURL', 'SCI', 'Auto-entrepreneur / EI', 'Association', 'Autre'];
const TYPES_PROJET = [
    { id: 'transfert', icon: '🔄', label: 'Transfert de siège', desc: "Je transfère l'adresse de ma société existante" },
    { id: 'domiciliation', icon: '📍', label: 'Domiciliation seule', desc: "J'ai déjà une société et je veux juste une adresse" },
];
const OFFRES_COURRIER = [
    { id: 'notification', icon: '📄', label: 'Scan inclus', price: 'Inclus', desc: "Vos courriers scannés et disponibles en ligne" },
    { id: 'scan', icon: '📦', label: 'Scan + Réexpédition', price: '+4€ HT/mois', desc: 'Scan et renvoi de vos courriers à votre adresse' },
    { id: 'reexpedition', icon: '📬', label: 'Boîte physique', price: '+18€ HT/mois', desc: 'Récupérez vos courriers et colis sur place' },
];
const PLANS = {
    essentiel: { name: 'Essentiel', price: '20' },
    'scan-plus': { name: 'Scan+', price: '24' },
    physique: { name: 'Physique+', price: '38' },
};

const STORAGE_KEY = 'dpc_souscription_draft';
const STORAGE_STEP_KEY = 'dpc_souscription_step';

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
    const planId = searchParams.get('plan') || 'essentiel';
    const plan = PLANS[planId] || PLANS.essentiel;

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
        frequence: 'mensuel',
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
                return {
                    ...defaultData,
                    ...parsed,
                    pieceIdentiteFile: null,
                    pieceIdentiteVersoFile: null,
                    justificatifDomicileFile: null
                };
            }
        } catch (e) {}
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
        } catch (e) {}
        return 0;
    });

    const currentStepId = CURRENT_STEPS[step]?.id || 'projet';

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Sauvegarde automatique des données dans localStorage à chaque modification
    useEffect(() => {
        try {
            const toSave = { ...data };
            delete toSave.pieceIdentiteFile;
            delete toSave.pieceIdentiteVersoFile;
            delete toSave.justificatifDomicileFile;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {}
    }, [data]);

    // Sauvegarde de l'étape active
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_STEP_KEY, step.toString());
        } catch (e) {}
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
            if (!data.email.trim() || !/\S+@\S+\.\S+/.test(data.email)) e.email = 'Email invalide';
            if (!data.telephone.trim()) e.telephone = 'Requis';
            if (!data.adresse.trim()) e.adresse = 'Requis';
            if (!data.codePostal.trim()) e.codePostal = 'Requis';
            if (!data.villePerso.trim()) e.villePerso = 'Requis';
            if (!data.pays.trim()) e.pays = 'Requis';
            if (!data.dateNaissance) e.dateNaissance = 'Requis';
            if (!data.lieuNaissance.trim()) e.lieuNaissance = 'Requis';
        }
        if (currentStepId === 'entreprise') {
            if (!data.nomSociete.trim()) e.nomSociete = 'Requis';
            if (!data.activite.trim()) e.activite = 'Requis';
        }
        if (currentStepId === 'domiciliation') {
            if (!data.ville) e.ville = 'Veuillez choisir une ville';
        }
        if (currentStepId === 'documents') {
            if (!data.pieceIdentiteRecto) e.pieceIdentiteRecto = 'Requis';
            if (!data.pieceIdentiteVerso) e.pieceIdentiteVerso = 'Requis';
            if (!data.justificatifDomicile) e.justificatifDomicile = 'Requis';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => { if (validate()) setStep(s => Math.min(s + 1, CURRENT_STEPS.length - 1)); };
    const prev = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)); };

    const handleBackClick = (e) => {
        e.preventDefault();
        if (step > 0) {
            prev();
        } else {
            navigate('/tarifs');
        }
    };

    const currentPlanName = data.offre === 'scan' ? 'Scan+' : (data.offre === 'reexpedition' ? 'Physique+' : 'Essentiel');
    const currentPlanPrice = data.offre === 'scan' ? '24' : (data.offre === 'reexpedition' ? '38' : '20');

    const getHT = () => {
        let base = parseInt(currentPlanPrice);
        return data.frequence === 'annuel' ? base * 10 : base;
    };

    const getTTC = () => getHT() * 1.2;

    const prixTotal = () => data.frequence === 'annuel' ? `${getHT()}€/an` : `${getHT()}€/mois`;
    const prixTotalTTC = () => data.frequence === 'annuel' ? `${getTTC().toFixed(2)}€/an` : `${getTTC().toFixed(2)}€/mois`;

    if (success) {
        return (
            <div className="souscription-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="success-message" style={{ textAlign: 'center', background: 'white', padding: '3rem', borderRadius: '16px', maxWidth: '600px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
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
                        <span className="spb-price">{currentPlanPrice}€ HT/mois</span>
                    </div>
                </div>

                <nav className="sous-steps-nav">
                    {CURRENT_STEPS.map((s, i) => (
                        <div
                            key={s.id}
                            className={`sous-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                            onClick={() => {
                                if (i < step) {
                                    setStep(i);
                                }
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
                </nav>

                <div className="sous-sidebar-footer">
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

                <div className="sous-content">

                    {/* ══ ÉTAPE 0 — Choix du projet ══ */}
                    {currentStepId === 'projet' && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 1 sur {CURRENT_STEPS.length}</div>
                                <h2>Quel est votre projet ?</h2>
                                <p>Sélectionnez la situation qui correspond à votre cas</p>
                            </div>

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
                                <label className="sous-label">Forme juridique souhaitée *</label>
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
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 2 sur {CURRENT_STEPS.length}</div>
                                <h2>Saisissez vos coordonnées</h2>
                                <p>Ces informations figurent sur votre contrat de domiciliation</p>
                            </div>

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
                                    <input className={`sous-input ${errors.email ? 'error' : ''}`} type="email" placeholder="exemple@gmail.com" value={data.email} onChange={e => set('email', e.target.value)} />
                                    {errors.email && <div className="field-error">{errors.email}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Téléphone *</label>
                                    <div className="phone-field">
                                        <span className="phone-flag">🇫🇷 +33</span>
                                        <input 
                                            className={`sous-input phone-input ${errors.telephone ? 'error' : ''}`} 
                                            placeholder="06 XX XX XX XX" 
                                            value={data.telephone} 
                                            maxLength={10}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 10) set('telephone', val);
                                            }} 
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
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 3 sur {CURRENT_STEPS.length}</div>
                                <h2>Votre entreprise</h2>
                                <p>{data.typeProjet === 'creation' ? 'Renseignez les informations de votre future société' : 'Renseignez les informations de votre société existante'}</p>
                            </div>

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
                                        <input className="sous-input" placeholder="123 456 789" maxLength={11} value={data.siren} onChange={e => set('siren', e.target.value)} />
                                        <div className="field-hint">9 chiffres — visible sur votre Kbis</div>
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
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 4 sur {CURRENT_STEPS.length}</div>
                                <h2>Choisissez votre ville</h2>
                                <p>Sélectionnez la ville où vous souhaitez domicilier votre entreprise</p>
                            </div>

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

                            <div className="domi-info-card">
                                <span className="dic-icon">ℹ️</span>
                                <div>
                                    <div className="dic-title">Adresse confidentielle</div>
                                    <div className="dic-text">L'adresse précise vous sera communiquée après signature du contrat. Toutes nos adresses sont dans des quartiers professionnels (centre-ville ou quartier d'affaires).</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 4 — Offre courrier ══ */}
                    {currentStepId === 'courrier' && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 5 sur {CURRENT_STEPS.length}</div>
                                <h2>Gestion de votre courrier</h2>
                                <p>Comment souhaitez-vous gérer votre courrier ?</p>
                            </div>

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
                                                <div className="cc-label">{o.label}</div>
                                                <div className="cc-desc">{o.desc}</div>
                                            </div>
                                        </div>
                                        <div className="cc-right">
                                            <div className="cc-price">{o.price}</div>
                                            <div className={`cc-radio ${data.offre === o.id ? 'on' : ''}`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 5 — Fréquence ══ */}
                    {currentStepId === 'frequence' && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 6 sur {CURRENT_STEPS.length}</div>
                                <h2>Choisissez votre fréquence</h2>
                                <p>Économisez 2 mois avec l'abonnement annuel</p>
                            </div>

                            <div className="freq-options">
                                <button
                                    className={`freq-card ${data.frequence === 'mensuel' ? 'selected' : ''}`}
                                    onClick={() => set('frequence', 'mensuel')}
                                >
                                    <div className="fc-left">
                                        <div className="fc-title">Mensuel</div>
                                        <div className="fc-sub">Résiliable à tout moment</div>
                                    </div>
                                    <div className="fc-right">
                                        <div className="fc-price">{currentPlanPrice}€ <small>HT/mois</small></div>
                                        <div className={`fc-radio ${data.frequence === 'mensuel' ? 'on' : ''}`} />
                                    </div>
                                </button>
                                
                                <button
                                    className={`freq-card ${data.frequence === 'annuel' ? 'selected' : ''}`}
                                    onClick={() => set('frequence', 'annuel')}
                                >
                                    <div className="fc-badge">🎁 2 mois offerts</div>
                                    <div className="fc-left">
                                        <div className="fc-title">Annuel</div>
                                        <div className="fc-sub">Soit {(parseInt(currentPlanPrice) * 10).toFixed(0)}€ HT/an — {currentPlanPrice}€ HT/mois × 10</div>
                                    </div>
                                    <div className="fc-right">
                                        <div className="fc-price">{(parseInt(currentPlanPrice) * 10).toFixed(0)}€ <small>HT/an</small></div>
                                        <div className={`fc-radio ${data.frequence === 'annuel' ? 'on' : ''}`} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 6 — Documents ══ */}
                    {currentStepId === 'documents' && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 7 sur {CURRENT_STEPS.length}</div>
                                <h2>Vos documents justificatifs</h2>
                                <p>Veuillez télécharger les documents nécessaires pour votre dossier</p>
                            </div>
                            
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
                        </div>
                    )}

                    {/* ══ ÉTAPE 7 — Récapitulatif ══ */}
                    {currentStepId === 'recapitulatif' && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape {step + 1} sur {CURRENT_STEPS.length}</div>
                                <h2>Vérifiez votre commande</h2>
                                <p>Relisez vos informations avant de passer au paiement</p>
                            </div>

                            <div className="recap-grid">
                                <div className="recap-card">
                                    <h3>Choix du projet</h3>
                                    <div className="rc-row"><span>Type</span><strong>{TYPES_PROJET.find(t => t.id === data.typeProjet)?.label || '—'}</strong></div>
                                    <div className="rc-row"><span>Forme juridique</span><strong>{data.formeJuridique || '—'}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <h3>Coordonnées</h3>
                                    <div className="rc-row"><span>Nom</span><strong>{data.prenom} {data.nom}</strong></div>
                                    <div className="rc-row"><span>Email</span><strong>{data.email}</strong></div>
                                    <div className="rc-row"><span>Téléphone</span><strong>{data.telephone}</strong></div>
                                    <div className="rc-row"><span>Adresse pers.</span><strong>{data.adresse}{data.complement ? `, ${data.complement}` : ''} {data.codePostal} {data.villePerso}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <h3>Entreprise</h3>
                                    <div className="rc-row"><span>Nom</span><strong>{data.nomSociete || '—'}</strong></div>
                                    <div className="rc-row"><span>SIREN</span><strong>{data.siren || '—'}</strong></div>
                                    <div className="rc-row"><span>Activité</span><strong>{data.activite || '—'}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <h3>Domiciliation & Courrier</h3>
                                    <div className="rc-row"><span>Ville cible</span><strong>{data.ville}</strong></div>
                                    <div className="rc-row"><span>Offre courrier</span><strong>{OFFRES_COURRIER.find(o => o.id === data.offre)?.label}</strong></div>
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
                                    <div className="rt-value" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>{(getHT() * 0.2).toFixed(2)}€{data.frequence === 'annuel' ? '/an' : '/mois'}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                                    <div className="rt-label">Total TTC</div>
                                    <div className="rt-value">{prixTotalTTC()}</div>
                                </div>
                            </div>

                            <label className="cgv-field">
                                <input type="checkbox" checked={data.cgv} onChange={e => set('cgv', e.target.checked)} />
                                <span>J'accepte les <a href="#" className="cgv-link">Conditions Générales de Vente</a> et la politique de confidentialité</span>
                            </label>

                            <div style={{ marginTop: '2.5rem' }}>
                                <button
                                    className="sous-pay-btn"
                                    disabled={!data.cgv || loading}
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            let pieceUrl = '';
                                            let pieceVersoUrl = '';
                                            let justificatifUrl = '';

                                            // Upload files to Cloudinary if they exist
                                            if (data.pieceIdentiteFile) {
                                                try {
                                                    let fileToUpload = data.pieceIdentiteFile;
                                                    if (fileToUpload.type === 'application/pdf' || fileToUpload.name.toLowerCase().endsWith('.pdf')) {
                                                        fileToUpload = await convertPdfToPng(fileToUpload);
                                                    }
                                                    const res = await uploadFile(fileToUpload, { folder: 'demandes' });
                                                    pieceUrl = res.secure_url;
                                                } catch(e) { console.error('Upload pieceIdentite error', e); }
                                            }
                                            if (data.pieceIdentiteVersoFile) {
                                                try {
                                                    let fileToUpload = data.pieceIdentiteVersoFile;
                                                    if (fileToUpload.type === 'application/pdf' || fileToUpload.name.toLowerCase().endsWith('.pdf')) {
                                                        fileToUpload = await convertPdfToPng(fileToUpload);
                                                    }
                                                    const res = await uploadFile(fileToUpload, { folder: 'demandes' });
                                                    pieceVersoUrl = res.secure_url;
                                                } catch(e) { console.error('Upload pieceIdentiteVerso error', e); }
                                            }
                                            if (data.justificatifDomicileFile) {
                                                try {
                                                    let fileToUpload = data.justificatifDomicileFile;
                                                    if (fileToUpload.type === 'application/pdf' || fileToUpload.name.toLowerCase().endsWith('.pdf')) {
                                                        fileToUpload = await convertPdfToPng(fileToUpload);
                                                    }
                                                    const res = await uploadFile(fileToUpload, { folder: 'demandes' });
                                                    justificatifUrl = res.secure_url;
                                                } catch(e) { console.error('Upload justificatif error', e); }
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
                                            localStorage.setItem('pending_email', data.email);
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
                                                null,
                                                data.email,
                                                `${data.prenom} ${data.nom}`,
                                                { demande_id: demande.id }
                                            );
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                >
                                    {loading ? 'Traitement en cours...' : (!data.cgv ? 'Acceptez les CGV pour continuer' : `Payer ${prixTotalTTC()} de façon sécurisée ->`)}
                                </button>
                                <div className="stripe-badge" style={{ justifyContent: 'center', marginTop: '1rem', borderTop: 'none' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                    <span>Paiement sécurisé via Stripe · SSL 256-bit</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Navigation ── */}
                    <div className="sous-nav-buttons">
                        {step > 0 && (
                            <button className="sous-btn-prev" onClick={prev}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 5l-7 7 7 7" />
                                </svg>
                                Précédent
                            </button>
                        )}
                        {step < CURRENT_STEPS.length - 1 && (
                            <button className="sous-btn-next" onClick={next}>
                                Suivant
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
