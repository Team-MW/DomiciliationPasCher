import React, { useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';

export default function CreateClientModal({ onClose, onCreated, showAlert }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        city: 'Toulouse',
        plan: 'Essentiel',
        prenom: '',
        nom: '',
        telephone: '',
        adresse: '',
        siret: '',
        activite: '',
        dateNaissance: '',
        lieuNaissance: '',
        nationalite: '',
        qualite: '',
        formeJuridique: '',
        typeProjet: 'creation'
    });
    
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            setProgress('Création du profil client...');
            // Préparer les extra_info
            const clientData = {
                ...formData,
                extra_info: {
                    prenom: formData.prenom,
                    nom: formData.nom,
                    email: formData.email,
                    telephone: formData.telephone,
                    adressePerso: formData.adresse,
                    siren: formData.siret,
                    nomSociete: formData.company,
                    activite: formData.activite,
                    dateNaissance: formData.dateNaissance,
                    lieuNaissance: formData.lieuNaissance,
                    nationalite: formData.nationalite,
                    qualite: formData.qualite,
                    formeJuridique: formData.formeJuridique,
                    typeProjet: formData.typeProjet
                }
            };
            
            // 1. Ajouter le client en base
            await adminDataService.addClient(clientData);

            onCreated();
        } catch (err) {
            console.error("Erreur de création:", err);
            const errorMessage = err.message || err;
            if (errorMessage.includes("Duplicate entry") && errorMessage.includes("clients.email")) {
                await showAlert("Erreur : Cette adresse email est déjà utilisée par un autre client. Veuillez utiliser une adresse email différente.");
            } else {
                await showAlert(`Erreur lors de la création : ${errorMessage}`);
            }
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="admin-modal-overlay" style={{ zIndex: 1000, overflowY: 'auto', alignItems: 'flex-start' }}>
            <div className="admin-modal" style={{ maxWidth: '800px', margin: '40px auto' }}>
                <div className="modal-header">
                    <h2>Créer un dossier client complet</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    
                    <h3 style={{ fontSize: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>
                        1. Informations de base
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nom du profil (Affichage)</label>
                            <input
                                type="text" required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="ex: Jean Dupont"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email de connexion</label>
                            <input
                                type="email" required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="client@email.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Ville de domiciliation</label>
                            <select
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                            >
                                <option value="Toulouse">Toulouse (31)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Formule choisie</label>
                            <select
                                value={formData.plan}
                                onChange={e => setFormData({ ...formData, plan: e.target.value })}
                            >
                                <option value="Essentiel">Essentiel (20€ HT / 24€ TTC)</option>
                                <option value="Scan+">Scan+ (24€ HT / 28.80€ TTC)</option>
                                <option value="Physique+">Physique+ (38€ HT / 45.60€ TTC)</option>
                            </select>
                        </div>
                    </div>

                    <h3 style={{ fontSize: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: '24px', marginBottom: '16px', color: '#1e293b' }}>
                        2. Identité du gérant
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Prénom</label>
                            <input
                                type="text"
                                value={formData.prenom}
                                onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                                placeholder="Jean"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nom</label>
                            <input
                                type="text"
                                value={formData.nom}
                                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                                placeholder="Dupont"
                            />
                        </div>
                        <div className="form-group">
                            <label>Téléphone</label>
                            <input
                                type="tel"
                                value={formData.telephone}
                                onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                                placeholder="06 12 34 56 78"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date de Naissance</label>
                            <input
                                type="text"
                                value={formData.dateNaissance}
                                onChange={e => setFormData({ ...formData, dateNaissance: e.target.value })}
                                placeholder="01/01/1990"
                            />
                        </div>
                        <div className="form-group">
                            <label>Lieu de Naissance</label>
                            <input
                                type="text"
                                value={formData.lieuNaissance}
                                onChange={e => setFormData({ ...formData, lieuNaissance: e.target.value })}
                                placeholder="Paris"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nationalité</label>
                            <input
                                type="text"
                                value={formData.nationalite}
                                onChange={e => setFormData({ ...formData, nationalite: e.target.value })}
                                placeholder="Française"
                            />
                        </div>
                        <div className="form-group">
                            <label>Qualité (Titre)</label>
                            <input
                                type="text"
                                value={formData.qualite}
                                onChange={e => setFormData({ ...formData, qualite: e.target.value })}
                                placeholder="Gérant"
                            />
                        </div>
                        <div className="form-group full">
                            <label>Adresse personnelle</label>
                            <input
                                type="text"
                                value={formData.adresse}
                                onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                                placeholder="12 rue de la Paix, 75000 Paris"
                            />
                        </div>
                    </div>

                    <h3 style={{ fontSize: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: '24px', marginBottom: '16px', color: '#1e293b' }}>
                        3. Informations de l'entreprise
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nom de la société</label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                placeholder="DPC SARL"
                            />
                        </div>
                        <div className="form-group">
                            <label>SIRET / SIREN</label>
                            <input
                                type="text"
                                value={formData.siret}
                                onChange={e => setFormData({ ...formData, siret: e.target.value })}
                                placeholder="123 456 789 00012"
                            />
                        </div>
                        <div className="form-group">
                            <label>Forme Juridique</label>
                            <input
                                type="text"
                                value={formData.formeJuridique}
                                onChange={e => setFormData({ ...formData, formeJuridique: e.target.value })}
                                placeholder="SAS, SARL..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Type de Projet</label>
                            <select
                                value={formData.typeProjet}
                                onChange={e => setFormData({ ...formData, typeProjet: e.target.value })}
                            >
                                <option value="creation">Création</option>
                                <option value="transfert">Transfert</option>
                                <option value="domiciliation">Domiciliation simple</option>
                            </select>
                        </div>
                        <div className="form-group full">
                            <label>Activité de l'entreprise</label>
                            <input
                                type="text"
                                value={formData.activite}
                                onChange={e => setFormData({ ...formData, activite: e.target.value })}
                                placeholder="Vente de matériel informatique..."
                            />
                        </div>
                    </div>



                    {progress && (
                        <div style={{ marginTop: '16px', padding: '10px', background: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                            ⏳ {progress}
                        </div>
                    )}

                    <div style={{ padding: '16px 0 0', fontSize: '12px', color: '#64748B' }}>
                        *Le client recevra son accès et devra se créer un compte avec cet e-mail sur la page /espace-client pour lier son compte.
                    </div>
                    
                    <div className="modal-footer" style={{ marginTop: '24px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Annuler</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Création en cours...' : 'Créer le dossier complet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
