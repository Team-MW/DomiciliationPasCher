import React from 'react';
import jsPDF from 'jspdf';
import logoUrl from '../../../assets/DomiciliationPasCher-Logo.png';

export default function Factures({ clientData }) {
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

    // Calculer les mois écoulés depuis la date d'inscription
    const factures = [];
    const startDate = new Date(clientData.since);
    const currentDate = new Date();
    
    // Pour chaque mois, de startDate jusqu'à aujourd'hui
    let iterationDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endLimit = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    while (iterationDate <= endLimit) {
        const month = iterationDate.getMonth() + 1;
        const year = iterationDate.getFullYear();
        
        // On prend le même jour que la date de souscription, max 28 pour éviter les débordements de mois
        const day = startDate.getDate() > 28 ? 28 : startDate.getDate(); 
        
        const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        const ref = `FAC-${year}${month.toString().padStart(2, '0')}-${clientData.id.toString().substring(0, 4)}`;
        
        const amount = clientData.plan === 'Scan+' ? 28 : 23;

        factures.push({
            id: ref,
            ref,
            dateStr,
            amount
        });

        // Mois suivant
        iterationDate.setMonth(iterationDate.getMonth() + 1);
    }

    // Trier les factures par date décroissante
    factures.reverse();

    const generatePdf = (facture) => {
        const doc = new jsPDF();

        const buildPdfContent = (imgData = null) => {
            if (imgData) {
                doc.addImage(imgData, 'PNG', 15, 15, 45, 15);
            }

            // 2. Textes Header
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text('FACTURE', 140, 25);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Réf : ${facture.ref}`, 140, 32);
            doc.text(`Date : ${facture.dateStr}`, 140, 38);

            // 3. Infos entreprise Domiciliation
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text('Domiciliation Pas Cher', 15, 48);
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('contact@domiciliationpascher.com', 15, 54);
            doc.text('https://domiciliation-pas-cher.fr', 15, 60);

            // 4. Infos Client
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text('Facturé à :', 120, 48);
            doc.setFontSize(10);
            const clientName = clientData.company ? clientData.company : clientData.name;
            doc.text(clientName || 'Client', 120, 54);
            if (clientData.name && clientData.company) {
                doc.text(clientData.name, 120, 60);
            }
            doc.text(clientData.email || '', 120, 66);

            // 5. Tableau Lignes de facture
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 80, 195, 80);
            
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text('Description', 15, 88);
            doc.text('Montant HT', 130, 88);
            doc.text('Montant TTC', 170, 88);

            doc.line(15, 93, 195, 93);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Forfait Domiciliation - ${clientData.plan || 'Standard'}`, 15, 102);
            
            const ttc = facture.amount;
            const ht = (ttc / 1.2).toFixed(2);
            const tva = (ttc - ht).toFixed(2);

            doc.text(`${ht} €`, 130, 102);
            doc.text(`${ttc.toFixed(2)} €`, 170, 102);

            doc.line(15, 110, 195, 110);

            // 6. Totaux
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Total HT :', 130, 120);
            doc.text(`${ht} €`, 170, 120);

            doc.text('TVA (20%) :', 130, 128);
            doc.text(`${tva} €`, 170, 128);

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text('Total TTC :', 130, 138);
            doc.text(`${ttc.toFixed(2)} €`, 170, 138);
            
            // Footer
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(150, 160, 170);
            doc.text('Merci de votre confiance. Domiciliation Pas Cher', 105, 280, { align: 'center' });

            doc.save(`${facture.ref}.pdf`);
        }

        const img = new Image();
        img.src = logoUrl;
        img.onload = () => {
            buildPdfContent(img);
        };
        img.onerror = () => {
            console.error("Erreur de chargement de l'image du logo");
            buildPdfContent(null);
        };
    };

    return (
        <div className="ec-tab-animate">
            <div className="ec-content-card">
                <div className="ec-card-header">
                    <h2>Factures</h2>
                </div>
                {factures.length > 0 ? (
                    <table className="ec-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Référence</th>
                                <th>Date</th>
                                <th>Montant</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {factures.map((fac) => (
                                <tr key={fac.id}>
                                    <td style={{ fontWeight: '600' }}>{fac.ref}</td>
                                    <td>{fac.dateStr}</td>
                                    <td style={{ fontWeight: '700' }}>{fac.amount} €</td>
                                    <td>
                                        <button 
                                            className="ec-btn-secondary" 
                                            onClick={() => generatePdf(fac)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="7 10 12 15 17 10"></polyline>
                                                <line x1="12" y1="15" x2="12" y2="3"></line>
                                            </svg>
                                            Télécharger
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="ec-card-body" style={{ padding: '40px', textAlign: 'center' }}>
                        <p style={{ color: '#64748b' }}>Aucune facture disponible pour le moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
