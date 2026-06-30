import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';
import { convertPdfToPng } from '../../../utils/pdfConverter';
import { sendFailedPaymentEmail } from '../../../utils/emailService';
import { generateAttestationPdf, generateContratPdf } from '../../../utils/pdfGenerator';

const formatDateLong = (dateStr) => {
    if (!dateStr) return 'Non définie';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const mIndex = parseInt(month, 10) - 1;
        if (mIndex >= 0 && mIndex < 12) {
            return `${parseInt(day, 10)} ${months[mIndex]} ${year}`;
        }
    }
    return dateStr;
};

const handleDataUrlDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export default function DossierClient({ client, onBack, onUpdate, showConfirm, showAlert }) {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [downloadingDocId, setDownloadingDocId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Dériver les dossiers depuis la liste des documents de manière sécurisée
    const folders = Array.from(new Set((documents || []).map(d => (d && d.folder) || 'Documents')));

    const [activeDossierTab, setActiveDossierTab] = useState('details');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [payments, setPayments] = useState([]);
    const [fileToName, setFileToName] = useState(null);
    const [customFileName, setCustomFileName] = useState('');

    useEffect(() => {
        if (client) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const [docs, pay] = await Promise.all([
                        adminDataService.getDocuments(client.id),
                        adminDataService.getPayments(client.id)
                    ]);
                    setDocuments(docs);
                    setPayments(pay);
                    setIsLoading(false);

                    // Synchronisation silencieuse en tâche de fond avec Stripe
                    let stripeCustomerId = null;
                    if (client.extra_info) {
                        try {
                            const extraInfo = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
                            stripeCustomerId = extraInfo?.stripe_customer_id || null;
                        } catch (e) {
                            console.error("Error parsing client.extra_info:", e);
                        }
                    }

                    const stripePayments = await adminDataService.syncStripePayments(client.email, stripeCustomerId, client.since);
                    if (stripePayments && stripePayments.length > 0) {
                        let addedCount = 0;
                        for (const sp of stripePayments) {
                            // Vérifier si ce paiement Stripe existe déjà (par référence OU par montant+date pour éviter doublons avec le paiement initial manuel)
                            const stripeRef = `STRIPE-${sp.id.substring(3, 10)}`;
                            const alreadyExists = pay.some(p => p.invoice_ref === stripeRef || (p.amount == sp.amount && p.date == sp.date));
                            if (!alreadyExists) {
                                await adminDataService.addPayment(client.id, {
                                    ...sp,
                                    invoice_ref: stripeRef
                                });
                                addedCount++;
                            }
                        }

                        // Récupérer la liste à jour des paiements locaux
                        let finalPayments = pay;
                        if (addedCount > 0) {
                            finalPayments = await adminDataService.getPayments(client.id);
                            setPayments(finalPayments);
                        }

                        // Vérifier le statut de paiement le plus récent pour automatiser les statuts client
                        const sortedPayments = [...finalPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
                        if (sortedPayments.length > 0) {
                            const latestPayment = sortedPayments[0];
                            if (latestPayment.status === 'échec' && client.status === 'actif') {
                                await adminDataService.updateClientStatus(client.id, 'echec_paiement');
                                onUpdate(); // Notification à Admin.jsx pour rafraîchir la liste générale
                            } else if (latestPayment.status === 'payé' && (client.status === 'echec_paiement' || client.status === 'impayé')) {
                                await adminDataService.updateClientStatus(client.id, 'actif');
                                onUpdate();
                            }
                        }
                    }
                } catch (stripeErr) {
                    console.warn("Silent Stripe sync failed:", stripeErr);
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [client]);

    useEffect(() => {
        const body = document.querySelector('.admin-body');
        if (body) body.scrollTop = 0;
    }, [activeDossierTab, currentFolder]);

    useEffect(() => {
        if (client && activeDossierTab === 'messages') {
            const fetchMessages = async () => {
                const msgs = await adminDataService.getMessages(client.id);
                setMessages(msgs);
                // Marquer comme lu
                await adminDataService.markMessagesAsRead(client.id, 'admin');
            };
            fetchMessages();
        }
    }, [client, activeDossierTab]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const msg = await adminDataService.addMessage(client.id, {
                content: newMessage,
                sender: 'admin'
            });
            setMessages(prev => [...prev, msg]);
            setNewMessage('');
        } catch (err) {
            await showAlert("Erreur lors de l'envoi du message");
        }
    };

    const handleFileChange = async (e) => {
        const originalFile = e.target.files[0];
        if (!originalFile) return;

        // Prevent double events
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
                console.log("Traitement direct du PDF admin (sans Cloudinary)...");
                finalUrl = await blobToBase64(originalFile);
            } else {
                console.log("Upload du fichier image vers Cloudinary...");
                const info = await uploadFile(originalFile, { folder: `clients/${client.id}/Documents` });
                finalUrl = info.secure_url;
            }

            await adminDataService.addDocument(client.id, {
                name: finalName,
                size: (originalFile.size / 1024).toFixed(0) + ' KB',
                type: originalFile.type,
                owner: 'admin',
                folder: 'Documents',
                url: finalUrl
            });

            const docs = await adminDataService.getDocuments(client.id);
            setDocuments(Array.isArray(docs) ? docs : []);
        } catch (err) {
            setIsUploading(false);
            console.error("Erreur préparation fichier:", err);
            alert("Erreur de préparation : " + err.message);
        } finally {
            setIsUploading(false);
        }
    };


    const handleUploadClick = () => {
        document.getElementById('admin-file-upload').click();
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleUploadClick(); // On ouvre le widget pour plus de sécurité
    };

    const handleAddInvoice = async () => {
        let defaultAmount = '20.00';
        if (client.plan === 'Scan+') defaultAmount = '24.00';
        else if (client.plan === 'Physique+') defaultAmount = '38.00';

        const amount = prompt(`Montant de la facture (ex: ${defaultAmount}) ?`, defaultAmount);
        if (!amount) return;

        const date = prompt("Date de la facture (AAAA-MM-JJ) ?", new Date().toISOString().split('T')[0]);
        if (!date) return;

        try {
            setIsLoading(true);
            await adminDataService.addPayment(client.id, {
                amount: parseFloat(amount),
                date
            });
            const pay = await adminDataService.getPayments(client.id);
            setPayments(pay);
        } catch (err) {
            await showAlert("Erreur lors de l'ajout de la facture");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateMockHistory = async () => {
        const confirmed = await showConfirm("Générer l'historique complet des paiements pour ce client depuis son inscription ?");
        if (!confirmed) return;

        try {
            setIsLoading(true);
            const startDate = new Date(client.since);
            const currentDate = new Date();
            let iter = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

            while (iter <= currentDate) {
                let amount = 20;
                if (client.plan === 'Scan+') amount = 24;
                else if (client.plan === 'Physique+') amount = 38;

                await adminDataService.addPayment(client.id, {
                    amount,
                    date: dateStr,
                    status: 'payé'
                });
                iter.setMonth(iter.getMonth() + 1);
            }

            const pay = await adminDataService.getPayments(client.id);
            setPayments(pay);
            await showAlert("Historique généré avec succès !");
        } catch (err) {
            await showAlert("Erreur lors de la génération de l'historique");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncStripe = async () => {
        const confirmed = await showConfirm(`Vérifier les paiements réels sur Stripe pour ${client.email} ?`);
        if (!confirmed) return;

        try {
            setIsLoading(true);

            let stripeCustomerId = null;
            try {
                if (client.extra_info) {
                    const extraInfo = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
                    stripeCustomerId = extraInfo?.stripe_customer_id || null;
                }
            } catch (e) {
                console.error("Error parsing client.extra_info in handleSyncStripe:", e);
            }

            const stripePayments = await adminDataService.syncStripePayments(client.email, stripeCustomerId, client.since);

            if (stripePayments.length === 0) {
                await showAlert("Aucun paiement trouvé sur Stripe pour ce client.");
                return;
            }

            // Sync : on ajoute ceux qui ne sont pas là
            let addedCount = 0;
            const currentPayments = await adminDataService.getPayments(client.id);
            for (const sp of stripePayments) {
                // Vérifier si ce paiement Stripe existe déjà
                const stripeRef = `STRIPE-${sp.id.substring(3, 10)}`;
                const alreadyExists = currentPayments.some(p => p.invoice_ref === stripeRef || (p.amount == sp.amount && p.date == sp.date));
                if (!alreadyExists) {
                    await adminDataService.addPayment(client.id, {
                        ...sp,
                        invoice_ref: stripeRef
                    });
                    addedCount++;
                }
            }

            // Récupérer la liste finale à jour des paiements locaux
            const finalPayments = await adminDataService.getPayments(client.id);
            setPayments(finalPayments);

            // Vérifier le statut de paiement le plus récent pour automatiser les statuts client
            const sortedPayments = [...finalPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
            let statusUpdated = false;
            if (sortedPayments.length > 0) {
                const latestPayment = sortedPayments[0];
                if (latestPayment.status === 'échec' && client.status === 'actif') {
                    await adminDataService.updateClientStatus(client.id, 'echec_paiement');
                    statusUpdated = true;
                    onUpdate();
                } else if (latestPayment.status === 'payé' && (client.status === 'echec_paiement' || client.status === 'impayé')) {
                    await adminDataService.updateClientStatus(client.id, 'actif');
                    statusUpdated = true;
                    onUpdate();
                }
            }

            if (addedCount > 0) {
                await showAlert(`${addedCount} nouveau(x) paiement(s) récupéré(s) de Stripe !` + (statusUpdated ? " Le statut d'accès du client a été mis à jour automatiquement." : ""));
            } else {
                await showAlert("Historique déjà à jour avec Stripe." + (statusUpdated ? " Le statut d'accès du client a été mis à jour automatiquement." : ""));
            }
        } catch (err) {
            console.error(err);
            await showAlert("Erreur lors de la synchronisation Stripe.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${client.company} ?\n\nCela révoquera instantanément son accès à l'Espace Client.`, { isDanger: true });
        if (confirmed) {
            setIsLoading(true);
            try {
                await adminDataService.deleteClient(client.id);
                onUpdate(); // Refresh the list
                onBack(); // Go back to the client list
            } catch (err) {
                console.error("Error deleting client:", err);
                await showAlert("Erreur lors de la suppression du client.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (!client) return null;

    let extra = null;
    try {
        if (client.extra_info) {
            extra = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
            // Si c'est un objet vide, on le remet à null pour l'affichage du message d'aide
            if (extra && Object.keys(extra).length === 0) extra = null;
            
            // Force local PDF generation in the admin panel if signature data exists
            // This ensures it behaves just like the client view and avoids Cloudinary URL issues
            if (extra && extra.procurationSignatureUrl) {
                extra.procurationSignedUrl = '#local-procuration';
            }
            if (extra && extra.contractSignatureUrl) {
                extra.contractSignedUrl = '#local-signature';
            }
        }
    } catch (e) {
        console.error("Error parsing extra_info", e);
    }

    const renderTabContent = () => {
        switch (activeDossierTab) {
            case 'docs':
                return (
                    <>
                        {/* NOUVEAU : Bloc Génération administrative */}
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚙️</span> Génération de Documents Officiels
                            </h3>
                            <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px', margin: 0 }}>
                                Générez et téléchargez instantanément l'attestation ou le contrat officiel pré-remplis avec les données d'inscription validées pour ce client.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                                <button
                                    className="btn-primary-sm"
                                    style={{ background: '#0F172A', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', opacity: downloadingDocId ? 0.7 : 1 }}
                                    onClick={async () => {
                                        if (downloadingDocId) return;
                                        setDownloadingDocId('attestation');
                                        try {
                                            await generateAttestationPdf(client);
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
                                            <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                            Génération...
                                        </>
                                    ) : (
                                        <><span>📥</span> Attestation de Domiciliation</>
                                    )}
                                </button>
                                <button
                                    style={{ background: 'white', color: '#0F172A', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', opacity: downloadingDocId ? 0.7 : 1 }}
                                    onClick={async () => {
                                        if (downloadingDocId) return;
                                        setDownloadingDocId('contrat-vierge');
                                        try {
                                            await generateContratPdf(client);
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
                                            <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                            Génération...
                                        </>
                                    ) : (
                                        <><span>📜</span> Contrat de Domiciliation</>
                                    )}
                                </button>
                            </div>

                            {/* NOUVEAU : Documents Communs de l'Établissement */}
                            <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '20px', paddingTop: '16px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '10px' }}>📁 Documents Communs Domiciliataire (Toulouse) :</span>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <a
                                        href="/Agrement_CASSIN.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'none', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        🛡️ Agrément CASSIN.pdf
                                    </a>
                                    <a
                                        href="/Extrait_KBIS_CASSIN.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'none', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        🏢 Extrait KBIS CASSIN.pdf
                                    </a>
                                    <a
                                        href="/Procuration_Postale.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'none', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        ✉️ Procuration Postale.pdf
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* ── DOCUMENTS JUSTIFICATIFS ─────────────────────── */}
                        {(extra?.pieceIdentiteUrl || extra?.justificatifDomicileUrl || extra?.kbisUrl || extra?.contractSignedUrl || extra?.procurationSignedUrl) && (
                            <div style={{
                                borderRadius: '12px', overflow: 'hidden', marginBottom: '20px',
                                border: '2px solid #e2e8f0'
                            }}>
                                <div style={{
                                    background: '#f8fafc',
                                    padding: '14px 20px', color: '#0f172a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    borderBottom: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '22px' }}>🪪</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                                Documents Justificatifs
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                Déposés par le client
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ background: 'white', padding: '12px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {extra?.pieceIdentiteUrl && (
                                        <a
                                            href={extra.pieceIdentiteUrl.startsWith('data:') ? '#' : extra.pieceIdentiteUrl}
                                            onClick={(e) => {
                                                if (extra.pieceIdentiteUrl.startsWith('data:')) {
                                                    e.preventDefault();
                                                    handleDataUrlDownload(extra.pieceIdentiteUrl, 'Piece_Identite.pdf');
                                                }
                                            }}
                                            target={extra.pieceIdentiteUrl.startsWith('data:') ? undefined : "_blank"}
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                color: '#334155', fontWeight: 600, fontSize: '13px'
                                            }}
                                        >
                                            👁️ Voir la Pièce d'identité
                                        </a>
                                    )}
                                    {extra?.justificatifDomicileUrl && (
                                        <a
                                            href={extra.justificatifDomicileUrl.startsWith('data:') ? '#' : extra.justificatifDomicileUrl}
                                            onClick={(e) => {
                                                if (extra.justificatifDomicileUrl.startsWith('data:')) {
                                                    e.preventDefault();
                                                    handleDataUrlDownload(extra.justificatifDomicileUrl, 'Justificatif_Domicile.pdf');
                                                }
                                            }}
                                            target={extra.justificatifDomicileUrl.startsWith('data:') ? undefined : "_blank"}
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                color: '#334155', fontWeight: 600, fontSize: '13px'
                                            }}
                                        >
                                            👁️ Voir le Justificatif de domicile
                                        </a>
                                    )}
                                    {extra?.kbisUrl && (
                                        <a
                                            href={extra.kbisUrl.startsWith('data:') ? '#' : extra.kbisUrl}
                                            onClick={(e) => {
                                                if (extra.kbisUrl.startsWith('data:')) {
                                                    e.preventDefault();
                                                    handleDataUrlDownload(extra.kbisUrl, 'Extrait_KBIS.pdf');
                                                }
                                            }}
                                            target={extra.kbisUrl.startsWith('data:') ? undefined : "_blank"}
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                color: '#334155', fontWeight: 600, fontSize: '13px'
                                            }}
                                        >
                                            👁️ Voir l'Extrait KBIS
                                        </a>
                                    )}
                                    {extra?.contractSignedUrl && (
                                        <a
                                            href={extra.contractSignedUrl === '#local-signature' || extra.contractSignedUrl.startsWith('data:') ? '#' : extra.contractSignedUrl}
                                            onClick={async (e) => {
                                                if (extra.contractSignedUrl.startsWith('data:')) {
                                                    e.preventDefault();
                                                    handleDataUrlDownload(extra.contractSignedUrl, `Contrat_Signe_${client.company || client.id}.pdf`);
                                                } else if (extra.contractSignedUrl === '#local-signature') {
                                                    e.preventDefault();
                                                    if (downloadingDocId) return;
                                                    if (extra?.contractSignatureUrl) {
                                                        setDownloadingDocId('contrat-signe');
                                                        try {
                                                            const { generateSignedContratBlob } = await import('../../../utils/pdfGenerator');
                                                            const blob = await generateSignedContratBlob(client, extra.contractSignatureUrl);
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `Contrat_Signe_${client.company || client.id}.pdf`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        } catch (err) {
                                                            console.error(err);
                                                        } finally {
                                                            setDownloadingDocId(null);
                                                        }
                                                    }
                                                }
                                            }}
                                            target={extra.contractSignedUrl === '#local-signature' || extra.contractSignedUrl.startsWith('data:') ? '_self' : '_blank'}
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                color: '#334155', fontWeight: 600, fontSize: '13px',
                                                opacity: downloadingDocId === 'contrat-signe' ? 0.6 : 1,
                                                pointerEvents: downloadingDocId ? 'none' : 'auto'
                                            }}
                                        >
                                            {downloadingDocId === 'contrat-signe' ? 'Génération...' : '👁️ Voir le Contrat'}
                                        </a>
                                    )}
                                    {extra?.procurationSignedUrl && (
                                        <a
                                            href={extra.procurationSignedUrl === '#local-procuration' || extra.procurationSignedUrl.startsWith('data:') ? '#' : extra.procurationSignedUrl}
                                            onClick={async (e) => {
                                                if (extra.procurationSignedUrl.startsWith('data:')) {
                                                    e.preventDefault();
                                                    handleDataUrlDownload(extra.procurationSignedUrl, `Procuration_${client.company || client.id}.pdf`);
                                                } else if (extra.procurationSignedUrl === '#local-procuration') {
                                                    e.preventDefault();
                                                    if (downloadingDocId) return;
                                                    if (extra?.procurationSignatureUrl) {
                                                        setDownloadingDocId('procuration-signe');
                                                        try {
                                                            const { generateSignedProcurationBlob } = await import('../../../utils/pdfGenerator');
                                                            const blob = await generateSignedProcurationBlob(client, extra.procurationSignatureUrl, extra.procurationData);
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `Procuration_${client.company || client.id}.pdf`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        } catch (err) {
                                                            console.error(err);
                                                        } finally {
                                                            setDownloadingDocId(null);
                                                        }
                                                    }
                                                }
                                            }}
                                            target={extra.procurationSignedUrl === '#local-procuration' || extra.procurationSignedUrl.startsWith('data:') ? '_self' : '_blank'}
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                background: '#f1f5f9', border: '1px solid #cbd5e1',
                                                color: '#334155', fontWeight: 600, fontSize: '13px',
                                                opacity: downloadingDocId === 'procuration-signe' ? 0.6 : 1,
                                                pointerEvents: downloadingDocId ? 'none' : 'auto'
                                            }}
                                        >
                                            {downloadingDocId === 'procuration-signe' ? 'Génération...' : '👁️ Voir la Procuration'}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── STATUT SIGNATURE ÉLECTRONIQUE ─────────────────────── */}
                        {(() => {
                            const contractSigned = extra?.contractSigned;
                            const contractUrl = extra?.contractSignedUrl;
                            const contractAt = extra?.contractSignedAt;
                            return (
                                <>
                                    <div style={{
                                        borderRadius: '12px', overflow: 'hidden', marginBottom: '20px',
                                        border: contractSigned ? '2px solid #bbf7d0' : '2px solid #fde68a'
                                    }}>
                                        <div style={{
                                            background: contractSigned
                                                ? 'linear-gradient(135deg, #064e3b, #065f46)'
                                                : 'linear-gradient(135deg, #78350f, #92400e)',
                                            padding: '14px 20px', color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '22px' }}>{contractSigned ? '✅' : '⏳'}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                                        {contractSigned ? 'Contrat signé électroniquement' : 'En attente de signature du contrat'}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>
                                                        {contractSigned && contractAt
                                                            ? `Signé le ${new Date(contractAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date(contractAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                                            : 'Le client n\'a pas encore signé son contrat de domiciliation'}
                                                    </div>
                                                </div>
                                            </div>
                                            {contractSigned && (
                                                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
                                                    Validé ✔
                                                </span>
                                            )}
                                        </div>
                                        {contractSigned && contractUrl && (
                                            <div style={{ background: 'white', padding: '12px 20px' }}>
                                                <a
                                                    href={contractUrl === '#local-signature' || contractUrl.startsWith('data:') ? '#' : contractUrl}
                                                    onClick={async (e) => {
                                                        if (contractUrl && contractUrl.startsWith('data:')) {
                                                            e.preventDefault();
                                                            handleDataUrlDownload(contractUrl, `Contrat_Signe_${client.company || client.id}.pdf`);
                                                            return;
                                                        }
                                                        if (contractUrl === '#local-signature') {
                                                            e.preventDefault();
                                                            if (downloadingDocId) return;
                                                            if (extra?.contractSignatureUrl) {
                                                                setDownloadingDocId('contrat-signe');
                                                                try {
                                                                    const { generateSignedContratBlob } = await import('../../../utils/pdfGenerator');
                                                                    const blob = await generateSignedContratBlob(client, extra.contractSignatureUrl);
                                                                    const url = URL.createObjectURL(blob);
                                                                    const a = document.createElement('a');
                                                                    a.href = url;
                                                                    a.download = `Contrat_Signe_${client.company || client.id}.pdf`;
                                                                    document.body.appendChild(a);
                                                                    a.click();
                                                                    document.body.removeChild(a);
                                                                    URL.revokeObjectURL(url);
                                                                } catch (err) {
                                                                    console.error(err);
                                                                } finally {
                                                                    setDownloadingDocId(null);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    target={contractUrl === '#local-signature' || contractUrl.startsWith('data:') ? '_self' : '_blank'}
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        padding: '9px 16px', borderRadius: '8px', textDecoration: 'none',
                                                        background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                                        color: '#15803d', fontWeight: 700, fontSize: '13px',
                                                        pointerEvents: downloadingDocId ? 'none' : 'auto',
                                                        opacity: downloadingDocId ? 0.7 : 1
                                                    }}
                                                >
                                                    {downloadingDocId === 'contrat-signe' ? (
                                                        <>
                                                            <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                            Génération du PDF...
                                                        </>
                                                    ) : (
                                                        <>📥 Télécharger le contrat signé (PDF)</>
                                                    )}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* PROCURATION POSTALE */}
                                    <div style={{
                                        borderRadius: '12px', overflow: 'hidden', marginBottom: '20px',
                                        border: extra?.procurationSigned ? '2px solid #bbf7d0' : '2px solid #fde68a'
                                    }}>
                                        <div style={{
                                            background: extra?.procurationSigned
                                                ? 'linear-gradient(135deg, #064e3b, #065f46)'
                                                : 'linear-gradient(135deg, #78350f, #92400e)',
                                            padding: '14px 20px', color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '22px' }}>{extra?.procurationSigned ? '✅' : '⏳'}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                                        {extra?.procurationSigned ? 'Procuration Postale signée' : 'En attente de signature de la procuration'}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>
                                                        {extra?.procurationSigned && extra?.procurationSignedAt
                                                            ? `Signée le ${new Date(extra.procurationSignedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date(extra.procurationSignedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                                            : 'Le client n\'a pas encore signé sa procuration postale'}
                                                    </div>
                                                </div>
                                            </div>
                                            {extra?.procurationSigned && (
                                                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
                                                    Validé ✔
                                                </span>
                                            )}
                                        </div>
                                        {extra?.procurationSigned && extra?.procurationSignedUrl && (
                                            <div style={{ background: 'white', padding: '12px 20px' }}>
                                                <a
                                                    href={extra.procurationSignedUrl === '#local-procuration' || extra.procurationSignedUrl.startsWith('data:') ? '#' : extra.procurationSignedUrl}
                                                    onClick={async (e) => {
                                                        if (extra.procurationSignedUrl && extra.procurationSignedUrl.startsWith('data:')) {
                                                            e.preventDefault();
                                                            handleDataUrlDownload(extra.procurationSignedUrl, `Procuration_${client.company || client.id}.pdf`);
                                                            return;
                                                        }
                                                        if (extra.procurationSignedUrl === '#local-procuration') {
                                                            e.preventDefault();
                                                            if (downloadingDocId) return;
                                                            if (extra?.procurationSignatureUrl) {
                                                                setDownloadingDocId('procuration-signe');
                                                                try {
                                                                    const { generateSignedProcurationBlob } = await import('../../../utils/pdfGenerator');
                                                                    const blob = await generateSignedProcurationBlob(client, extra.procurationSignatureUrl, extra.procurationData);
                                                                    const url = URL.createObjectURL(blob);
                                                                    const a = document.createElement('a');
                                                                    a.href = url;
                                                                    a.download = `Procuration_${client.company || client.id}.pdf`;
                                                                    document.body.appendChild(a);
                                                                    a.click();
                                                                    document.body.removeChild(a);
                                                                    URL.revokeObjectURL(url);
                                                                } catch (err) {
                                                                    console.error(err);
                                                                } finally {
                                                                    setDownloadingDocId(null);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    target={extra.procurationSignedUrl === '#local-procuration' || extra.procurationSignedUrl.startsWith('data:') ? '_self' : '_blank'}
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        padding: '10px 16px', borderRadius: '8px', textDecoration: 'none',
                                                        background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                                        color: '#15803d', fontWeight: 700, fontSize: '13px',
                                                        pointerEvents: downloadingDocId ? 'none' : 'auto',
                                                        opacity: downloadingDocId ? 0.7 : 1
                                                    }}
                                                >
                                                    {downloadingDocId === 'procuration-signe' ? (
                                                        <>
                                                            <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                            Génération du PDF...
                                                        </>
                                                    ) : (
                                                        <>📥 Télécharger la procuration</>
                                                    )}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}

                        <div className="card-header">
                            <h2>Documents Déposés / Partagés</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="file"
                                    id="admin-file-upload"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                                <button className="btn-primary-sm" onClick={handleUploadClick} disabled={isUploading}>
                                    {isUploading ? 'Envoi...' : 'Uploader'}
                                </button>
                            </div>
                        </div>
                        <div
                            className="card-body"
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            style={{ minHeight: '250px', position: 'relative' }}
                        >
                            {isUploading && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10,
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(2px)'
                                }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        border: '3.5px solid #e2e8f0',
                                        borderTopColor: '#6366F1',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        marginBottom: '12px'
                                    }} />
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                                        Traitement et envoi du document...
                                    </p>
                                </div>
                            )}
                            {isLoading && (!documents || documents.length === 0) ? (
                                <div className="empty-state-full"><p>Chargement...</p></div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                                    {/* Documents from Client */}
                                    <div>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                            Documents déposés par le client
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
                                                            href={(doc.url === '#local-signature' || doc.url === '#local-procuration' || (doc.url && doc.url.startsWith('data:'))) ? '#' : doc.url}
                                                            onClick={async (e) => {
                                                                if (doc.url && doc.url.startsWith('data:')) {
                                                                    e.preventDefault();
                                                                    handleDataUrlDownload(doc.url, doc.name || 'document.pdf');
                                                                    return;
                                                                }
                                                                if (doc.url === '#local-signature') {
                                                                    e.preventDefault();
                                                                    if (downloadingDocId) return;
                                                                    let extraInfo = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
                                                                    if (extraInfo?.contractSignatureUrl) {
                                                                        setDownloadingDocId(doc.id);
                                                                        try {
                                                                            const { generateSignedContratBlob } = await import('../../../utils/pdfGenerator');
                                                                            const blob = await generateSignedContratBlob(client, extraInfo.contractSignatureUrl);
                                                                            const url = URL.createObjectURL(blob);
                                                                            const a = document.createElement('a');
                                                                            a.href = url;
                                                                            a.download = `Contrat_Signe_${client.company || client.id}.pdf`;
                                                                            document.body.appendChild(a);
                                                                            a.click();
                                                                            document.body.removeChild(a);
                                                                            URL.revokeObjectURL(url);
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                        } finally {
                                                                            setDownloadingDocId(null);
                                                                        }
                                                                    }
                                                                } else if (doc.url === '#local-procuration') {
                                                                    e.preventDefault();
                                                                    if (downloadingDocId) return;
                                                                    let extraInfo = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
                                                                    if (extraInfo?.procurationSignatureUrl) {
                                                                        setDownloadingDocId(doc.id);
                                                                        try {
                                                                            const { generateSignedProcurationBlob } = await import('../../../utils/pdfGenerator');
                                                                            const blob = await generateSignedProcurationBlob(client, extraInfo.procurationSignatureUrl, extraInfo.procurationData);
                                                                            const url = URL.createObjectURL(blob);
                                                                            const a = document.createElement('a');
                                                                            a.href = url;
                                                                            a.download = `Procuration_${client.company || client.id}.pdf`;
                                                                            document.body.appendChild(a);
                                                                            a.click();
                                                                            document.body.removeChild(a);
                                                                            URL.revokeObjectURL(url);
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                        } finally {
                                                                            setDownloadingDocId(null);
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            target={(doc.url === '#local-signature' || doc.url === '#local-procuration' || (doc.url && doc.url.startsWith('data:'))) ? '_self' : '_blank'}
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
                                                                        const updatedDocs = await adminDataService.getDocuments(client.id);
                                                                        setDocuments(Array.isArray(updatedDocs) ? updatedDocs : []);
                                                                    } catch (err) {
                                                                        alert("Erreur lors de la suppression");
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '8px 12px',
                                                                background: '#fee2e2',
                                                                border: '1px solid #fca5a5',
                                                                borderRadius: '8px',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                            title="Supprimer ce document"
                                                        >
                                                            🗑️
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
                                                    <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Aucun document déposé par le client.</div>
                                                )}
                                        </div>
                                    </div>

                                    {/* Documents from Admin */}
                                    <div>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                            Documents déposés par MW CREA (Admin)
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
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (window.confirm("Supprimer ce document ?")) {
                                                                    try {
                                                                        await adminDataService.deleteDocument(doc.id);
                                                                        const updatedDocs = await adminDataService.getDocuments(client.id);
                                                                        setDocuments(Array.isArray(updatedDocs) ? updatedDocs : []);
                                                                    } catch (err) {
                                                                        alert("Erreur lors de la suppression");
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '8px 12px',
                                                                background: '#fee2e2',
                                                                border: '1px solid #fca5a5',
                                                                borderRadius: '8px',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                            title="Supprimer ce document"
                                                        >
                                                            🗑️
                                                        </button>
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
                    </>
                );
            case 'messages':
                return (
                    <>
                        <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Chat avec {client.name}</h2>
                        </div>
                        <div className="card-body" style={{ height: '400px', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
                            <div className="messages-list" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#64748B', marginTop: '40px', fontSize: '14px' }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, opacity: 0.3, marginBottom: '12px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        <p>Aucun message. Envoyez le premier message au client.</p>
                                    </div>
                                ) : (
                                    messages.map(m => (
                                        <div key={m.id} style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                            <div style={{
                                                background: m.sender === 'admin' ? '#0F172A' : '#F1F5F9',
                                                color: m.sender === 'admin' ? '#FFFFFF' : '#0F172A',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                lineHeight: '1.5',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                borderBottomRightRadius: m.sender === 'admin' ? '2px' : '12px',
                                                borderBottomLeftRadius: m.sender === 'admin' ? '12px' : '2px'
                                            }}>
                                                {m.content}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', textAlign: m.sender === 'admin' ? 'right' : 'left', padding: '0 4px' }}>
                                                {new Date(m.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '12px', background: '#F8FAFC', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Écrivez votre message..."
                                    style={{
                                        flex: 1,
                                        height: '44px',
                                        borderRadius: '8px',
                                        border: '1px solid #E2E8F0',
                                        padding: '0 16px',
                                        fontSize: '14px',
                                        background: '#FFFFFF',
                                        color: '#0F172A',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    style={{
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0 16px',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    Envoyer
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </form>
                        </div>
                    </>
                );
            case 'facturation':
                return (
                    <>
                        <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Historique de facturation ({client.name})</h2>
                        </div>
                        <div className="card-body" style={{ minHeight: '250px', padding: '24px', background: '#FFFFFF' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>Paiements Abonnements</h3>
                                    <p style={{ color: '#64748B', fontSize: '13px' }}>Historique des derniers prélèvements effectués pour ce compte.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className="btn-secondary-sm"
                                        onClick={handleSyncStripe}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            border: '1px solid #E2E8F0',
                                            background: '#FFFFFF',
                                            color: '#334155',
                                            fontWeight: '600',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                                        Sync Stripe
                                    </button>
                                    <button
                                        className="btn-primary-sm"
                                        onClick={handleAddInvoice}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: '#0F172A',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            fontWeight: '600',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        + Ajouter une facture
                                    </button>
                                </div>
                            </div>

                            <div style={{ border: '1px solid #F1F5F9', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Facture ID</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Date</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Montant</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Méthode</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', background: '#FFFFFF' }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, opacity: 0.3, marginBottom: '12px' }}><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                                    <p style={{ fontSize: '14px', marginBottom: '16px' }}>Aucune facture enregistrée pour ce client.</p>
                                                    <button
                                                        className="btn-secondary-sm"
                                                        onClick={handleGenerateMockHistory}
                                                        style={{
                                                            border: '1px solid #E2E8F0',
                                                            background: '#FFFFFF',
                                                            color: '#475569',
                                                            fontWeight: '600',
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px'
                                                        }}
                                                    >
                                                        Générer l'historique auto
                                                    </button>
                                                </td>
                                            </tr>
                                        ) : (
                                            payments.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>{p.invoice_ref}</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{p.amount} €</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{p.method}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{
                                                            background: p.status === 'payé' ? '#DCFCE7' : '#FEE2E2',
                                                            color: p.status === 'payé' ? '#166534' : '#991B1B',
                                                            padding: '4px 10px',
                                                            borderRadius: '99px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            display: 'inline-block'
                                                        }}>
                                                            {p.status}
                                                        </span>
                                                        <button
                                                            onClick={async () => {
                                                                const confirmed = await showConfirm(`Supprimer le paiement ${p.invoice_ref} ?`);
                                                                if (confirmed) {
                                                                    try {
                                                                        await adminDataService.deletePayment(p.id);
                                                                        setPayments(prev => prev.filter(x => x.id !== p.id));
                                                                    } catch (err) {
                                                                        await showAlert("Erreur de suppression");
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: '#DC2626',
                                                                cursor: 'pointer',
                                                                marginLeft: '12px',
                                                                opacity: 0.6
                                                            }}
                                                            title="Supprimer"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                );

            case 'details':
            default:
                return (
                    <>
                        <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Fiche Client Détaillée</h2>
                        </div>
                        <div className="card-body" style={{ padding: '0 24px 24px 24px' }}>
                            {extra ? (
                                <>
                                    {/* Section Dirigeant */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>👤 Coordonnées du Dirigeant</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Nom Complet</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.nom} {extra.prenom}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Email</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', wordBreak: 'break-all' }}>{extra.email || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Téléphone</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.telephone || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Naissance</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.dateNaissance} ({extra.lieuNaissance})</div>
                                        </div>
                                    </div>

                                    {/* Section Entreprise */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>🏢 Informations Entreprise</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Nom Société</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.nomSociete || 'En cours de création'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>SIREN</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.siren || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Forme Juridique</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.formeJuridique || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Type Projet</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>
                                                {extra.typeProjet === 'creation' ? "Création" : extra.typeProjet === 'transfert' ? "Transfert" : "Domiciliation"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section Domiciliation */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>⚙️ Domiciliation & Forfait</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Adresse choisie</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.ville || 'Toulouse'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Offre Courrier</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>
                                                {extra.offre === 'scan' ? 'Scan numérique' : (extra.offre === 'reexpedition' ? 'Physique (+38€)' : 'Notification')}
                                            </div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Fréquence</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.frequence === 'annuel' ? 'Annuelle (2 mois off.)' : 'Mensuelle'}</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>
                                    <p>Aucune information détaillée d'inscription disponible pour ce client (créé manuellement ou données anciennes).</p>
                                </div>
                            )}
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="dossier-animate">
            <div className="dossier-header">
                <button onClick={onBack} className="btn-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14 }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Retour
                </button>
                <div className="dossier-title">
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.025em' }}>{client.company}</h1>
                </div>
            </div>

            <div style={{ display: 'inline-flex', padding: '4px', background: '#F1F5F9', borderRadius: '8px', marginBottom: '24px', gap: '4px' }}>
                <button
                    data-testid="tab-details"
                    onClick={() => setActiveDossierTab('details')}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'details' ? 'white' : 'transparent', color: activeDossierTab === 'details' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'details' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Détails Client
                </button>
                <button data-testid="tab-docs" onClick={() => setActiveDossierTab('docs')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'docs' ? 'white' : 'transparent', color: activeDossierTab === 'docs' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'docs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>Documents</button>
                <button data-testid="tab-docs-hidden" style={{ display: 'none' }}>Documents</button>

                <button
                    data-testid="tab-messages"
                    onClick={() => setActiveDossierTab('messages')}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'messages' ? 'white' : 'transparent', color: activeDossierTab === 'messages' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'messages' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    Messagerie
                    {parseInt(client.unreadCount) > 0 && activeDossierTab !== 'messages' && (
                        <span style={{
                            background: '#6366F1',
                            color: 'white',
                            fontSize: '10px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {client.unreadCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveDossierTab('facturation')}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'facturation' ? 'white' : 'transparent', color: activeDossierTab === 'facturation' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'facturation' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Facturation
                </button>
            </div>

            <div className="dossier-grid">
                <div className="content-card">
                    {renderTabContent()}
                </div>

                <div className="dossier-sidebar">
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Informations</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>CLERK USER ID</span>
                                <code style={{ fontSize: '11px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', wordBreak: 'break-all', color: '#334155' }}>{client.clerkId || "user_unknown"}</code>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>GÉRANT</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{client.name}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>EMAIL</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', wordBreak: 'break-all' }}>{client.email}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>FORMULE</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>{client.plan}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>DATE D'ENTRÉE</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{formatDateLong(client.since)}</span>
                            </div>
                        </div>
                        <div className="info-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                className="btn-danger-outline"
                                onClick={async () => {
                                    const confirmed = await showConfirm("Alerte: Déclarer ce client en défaut de paiement ? Son statut passera à 'impayé' et un email d'avertissement lui sera envoyé.", { isDanger: true });
                                    if (confirmed) {
                                        try {
                                            await adminDataService.updateClientStatus(client.id, 'impayé');
                                            try {
                                                await sendFailedPaymentEmail(client.email, client.name);
                                            } catch (mailErr) {
                                                console.error("Erreur d'envoi d'email impayé :", mailErr);
                                            }
                                            onUpdate();
                                            onBack();
                                        } catch (e) {
                                            await showAlert("Erreur de mise à jour");
                                        }
                                    }
                                }}
                                disabled={isLoading}
                                style={{ background: '#fff1f2', color: '#9f1239', borderColor: '#fda4af', borderStyle: 'solid', borderWidth: '1px', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', width: '100%' }}
                            >
                                Le client a un impayé
                            </button>
                            <button
                                className="btn-danger-outline"
                                onClick={handleDelete}
                                disabled={isLoading}
                                style={{ background: '#FFFFFF', color: '#DC2626', borderColor: '#FCA5A5', borderStyle: 'solid', borderWidth: '1px', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', width: '100%' }}
                            >
                                {isLoading ? 'Suppression...' : 'Supprimer le profil'}
                            </button>
                        </div>
                    </div>
                </div>
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
                                {isUploading ? 'Envoi...' : 'Valider'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
