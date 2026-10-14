import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { fetchWithRetry } from '../../../utils/api';
import { uploadFile } from '../../../utils/cloudinary';
import { convertPdfToPng } from '../../../utils/pdfConverter';
import { generateAttestationPdf, generateContratPdf, generateSignedContratBlob, generateSignedProcurationBlob } from '../../../utils/pdfGenerator';
import SignatureModal from '../../../components/SignatureModal/SignatureModal';
import AddressAutocomplete from '../../../components/AddressAutocomplete/AddressAutocomplete';
import { useTranslation } from '../../../i18n/LanguageContext';
import { parseExtraInfo, getContractLegalFields } from '../../../utils/contractLegalFields';
import { appAlert, appConfirm } from '../../../components/AppDialog/dialogApi';

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

const isUsableDocUrl = (url) => Boolean(url) && url !== '#' && !String(url).startsWith('#local');

/** Ouvre un document http(s) ou data: (les PDF client sont stockés en data URL, pas en lien Cloudinary). */
export function openStoredDocument(url, filename = 'document.pdf') {
    if (!isUsableDocUrl(url)) return false;
    if (url.startsWith('data:')) {
        try {
            const comma = url.indexOf(',');
            if (comma < 0) {
                handleDataUrlDownload(url, filename);
                return true;
            }
            const mime = (url.slice(5, comma).split(';')[0] || 'application/octet-stream').trim();
            const binary = atob(url.slice(comma + 1));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
            const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');
            if (!opened) handleDataUrlDownload(url, filename);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
            return true;
        } catch {
            handleDataUrlDownload(url, filename);
            return true;
        }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
}

export default function Docs({ documents, setDocuments, clientData, setClientData }) {
    const { t } = useTranslation();
    const [isUploading, setIsUploading] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [signStatus, setSignStatus] = useState(null); // null | 'loading' | 'done' | 'error'
    const [signedUrl, setSignedUrl] = useState(null);
    const [localSignatureUrl, setLocalSignatureUrl] = useState(null);
    const [downloadingDocId, setDownloadingDocId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [fileToName, setFileToName] = useState(null);
    const [customFileName, setCustomFileName] = useState('');
    const [pendingFileName, setPendingFileName] = useState('');

    // Procuration Postale States
    const [localProcSignatureUrl, setLocalProcSignatureUrl] = useState(null);
    const [showProcurationForm, setShowProcurationForm] = useState(false);
    const [showProcurationSignModal, setShowProcurationSignModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [procSignStatus, setProcSignStatus] = useState(null);
    const [isUploadingKbis, setIsUploadingKbis] = useState(false);
    const [localKbisUrl, setLocalKbisUrl] = useState(null);
    const [procurationFormData, setProcurationFormData] = useState({
        lieuNaissance: '', dateNaissance: '', typePiece: "Carte d'Identité", numeroPiece: '', dateDelivrance: '', autoriteDelivrance: '',
        pointRemise: '', complementAdresse: '', adresseVoie: '', lieuDit: '', codePostalVille: '', siret: '', siren: ''
    });
    const [showLegalModal, setShowLegalModal] = useState(false);
    const [legalSaving, setLegalSaving] = useState(false);
    const [legalError, setLegalError] = useState('');
    const [legalForm, setLegalForm] = useState({
        prenom: '', nom: '', company: '', address: '',
        nationalite: 'Française', qualite: 'Gérant', dateNaissance: '', lieuNaissance: '',
    });

    const parsedExtraInfo = useMemo(() => parseExtraInfo(clientData?.extra_info), [clientData]);
    const hasKbis = !!(parsedExtraInfo.kbisUrl || localKbisUrl);

    const checkApproval = () => {
        if (clientData?.isTemporary || clientData?.status === 'en_attente_validation') {
            setShowApprovalModal(true);
            return false;
        }
        return true;
    };

    const handleViewStoredDoc = (url, filename) => {
        if (!openStoredDocument(url, filename)) {
            appAlert(t('espaceClient.docs.viewUnavailable'));
        }
    };

    const openLegalOrSign = () => {
        if (!checkApproval()) return;
        const fields = getContractLegalFields(clientData);
        if (fields.missing.length === 0) {
            if (isSaving) return;
            setShowSignModal(true);
            return;
        }
        setLegalError('');
        setLegalForm({
            prenom: fields.prenom,
            nom: fields.nom,
            company: fields.compName,
            address: fields.address,
            nationalite: fields.nationalite || 'Française',
            qualite: fields.qualite || 'Gérant',
            dateNaissance: fields.dateNaissance,
            lieuNaissance: fields.lieuNaissance,
        });
        setShowLegalModal(true);
    };

    const handleLegalSubmit = async (e) => {
        e.preventDefault();
        const prenom = legalForm.prenom.trim();
        const nom = legalForm.nom.trim();
        const company = legalForm.company.trim();
        const address = legalForm.address.trim();
        const nationalite = legalForm.nationalite.trim();
        const qualite = legalForm.qualite.trim();
        const dateNaissance = legalForm.dateNaissance.trim();
        const lieuNaissance = legalForm.lieuNaissance.trim();
        if (!prenom || !nom || !company || !address || !nationalite || !qualite || !dateNaissance || !lieuNaissance) {
            setLegalError(t('espaceClient.docs.legalRequired'));
            return;
        }
        setLegalSaving(true);
        setLegalError('');
        try {
            const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, {
                prenom,
                nom,
                nomSociete: company,
                adressePerso: address,
                nationalite,
                qualite,
                dateNaissance,
                lieuNaissance,
            });
            await adminDataService.updateClientAddress(clientData.id, address);
            if (setClientData) {
                setClientData((prev) => ({
                    ...prev,
                    name: `${prenom} ${nom}`.trim(),
                    company,
                    address,
                    extra_info: JSON.stringify(updatedExtra),
                }));
            }
            setShowLegalModal(false);
            setShowSignModal(true);
        } catch (err) {
            console.error(err);
            setLegalError(t('espaceClient.docs.legalSaveError'));
        } finally {
            setLegalSaving(false);
        }
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
            appAlert(t('espaceClient.docs.kbisUploadError'));
        } finally {
            setIsUploadingKbis(false);
            if (e.target) e.target.value = '';
        }
    };

    const procInfo = useMemo(() => {
        const e = parseExtraInfo(clientData?.extra_info);
        return e?.procurationSigned ? e : null;
    }, [clientData]);

    const isProcSigned = !!(procInfo?.procurationSigned || localProcSignatureUrl);
    // Prioritize local generation over Cloudinary URL to avoid 401 HTTP issues
    const procUrl = (localProcSignatureUrl || procInfo?.procurationSignatureUrl) ? '#local-procuration' : procInfo?.procurationSignedUrl;
    const procSignedAt = procInfo?.procurationSignedAt;

    // Lire le statut de signature depuis extra_info
    const signatureInfo = useMemo(() => {
        const e = parseExtraInfo(clientData?.extra_info);
        return e?.contractSigned ? e : null;
    }, [clientData]);

    const isSigned = !!(signatureInfo?.contractSigned || signedUrl);
    // Prioritize local generation over Cloudinary URL to avoid 401 HTTP issues
    const contractUrl = (signedUrl === '#local-signature' || localSignatureUrl || signatureInfo?.contractSignatureUrl) ? '#local-signature' : (signedUrl || signatureInfo?.contractSignedUrl);
    const signedAt = signatureInfo?.contractSignedAt;

    const handleUploadClick = () => {
        setPendingFileName('');
        document.getElementById('file-upload').click();
    };

    const handleSpecificUploadClick = (name) => {
        setPendingFileName(name);
        document.getElementById('file-upload').click();
    };

    const handleFileChange = async (e) => {
        const originalFile = e.target.files[0];
        if (!originalFile) return;

        // Clear value immediately to prevent double events
        if (e.target.value !== undefined) e.target.value = '';

        setFileToName(originalFile);
        setCustomFileName(pendingFileName);
        setPendingFileName('');
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
            appAlert(t('espaceClient.docs.docUploadError'));
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
            step = 'Preuve de signature';
            const logRes = await fetchWithRetry('/api/log-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: clientData.id,
                    contractRef: 'contrat_domiciliation',
                    signeeName: clientData.representant?.nom || clientData.nom || 'Client',
                    signeeEmail: clientData.email || 'client@example.com'
                })
            });
            if (!logRes.ok) throw new Error(`Erreur logs de signature: ${logRes.status}`);
            const signProof = await logRes.json();

            step = 'Génération et Upload du Contrat PDF';
            console.log("Génération du contrat...");
            const pdfBlob = await generateSignedContratBlob(clientData, signatureDataUrl, signProof);
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
                setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra.merged || updatedExtra) }));
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

            // Envoi de l'email post-signature
            try {
                await fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: clientData.email,
                        nom: clientData.representant?.nom || clientData.nom || 'Client',
                        type: 'post_signature'
                    })
                });
            } catch(e) {
                console.warn("Erreur email post-signature", e);
            }

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
            step = 'Preuve de signature';
            const logRes = await fetchWithRetry('/api/log-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: clientData.id,
                    contractRef: 'procuration_postale',
                    signeeName: clientData.representant?.nom || clientData.nom || 'Client',
                    signeeEmail: clientData.email || 'client@example.com'
                })
            });
            if (!logRes.ok) throw new Error(`Erreur logs de signature: ${logRes.status}`);
            const signProof = await logRes.json();

            step = 'Génération et Upload de la Procuration';
            console.log("Génération de la procuration...");
            const pdfBlob = await generateSignedProcurationBlob(clientData, signatureDataUrl, procurationFormData, signProof);
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
                setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtraProc.merged || updatedExtraProc) }));
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

            // Envoi de l'email procuration
            try {
                await fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: clientData.email,
                        nom: clientData.representant?.nom || clientData.nom || 'Client',
                        type: 'procuration_postale'
                    })
                });
            } catch(e) {
                console.warn("Erreur email procuration", e);
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
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>{t('espaceClient.docs.dossierTitle')}</h2>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
                    {t('espaceClient.docs.introLead')}<strong>{t('espaceClient.docs.introStrong')}</strong>{t('espaceClient.docs.introRest')}
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
                                {isSigned ? t('espaceClient.docs.step1Signed') : t('espaceClient.docs.step1Unsigned')}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                {isSigned
                                    ? t('espaceClient.docs.signedOn').replace('{date}', signedAt ? new Date(signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
                                    : t('espaceClient.docs.legalHint')}
                            </div>
                        </div>
                    </div>
                    {isSigned && (
                        <span style={{
                            background: '#dcfce7', color: '#15803d', fontSize: '11px',
                            fontWeight: 700, padding: '4px 12px', borderRadius: '99px'
                        }}>
                            {t('espaceClient.docs.validated')}
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
                                    <p style={{ margin: 0, fontWeight: 600 }}>{t('espaceClient.docs.generatingContract')}</p>
                                </div>
                            )}
                            {signStatus === 'error' && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                                    {t('espaceClient.docs.signError')}
                                </div>
                            )}
                            {signStatus !== 'loading' && (
                                <>
                                    <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
                                        {t('espaceClient.docs.contractBodyLead')}<strong>{t('espaceClient.docs.contractBodyStrong')}</strong>{t('espaceClient.docs.contractBodyRest')}
                                    </p>
                                    <button
                                        onClick={openLegalOrSign}
                                        disabled={isSaving || signStatus === 'loading'}
                                        style={{
                                            width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                                            background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #1e40af, #0f172a)',
                                            color: 'white', fontWeight: 700, fontSize: '14px', cursor: isSaving ? 'default' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            opacity: isSaving ? 0.6 : 1
                                        }}
                                    >
                                        {isSaving ? t('espaceClient.docs.saving') : t('espaceClient.docs.signNow')}
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                                <span style={{ fontSize: '18px' }}>🎉</span>
                                {t('espaceClient.docs.contractSignedOk')}
                            </div>

                            {/* Bouton téléchargement */}
                            {contractUrl && (
                                <a
                                    href={contractUrl === '#local-signature' ? '#' : contractUrl}
                                    onClick={async (e) => {
                                        if (!checkApproval()) { e.preventDefault(); return; }
                                        if (e.target.href.includes('#local-signature') || contractUrl === '#local-signature') {
                                            e.preventDefault();
                                            if (downloadingDocId) return;
                                            setDownloadingDocId('contrat-signe');
                                            try {
                                                console.log("Tentative de génération du PDF...");
                                                const sig = localSignatureUrl || signatureInfo?.contractSignatureUrl;
                                                if (!sig) {
                                                    throw new Error(t('espaceClient.docs.signatureMissing'));
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
                                                appAlert(t('espaceClient.docs.errorPrefix').replace('{message}', err.message));
                                            } finally {
                                                setDownloadingDocId(null);
                                            }
                                        } else if (contractUrl && contractUrl.startsWith('data:')) {
                                            e.preventDefault();
                                            handleDataUrlDownload(contractUrl, `Contrat_Signe_${clientData.company || clientData.id}.pdf`);
                                        }
                                    }}
                                    target={(contractUrl === '#local-signature' || (contractUrl && contractUrl.startsWith('data:'))) ? '_self' : '_blank'}
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
                                            {t('espaceClient.docs.generatingPdf')}
                                        </>
                                    ) : (
                                        <>{t('espaceClient.docs.downloadSignedContract')}</>
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
                                {isProcSigned ? t('espaceClient.docs.step2Signed') : t('espaceClient.docs.step2Unsigned')}
                            </div>
                            <div style={{ fontSize: '12px', color: isProcSigned ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: '2px' }}>
                                {isProcSigned
                                    ? t('espaceClient.docs.signedOnFem').replace('{date}', procSignedAt ? new Date(procSignedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
                                    : t('espaceClient.docs.procHint')}
                            </div>
                        </div>
                    </div>
                    {isProcSigned && (
                        <span style={{
                            background: '#dcfce7', color: '#15803d', fontSize: '11px',
                            fontWeight: 700, padding: '4px 12px', borderRadius: '99px'
                        }}>
                            {t('espaceClient.docs.validated')}
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
                                    <p style={{ margin: 0, fontWeight: 600 }}>{t('espaceClient.docs.generatingProc')}</p>
                                </div>
                            )}
                            {procSignStatus === 'error' && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                                    {t('espaceClient.docs.procError').replace('{message}', window.lastProcSignError || t('espaceClient.docs.unknownError'))}
                                </div>
                            )}
                            {procSignStatus !== 'loading' && (
                                <>
                                    <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
                                        {t('espaceClient.docs.procBodyLead')}<strong>{t('espaceClient.docs.procBodyStrong')}</strong>{t('espaceClient.docs.procBodyRest')}{hasKbis ? t('espaceClient.docs.procBodyHasKbis') : t('espaceClient.docs.procBodyNoKbis')}
                                    </p>
                                    {!hasKbis ? (
                                        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 600 }}>{t('espaceClient.docs.dropKbis')}</p>
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
                                                        {t('espaceClient.docs.uploading')}
                                                    </span>
                                                ) : t('espaceClient.docs.dropMyKbis')}
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
                                            {t('espaceClient.docs.createProc')}
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                                <span style={{ fontSize: '18px' }}>🎉</span>
                                {t('espaceClient.docs.procSignedOk')}
                            </div>

                            {/* Bouton téléchargement */}
                            {procUrl && (
                                <a
                                    href={procUrl === '#local-procuration' ? '#' : procUrl}
                                    onClick={async (e) => {
                                        if (!checkApproval()) { e.preventDefault(); return; }
                                        if (e.target.href.includes('#local-procuration') || procUrl === '#local-procuration') {
                                            e.preventDefault();
                                            if (downloadingDocId) return;
                                            setDownloadingDocId('procuration-signe');
                                            try {
                                                console.log("Tentative de génération de la procuration...");
                                                const sig = localProcSignatureUrl || procInfo?.procurationSignatureUrl;
                                                const data = procInfo?.procurationData || procurationFormData;
                                                if (!sig) {
                                                    throw new Error(t('espaceClient.docs.signatureMissing'));
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
                                                appAlert(t('espaceClient.docs.errorPrefix').replace('{message}', err.message));
                                            } finally {
                                                setDownloadingDocId(null);
                                            }
                                        } else if (procUrl && procUrl.startsWith('data:')) {
                                            e.preventDefault();
                                            handleDataUrlDownload(procUrl, `Procuration_${clientData.company || clientData.id}.pdf`);
                                        }
                                    }}
                                    target={(procUrl === '#local-procuration' || (procUrl && procUrl.startsWith('data:'))) ? '_self' : '_blank'}
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
                                            {t('espaceClient.docs.generatingPdf')}
                                        </>
                                    ) : (
                                        <>{t('espaceClient.docs.downloadProc')}</>
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
                    <span>3️⃣</span> {t('espaceClient.docs.step3')}
                </h2>
                <div className="ec-grid-docs">
                    <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '24px' }}>📝</span>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{t('espaceClient.docs.generatorTitle')}</h3>
                            </div>
                            <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                {t('espaceClient.docs.generatorHint')}
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
                                        {t('espaceClient.docs.generating')}
                                    </>
                                ) : (
                                    <><span>📥</span> {t('espaceClient.docs.downloadAttestation')}</>
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
                                        {t('espaceClient.docs.generating')}
                                    </>
                                ) : (
                                    <><span>📜</span> {t('espaceClient.docs.downloadUnsignedContract')}</>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🛡️</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{t('espaceClient.docs.approvalTitle')}</h3>
                                    <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>{t('espaceClient.docs.official')}</span>
                                </div>
                            </div>
                            <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                {t('espaceClient.docs.approvalHint')}
                            </p>
                        </div>
                        <div>
                            <a href="/Agrement_CASSIN.pdf" target="_blank" rel="noopener noreferrer" className="ec-btn-primary" style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}>
                                <span>👁️</span> {t('espaceClient.docs.viewApproval')}
                            </a>
                        </div>
                    </div>

                    <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🏢</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{t('espaceClient.docs.kbisTitle')}</h3>
                                    <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>{t('espaceClient.docs.official')}</span>
                                </div>
                            </div>
                            <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                {t('espaceClient.docs.kbisHint')}
                            </p>
                        </div>
                        <div>
                            <a href="/Extrait_KBIS_CASSIN.pdf" target="_blank" rel="noopener noreferrer" className="ec-btn-primary" style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}>
                                <span>👁️</span> {t('espaceClient.docs.viewKbis')}
                            </a>
                        </div>
                    </div>

                    <div className="ec-content-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E2E8F0', background: '#FFFFFF', borderRadius: '16px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '24px' }}>✉️</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{t('espaceClient.docs.postalTitle')}</h3>
                                    <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>{t('espaceClient.docs.required')}</span>
                                </div>
                            </div>
                            <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                <strong>{t('espaceClient.docs.postalBodyStrong')}</strong>{t('espaceClient.docs.postalBodyRest')}
                            </p>
                        </div>
                        <div>
                            <a href="/Procuration_Postale.pdf" target="_blank" rel="noopener noreferrer" className="ec-btn-primary" style={{ textDecoration: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '13px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', textAlign: 'center' }}>
                                <span>📥</span> {t('espaceClient.docs.downloadPostal')}
                            </a>
                            <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
                                {t('espaceClient.docs.fillSignDrop')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MES DOCUMENTS PARTAGÉS ───────────────────────────── */}
            <div className="ec-content-card">
                <div className="ec-card-header">
                    <div className="ec-breadcrumb">
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{t('espaceClient.docs.sharedTitle')}</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="file" id="file-upload" style={{ display: 'none' }} onChange={handleFileChange} disabled={isUploading} />
                        <button className="ec-btn-primary" onClick={handleUploadClick} disabled={isUploading}>
                            {isUploading ? t('espaceClient.docs.transferring') : t('espaceClient.docs.dropDocument')}
                        </button>
                    </div>
                </div>

                <div style={{ padding: '24px', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '32px' }} onDragOver={onDragOver} onDrop={onDrop}>
                    {(() => {
                        const idDoc = documents?.find(d => d.name.toLowerCase().match(/identit|séjour|passeport|cni/));
                        const domicileDoc = documents?.find(d => d.name.toLowerCase().match(/domicile|justificatif/));
                        const statutDoc = documents?.find(d => d.name.toLowerCase().match(/statut|kbis/));

                        const requiredDocs = [
                            {
                                id: 'statut',
                                name: t('espaceClient.docs.reqStatutTitle'),
                                label: "Projet Statut",
                                description: t('espaceClient.docs.reqStatutDesc'),
                                doc: statutDoc,
                                fallbackUrl: parsedExtraInfo.kbisUrl || localKbisUrl,
                            },
                            {
                                id: 'id',
                                name: t('espaceClient.docs.reqIdTitle'),
                                label: "Pièce d'identité",
                                description: t('espaceClient.docs.reqIdDesc'),
                                doc: idDoc,
                                fallbackUrl: parsedExtraInfo.pieceIdentiteUrl || parsedExtraInfo.pieceIdentiteRecto,
                            },
                            {
                                id: 'domicile',
                                name: t('espaceClient.docs.reqHomeTitle'),
                                label: "Justificatif de domicile",
                                description: t('espaceClient.docs.reqHomeDesc'),
                                doc: domicileDoc,
                                fallbackUrl: parsedExtraInfo.justificatifDomicileUrl,
                            }
                        ];

                        const otherDocs = (documents || []).filter(doc => {
                            if (!doc || doc.owner !== 'client') return false;
                            const name = doc.name?.toLowerCase() || '';
                            if (name.includes('kbis')) return false;
                            if (name.includes('contrat signé')) return false;
                            if (name.includes('procuration signée')) return false;
                            if (name.includes('procuration postale')) return false;
                            if (doc.id === statutDoc?.id || doc.id === idDoc?.id || doc.id === domicileDoc?.id) return false;
                            return true;
                        });

                        return (
                            <>
                                {/* SECTION 1: DOCUMENTS REQUIS */}
                                <div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: '#F1F5F9', borderRadius: '6px' }}>📋</span>
                                        {t('espaceClient.docs.adminRequired')}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                        {requiredDocs.map((req, idx) => (
                                            <div key={idx} style={{ background: req.doc ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${req.doc ? '#BBF7D0' : '#FECACA'}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: req.doc ? '#166534' : '#991B1B', margin: 0, paddingRight: '12px' }}>{req.name}</h4>
                                                        {req.doc ? (
                                                            <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('espaceClient.docs.provided')}</span>
                                                        ) : (
                                                            <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('espaceClient.docs.toProvide')}</span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: req.doc ? '#166534' : '#991B1B', opacity: 0.8, margin: 0 }}>{req.description}</p>
                                                </div>

                                                <div>
                                                    {req.doc ? (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const url = isUsableDocUrl(req.doc.url) ? req.doc.url : req.fallbackUrl;
                                                                    handleViewStoredDoc(url, req.doc.name || 'document.pdf');
                                                                }}
                                                                style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'white', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                                            >
                                                                {t('espaceClient.docs.viewDocument')}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (await appConfirm(t('espaceClient.docs.deleteConfirm'), {
                                                                        title: t('espaceClient.docs.deleteTitle'),
                                                                        confirmText: t('espaceClient.docs.deleteOk'),
                                                                        isDanger: true,
                                                                    })) {
                                                                        try {
                                                                            await adminDataService.deleteDocument(req.doc.id);
                                                                            setDocuments(prev => (prev || []).filter(x => x.id !== req.doc.id));
                                                                        } catch (err) { appAlert(t('espaceClient.docs.deleteError')); }
                                                                    }
                                                                }}
                                                                style={{ padding: '8px', background: 'white', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', cursor: 'pointer' }}
                                                            >
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSpecificUploadClick(req.label)}
                                                            style={{ width: '100%', padding: '8px', background: '#DC2626', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                                        >
                                                            {t('espaceClient.docs.attachFile')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* SECTION 2: AUTRES DOCUMENTS */}
                                <div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: '#F1F5F9', borderRadius: '6px' }}>📁</span>
                                        {t('espaceClient.docs.otherDocs')}
                                    </h3>
                                    
                                    {otherDocs.length === 0 ? (
                                        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
                                            <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>{t('espaceClient.docs.noOther')}</p>
                                            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>{t('espaceClient.docs.noOtherHint')}</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                            {otherDocs.map(doc => (
                                                <div key={doc.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                                        <div style={{ width: '36px', height: '36px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                                                            📄
                                                        </div>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name || t('espaceClient.docs.documentFallback')}</div>
                                                            <div style={{ fontSize: '11px', color: '#64748B' }}>{t('espaceClient.docs.sharedOn').replace('{date}', new Date(doc.date).toLocaleDateString())}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewStoredDoc(doc.url, doc.name || 'document.pdf')}
                                                            style={{ padding: '6px 10px', background: '#F1F5F9', borderRadius: '6px', color: '#475569', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                                                        >
                                                            {t('espaceClient.docs.view')}
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (await appConfirm(t('espaceClient.docs.deleteConfirm'), {
                                                                    title: t('espaceClient.docs.deleteTitle'),
                                                                    confirmText: t('espaceClient.docs.deleteOk'),
                                                                    isDanger: true,
                                                                })) {
                                                                    try {
                                                                        await adminDataService.deleteDocument(doc.id);
                                                                        setDocuments(prev => (prev || []).filter(x => x.id !== doc.id));
                                                                    } catch (err) { appAlert(t('espaceClient.docs.deleteError')); }
                                                                }
                                                            }}
                                                            style={{ padding: '6px 10px', background: '#FEE2E2', border: 'none', borderRadius: '6px', color: '#EF4444', cursor: 'pointer' }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            
                            {/* SECTION 3: Documents from Admin */}
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: '#F1F5F9', borderRadius: '6px' }}>🏛️</span>
                                    {t('espaceClient.docs.adminMw')}
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
                                                    {doc.title || doc.name || t('espaceClient.docs.untitled')}
                                                </a>
                                            </div>
                                        );
                                    })}
                                    {(documents || []).filter(doc => doc && doc.owner !== 'client').length === 0 && (
                                        <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>{t('espaceClient.docs.noAdmin')}</div>
                                    )}
                                </div>
                            </div>
                        </>
                        );
                    })()}
                </div>
            </div>

            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                    <strong>{t('espaceClient.docs.note')}</strong>{t('espaceClient.docs.noteBody')}
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
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>{t('espaceClient.docs.nameDoc')}</h2>
                        </div>
                        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px', lineHeight: 1.5 }}>
                            {t('espaceClient.docs.nameDocHint')}
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
                                {t('espaceClient.docs.cancel')}
                            </button>
                            <button
                                onClick={confirmFileUpload}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                            >
                                {t('espaceClient.docs.validate')}
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
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>{t('espaceClient.docs.procFormTitle')}</h2>
                                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>{t('espaceClient.docs.procFormHint')}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowProcurationForm(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.birthDate')}</label>
                                    <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.dateNaissance} onChange={e => setProcurationFormData({ ...procurationFormData, dateNaissance: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.birthPlace')}</label>
                                    <input type="text" placeholder={t('espaceClient.docs.birthPlacePh')} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.lieuNaissance} onChange={e => setProcurationFormData({ ...procurationFormData, lieuNaissance: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.idType')}</label>
                                <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }} value={procurationFormData.typePiece} onChange={e => setProcurationFormData({ ...procurationFormData, typePiece: e.target.value })}>
                                    <option value="Carte d'Identité">{t('espaceClient.docs.idTypeId')}</option>
                                    <option value="Passeport">{t('espaceClient.docs.idTypePassport')}</option>
                                    <option value="Titre de Séjour">{t('espaceClient.docs.idTypeResidence')}</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.idNumber')}</label>
                                <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.numeroPiece} onChange={e => setProcurationFormData({ ...procurationFormData, numeroPiece: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.issuedOn')}</label>
                                    <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.dateDelivrance} onChange={e => setProcurationFormData({ ...procurationFormData, dateDelivrance: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.issuedBy')}</label>
                                    <input type="text" placeholder={t('espaceClient.docs.issuedByPh')} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.autoriteDelivrance} onChange={e => setProcurationFormData({ ...procurationFormData, autoriteDelivrance: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.siret')}</label>
                                <input type="text" placeholder="Ex: 12345678900012" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.siret || ''} onChange={e => setProcurationFormData({ ...procurationFormData, siret: e.target.value })} />
                            </div>
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.siren')}</label>
                                <input type="text" placeholder="Ex: 123456789" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.siren || ''} onChange={e => setProcurationFormData({ ...procurationFormData, siren: e.target.value })} />
                            </div>

                            {/* Nouveaux champs pour l'adresse d'expédition (optionnels) */}
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                                <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#0f172a' }}>{t('espaceClient.docs.recipientAddress')}</h3>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.street')}</label>
                                    <input type="text" placeholder={t('espaceClient.docs.streetPh')} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', marginBottom: '10px' }} value={procurationFormData.adresseVoie} onChange={e => setProcurationFormData({ ...procurationFormData, adresseVoie: e.target.value })} />
                                </div>

                                <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.deliveryPoint')}</label>
                                        <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.pointRemise} onChange={e => setProcurationFormData({ ...procurationFormData, pointRemise: e.target.value })} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.complement')}</label>
                                        <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.complementAdresse} onChange={e => setProcurationFormData({ ...procurationFormData, complementAdresse: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.postcodeCity')}</label>
                                        <AddressAutocomplete
                                            value={procurationFormData.codePostalVille}
                                            onChange={(codePostalVille) => setProcurationFormData({ ...procurationFormData, codePostalVille })}
                                            searchType="municipality"
                                            placeholder={t('espaceClient.docs.postcodeCityPh')}
                                            noResultsLabel={t('espaceClient.docs.cityNoResults')}
                                            inputStyle={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>{t('espaceClient.docs.locality')}</label>
                                        <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} value={procurationFormData.lieuDit} onChange={e => setProcurationFormData({ ...procurationFormData, lieuDit: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                            <button onClick={() => setShowProcurationForm(false)} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#64748B', transition: 'background 0.2s' }}>{t('espaceClient.docs.cancel')}</button>
                            <button onClick={() => {
                                setShowProcurationForm(false);
                                setShowProcurationSignModal(true);
                            }} style={{ flex: 1, padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{t('espaceClient.docs.nextSign')}</button>
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

            {/* Modal Approval */}
            {showLegalModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
                    <form onSubmit={handleLegalSubmit} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', margin: '24px 0' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>{t('espaceClient.docs.legalModalTitle')}</h2>
                        <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.55, margin: '0 0 20px' }}>{t('espaceClient.docs.legalModalHint')}</p>
                        {legalError && (
                            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', fontSize: '13px' }}>{legalError}</div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.docs.legalPrenom')}</label>
                                <input required value={legalForm.prenom} onChange={(e) => setLegalForm((f) => ({ ...f, prenom: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.docs.legalNom')}</label>
                                <input required value={legalForm.nom} onChange={(e) => setLegalForm((f) => ({ ...f, nom: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.settings.company')}</label>
                                <input required value={legalForm.company} onChange={(e) => setLegalForm((f) => ({ ...f, company: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.settings.addressLabel')}</label>
                                <AddressAutocomplete
                                    value={legalForm.address}
                                    onChange={(value) => setLegalForm((f) => ({ ...f, address: value }))}
                                    placeholder={t('espaceClient.settings.addressPlaceholder')}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.settings.nationality')}</label>
                                <select required value={legalForm.nationalite} onChange={(e) => setLegalForm((f) => ({ ...f, nationalite: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                                    <option value="Française">Française</option>
                                    <option value="Autre (UE)">Autre (UE)</option>
                                    <option value="Hors UE">Hors UE</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.settings.quality')}</label>
                                <select required value={legalForm.qualite} onChange={(e) => setLegalForm((f) => ({ ...f, qualite: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                                    <option value="Gérant">Gérant</option>
                                    <option value="Président">Président</option>
                                    <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                                    <option value="Fondateur">Fondateur</option>
                                    <option value="Directeur Général">Directeur Général</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.settings.birthDate')}</label>
                                <input required type="date" value={legalForm.dateNaissance} onChange={(e) => setLegalForm((f) => ({ ...f, dateNaissance: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{t('espaceClient.settings.birthPlace')}</label>
                                <input required value={legalForm.lieuNaissance} onChange={(e) => setLegalForm((f) => ({ ...f, lieuNaissance: e.target.value }))} placeholder={t('espaceClient.docs.birthPlacePh')} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button type="button" onClick={() => setShowLegalModal(false)} disabled={legalSaving} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer' }}>{t('espaceClient.docs.cancel')}</button>
                            <button type="submit" disabled={legalSaving} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#1e40af', color: 'white', fontWeight: 700, cursor: legalSaving ? 'default' : 'pointer', opacity: legalSaving ? 0.7 : 1 }}>
                                {legalSaving ? t('espaceClient.docs.saving') : t('espaceClient.docs.legalContinue')}
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {showApprovalModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '400px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center', animation: 'scaleIn 0.2s ease-out' }}>
                        <div style={{ width: '64px', height: '64px', background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#D97706' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>{t('espaceClient.docs.pendingTitle')}</h2>
                        <p style={{ color: '#64748B', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '32px' }}>
                            {t('espaceClient.docs.pendingBody')}
                        </p>
                        <button onClick={() => setShowApprovalModal(false)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '15px', transition: 'background 0.2s' }}>
                            {t('espaceClient.docs.understood')}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
