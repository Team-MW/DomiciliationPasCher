import { adminDataService } from '../../../services/adminDataService';
import logoUrl from '../../../assets/DomiciliationPasCher-Logo.png';
// import jsPDF from 'jspdf';
import { useState, useEffect } from 'react';

export default function Factures({ clientData }) {
    const [realPayments, setRealPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingDocId, setDownloadingDocId] = useState(null);

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
                            const extraInfo = typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info;
                            stripeCustomerId = extraInfo?.stripe_customer_id || null;
                        } catch (e) {
                            console.error("Error parsing clientData.extra_info:", e);
                        }
                    }

                    const stripePayments = await adminDataService.syncStripePayments(clientData.email, stripeCustomerId, clientData.since);
                    if (stripePayments && stripePayments.length > 0) {
                        let addedCount = 0;
                        for (const sp of stripePayments) {
                            const alreadyExists = pay.some(p => p.amount == sp.amount && p.date == sp.date);
                            if (!alreadyExists) {
                                await adminDataService.addPayment(clientData.id, {
                                    ...sp,
                                    invoice_ref: `STRIPE-${sp.id.substring(3, 10)}`
                                });
                                addedCount++;
                            }
                        }
                        if (addedCount > 0) {
                            const updatedPay = await adminDataService.getPayments(clientData.id);
                            setRealPayments(updatedPay);
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

    // Calculer uniquement les vraies factures payées à afficher (filtrage strict)
    const factures = realPayments
        .filter(p => p.status === 'payé')
        .map(p => {
            const amountTTC = parseFloat(p.amount);
            const amountHT = amountTTC / 1.2;
            return {
                id: p.id,
                ref: p.invoice_ref,
                dateStr: new Date(p.date).toLocaleDateString('fr-FR'),
                amountTTC,
                amountHT,
            };
        });

    const generatePdf = async (facture) => {
        try {
            setDownloadingDocId(facture.id);
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            const buildPdfContent = (imgData = null) => {
                if (imgData) {
                    try {
                        doc.addImage(imgData, 'PNG', 15, 15, 45, 15);
                    } catch (e) {
                        console.error("Erreur addImage logo PNG", e);
                    }
                }

                doc.setFontSize(22);
                doc.setTextColor(30, 41, 59);
                doc.text('FACTURE', 140, 25);
                
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text(`Réf : ${facture.ref}`, 140, 32);
                doc.text(`Date : ${facture.dateStr}`, 140, 38);

                doc.setFontSize(12);
                doc.setTextColor(30, 41, 59);
                doc.text('Domiciliation Pas Cher', 15, 48);
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text('150 Rue Nicolas Louis Vauquelin', 15, 54);
                doc.text('31100 Toulouse, FRANCE', 15, 60);
                doc.text('N° SIREN : 101 512 531', 15, 66);
                doc.text('contact@domiciliation-pas-cher.fr', 15, 72);

                doc.setFontSize(12);
                doc.setTextColor(30, 41, 59);
                doc.text('Facturé à :', 120, 48);
                doc.setFontSize(10);
                
                const sanitizePdfText = (str) => {
                    if (!str) return '';
                    // Supprime l'émoji téléphone et autres caractères non-Latin1 qui corrompent jsPDF
                    let clean = str.replace(/ - 📞.*/, '');
                    return clean.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
                };

                const clientName = clientData.company ? clientData.company : clientData.name;
                doc.text(sanitizePdfText(clientName) || 'Client', 120, 54);
                if (clientData.name && clientData.company) {
                    doc.text(sanitizePdfText(clientData.name), 120, 60);
                }
                doc.text(sanitizePdfText(clientData.email) || '', 120, 66);

                doc.setDrawColor(226, 232, 240);
                doc.line(15, 80, 195, 80);
                
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('Description', 15, 88);
                doc.text('Prix unitaire HT', 130, 88);
                doc.text('Total HT', 170, 88);

                doc.line(15, 93, 195, 93);

                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text(`Forfait Domiciliation - ${clientData.plan || 'Standard'}`, 15, 102);
                
                const ttc = facture.amountTTC.toFixed(2);
                const ht = facture.amountHT.toFixed(2);
                const tva = (facture.amountTTC - facture.amountHT).toFixed(2);

                doc.text(`${ht} €`, 130, 102);
                doc.text(`${ht} €`, 170, 102);

                doc.line(15, 110, 195, 110);

                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                doc.text('Total HT :', 130, 120);
                doc.text(`${ht} €`, 170, 120);

                doc.text('TVA (20%) :', 130, 128);
                doc.text(`${tva} €`, 170, 128);

                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text('Total TTC :', 130, 138);
                doc.text(`${ttc} €`, 170, 138);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(150, 160, 170);
                doc.text('Merci de votre confiance. Domiciliation Pas Cher', 105, 280, { align: 'center' });

                doc.save(`${facture.ref}.pdf`);
                setDownloadingDocId(null);
            };

            const img = new Image();
            img.src = logoUrl;
            img.onload = () => {
                buildPdfContent(img);
            };
            img.onerror = () => {
                console.error("Erreur de chargement de l'image du logo");
                buildPdfContent(null);
            };
        } catch (err) {
            console.error("Erreur lors de la génération PDF :", err);
            alert("Erreur de génération du PDF.");
            setDownloadingDocId(null);
        }
    };

    return (
        <div className="ec-tab-animate">
            <div className="tab-header" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ec-text-main)' }}>Vos Factures</h2>
                <p style={{ color: 'var(--ec-text-sub)', fontSize: '14px', marginTop: '4px' }}>Téléchargez vos justificatifs de paiement.</p>
            </div>

            {factures.length > 0 ? (
                <div className="cards-grid">
                    {factures.map((fac) => (
                        <div key={fac.id} className="case-card">
                            <div className="case-card-header">
                                <span className="case-badge badge-success">Payée</span>
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
                                    className="ec-btn-primary" 
                                    onClick={() => generatePdf(fac)}
                                    disabled={downloadingDocId === fac.id}
                                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: downloadingDocId === fac.id ? 0.7 : 1, cursor: downloadingDocId === fac.id ? 'not-allowed' : 'pointer' }}
                                >
                                    {downloadingDocId === fac.id ? (
                                        <>
                                            <svg className="spinner" viewBox="0 0 24 24" width="14" height="14" style={{ animation: 'spin 1s linear infinite' }}>
                                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                                            </svg>
                                            Chargement...
                                        </>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="7 10 12 15 17 10"></polyline>
                                                <line x1="12" y1="15" x2="12" y2="3"></line>
                                            </svg>
                                            Télécharger
                                        </>
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
