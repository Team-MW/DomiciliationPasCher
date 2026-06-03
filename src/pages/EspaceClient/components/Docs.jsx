import React, { useState } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';
import { convertPdfToPng } from '../../../utils/pdfConverter';
import { generateAttestationPdf, generateContratPdf } from '../../../utils/pdfGenerator';

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
            // Utiliser le même flux d'envoi
            const fakeEvent = { target: { files } };
            handleFileChange(fakeEvent);
        }
    };

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* SECTION 1 : DOCUMENTS CONTRACTUELS (AUTOMATIQUES) & AGRÉMENT (COMMUN) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Attestation & Contrat */}
                <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px' }}>📝</span>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Générateur de Documents</h3>
                        </div>
                        <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                            Générez instantanément vos documents contractuels officiels pré-remplis avec les données de votre entreprise.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button 
                            className="ec-btn-primary" 
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
                            onClick={() => generateAttestationPdf(clientData)}
                        >
                            <span>📥</span> Télécharger mon Attestation
                        </button>
                        <button 
                            className="ec-btn-secondary" 
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: '600', borderRadius: '8px', cursor: 'pointer' }}
                            onClick={() => generateContratPdf(clientData)}
                        >
                            <span>📜</span> Télécharger mon Contrat
                        </button>
                    </div>
                </div>

                {/* Agrément CASSIN */}
                <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🛡️</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Agrément Préfectoral</h3>
                                <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>Officiel</span>
                            </div>
                        </div>
                        <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                            Consultez l'autorisation d'exercice délivrée par la Préfecture de la Haute-Garonne pour notre centre de domiciliation commerciale.
                        </p>
                    </div>
                    <div>
                        <a 
                            href="/Agrement_CASSIN.pdf" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ec-btn-primary" 
                            style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}
                        >
                            <span>👁️</span> Consulter l'Agrément CASSIN
                        </a>
                    </div>
                </div>

                {/* Extrait KBIS */}
                <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🏢</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Extrait KBIS</h3>
                                <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>Officiel</span>
                            </div>
                        </div>
                        <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                            Consultez l'extrait KBIS officiel de notre établissement de domiciliation commerciale (CASSIN LUDOVIC).
                        </p>
                    </div>
                    <div>
                        <a 
                            href="/Extrait_KBIS_CASSIN.pdf" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ec-btn-primary" 
                            style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}
                        >
                            <span>👁️</span> Consulter l'Extrait KBIS
                        </a>
                    </div>
                </div>

                {/* Procuration Postale */}
                <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px' }}>✉️</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Procuration Postale</h3>
                                <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>Requis</span>
                            </div>
                        </div>
                        <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                            <strong>Obligatoire</strong> pour nous autoriser à réceptionner vos lettres recommandées et vos colis auprès de La Poste.
                        </p>
                    </div>
                    <div>
                        <a 
                            href="/Procuration_Postale.pdf" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ec-btn-primary" 
                            style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}
                        >
                            <span>📥</span> Télécharger la Procuration
                        </a>
                        <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
                            Remplissez, signez et déposez-la ci-dessous.
                        </span>
                    </div>
                </div>
            </div>

            {/* SECTION 2 : COFFRE-FORT NUMÉRIQUE / MES DOCUMENTS PARTAGÉS */}
            <div className="ec-content-card">
                <div className="ec-card-header">
                    <div className="ec-breadcrumb">
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Mes Documents Partagés</h2>
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
                    style={{ padding: '24px', minHeight: '300px' }}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                >
                    {!documents || documents.length === 0 ? (
                        <div className="ec-empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                            <p style={{ color: '#64748B', fontSize: '15px' }}>Aucun document déposé pour le moment.</p>
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
            
            <div style={{ marginTop: '0px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                    <strong>Note :</strong> Cet espace réunit vos pièces justificatives (KBIS, statuts), vos factures et vos contrats de domiciliation officielle.
                    Vous pouvez télétransmettre de nouvelles pièces justificatives en glissant vos fichiers dans la zone ci-dessus.
                </p>
            </div>
        </div>
    );
}
