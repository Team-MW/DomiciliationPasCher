import React, { useState } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';
import { convertPdfToPng } from '../../../utils/pdfConverter';

export default function Docs({ documents, setDocuments, clientData }) {
    const [isUploading, setIsUploading] = useState(false);

    const handleUploadClick = () => {
        document.getElementById('file-upload').click();
    };

    const handleFileChange = async (e) => {
        const originalFile = e.target.files[0];
        if (!originalFile) return;

        setIsUploading(true);
        try {
            let fileToUpload = originalFile;
            
            // Si c'est un PDF, on le transforme en PNG avant l'envoi
            if (originalFile.type === 'application/pdf' || originalFile.name.toLowerCase().endsWith('.pdf')) {
                console.log("Conversion du PDF en PNG...");
                fileToUpload = await convertPdfToPng(originalFile);
            }

            const info = await uploadFile(fileToUpload, {
                folder: `clients/${clientData.id}/Documents`
            });

            await adminDataService.addDocument(clientData.id, {
                name: fileToUpload.name,
                size: (fileToUpload.size / 1024).toFixed(0) + ' KB',
                type: fileToUpload.type,
                owner: 'client',
                folder: 'Documents',
                url: info.secure_url
            });

            const updatedDocs = await adminDataService.getDocuments(clientData.id);
            setDocuments(updatedDocs);
        } catch (err) {
            console.error("Error during upload:", err);
            alert("Erreur détaillée : " + err.message);
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
                        <button className="ec-btn-primary" onClick={handleUploadClick} disabled={isUploading}>
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
                    {!documents || documents.length === 0 ? (
                        <div className="ec-empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                            <p style={{ color: '#64748B', fontSize: '15px' }}>Aucun document pour le moment.</p>
                            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>Glissez-déposez un fichier ici pour l'envoyer.</p>
                        </div>
                    ) : (
                        documents.map(doc => {
                            if (!doc) return null;
                            return (
                                <a 
                                    key={doc.id} 
                                    href={doc.url && doc.url.toLowerCase().endsWith('.pdf') ? doc.url.replace(/\.pdf$/i, '.jpg') : doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ec-explorer-item file" 
                                    style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}
                                >
                                    <div className="ec-explorer-icon"><Icons.Docs /></div>
                                    <div className="ec-explorer-name" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0F172A' }}>{doc.name}</div>
                                    <div className="ec-explorer-meta">
                                        {doc.size} · {doc.owner === 'admin' ? 'Transmis par Admin' : 'Déposé par moi'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', width: '100%' }}>
                                        <div 
                                            className="ec-explorer-dl" 
                                            style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Ouvrir / Télécharger"
                                        >
                                            <Icons.ArrowRight />
                                        </div>
                                        <button 
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (window.confirm("Supprimer ce document ?")) {
                                                    try {
                                                        await adminDataService.deleteDocument(doc.id);
                                                        setDocuments(prev => (prev || []).filter(x => x.id !== doc.id));
                                                    } catch (err) { alert("Erreur lors de la suppression"); }
                                                }
                                            }}
                                            style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FEE2E2', borderRadius: '8px', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626' }}
                                            title="Supprimer"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </a>
                            );
                        })
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
