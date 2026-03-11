import React, { useState } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';

export default function Docs({ documents, setDocuments, currentFolder, setCurrentFolder, clientData }) {
    const [isUploading, setIsUploading] = useState(false);

    // Dériver les dossiers depuis la liste des documents reçue en prop
    const folders = Array.from(new Set(documents.map(d => d.folder || 'Documents')));

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        await performUpload(file);
    };

    const performUpload = async (file) => {
        setIsUploading(true);
        try {
            const info = await uploadFile(file, {
                folder: `clients/${clientData.id}/${currentFolder || 'Documents'}`
            });

            await adminDataService.addDocument(clientData.id, {
                name: file.name || info.original_filename || 'Sans nom',
                size: (file.size / 1024).toFixed(0) + ' KB',
                type: file.type || (info.resource_type + '/' + info.format),
                owner: 'client',
                folder: currentFolder || 'Documents',
                url: info.secure_url
            });

            const updatedDocs = await adminDataService.getDocuments(clientData.id);
            setDocuments(updatedDocs);
        } catch (err) {
            console.error("Error during upload:", err);
            alert("Erreur lors de l'envoi : " + err.message);
        } finally {
            setIsUploading(false);
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
                        <input
                            type="file"
                            id="file-upload"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                        <button className="ec-btn-primary" onClick={() => document.getElementById('file-upload').click()} disabled={isUploading}>
                            {isUploading ? 'Transfert...' : '+ Déposer un fichier'}
                        </button>
                    </div>
                </div>

                <div
                    className="ec-explorer-grid"
                    style={{ padding: '24px', minHeight: '300px' }}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                >
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
                                    <button className="ec-explorer-dl" onClick={() => window.open(doc.url, '_blank')}><Icons.ArrowRight /></button>
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
