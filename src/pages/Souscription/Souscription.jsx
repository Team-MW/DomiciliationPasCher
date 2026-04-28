import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { handleCheckout } from '../../utils/stripe';
import { adminDataService } from '../../services/adminDataService';
import './Souscription.css';

/* ─── Config des étapes ─── */
const STEPS = [
    { id: 'projet', label: 'Choix du projet' },
    { id: 'coordonnees', label: 'Coordonnées' },
    { id: 'entreprise', label: 'Votre entreprise' },
    { id: 'domiciliation', label: 'Domiciliation' },
    { id: 'courrier', label: 'Offre courrier' },
    { id: 'frequence', label: 'Fréquence' },
    { id: 'recapitulatif', label: 'Récapitulatif & Paiement' },
];

const VILLES = ['Toulouse (31)'];
const FORMES_JURIDIQUES = ['SASU', 'SAS', 'SARL', 'EURL', 'SCI', 'Auto-entrepreneur / EI', 'Association', 'Autre'];
const TYPES_PROJET = [
    { id: 'creation', icon: '🚀', label: "Création d'entreprise", desc: "Je crée ma société et je cherche une adresse de siège social" },
    { id: 'transfert', icon: '🔄', label: 'Transfert de siège', desc: "Je transfère l'adresse de ma société existante" },
    { id: 'domiciliation', icon: '📍', label: 'Domiciliation seule', desc: "J'ai déjà une société et je veux juste une adresse" },
];
const OFFRES_COURRIER = [
    { id: 'notification', icon: '🔔', label: 'Notification email', price: 'Inclus', desc: "Recevez un email dès qu'un courrier arrive" },
    { id: 'scan', icon: '📄', label: 'Scan numérique', price: '+4€ HT/mois', desc: 'Vos courriers scannés et disponibles en ligne' },
    { id: 'reexpedition', icon: '📦', label: 'Réexpédition physique', price: '+18€ HT/mois', desc: 'Votre courrier vous est envoyé chaque mois' },
];
const PLANS = {
    essentiel: { name: 'Essentiel', price: '20' },
    'scan-plus': { name: 'Scan+', price: '24' },
    physique: { name: 'Physique+', price: '38' },
};

export default function Souscription() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('plan') || 'essentiel';
    const plan = PLANS[planId] || PLANS.essentiel;

    const [step, setStep] = useState(0);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const [data, setData] = useState({
        typeProjet: '',
        formeJuridique: '',
        // Coordonnées
        nom: '', prenom: '', email: '', telephone: '',
        dateNaissance: '', lieuNaissance: '',
        // Entreprise
        nomSociete: '', siren: '', activite: '', nationalite: 'Française',
        // Domiciliation
        ville: '',
        // Courrier
        offre: planId === 'scan-plus' ? 'scan' : (planId === 'physique' ? 'reexpedition' : 'notification'),
        // Fréquence
        frequence: 'mensuel',
        // CGV
        cgv: false,
    });

    const set = (key, val) => setData(d => ({ ...d, [key]: val }));

    /* Validation par étape */
    const validate = () => {
        const e = {};
        if (step === 0) {
            if (!data.typeProjet) e.typeProjet = 'Veuillez choisir un type de projet';
            if (!data.formeJuridique) e.formeJuridique = 'Veuillez choisir une forme juridique';
        }
        if (step === 1) {
            if (!data.nom.trim()) e.nom = 'Requis';
            if (!data.prenom.trim()) e.prenom = 'Requis';
            if (!data.email.trim() || !/\S+@\S+\.\S+/.test(data.email)) e.email = 'Email invalide';
            if (!data.telephone.trim()) e.telephone = 'Requis';
        }
        if (step === 2) {
            if (!data.nomSociete.trim() && data.typeProjet !== 'creation') e.nomSociete = 'Requis';
            if (!data.activite.trim()) e.activite = 'Requis';
        }
        if (step === 3) {
            if (!data.ville) e.ville = 'Veuillez choisir une ville';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => { if (validate()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
    const prev = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)); };

    const currentPlanName = data.offre === 'scan' ? 'Scan+' : (data.offre === 'reexpedition' ? 'Physique+' : 'Essentiel');
    const currentPlanPrice = data.offre === 'scan' ? '24' : (data.offre === 'reexpedition' ? '38' : '20');

    const prixTotal = () => {
        let base = parseInt(currentPlanPrice);
        return data.frequence === 'annuel' ? (base * 10).toFixed(0) + '€/an' : base + '€/mois';
    };

    return (
        <div className="souscription-layout">

            {/* ── Sidebar ── */}
            <aside className="sous-sidebar">
                <div className="sous-sidebar-top">
                    <Link to="/tarifs" className="sous-back">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                        Retour
                    </Link>

                    <div className="sous-plan-badge">
                        <span className="spb-label">Forfait choisi</span>
                        <span className="spb-name">{currentPlanName}</span>
                        <span className="spb-price">{currentPlanPrice}€ HT/mois</span>
                    </div>
                </div>

                <nav className="sous-steps-nav">
                    {STEPS.map((s, i) => (
                        <div
                            key={s.id}
                            className={`sous-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
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
                    <div className="sous-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                </div>

                <div className="sous-content">

                    {/* ══ ÉTAPE 0 — Choix du projet ══ */}
                    {step === 0 && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 1 sur {STEPS.length}</div>
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
                    {step === 1 && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 2 sur {STEPS.length}</div>
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
                                        <input className={`sous-input phone-input ${errors.telephone ? 'error' : ''}`} placeholder="06 XX XX XX XX" value={data.telephone} onChange={e => set('telephone', e.target.value)} />
                                    </div>
                                    {errors.telephone && <div className="field-error">{errors.telephone}</div>}
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Date de naissance</label>
                                    <input className="sous-input" type="date" value={data.dateNaissance} onChange={e => set('dateNaissance', e.target.value)} />
                                </div>
                                <div className="sous-field">
                                    <label className="sous-label">Lieu de naissance</label>
                                    <input className="sous-input" placeholder="Ville, Pays" value={data.lieuNaissance} onChange={e => set('lieuNaissance', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 2 — Votre entreprise ══ */}
                    {step === 2 && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 3 sur {STEPS.length}</div>
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
                                    <label className="sous-label">Nationalité du dirigeant</label>
                                    <select className="sous-input" value={data.nationalite} onChange={e => set('nationalite', e.target.value)}>
                                        <option>Française</option>
                                        <option>Autre (UE)</option>
                                        <option>Hors UE</option>
                                    </select>
                                </div>

                                <div className="sous-field">
                                    <label className="sous-label">Forme juridique</label>
                                    <input className="sous-input" value={data.formeJuridique} readOnly style={{ opacity: 0.7 }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ÉTAPE 3 — Domiciliation ══ */}
                    {step === 3 && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 4 sur {STEPS.length}</div>
                                <h2>Choisissez votre ville</h2>
                                <p>Sélectionnez la ville où vous souhaitez domicilier votre entreprise</p>
                            </div>

                            <div className="villes-grid">
                                {VILLES.map(v => (
                                    <button
                                        key={v}
                                        className={`ville-btn ${data.ville === v ? 'selected' : ''}`}
                                        onClick={() => set('ville', v)}
                                    >
                                        <span className="vb-icon">📍</span>
                                        <span>{v}</span>
                                        <div className="vb-check">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                    </button>
                                ))}
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
                    {step === 4 && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 5 sur {STEPS.length}</div>
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
                    {step === 5 && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 6 sur {STEPS.length}</div>
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

                    {/* ══ ÉTAPE 6 — Récapitulatif ══ */}
                    {step === 6 && (
                        <div className="sous-step">
                            <div className="sous-step-header">
                                <div className="sous-step-num">Étape 7 sur {STEPS.length}</div>
                                <h2>Vérifiez votre commande</h2>
                                <p>Relisez vos informations avant de passer au paiement</p>
                            </div>

                            <div className="recap-grid">
                                <div className="recap-card">
                                    <div className="rc-title">📋 Projet</div>
                                    <div className="rc-row"><span>Type</span><strong>{TYPES_PROJET.find(t => t.id === data.typeProjet)?.label || '—'}</strong></div>
                                    <div className="rc-row"><span>Forme juridique</span><strong>{data.formeJuridique || '—'}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <div className="rc-title">👤 Coordonnées</div>
                                    <div className="rc-row"><span>Nom</span><strong>{data.nom} {data.prenom}</strong></div>
                                    <div className="rc-row"><span>Email</span><strong>{data.email}</strong></div>
                                    <div className="rc-row"><span>Téléphone</span><strong>{data.telephone}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <div className="rc-title">🏢 Entreprise</div>
                                    <div className="rc-row"><span>Nom</span><strong>{data.nomSociete || '(En cours de création)'}</strong></div>
                                    {data.siren && <div className="rc-row"><span>SIREN</span><strong>{data.siren}</strong></div>}
                                    <div className="rc-row"><span>Activité</span><strong>{data.activite}</strong></div>
                                </div>

                                <div className="recap-card">
                                    <div className="rc-title">📍 Domiciliation</div>
                                    <div className="rc-row"><span>Ville</span><strong>{data.ville}</strong></div>
                                    <div className="rc-row"><span>Forfait</span><strong>{currentPlanName}</strong></div>
                                    <div className="rc-row"><span>Courrier</span><strong>{OFFRES_COURRIER.find(o => o.id === data.offre)?.label}</strong></div>
                                    <div className="rc-row"><span>Fréquence</span><strong>{data.frequence === 'annuel' ? 'Annuel (2 mois offerts)' : 'Mensuel'}</strong></div>
                                </div>
                            </div>

                            <div className="recap-total">
                                <div className="rt-label">Total</div>
                                <div className="rt-value">{prixTotal()} HT</div>
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
                                            // Enregistrer la demande dans le service admin
                                            // On ajoute le numéro de téléphone pour que l'admin y ait accès dans son pannel
                                            adminDataService.addDemande({
                                                clientName: `${data.prenom} ${data.nom} - 📞 ${data.telephone}`,
                                                email: data.email,
                                                company: data.nomSociete || 'En cours de création',
                                                city: data.ville,
                                                plan: currentPlanName,
                                                amount: parseFloat(prixTotal().split('€')[0]).toFixed(2),
                                                extra_info: data
                                            });

                                            const totalAmount = parseFloat(prixTotal().split('€')[0]);
                                            let productName = `Forfait ${currentPlanName} - ${data.ville} (${data.frequence})`;

                                            // Stocker les infos pour EmailJS sur la page de succès
                                            localStorage.setItem('pending_emailjs', data.email);
                                            localStorage.setItem('pending_namejs', `${data.prenom} ${data.nom}`);

                                            const actualPlanId = data.offre === 'scan' ? 'scan-plus' : (data.offre === 'reexpedition' ? 'physique' : 'essentiel');
                                            await handleCheckout(actualPlanId, totalAmount, productName, data.frequence);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                >
                                    {loading ? 'Redirection vers Stripe en cours...' : (!data.cgv ? 'Acceptez les CGV pour payer' : `Payer ${prixTotal()} HT de façon sécurisée ->`)}
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
                        {step < STEPS.length - 1 && (
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
