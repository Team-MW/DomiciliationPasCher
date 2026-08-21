import { adminDataService } from '../../../services/adminDataService';
import logoUrl from '../../../assets/DomiciliationPasCher-Logo.png';
import { generateLocalInvoicePdf } from '../../../utils/pdfGenerator';
// import jsPDF from 'jspdf';
import { useState, useEffect } from 'react';

export default function Factures({ clientData, setClientData }) {
    const [realPayments, setRealPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingDocId, setDownloadingDocId] = useState(null);
    const [isPortalLoading, setIsPortalLoading] = useState(false);

    let stripeCustomerId = null;
    if (clientData?.extra_info) {
        try {
            let extraInfo = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info;
            if (typeof extraInfo === 'string') extraInfo = JSON.parse(extraInfo);
            stripeCustomerId = extraInfo?.stripe_customer_id || null;
        } catch (e) {}
    }

    const handleManagePaymentMethods = async () => {
        let currentStripeId = stripeCustomerId;
        setIsPortalLoading(true);

        if (!currentStripeId) {
            try {
                // Essayer de créer un client Stripe à la volée s'il n'existe pas encore
                const res = await fetch('/api/ensure-stripe-customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: clientData.email,
                        name: clientData.name || clientData.company,
                        company: clientData.company
                    })
                });
                const data = await res.json();
                if (data.customerId) {
                    currentStripeId = data.customerId;
                    const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, { stripe_customer_id: currentStripeId });
                    if (setClientData) {
                        setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
                    }
                }
            } catch (err) {
                console.error("Erreur création client Stripe:", err);
            }
        }

        if (!currentStripeId) {
            setIsPortalLoading(false);
            alert("Impossible de configurer le compte Stripe. Veuillez contacter le support.");
            return;
        }

        try {
            const url = await adminDataService.createStripePortalSession(currentStripeId);
            if (url) {
                window.location.href = url;
            } else {
                alert("Impossible d'ouvrir le portail de paiement.");
            }
        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes('No such customer')) {
                alert("L'identifiant Stripe enregistré est obsolète (ex: changement de mode test/live). Il va être réinitialisé, veuillez cliquer à nouveau sur le bouton.");
                try {
                    const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, { stripe_customer_id: null });
                    if (setClientData) {
                        setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
                    }
                } catch(e) {
                    console.error("Erreur réinitialisation Stripe ID:", e);
                }
            } else {
                alert(`Erreur lors de la connexion à Stripe: ${err.message}`);
            }
        } finally {
            setIsPortalLoading(false);
        }
    };

    useEffect(() => {
        if (clientData?.id) {
            const fetchPayments = async () => {
                try {
                    // 1. Charger d'abord les paiements stockés localement
                    const pay = await adminDataService.getPayments(clientData.id);
                    setRealPayments(pay);
                    setIsLoading(false);

                    // 2. Synchronisation silencieuse en tâche de fond avec Stripe
                    let stripeCustomerId = null;
                    if (clientData.extra_info) {
                        try {
                            let extraInfo = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info;
                            if (typeof extraInfo === 'string') extraInfo = JSON.parse(extraInfo);
                            stripeCustomerId = extraInfo?.stripe_customer_id || null;
                        } catch (e) {
                            console.error("Error parsing clientData.extra_info:", e);
                        }
                    }

                    const syncData = await adminDataService.syncStripePayments(clientData.email, stripeCustomerId, clientData.since);
                    const stripePayments = syncData.payments;

                    // Sauvegarde automatique de l'ID Stripe s'il était manquant mais trouvé via l'email
                    if (!stripeCustomerId && syncData.foundCustomerId && setClientData) {
                        try {
                            const updatedExtra = await adminDataService.updateClientExtraInfo(clientData.id, { stripe_customer_id: syncData.foundCustomerId });
                            setClientData(prev => ({ ...prev, extra_info: JSON.stringify(updatedExtra) }));
                        } catch (e) {
                            console.error("Erreur auto-save stripeCustomerId:", e);
                        }
                    }

                    if (stripePayments) {
                        const manualPayments = pay.filter(p => p.method === 'Ajout Manuel');
                        const formattedStripe = stripePayments.map(sp => ({
                            ...sp,
                            invoice_ref: sp.invoice_ref || `STRIPE-${sp.id.substring(3, 10)}`
                        }));
                        setRealPayments([...formattedStripe, ...manualPayments].sort((a, b) => new Date(b.date) - new Date(a.date)));
                    }

                    // Mettre à jour le statut du client automatiquement si l'abonnement a changé
                    if (syncData.subscriptionStatus) {
                        const subStatus = syncData.subscriptionStatus;
                        let newClientStatus = clientData.status;
                        
                        if (subStatus === 'canceled' && clientData.status !== 'résilié') {
                            newClientStatus = 'résilié';
                        } else if ((subStatus === 'past_due' || subStatus === 'unpaid') && clientData.status === 'actif') {
                            newClientStatus = 'echec_paiement';
                        } else if (subStatus === 'active' && (clientData.status === 'echec_paiement' || clientData.status === 'impayé')) {
                            newClientStatus = 'actif';
                        }

                        if (newClientStatus !== clientData.status && typeof onUpdateClient === 'function') {
                            await adminDataService.updateClientStatus(clientData.id, newClientStatus);
                            // On pourrait appeler un callback onUpdateClient ici si le composant parent le supportait, 
                            // mais l'essentiel est que la base de données est mise à jour.
                        }
                    }
                } catch (err) {
                    console.error("Erreur chargement/sync factures:", err);
                    setIsLoading(false);
                }
            };
            fetchPayments();
        }
    }, [clientData]);

    if (!clientData || !clientData.since) {
        return (
            <div className="ec-tab-animate">
                <div className="ec-content-card">
                    <div className="ec-card-header"><h2>Factures</h2></div>
                    <div className="ec-card-body" style={{ padding: '24px' }}>
                        <p>Aucune donnée de facturation trouvée.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Afficher toutes les factures (payées ou en échec)
    const factures = realPayments
        .map(p => {
            const amountTTC = parseFloat(p.amount);
            const amountHT = amountTTC / 1.2;
            return {
                id: p.id,
                ref: p.invoice_ref,
                dateStr: new Date(p.date).toLocaleDateString('fr-FR'),
                amountTTC,
                amountHT,
                status: p.status,
                invoice_url: p.invoice_url,
                receipt_url: p.receipt_url
            };
        });

    const generatePdf = async (facture) => {
        if (facture.invoice_url) {
            window.open(facture.invoice_url, '_blank');
            return;
        }
        if (facture.receipt_url) {
            window.open(facture.receipt_url, '_blank');
            return;
        }

        try {
            setDownloadingDocId(facture.id);
            await generateLocalInvoicePdf(clientData, facture);
            setDownloadingDocId(null);
        } catch (err) {
            console.error("Erreur lors de la génération PDF :", err);
            alert("Erreur de génération du PDF.");
            setDownloadingDocId(null);
        }
    };

    return (
        <div className="ec-tab-animate">
            <div className="tab-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ec-text-main)' }}>Vos Factures</h2>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '14px', marginTop: '4px' }}>Téléchargez vos justificatifs de paiement.</p>
                </div>
                <button 
                    className="ec-btn-primary" 
                    onClick={handleManagePaymentMethods}
                    disabled={isPortalLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: isPortalLoading ? 0.7 : 1, cursor: isPortalLoading ? 'not-allowed' : 'pointer', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}
                >
                    {isPortalLoading ? (
                        <>
                            <svg className="spinner" viewBox="0 0 24 24" width="16" height="16" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                            </svg>
                            Chargement...
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                            Gérer mes moyens de paiement
                        </>
                    )}
                </button>
            </div>

            {factures.length > 0 ? (
                <div className="cards-grid">
                    {factures.map((fac) => (
                        <div key={fac.id} className="case-card">
                            <div className="case-card-header">
                                <span className={`case-badge ${fac.status === 'payé' ? 'badge-success' : 'badge-danger'}`} style={{ backgroundColor: fac.status === 'payé' ? '#dcfce7' : '#fee2e2', color: fac.status === 'payé' ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600' }}>
                                    {fac.status === 'payé' ? 'Payée' : 'Impayé'}
                                </span>
                                <span className="case-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    {fac.dateStr}
                                </span>
                            </div>
                            
                            <div className="case-card-body">
                                <h3 className="case-title">{fac.ref}</h3>
                                <p className="case-client-name" style={{ marginTop: '8px', fontSize: '18px', fontWeight: '800', color: 'var(--ec-text-main)' }}>{fac.amountTTC.toFixed(2)} € TTC</p>
                                <p style={{ fontSize: '12px', color: 'var(--ec-text-sub)', marginTop: '2px' }}>({fac.amountHT.toFixed(2)} € HT + TVA 20%)</p>
                            </div>
                            
                            <div className="case-card-footer">
                                <button 
                                    className={fac.status === 'payé' ? "ec-btn-primary" : "ec-btn-primary danger"}
                                    onClick={() => fac.status === 'payé' ? generatePdf(fac) : handleManagePaymentMethods()}
                                    disabled={downloadingDocId === fac.id || isPortalLoading}
                                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: (downloadingDocId === fac.id || isPortalLoading) ? 0.7 : 1, cursor: (downloadingDocId === fac.id || isPortalLoading) ? 'not-allowed' : 'pointer', backgroundColor: fac.status === 'payé' ? '' : '#ef4444' }}
                                >
                                    {downloadingDocId === fac.id ? (
                                        <>
                                            <svg className="spinner" viewBox="0 0 24 24" width="14" height="14" style={{ animation: 'spin 1s linear infinite' }}>
                                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                                            </svg>
                                            Chargement...
                                        </>
                                    ) : (
                                        fac.status === 'payé' ? (
                                            <>
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="7 10 12 15 17 10"></polyline>
                                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                                </svg>
                                                Télécharger
                                            </>
                                        ) : (
                                            <>
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                                    <line x1="1" y1="10" x2="23" y2="10"></line>
                                                </svg>
                                                Régler l'impayé
                                            </>
                                        )
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state-full" style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid var(--ec-border)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--ec-text-sub)', opacity: 0.5, marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <p style={{ color: 'var(--ec-text-sub)', fontSize: '16px', fontWeight: '600' }}>Aucune facture disponible pour le moment.</p>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
