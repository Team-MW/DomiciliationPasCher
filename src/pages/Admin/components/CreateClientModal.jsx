import React, { useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function CreateClientModal({ onClose, onCreated }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        city: 'Paris',
        plan: 'Essentiel'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await adminDataService.addClient(formData);
            onCreated();
        } catch (err) {
            alert('Erreur lors de la création');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal">
                <div className="modal-header">
                    <h2>Créer un nouveau profil client</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nom du gérant</label>
                            <input
                                type="text" required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="ex: Jean Dupont"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email personnel / Pro</label>
                            <input
                                type="email" required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="client@email.com"
                            />
                        </div>
                        <div className="form-group full">
                            <label>Nom de la société</label>
                            <input
                                type="text" required
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                placeholder="DPC SARL"
                            />
                        </div>
                        <div className="form-group">
                            <label>Ville de domiciliation</label>
                            <select
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                            >
                                <option value="Paris">Paris</option>
                                <option value="Lyon">Lyon</option>
                                <option value="Marseille">Marseille</option>
                                <option value="Lille">Lille</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Formule choisie</label>
                            <select
                                value={formData.plan}
                                onChange={e => setFormData({ ...formData, plan: e.target.value })}
                            >
                                <option value="Essentiel">Essentiel (23€)</option>
                                <option value="Scan+">Scan+ (28€)</option>
                                <option value="Physique+">Physique+ (53€)</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ padding: '0 24px 16px', fontSize: '13px', color: '#64748B' }}>
                        *Le client recevra son accès et devra se créer un compte avec cet e-mail sur la page /espace-client pour lier son compte Clerk.
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Création...' : 'Créer le profil'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
