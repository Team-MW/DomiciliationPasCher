import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { fetchWithRetry } from '../../../utils/api';
import { uploadFile } from '../../../utils/cloudinary';
import { convertPdfToPng } from '../../../utils/pdfConverter';
import { generateAttestationPdf, generateContratPdf, generateSignedContratBlob, generateSignedProcurationBlob } from '../../../utils/pdfGenerator';
import SignatureModal from '../../../components/SignatureModal/SignatureModal';

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const handleDataUrlDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default function Docs({ documents, setDocuments, clientData, setClientData }) {
    const [isUploading, setIsUploading] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [signStatus, setSignStatus] = useState(null); // null | 'loading' | 'done' | 'error'
    const [signedUrl, setSignedUrl] = useState(null);
    const [localSignatureUrl, setLocalSignatureUrl] = useState(null);
    const [downloadingDocId, setDownloadingDocId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [fileToName, setFileToName] = useState(null);
    const [customFileName, setCustomFileName] = useState('');

    // Procuration Postale States
    const [localProcSignatureUrl, setLocalProcSignatureUrl] = useState(null);
    const [showProcurationForm, setShowProcurationForm] = useState(false);
    const [showProcurationSignModal, setShowProcurationSignModal] = useState(false);
    const [procSignStatus, setProcSignStatus] = useState(null);
    const [isUploadingKbis, setIsUploadingKbis] = useState(false);
    const [localKbisUrl, setLocalKbisUrl] = useState(null);
    const [procurationFormData, setProcurationFormData] = useState({
        lieuNaissance: '', dateNaissance: '', typePiece: "Carte d'Identité", numeroPiece: '', dateDelivrance: '', autoriteDelivrance: '',
        pointRemise: '', complementAdresse: '', adresseVoie: '', lieuDit: '', codePostalVille: '', siret: ''
    });

    const parsedExtraInfo = useMemo(() => {
        try {
            if (!clientData?.extra_info) return {};
            return typeof clientData.extra_info === 'string'
                ? JSON.parse(clientData.extra_info) : clientData.extra_info;
        } catch { return {}; }
    }, [clientData]);
    const hasKbis = !!(parsedExtraInfo.kbisUrl || localKbisUrl);

    const checkApproval = () => {
        if (clientData?.isTemporary || clientData?.status === 'en_attente_validation') {
            alert("Vous n'avez pas encore été approuvé.\n\nVous serez approuvé sous 24h. Une fois approuvé, vous pourrez signer, télécharger et déposer vos documents.");
            return false;
        }
        return true;
    };

    const handleKbisUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingKbis(true);
        try {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            let finalUrl = '';
            let finalName = isPdf ? 'Extrait KBIS.pdf' : 'Extrait KBIS.png';
            
            if (isPdf) {
                console.log("Traitement direct du KBIS PDF (sans Cloudinary)...");
                finalUrl = await blobToBase64(file);
            } else {
                console.log("Upload du KBIS PNG vers Cloudinary...");
                const res = await uploadFile(file, { folder: 'kbis' });
                finalUrl = res.secure_url;
            }

            const docData = await adminDataService.addDocument(clientData.id, {
                name: finalName,
                size: (file.size / 1024).toFixed(0) + ' KB',
                type: file.type,
                owner: 'client',
                folder: 'Documents',
                url: finalUrl
            });
            const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, {
                kbisUrl: finalUrl
            });
            if (setClientData) {
                setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
            }
            setLocalKbisUrl(finalUrl);
            setDocuments(prev => [docData, ...prev]);
        } catch (err) {
            console.error('KBIS upload error', err);
            alert("Erreur lors de l'envoi du KBIS.");
        } finally {
            setIsUploadingKbis(false);
            if (e.target) e.target.value = '';
        }
    };

    const procInfo = useMemo(() => {
        try {
            if (!clientData?.extra_info) return null;
            const e = typeof clientData.extra_info === 'string'
                ? JSON.parse(clientData.extra_info) : clientData.extra_info;
            return e?.procurationSigned ? e : null;
        } catch { return null; }
    }, [clientData]);

    const isProcSigned = !!(procInfo?.procurationSigned || localProcSignatureUrl);
    const procUrl = procInfo?.procurationSignedUrl || (localProcSignatureUrl ? '#local-procuration' : null);
    const procSignedAt = procInfo?.procurationSignedAt;

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
        if (!checkApproval()) return;
        document.getElementById('file-upload').click();
    };

    const handleFileChange = async (e) => {
        const originalFile = e.target.files[0];
        if (!originalFile) return;

        // Clear value immediately to prevent double events
        if (e.target.value !== undefined) e.target.value = '';

        setFileToName(originalFile);
        setCustomFileName('');
    };

    const confirmFileUpload = async () => {
        if (!fileToName) return;
        setIsUploading(true);
        const originalFile = fileToName;
        
        const originalExt = originalFile.name.includes('.') ? originalFile.name.substring(originalFile.name.lastIndexOf('.')) : '';
        let finalName = customFileName.trim() || originalFile.name;
        if (customFileName.trim() && originalExt && !finalName.toLowerCase().endsWith(originalExt.toLowerCase())) {
            finalName += originalExt;
        }

        setFileToName(null);
        setCustomFileName('');

        try {
            const isPdf = originalFile.type === 'application/pdf' || originalFile.name.toLowerCase().endsWith('.pdf');
            let finalUrl = '';

            if (isPdf) {
                console.log("Traitement direct du PDF client (sans Cloudinary)...");
                finalUrl = await blobToBase64(originalFile);
            } else {
                console.log("Upload du fichier image vers Cloudinary...");
                const info = await uploadFile(originalFile, { folder: `clients/${clientData.id}/Documents` });
                finalUrl = info.secure_url;
            }

            await adminDataService.addDocument(clientData.id, {
                name: finalName,
                size: (originalFile.size / 1024).toFixed(0) + ' KB',
                type: originalFile.type,
                owner: 'client',
                folder: 'Documents',
                url: finalUrl
            });
            const updatedDocs = await adminDataService.getDocuments(clientData.id);
            setDocuments(updatedDocs);
        } catch (err) {
            console.error("Error during upload:", err);
            alert("Erreur lors de l'envoi du document.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSigned = async (signatureDataUrl) => {
        setShowSignModal(false);
        setIsSaving(true);
        setSignStatus('loading');

        // Petit délai pour laisser React afficher l'état de chargement avant le calcul lourd (évite le freeze)
        await new Promise(resolve => setTimeout(resolve, 100));

        let step = 'Démarrage';
        try {
            step = 'Génération et Upload du Contrat PDF';
            console.log("Génération du contrat...");
            const pdfBlob = await generateSignedContratBlob(clientData, signatureDataUrl);
            const pdfFile = new File([pdfBlob], `Contrat_Signe_${clientData.id}.pdf`, { type: 'application/pdf' });
            
            let finalUrl = '#local-signature';
            let fileSizeStr = 'Généré à la volée';
            
            try {
                console.log("Upload du contrat sur Cloudinary...");
                const uploadRes = await uploadFile(pdfFile, { folder: `clients/${clientData.id}/Contrats` });
                finalUrl = uploadRes.secure_url;
                fileSizeStr = (pdfFile.size / 1024).toFixed(0) + ' KB';
            } catch (upErr) {
                console.warn("Upload Cloudinary bloqué pour le PDF, on utilise la méthode locale.", upErr);
            }

            step = 'Sauvegarde base de données';
            const extraInfo = {
                contractSigned: true,
                contractSignedAt: new Date().toISOString(),
                contractSignatureUrl: signatureDataUrl,
                contractSignedUrl: finalUrl
            };

            const response = await fetchWithRetry('/api/update-client-extra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: clientData.id, extraInfo })
            });
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const updatedExtra = await response.json();

            if (setClientData) {
                setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
            }

            step = 'Enregistrement BD document';
            await adminDataService.addDocument(clientData.id, {
                name: '✅ Contrat signé électroniquement.pdf',
                size: fileSizeStr,
                type: 'application/pdf',
                owner: 'client',
                folder: 'Contrats',
                url: finalUrl
            });

            // Recharger localement
            const updatedDocs = await adminDataService.getDocuments(clientData.id);
            setDocuments(updatedDocs);

            setSignedUrl(finalUrl);
            setLocalSignatureUrl(signatureDataUrl);
            setSignStatus('done');

        } catch (err) {
            console.error('Erreur signature:', err);
            window.lastSignError = `[${step}] ` + (err.message || String(err));
            setSignStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignProcuration = async (signatureDataUrl) => {
        setProcSignStatus('loading');
        setShowProcurationSignModal(false);

        await new Promise(resolve => setTimeout(resolve, 100));

        let step = 'Démarrage';
        try {
            step = 'Génération et Upload de la Procuration';
            console.log("Génération de la procuration...");
            const pdfBlob = await generateSignedProcurationBlob(clientData, signatureDataUrl, procurationFormData);
            const pdfFile = new File([pdfBlob], `Procuration_${clientData.id}.pdf`, { type: 'application/pdf' });
            
            let finalUrl = '#local-procuration';
            let fileSizeStr = 'Généré à la volée';
            
            try {
                console.log("Upload de la procuration sur Cloudinary...");
                const uploadRes = await uploadFile(pdfFile, { folder: `clients/${clientData.id}/Documents` });
                finalUrl = uploadRes.secure_url;
                fileSizeStr = (pdfFile.size / 1024).toFixed(0) + ' KB';
            } catch (upErr) {
                console.warn("Upload Cloudinary bloqué pour le PDF de procuration.", upErr);
            }

            step = 'Sauvegarde base de données procuration';
            const extraInfo = {
                procurationSigned: true,
                procurationSignedAt: new Date().toISOString(),
                procurationSignatureUrl: signatureDataUrl,
                procurationData: procurationFormData,
                procurationSignedUrl: finalUrl
            };

            const response = await fetchWithRetry('/api/update-client-extra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: clientData.id, extraInfo })
            });
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const updatedExtraProc = await response.json();
            
            if (setClientData) {
                setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtraProc) }));
            }

            step = 'Enregistrement BD document procuration';
            await adminDataService.addDocument(clientData.id, {
                name: '✉️ Procuration Postale.pdf',
                size: fileSizeStr,
                type: 'application/pdf',
                owner: 'client',
                folder: 'Documents',
                url: finalUrl
            });

            const updatedDocs = await adminDataService.getDocuments(clientData.id);
            setDocuments(updatedDocs);

            setLocalProcSignatureUrl(signatureDataUrl);
            setProcSignStatus('done');

            // Auto-téléchargement de la procuration
            try {
                console.log("Téléchargement automatique de la procuration...");
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Procuration_${clientData.company || clientData.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (autoDlErr) {
                console.error("Erreur auto-téléchargement:", autoDlErr);
            }

        } catch (err) {
            console.error('Erreur signature procuration:', err);
            window.lastProcSignError = `[${step}] ` + (err.message || String(err));
            setProcSignStatus('error');
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
            <div style={{ background: '#f8fafc', padding: '16px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>Dossier de Domiciliation 📁</h2>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
                    Pour finaliser votre inscription, veuillez compléter les <strong>deux étapes obligatoires</strong> ci-dessous.
                    Une fois le contrat et la procuration signés, vous pourrez générer vos documents finaux (Attestation, Extrait KBIS, etc.) plus bas.
                </p>
            </div>

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
                        <span style={{ fontSize: '28px' }}>{isSigned ? '✅' : '1️⃣'}</span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px' }}>
                                {isSigned ? 'Étape 1 : Contrat signé' : 'Étape 1 : Signer mon contrat'}
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
                                        onClick={() => {
                                            if (!checkApproval()) return;
                                            if (isSaving) return; // prevent duplicate clicks
                                            setShowSignModal(true);
                                        }}
                                        disabled={isSaving || signStatus === 'loading'}
                                        style={{
                                            width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                                            background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #1e40af, #0f172a)',
                                            color: 'white', fontWeight: 700, fontSize: '14px', cursor: isSaving ? 'default' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            opacity: isSaving ? 0.6 : 1
                                        }}
                                    >
                                        {isSaving ? 'Enregistrement...' : '✍️ Signer mon contrat maintenant'}
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

                            {/* Bouton téléchargement */}
                            {contractUrl && (
                                <a
                                    href={contractUrl === '#local-signature' ? '#' : contractUrl}
                                    onClick={async (e) => {
                                        if (!checkApproval()) { e.preventDefault(); return; }
                                        if (contractUrl === '#local-signature') {
                                            e.preventDefault();
                                            if (downloadingDocId) return;
                                            setDownloadingDocId('contrat-signe');
                                            try {
                                                console.log("Tentative de génération du PDF...");
                                                const sig = localSignatureUrl || signatureInfo?.contractSignatureUrl;
                                                if (!sig) {
                                                    throw new Error("Données de signature introuvables en mémoire ou en base.");
                                                }
                                                const blob = await generateSignedContratBlob(clientData, sig);
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `Contrat_Signe_${clientData.company || clientData.id}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                            } catch (err) {
                                                console.error("Erreur téléchargement PDF:", err);
                                                alert("Erreur: " + err.message);
                                            } finally {
                                                setDownloadingDocId(null);
                                            }
                                        } else if (contractUrl.startsWith('data:')) {
                                            e.preventDefault();
                                            handleDataUrlDownload(contractUrl, `Contrat_Signe_${clientData.company || clientData.id}.pdf`);
                                        }
                                    }}
                                    target={contractUrl === '#local-signature' || contractUrl.startsWith('data:') ? '_self' : '_blank'}
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        padding: '12px', borderRadius: '10px', textDecoration: 'none',
                                        background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                        color: '#15803d', fontWeight: 700, fontSize: '13px', width: '100%',
                                        pointerEvents: downloadingDocId ? 'none' : 'auto',
                                        opacity: downloadingDocId ? 0.7 : 1
                                    }}
                                >
                                    {downloadingDocId === 'contrat-signe' ? (
                                        <>
                                            <div style={{ width: '16px', height: '16px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                            Génération du PDF...
                                        </>
                                    ) : (
                                        <>📥 Télécharger mon contrat signé (PDF)</>
                                    )}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── PROCURATION POSTALE ─────────────────────────────── */}
            <div style={{
                borderRadius: '20px', overflow: 'hidden',
                border: isProcSigned ? '2px solid #bbf7d0' : '2px solid #e2e8f0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
            }}>
                <div style={{
                    background: isProcSigned
                        ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                        : '#f8fafc',
                    padding: '20px 24px', color: isProcSigned ? 'white' : '#0f172a',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: isProcSigned ? 'none' : '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>{isProcSigned ? '✅' : '2️⃣'}</span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px' }}>
                                {isProcSigned ? 'Étape 2 : Procuration Postale signée' : 'Étape 2 : Procuration Postale'}
                            </div>
                            <div style={{ fontSize: '12px', color: isProcSigned ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: '2px' }}>
                                {isProcSigned
                                    ? `Signée le ${procSignedAt ? new Date(procSignedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}`
                                    : 'Autorisez-nous à recevoir vos recommandés'}
                            </div>
                        </div>
                    </div>
                    {isProcSigned && (
                        <span style={{
                            background: '#dcfce7', color: '#15803d', fontSize: '11px',
                            fontWeight: 700, padding: '4px 12px', borderRadius: '99px'
                        }}>
                            Validé ✔
                        </span>
                    )}
                </div>

                <div style={{ background: 'white', padding: '20px 24px' }}>
                    {!isProcSigned ? (
                        <>
                            {procSignStatus === 'loading' && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#1e40af' }}>
                                    <div style={{
                                        width: '32px', height: '32px', border: '3px solid #bfdbfe',
                                        borderTopColor: '#1e40af', borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
                                    }} />
                                    <p style={{ margin: 0, fontWeight: 600 }}>Génération et enregistrement de la procuration...</p>
                                </div>
                            )}
                            {procSignStatus === 'error' && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                                    ❌ Une erreur est survenue : {window.lastProcSignError || 'Erreur inconnue'}
                                </div>
                            )}
                            {procSignStatus !== 'loading' && (
                                <>
                                    <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
                                        Afin que nous puissions réceptionner vos courriers recommandés et colis en votre nom, une <strong>Procuration Postale</strong> officielle est requise. {hasKbis ? "Remplissez simplement les informations de votre pièce d'identité." : "Vous devez d'abord fournir votre Extrait KBIS."}
                                    </p>
                                    {!hasKbis ? (
                                        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 600 }}>Déposez votre Extrait KBIS pour débloquer la procuration.</p>
                                            <input type="file" id="kbis-upload" style={{ display: 'none' }} onChange={handleKbisUpload} accept="application/pdf,image/*" />
                                            <button
                                                onClick={() => {
                                                    if (!checkApproval()) return;
                                                    document.getElementById('kbis-upload').click();
                                                }}
                                                disabled={isUploadingKbis}
                                                style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: isUploadingKbis ? 0.7 : 1 }}
                                            >
                                                {isUploadingKbis ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                        <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                        Envoi en cours...
                                                    </span>
                                                ) : '📤 Déposer mon KBIS'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (!checkApproval()) return;
                                                setShowProcurationForm(true);
                                            }}
                                            style={{
                                                width: '100%', padding: '13px', borderRadius: '12px', border: '1px solid #cbd5e1',
                                                background: '#f8fafc',
                                                color: '#0f172a', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            📝 Créer ma procuration
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                                <span style={{ fontSize: '18px' }}>🎉</span>
                                Votre procuration a été générée et signée avec succès.
                            </div>
                            
                            {/* Bouton téléchargement */}
                            {procUrl && (
                                <a
                                    href={procUrl === '#local-procuration' ? '#' : procUrl}
                                    onClick={async (e) => {
                                        if (!checkApproval()) { e.preventDefault(); return; }
                                        if (procUrl === '#local-procuration') {
                                            e.preventDefault();
                                            if (downloadingDocId) return;
                                            setDownloadingDocId('procuration-signe');
                                            try {
                                                console.log("Tentative de génération de la procuration...");
                                                const sig = localProcSignatureUrl || procInfo?.procurationSignatureUrl;
                                                const data = procInfo?.procurationData || procurationFormData;
                                                if (!sig) {
                                                    throw new Error("Données de signature introuvables en mémoire ou en base.");
                                                }
                                                const blob = await generateSignedProcurationBlob(clientData, sig, data);
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `Procuration_${clientData.company || clientData.id}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                            } catch (err) {
                                                console.error("Erreur téléchargement procuration:", err);
                                                alert("Erreur: " + err.message);
                                            } finally {
                                                setDownloadingDocId(null);
                                            }
                                        } else if (procUrl.startsWith('data:')) {
                                            e.preventDefault();
                                            handleDataUrlDownload(procUrl, `Procuration_${clientData.company || clientData.id}.pdf`);
                                        }
                                    }}
                                    target={procUrl === '#local-procuration' || procUrl.startsWith('data:') ? '_self' : '_blank'}
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        padding: '12px', borderRadius: '10px', textDecoration: 'none',
                                        background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                        color: '#15803d', fontWeight: 700, fontSize: '13px', width: '100%',
                                        pointerEvents: downloadingDocId ? 'none' : 'auto',
                                        opacity: downloadingDocId ? 0.7 : 1
                                    }}
                                >
                                    {downloadingDocId === 'procuration-signe' ? (
                                        <>
                                            <div style={{ width: '16px', height: '16px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                            Génération du PDF...
                                        </>
                                    ) : (
                                        <>📥 Télécharger ma Procuration (PDF)</>
                                    )}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DOCUMENTS CONTRACTUELS ───────────────────────────── */}
            <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>3️⃣</span> Étape 3 : Vos documents finaux
                </h2>
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
                            <button
                                className="ec-btn-primary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', opacity: downloadingDocId ? 0.7 : 1 }}
                                onClick={async (e) => {
                                    if (!checkApproval()) { e.preventDefault(); return; }
                                    if (downloadingDocId) return;
                                    setDownloadingDocId('attestation');
                                    try {
                                        await generateAttestationPdf(clientData);
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setDownloadingDocId(null);
                                    }
                                }}
                                disabled={downloadingDocId !== null}
                            >
                                {downloadingDocId === 'attestation' ? (
                                    <>
                                        <div style={{ width: '16px', height: '16px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                        Génération...
                                    </>
                                ) : (
                                    <><span>📥</span> Télécharger mon Attestation</>
                                )}
                            </button>
                            <button
                                className="ec-btn-secondary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', opacity: downloadingDocId ? 0.7 : 1 }}
                                onClick={async (e) => {
                                    if (!checkApproval()) { e.preventDefault(); return; }
                                    if (downloadingDocId) return;
                                    setDownloadingDocId('contrat-vierge');
                                    try {
                                        await generateContratPdf(clientData);
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setDownloadingDocId(null);
                                    }
                                }}
                                disabled={downloadingDocId !== null}
                            >
                                {downloadingDocId === 'contrat-vierge' ? (
                                    <>
                                        <div style={{ width: '16px', height: '16px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                        Génération...
                                    </>
                                ) : (
                                    <><span>📜</span> Télécharger mon Contrat (non signé)</>
                                )}
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

                <div style={{ padding: '24px', minHeight: '300px' }} onDragOver={onDragOver} onDrop={onDrop}>
                    {!documents || documents.length === 0 ? (
                        <div className="ec-empty" style={{ textAlign: 'center', padding: '60px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                            <p style={{ color: '#64748B', fontSize: '15px' }}>Aucun document déposé pour le moment.</p>
                            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>Glissez-déposez un fichier ici pour l'envoyer.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Documents from Client */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    Mes documents déposés
                                </h3>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {(documents || []).filter(doc => {
                                        if (!doc || doc.owner !== 'client') return false;
                                        const name = doc.name?.toLowerCase() || '';
                                        if (name.includes('kbis')) return false;
                                        if (name.includes('contrat signé')) return false;
                                        if (name.includes('procuration signée')) return false;
                                        if (name.includes('procuration postale')) return false;
                                        return true;
                                    }).map(doc => {
                                        return (
                                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                                {downloadingDocId === doc.id && (
                                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', zIndex: 10 }}>
                                                        <div style={{ width: '16px', height: '16px', border: '2px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                    </div>
                                                )}
                                                <a
                                                    href={(!doc.url || doc.url.startsWith('#') || doc.url.startsWith('data:')) ? '#' : doc.url}
                                                    onClick={async (e) => {
                                                        if (!checkApproval()) { e.preventDefault(); return; }
                                                        if (doc.url && doc.url.startsWith('data:')) {
                                                            e.preventDefault();
                                                            handleDataUrlDownload(doc.url, doc.name || 'document.pdf');
                                                            return;
                                                        }
                                                        if (doc.url === '#local-signature') {
                                                            e.preventDefault();
                                                            if (downloadingDocId) return;
                                                            setDownloadingDocId(doc.id);
                                                            try {
                                                                const sig = localSignatureUrl || signatureInfo?.contractSignatureUrl;
                                                                if (!sig) throw new Error("Données de signature introuvables en mémoire.");
                                                                const blob = await generateSignedContratBlob(clientData, sig);
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `Contrat_Signe_${clientData.company || clientData.id}.pdf`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                document.body.removeChild(a);
                                                                URL.revokeObjectURL(url);
                                                            } catch (err) {
                                                                alert("Erreur: " + err.message);
                                                            } finally {
                                                                setDownloadingDocId(null);
                                                            }
                                                        } else if (doc.url === '#local-procuration') {
                                                            e.preventDefault();
                                                            if (downloadingDocId) return;
                                                            setDownloadingDocId(doc.id);
                                                            try {
                                                                const sig = localProcSignatureUrl || procInfo?.procurationSignatureUrl;
                                                                const data = procInfo?.procurationData || procurationFormData;
                                                                if (!sig) throw new Error("Données de signature de procuration introuvables.");
                                                                const blob = await generateSignedProcurationBlob(clientData, sig, data);
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `Procuration_${clientData.company || clientData.id}.pdf`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                document.body.removeChild(a);
                                                                URL.revokeObjectURL(url);
                                                            } catch (err) {
                                                                alert("Erreur: " + err.message);
                                                            } finally {
                                                                setDownloadingDocId(null);
                                                            }
                                                        }
                                                    }}
                                                    target={(!doc.url || doc.url.startsWith('#') || doc.url.startsWith('data:')) ? undefined : "_blank"}
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                        background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                        color: '#334155', fontWeight: 600, fontSize: '13px'
                                                    }}
                                                >
                                                    👁️ {doc.title || doc.name || 'Document sans titre'}
                                                </a>
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
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: '#fee2e2',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '8px',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                    }}
                                                    title="Supprimer ce document"
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {(documents || []).filter(doc => {
                                        if (!doc || doc.owner !== 'client') return false;
                                        const name = doc.name?.toLowerCase() || '';
                                        if (name.includes('kbis')) return false;
                                        if (name.includes('contrat signé')) return false;
                                        if (name.includes('procuration signée')) return false;
                                        if (name.includes('procuration postale')) return false;
                                        return true;
                                    }).length === 0 && (
                                        <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Aucun document déposé par vous.</div>
                                    )}
                                </div>
                            </div>

                            {/* Documents from Admin */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    Documents administratifs (MW CREA)
                                </h3>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {(documents || []).filter(doc => doc && doc.owner !== 'client').map(doc => {
                                        return (
                                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                                {downloadingDocId === doc.id && (
                                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', zIndex: 10 }}>
                                                        <div style={{ width: '16px', height: '16px', border: '2px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                    </div>
                                                )}
                                                <a
                                                    href={(doc.url && doc.url.startsWith('data:')) ? '#' : doc.url}
                                                    onClick={(e) => {
                                                        if (!checkApproval()) { e.preventDefault(); return; }
                                                        if (doc.url && doc.url.startsWith('data:')) {
                                                            e.preventDefault();
                                                            handleDataUrlDownload(doc.url, doc.name || 'document.pdf');
                                                        }
                                                    }}
                                                    target={(doc.url && doc.url.startsWith('data:')) ? undefined : "_blank"}
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                        background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                        color: '#334155', fontWeight: 600, fontSize: '13px'
                                                    }}
                                                >
                                                    👁️ {doc.title || doc.name || 'Document sans titre'}
                                                </a>
                                            </div>
                                        );
                                    })}
                                    {(documents || []).filter(doc => doc && doc.owner !== 'client').length === 0 && (
                                        <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Aucun document administratif.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                    <strong>Note :</strong> Cet espace réunit vos pièces justificatives (KBIS, statuts), vos factures et vos contrats de domiciliation officielle.
                    Vous pouvez télétransmettre de nouvelles pièces justificatives en glissant vos fichiers dans la zone ci-dessus.
                </p>
            </div>

            {/* Custom Modal for Naming Documents */}
            {fileToName && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#3B82F6' }}>
                                📄
                            </div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Nommer le document</h2>
                        </div>
                        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px', lineHeight: 1.5 }}>
                            Entrez un nom pour votre document ou laissez ce champ vide pour utiliser le nom d'origine.
                        </p>
                        <input
                            type="text"
                            value={customFileName}
                            onChange={(e) => setCustomFileName(e.target.value)}
                            placeholder={fileToName.name}
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #CBD5E1',
                                outline: 'none', marginBottom: '24px', fontSize: '14px', boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmFileUpload();
                            }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setFileToName(null);
                                    setCustomFileName('');
                                }}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmFileUpload}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showSignModal && (
                <SignatureModal
                    clientData={clientData}
                    onClose={() => setShowSignModal(false)}
                    onSigned={handleSigned}
                />
            )}

            {/* Modal de formulaire de procuration */}
            {showProcurationForm && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#3B82F6' }}>
                                    📝
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Procuration</h2>
                                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>Informations requises</p>
                                </div>
                            </div>
                            <button onClick={() => setShowProcurationForm(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Date de naissance</label>
                                    <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.dateNaissance} onChange={e => setProcurationFormData({ ...procurationFormData, dateNaissance: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Lieu de naissance</label>
                                    <input type="text" placeholder="Ex: Toulouse" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.lieuNaissance} onChange={e => setProcurationFormData({ ...procurationFormData, lieuNaissance: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Type de pièce d'identité</label>
                                <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }} value={procurationFormData.typePiece} onChange={e => setProcurationFormData({ ...procurationFormData, typePiece: e.target.value })}>
                                    <option>Carte d'Identité</option>
                                    <option>Passeport</option>
                                    <option>Titre de Séjour</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Numéro de la pièce</label>
                                <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.numeroPiece} onChange={e => setProcurationFormData({ ...procurationFormData, numeroPiece: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Délivrée le</label>
                                    <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.dateDelivrance} onChange={e => setProcurationFormData({ ...procurationFormData, dateDelivrance: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Par l'autorité</label>
                                    <input type="text" placeholder="Ex: Préfecture" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.autoriteDelivrance} onChange={e => setProcurationFormData({ ...procurationFormData, autoriteDelivrance: e.target.value })} />
                                </div>
                            </div>

                            {/* Nouveaux champs pour l'adresse d'expédition (optionnels) */}
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                                <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#0f172a' }}>Adresse du destinataire (Optionnel)</h3>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>N°, TYPE et NOM DE LA VOIE</label>
                                    <input type="text" placeholder="Ex: 10 Rue de la Paix" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', marginBottom: '10px' }} value={procurationFormData.adresseVoie} onChange={e => setProcurationFormData({ ...procurationFormData, adresseVoie: e.target.value })} />
                                </div>

                                <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Point de remise (appart, étage)</label>
                                        <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.pointRemise} onChange={e => setProcurationFormData({ ...procurationFormData, pointRemise: e.target.value })} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Complément (bâtiment, résidence)</label>
                                        <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.complementAdresse} onChange={e => setProcurationFormData({ ...procurationFormData, complementAdresse: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Code Postal & Ville</label>
                                        <input type="text" placeholder="Ex: 75001 Paris" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.codePostalVille} onChange={e => setProcurationFormData({ ...procurationFormData, codePostalVille: e.target.value })} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Lieu dit (BP, etc.)</label>
                                        <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.lieuDit} onChange={e => setProcurationFormData({ ...procurationFormData, lieuDit: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                            <button onClick={() => setShowProcurationForm(false)} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#64748B', transition: 'background 0.2s' }}>Annuler</button>
                            <button onClick={() => {
                                setShowProcurationForm(false);
                                setShowProcurationSignModal(true);
                            }} style={{ flex: 1, padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Suivant : Signer</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de signature pour la procuration */}
            {showProcurationSignModal && (
                <SignatureModal
                    clientData={clientData}
                    onClose={() => setShowProcurationSignModal(false)}
                    onSigned={handleSignProcuration}
                />
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
