import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';
import { convertPdfToPng } from '../../../utils/pdfConverter';
import { generateAttestationPdf, generateContratPdf, generateSignedContratBlob } from '../../../utils/pdfGenerator';
import SignatureModal from '../../../components/SignatureModal/SignatureModal';

export default function Docs({ documents, setDocuments, clientData }) {
    const [isUploading, setIsUploading] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [signStatus, setSignStatus] = useState(null); // null | 'loading' | 'done' | 'error'
    const [signedUrl, setSignedUrl] = useState(null);
    const [localSignatureUrl, setLocalSignatureUrl] = useState(null);

    // Lire le statut de signature depuis extra_info
    const signatureInfo = useMemo(() => {
        try {
            if (!clientData?.extra_info) return null;
            const e = typeof clientData.extra_info === 'string'
                ? JSON.parse(clientData.extra_info) : clientData.extra_info;
            return e?.contractSigned ? e : null;
        } catch { return null; }
    }, [clientData]);

    const isSigned = !!(signatureInfo?.contractSigned || signedUrl);
    const contractUrl = signedUrl || signatureInfo?.contractSignedUrl;
    const signedAt = signatureInfo?.contractSignedAt;

    const handleUploadClick = () => {
        document.getElementById('file-upload').click();
    };

    const handleFileChange = async (e) => {
        const originalFile = e.target.files[0];
        if (!originalFile) return;

        setIsUploading(true);
        try {
            let fileToUpload = originalFile;
            if (originalFile.type === 'application/pdf' || originalFile.name.toLowerCase().endsWith('.pdf')) {
                fileToUpload = await convertPdfToPng(originalFile);
            }
            const info = await uploadFile(fileToUpload, { folder: `clients/${clientData.id}/Documents` });
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
            alert("Erreur : " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSigned = async (signatureDataUrl) => {
        setShowSignModal(false);
        setSignStatus('loading');
        
        // Petit délai pour laisser React afficher l'état de chargement avant le calcul lourd (évite le freeze)
        await new Promise(resolve => setTimeout(resolve, 100));

        let step = 'Démarrage';
        try {
            // Au lieu d'uploader le PDF complet sur Cloudinary (qui le bloque), 
            // on sauvegarde simplement l'image de la signature dans la DB du client.
            // Le PDF complet sera généré dynamiquement à la volée quand le client ou l'admin cliquera sur "Voir/Télécharger".
            step = 'Sauvegarde base de données';
            
            const extraInfo = {
                contractSigned: true,
                contractSignedAt: new Date().toISOString(),
                contractSignatureUrl: signatureDataUrl, // On stocke uniquement la donnée de la signature dessinée (quelques Ko)
                contractSignedUrl: '#local-signature' // Drapeau spécial
            };

            await adminDataService.updateClientExtraInfo(clientData.id, extraInfo);

            // Enregistrer dans la DB comme document
            step = 'Enregistrement BD document';
            await adminDataService.addDocument(clientData.id, {
                name: '✅ Contrat signé électroniquement.pdf',
                size: 'Généré à la volée',
                type: 'application/pdf',
                owner: 'client',
                folder: 'Contrats',
                url: '#local-signature'
            });

            // Recharger localement
            const updatedDocs = await adminDataService.getDocuments(clientData.id);
            setDocuments(updatedDocs);

            setSignedUrl('#local-signature');
            setLocalSignatureUrl(signatureDataUrl);
            setSignStatus('done');
        } catch (err) {
            console.error('Erreur signature:', err);
            window.lastSignError = `[${step}] ` + (err.message || String(err));
            setSignStatus('error');
        }
    };

    const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files?.length > 0) handleFileChange({ target: { files } });
    };

    return (
        <div className="ec-tab-animate" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* ── SIGNATURE DU CONTRAT ─────────────────────────────── */}
            <div style={{
                borderRadius: '20px', overflow: 'hidden',
                border: isSigned ? '2px solid #bbf7d0' : '2px solid #bfdbfe',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
            }}>
                <div style={{
                    background: isSigned
                        ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                        : 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
                    padding: '20px 24px', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>{isSigned ? '✅' : '✍️'}</span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px' }}>
                                {isSigned ? 'Contrat signé' : 'Signer mon contrat'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                {isSigned
                                    ? `Signé le ${signedAt ? new Date(signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}`
                                    : 'Signature électronique · Valeur juridique eIDAS'}
                            </div>
                        </div>
                    </div>
                    {isSigned && (
                        <span style={{
                            background: '#dcfce7', color: '#15803d', fontSize: '11px',
                            fontWeight: 700, padding: '4px 12px', borderRadius: '99px'
                        }}>
                            Validé ✔
                        </span>
                    )}
                </div>

                <div style={{ background: 'white', padding: '20px 24px' }}>
                    {!isSigned ? (
                        <>
                            {signStatus === 'loading' && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#1e40af' }}>
                                    <div style={{
                                        width: '32px', height: '32px', border: '3px solid #bfdbfe',
                                        borderTopColor: '#1e40af', borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
                                    }} />
                                    <p style={{ margin: 0, fontWeight: 600 }}>Génération et enregistrement du contrat signé...</p>
                                </div>
                            )}
                            {signStatus === 'error' && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                                    ❌ Une erreur est survenue : {window.lastSignError || 'Erreur inconnue'}
                                </div>
                            )}
                            {signStatus !== 'loading' && (
                                <>
                                    <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
                                        Votre contrat de domiciliation est prêt. Apposez votre <strong>signature électronique</strong> pour le valider officiellement. Le document signé sera immédiatement accessible par votre espace et par l'administration.
                                    </p>
                                    <button
                                        onClick={() => setShowSignModal(true)}
                                        style={{
                                            width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                                            background: 'linear-gradient(135deg, #1e40af, #0f172a)',
                                            color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        ✍️ Signer mon contrat maintenant
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                                <span style={{ fontSize: '18px' }}>🎉</span>
                                Votre contrat a été signé et enregistré avec succès.
                            </div>
                            {contractUrl && (
                                <a
                                    href={contractUrl === '#local-signature' ? '#' : contractUrl}
                                    onClick={async (e) => {
                                        if (contractUrl === '#local-signature') {
                                            e.preventDefault();
                                            try {
                                                console.log("Tentative de génération du PDF...");
                                                const sig = localSignatureUrl || signatureInfo?.contractSignatureUrl;
                                                if (!sig) {
                                                    throw new Error("Données de signature introuvables en mémoire.");
                                                }
                                                console.log("Génération du blob PDF...");
                                                const blob = await generateSignedContratBlob(clientData, sig);
                                                console.log("Blob généré:", blob);
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `Contrat_Signe_${clientData.company || clientData.id}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                                console.log("Téléchargement lancé.");
                                            } catch (err) {
                                                console.error("Erreur téléchargement PDF:", err);
                                                alert("Erreur: " + err.message);
                                            }
                                        }
                                    }}
                                    target={contractUrl === '#local-signature' ? '_self' : '_blank'}
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        padding: '12px', borderRadius: '10px', textDecoration: 'none',
                                        background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                        color: '#15803d', fontWeight: 700, fontSize: '13px'
                                    }}
                                >
                                    📥 Télécharger mon contrat signé (PDF)
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DOCUMENTS CONTRACTUELS ───────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
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
                        <button className="ec-btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => generateAttestationPdf(clientData)}>
                            <span>📥</span> Télécharger mon Attestation
                        </button>
                        <button className="ec-btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: '600', borderRadius: '8px', cursor: 'pointer' }} onClick={() => generateContratPdf(clientData)}>
                            <span>📜</span> Télécharger mon Contrat (non signé)
                        </button>
                    </div>
                </div>

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
                        <a href="/Agrement_CASSIN.pdf" target="_blank" rel="noopener noreferrer" className="ec-btn-primary" style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}>
                            <span>👁️</span> Consulter l'Agrément CASSIN
                        </a>
                    </div>
                </div>

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
                        <a href="/Extrait_KBIS_CASSIN.pdf" target="_blank" rel="noopener noreferrer" className="ec-btn-primary" style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}>
                            <span>👁️</span> Consulter l'Extrait KBIS
                        </a>
                    </div>
                </div>

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
                        <a href="/Procuration_Postale.pdf" target="_blank" rel="noopener noreferrer" className="ec-btn-primary" style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}>
                            <span>📥</span> Télécharger la Procuration
                        </a>
                        <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
                            Remplissez, signez et déposez-la ci-dessous.
                        </span>
                    </div>
                </div>
            </div>

            {/* ── MES DOCUMENTS PARTAGÉS ───────────────────────────── */}
            <div className="ec-content-card">
                <div className="ec-card-header">
                    <div className="ec-breadcrumb">
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Mes Documents Partagés</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="file" id="file-upload" style={{ display: 'none' }} onChange={handleFileChange} disabled={isUploading} />
                        <button className="ec-btn-primary" onClick={handleUploadClick} disabled={isUploading}>
                            {isUploading ? 'Transfert...' : '+ Déposer un document'}
                        </button>
                    </div>
                </div>

                <div className="ec-explorer-grid" style={{ padding: '24px', minHeight: '300px' }} onDragOver={onDragOver} onDrop={onDrop}>
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
                                    href={doc.url === '#local-signature' ? '#' : (doc.url && doc.url.toLowerCase().endsWith('.pdf') ? doc.url.replace(/\.pdf$/i, '.jpg') : doc.url)}
                                    onClick={async (e) => {
                                        if (doc.url === '#local-signature') {
                                            e.preventDefault();
                                            try {
                                                console.log("DocumentsList: Tentative de génération du PDF...");
                                                const sig = localSignatureUrl || signatureInfo?.contractSignatureUrl;
                                                if (!sig) {
                                                    throw new Error("Données de signature introuvables en mémoire.");
                                                }
                                                console.log("DocumentsList: Génération du blob PDF...");
                                                const blob = await generateSignedContratBlob(clientData, sig);
                                                console.log("DocumentsList: Blob généré:", blob);
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `Contrat_Signe_${clientData.company || clientData.id}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                                console.log("DocumentsList: Téléchargement lancé.");
                                            } catch (err) {
                                                console.error("Erreur téléchargement PDF (DocsList):", err);
                                                alert("Erreur: " + err.message);
                                            }
                                        }
                                    }}
                                    target={doc.url === '#local-signature' ? '_self' : '_blank'}
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
                                        <div className="ec-explorer-dl" style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Ouvrir / Télécharger">
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

            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                    <strong>Note :</strong> Cet espace réunit vos pièces justificatives (KBIS, statuts), vos factures et vos contrats de domiciliation officielle.
                    Vous pouvez télétransmettre de nouvelles pièces justificatives en glissant vos fichiers dans la zone ci-dessus.
                </p>
            </div>

            {showSignModal && (
                <SignatureModal
                    clientData={clientData}
                    onClose={() => setShowSignModal(false)}
                    onSigned={handleSigned}
                />
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
