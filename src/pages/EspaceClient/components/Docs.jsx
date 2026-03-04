import React, { useState } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';

export default function Docs({ documents, setDocuments, currentFolder, setCurrentFolder, clientData }) {
    const [isUploading, setIsUploading] = useState(false);

    // Dériver les dossiers depuis la liste des documents reçue en prop
    const folders = Array.from(new Set(documents.map(d => d.folder || 'Documents')));

    const handleUpload = async () => {
        const name = prompt('Nom du document à déposer ici ?');
        if (name) {
            setIsUploading(true);
            try {
                await adminDataService.addDocument(clientData.id, {
                    name, size: '450KB', type: 'application/pdf', owner: 'client',
                    folder: currentFolder || 'Documents'
                });
                const updatedDocs = await adminDataService.getDocuments(clientData.id);
                setDocuments(updatedDocs);
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="ec-tab-animate">
            <div className="ec-content-card">
                <div className="ec-card-header">
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
                        <button className="ec-btn-primary" onClick={handleUpload} disabled={isUploading}>
                            {isUploading ? 'Transfert...' : '+ Déposer un fichier'}
                        </button>
                    </div>
                </div>

                <div className="ec-explorer-grid" style={{ padding: '24px' }}>
                    {/* SI VIEW ROOT : AFFICHER LES DOSSIERS */}
                    {!currentFolder && (
                        <>
                            {folders.map(folder => (
                                <div key={folder} className="ec-explorer-item folder" onClick={() => setCurrentFolder(folder)}>
                                    <div className="ec-explorer-icon"><Icons.Folder /></div>
                                    <div className="ec-explorer-name">{folder}</div>
                                    <div className="ec-explorer-count">
                                        {documents.filter(d => d.folder === folder).length} fichiers
                                    </div>
                                </div>
                            ))}
                            <div className="ec-explorer-item folder new" onClick={() => {
                                const name = prompt('Nom du nouveau dossier ?');
                                // Le dossier sera créé lors du premier ajout de doc dedans
                                if (name) setCurrentFolder(name);
                            }}>
                                <div className="ec-explorer-icon add">+</div>
                                <div className="ec-explorer-name">Nouveau dossier</div>
                            </div>
                        </>
                    )}

                    {/* SI VIEW FOLDER : AFFICHER LES FICHIERS DU DOSSIER */}
                    {currentFolder && (
                        <>
                            <div className="ec-explorer-item back" onClick={() => setCurrentFolder(null)}>
                                <div className="ec-explorer-icon"><Icons.Back /></div>
                                <div className="ec-explorer-name">Retour</div>
                            </div>
                            {documents.filter(d => d.folder === currentFolder).map(doc => (
                                <div key={doc.id} className="ec-explorer-item file">
                                    <div className="ec-explorer-icon"><Icons.Docs /></div>
                                    <div className="ec-explorer-name">{doc.name}</div>
                                    <div className="ec-explorer-meta">
                                        {doc.size} · {doc.owner === 'admin' ? 'Admin' : 'Moi'}
                                    </div>
                                    <button className="ec-explorer-dl" onClick={() => alert('Téléchargement simulé')}><Icons.ArrowRight /></button>
                                </div>
                            ))}
                            {documents.filter(d => d.folder === currentFolder).length === 0 && (
                                <div className="ec-empty">Ce dossier est vide. Prêt pour un dépôt.</div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
