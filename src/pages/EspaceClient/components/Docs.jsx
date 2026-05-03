import React, { useState } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';

export default function Docs({ documents, setDocuments, clientData }) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await performUpload(file);
    };

    const performUpload = async (file) => {
        setIsUploading(true);
        try {
            const info = await uploadFile(file, {
                folder: `clients/${clientData.id}/Documents`
            });

            await adminDataService.addDocument(clientData.id, {
                name: file.name || info.original_filename || 'Sans nom',
                size: (file.size / 1024).toFixed(0) + ' KB',
                type: file.type || (info.resource_type + '/' + info.format),
                owner: 'client',
                folder: 'Documents',
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
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Mes Documents</h2>
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
                            {isUploading ? 'Transfert...' : '+ Déposer un document'}
                        </button>
                    </div>
                </div>

                <div
                    className="ec-explorer-grid"
                    style={{ padding: '24px', minHeight: '400px' }}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                >
                    {documents.length === 0 ? (
                        <div className="ec-empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                            <p style={{ color: '#64748B', fontSize: '15px' }}>Aucun document pour le moment.</p>
                            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>Glissez-déposez un fichier ici pour l'envoyer.</p>
                        </div>
                    ) : (
                        documents.map(doc => (
                            <div key={doc.id} className="ec-explorer-item file" style={{ cursor: 'default' }}>
                                <div className="ec-explorer-icon"><Icons.Docs /></div>
                                <div className="ec-explorer-name" style={{ fontWeight: 600 }}>{doc.name}</div>
                                <div className="ec-explorer-meta">
                                    {doc.size} · {doc.owner === 'admin' ? 'Transmis par Admin' : 'Déposé par moi'}
                                </div>
                                <button 
                                    className="ec-explorer-dl" 
                                    onClick={() => window.open(doc.url, '_blank')}
                                    title="Télécharger"
                                >
                                    <Icons.ArrowRight />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            <div style={{ marginTop: '20px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                    <strong>Note :</strong> Tous vos documents (justificatifs, contrats, courriers scannés) sont regroupés ici. 
                    Vous pouvez ajouter de nouveaux fichiers à tout moment en cliquant sur le bouton ci-dessus.
                </p>
            </div>
        </div>
    );
}
