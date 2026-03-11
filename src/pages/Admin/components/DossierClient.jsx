import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';

export default function DossierClient({ client, onBack, onUpdate }) {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentFolder, setCurrentFolder] = useState(null);

    // Dériver les dossiers depuis la liste des documents
    const folders = Array.from(new Set(documents.map(d => d.folder || 'Documents')));

    useEffect(() => {
        if (client) {
            const fetchDocs = async () => {
                setIsLoading(true);
                const docs = await adminDataService.getDocuments(client.id);
                setDocuments(docs);
                setIsLoading(false);
            };
            fetchDocs();
        }
    }, [client]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await performUpload(file);
    };

    const performUpload = async (file) => {
        setIsLoading(true);
        try {
            const info = await uploadFile(file, {
                folder: `clients/${client.id}/${currentFolder || 'Documents'}`
            });

            await adminDataService.addDocument(client.id, {
                name: file.name || info.original_filename || 'Sans nom',
                size: (file.size / 1024).toFixed(0) + ' KB',
                type: file.type || (info.resource_type + '/' + info.format),
                owner: 'admin',
                folder: currentFolder || 'Documents',
                url: info.secure_url
            });
            const docs = await adminDataService.getDocuments(client.id);
            setDocuments(docs);
        } catch (err) {
            console.error("Error during upload:", err);
            alert("Erreur lors de l'envoi : " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            performUpload(files[0]);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${client.company} ?\n\nCela révoquera instantanément son accès à l'Espace Client.`)) {
            setIsLoading(true);
            try {
                await adminDataService.deleteClient(client.id);
                onUpdate(); // Refresh the list
                onBack(); // Go back to the client list
            } catch (err) {
                console.error("Error deleting client:", err);
                alert("Erreur lors de la suppression du client.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (!client) return null;

    return (
        <div className="dossier-animate">
            <div className="dossier-header">
                <button onClick={onBack} className="btn-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14 }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Retour
                </button>
                <div className="dossier-title">
                    <h1>{client.company}</h1>
                    <span className="badge-status">Compte {client.status}</span>
                </div>
            </div>

            <div className="dossier-grid">
                <div className="content-card">
                    <div className="card-header">
                        <div className="ec-breadcrumb">
                            <button className={`ec-crumb ${!currentFolder ? 'active' : ''}`} onClick={() => setCurrentFolder(null)}>Documents</button>
                            {currentFolder && (
                                <>
                                    <span className="ec-divider">/</span>
                                    <button className="ec-crumb active">{currentFolder}</button>
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="file"
                                id="admin-file-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                disabled={isLoading}
                            />
                            <button className="btn-primary-sm" onClick={() => document.getElementById('admin-file-upload').click()} disabled={isLoading}>
                                {isLoading ? 'Envoi...' : 'Uploader'}
                            </button>
                        </div>
                    </div>
                    <div
                        className="card-body"
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        style={{ minHeight: '200px' }}
                    >
                        {isLoading && documents.length === 0 ? (
                            <div className="empty-state-full"><p>Chargement...</p></div>
                        ) : (
                            <div className="ec-explorer-grid" style={{ padding: '0px', border: 'none', background: 'transparent' }}>
                                {/* SI VIEW ROOT : AFFICHER LES DOSSIERS */}
                                {!currentFolder && (
                                    <>
                                        {folders.map(folder => (
                                            <div key={folder} className="ec-explorer-item folder" onClick={() => setCurrentFolder(folder)}>
                                                <div className="ec-explorer-icon"><Icons.File style={{ color: '#6366F1' }} /></div>
                                                <div className="ec-explorer-name">{folder}</div>
                                                <div className="ec-explorer-count">
                                                    {documents.filter(d => d.folder === folder).length} fichiers
                                                </div>
                                            </div>
                                        ))}
                                        <div className="ec-explorer-item folder new" onClick={() => {
                                            const name = prompt('Nom du nouveau dossier ?');
                                            if (name) setCurrentFolder(name);
                                        }}>
                                            <div className="ec-explorer-icon add">+</div>
                                            <div className="ec-explorer-name">Nouveau dossier</div>
                                        </div>
                                    </>
                                )}

                                {/* SI VIEW FOLDER : AFFICHER LES FICHIERS */}
                                {currentFolder && (
                                    <>
                                        <div className="ec-explorer-item back" onClick={() => setCurrentFolder(null)}>
                                            <div className="ec-explorer-icon">←</div>
                                            <div className="ec-explorer-name">Retour</div>
                                        </div>
                                        {documents.filter(d => d.folder === currentFolder).map(doc => (
                                            <div key={doc.id} className="ec-explorer-item file" onClick={() => doc.url && window.open(doc.url, '_blank')}>
                                                <div className="ec-explorer-icon"><Icons.File /></div>
                                                <div className="ec-explorer-name">{doc.name}</div>
                                                <div className="ec-explorer-meta">
                                                    {doc.size} · {doc.owner === 'admin' ? 'Vous' : 'Client'}
                                                </div>
                                                <button className="ec-explorer-dl" onClick={(e) => { e.stopPropagation(); window.open(doc.url, '_blank'); }}>↓</button>
                                            </div>
                                        ))}
                                        {documents.filter(d => d.folder === currentFolder).length === 0 && (
                                            <div className="ec-empty">Dossier vide.</div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="dossier-sidebar">
                    <div className="content-card">
                        <div className="card-header"><h2>Informations</h2></div>
                        <div className="card-body info-list">
                            <div className="info-group"><label>Clerk User ID</label><code style={{ fontSize: '10px' }}>{client.clerkId || "En attente d'inscription"}</code></div>
                            <div className="info-group"><label>Gérant</label><span>{client.name}</span></div>
                            <div className="info-group"><label>Email</label><span>{client.email}</span></div>
                            <div className="info-group"><label>Formule</label><span>{client.plan}</span></div>
                            <div className="info-group"><label>Date d'entrée</label><span>{client.since}</span></div>
                            <div className="info-actions">
                                <button className="btn-danger-outline" onClick={handleDelete} disabled={isLoading}>
                                    {isLoading ? 'Suppression...' : 'Supprimer le profil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
