const fs = require('fs');

const path = 'src/pages/Admin/components/DossierClient.jsx';
let content = fs.readFileSync(path, 'utf8');

const saveDetailsFn = `
    const handleSaveDetails = async () => {
        setIsSavingDetails(true);
        try {
            await adminDataService.updateClientExtraInfo(client.id, editFormData);
            // On met à jour l'état local du client si on Update ne refresh pas tout
            // mais onUpdate devrait relancer le fetch.
            onUpdate();
            setIsEditingDetails(false);
            showAlert("Informations mises à jour avec succès.");
        } catch (e) {
            console.error(e);
            showAlert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSavingDetails(false);
        }
    };
`;

// Insérer la fonction avant 'const renderTabContent = () => {'
content = content.replace('const renderTabContent = () => {', saveDetailsFn + '\n    const renderTabContent = () => {');

// Remplacer le contenu du case 'details':
const caseDetailsRegex = /case 'details':[\s\S]*?(?=\n\s*\}\n\s*\};\n\s*return \(\n\s*<div className="dossier-animate">)/;
const newCaseDetails = `case 'details':
            default:
                return (
                    <>
                        <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Fiche Client Détaillée</h2>
                            {extra && (
                                <div>
                                    {!isEditingDetails ? (
                                        <button 
                                            onClick={() => { setEditFormData(extra || {}); setIsEditingDetails(true); }}
                                            style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                        >
                                            ✏️ Modifier les infos
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => setIsEditingDetails(false)}
                                                style={{ padding: '6px 12px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                            >
                                                Annuler
                                            </button>
                                            <button 
                                                onClick={handleSaveDetails}
                                                disabled={isSavingDetails}
                                                style={{ padding: '6px 12px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                            >
                                                {isSavingDetails ? 'Sauvegarde...' : '💾 Sauvegarder'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="card-body" style={{ padding: '0 24px 24px 24px' }}>
                            {extra ? (
                                <>
                                    {/* Section Dirigeant */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>👤 Coordonnées du Dirigeant</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                        {[
                                            { key: 'nom', label: 'Nom' },
                                            { key: 'prenom', label: 'Prénom' },
                                            { key: 'email', label: 'Email' },
                                            { key: 'telephone', label: 'Téléphone' },
                                            { key: 'dateNaissance', label: 'Date Naissance' },
                                            { key: 'lieuNaissance', label: 'Lieu Naissance' },
                                            { key: 'nationalite', label: 'Nationalité' },
                                            { key: 'qualite', label: 'Qualité' },
                                            { key: 'adressePerso', label: 'Adresse Personnelle', fullWidth: true }
                                        ].map(field => (
                                            <div key={field.key} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', gridColumn: field.fullWidth ? '1 / -1' : 'auto' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>{field.label}</div>
                                                {isEditingDetails ? (
                                                    <input 
                                                        type="text" 
                                                        value={editFormData[field.key] || ''} 
                                                        onChange={e => setEditFormData({...editFormData, [field.key]: e.target.value})}
                                                        style={{ width: '100%', padding: '6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                    />
                                                ) : (
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', wordBreak: 'break-word' }}>{extra[field.key] || 'N/A'}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Section Entreprise */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>🏢 Informations Entreprise</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                        {[
                                            { key: 'nomSociete', label: 'Nom Société' },
                                            { key: 'siren', label: 'SIREN / SIRET' },
                                            { key: 'formeJuridique', label: 'Forme Juridique' },
                                            { key: 'typeProjet', label: 'Type Projet', isSelect: true, options: [{v:'creation', l:'Création'}, {v:'transfert', l:'Transfert'}, {v:'domiciliation', l:'Domiciliation'}] },
                                            { key: 'activite', label: 'Activité', fullWidth: true }
                                        ].map(field => (
                                            <div key={field.key} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', gridColumn: field.fullWidth ? '1 / -1' : 'auto' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>{field.label}</div>
                                                {isEditingDetails ? (
                                                    field.isSelect ? (
                                                        <select
                                                            value={editFormData[field.key] || ''}
                                                            onChange={e => setEditFormData({...editFormData, [field.key]: e.target.value})}
                                                            style={{ width: '100%', padding: '6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                        >
                                                            <option value="">Sélectionner</option>
                                                            {field.options.map(opt => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={editFormData[field.key] || ''} 
                                                            onChange={e => setEditFormData({...editFormData, [field.key]: e.target.value})}
                                                            style={{ width: '100%', padding: '6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                        />
                                                    )
                                                ) : (
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', wordBreak: 'break-word' }}>
                                                        {field.isSelect ? (field.options.find(o => o.v === extra[field.key])?.l || extra[field.key] || 'N/A') : (extra[field.key] || 'N/A')}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Section Domiciliation */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>⚙️ Domiciliation & Forfait</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Adresse choisie</div>
                                            {isEditingDetails ? (
                                                <input type="text" value={editFormData.ville || ''} onChange={e => setEditFormData({...editFormData, ville: e.target.value})} style={{ width: '100%', padding: '6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                            ) : (
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.ville || 'Toulouse'}</div>
                                            )}
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Offre Courrier</div>
                                            {isEditingDetails ? (
                                                <select value={editFormData.offre || ''} onChange={e => setEditFormData({...editFormData, offre: e.target.value})} style={{ width: '100%', padding: '6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                                                    <option value="scan">Scan numérique</option>
                                                    <option value="reexpedition">Physique (+38€)</option>
                                                    <option value="notification">Notification</option>
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>
                                                    {extra.offre === 'scan' ? 'Scan numérique' : (extra.offre === 'reexpedition' ? 'Physique (+38€)' : 'Notification')}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Fréquence</div>
                                            {isEditingDetails ? (
                                                <select value={editFormData.frequence || ''} onChange={e => setEditFormData({...editFormData, frequence: e.target.value})} style={{ width: '100%', padding: '6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                                                    <option value="annuel">Annuelle</option>
                                                    <option value="mensuel">Mensuelle</option>
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.frequence === 'annuel' ? 'Annuelle (2 mois off.)' : 'Mensuelle'}</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>
                                    <p>Aucune information détaillée d'inscription disponible pour ce client.</p>
                                    {!isEditingDetails && (
                                        <button 
                                            onClick={() => { setEditFormData({}); setIsEditingDetails(true); }}
                                            style={{ marginTop: '10px', padding: '6px 12px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                        >
                                            ➕ Ajouter des informations
                                        </button>
                                    )}
                                    {isEditingDetails && (
                                        <div style={{ marginTop: '20px', textAlign: 'left' }}>
                                            <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Nouveau profil</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <input placeholder="Prénom" value={editFormData.prenom || ''} onChange={e => setEditFormData({...editFormData, prenom: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                                <input placeholder="Nom" value={editFormData.nom || ''} onChange={e => setEditFormData({...editFormData, nom: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                                <input placeholder="Téléphone" value={editFormData.telephone || ''} onChange={e => setEditFormData({...editFormData, telephone: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                                <input placeholder="SIRET" value={editFormData.siret || ''} onChange={e => setEditFormData({...editFormData, siret: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                    <button onClick={() => setIsEditingDetails(false)} style={{ padding: '8px 16px' }}>Annuler</button>
                                                    <button onClick={handleSaveDetails} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}>{isSavingDetails ? 'Sauvegarde...' : 'Sauvegarder'}</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>`;

content = content.replace(caseDetailsRegex, newCaseDetails);
fs.writeFileSync(path, content);
console.log('Done replacement');
