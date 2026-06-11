import logoUrl from '../assets/DomiciliationPasCher-Logo.png';

/**
 * Extrait de manière sécurisée les informations supplémentaires du client
 */
const getClientExtraInfo = (clientData) => {
    if (!clientData) return {};
    let extra = {};
    try {
        if (clientData.extra_info) {
            extra = typeof clientData.extra_info === 'string' 
                ? JSON.parse(clientData.extra_info) 
                : clientData.extra_info;
        }
    } catch (e) {
        console.error("Error parsing extra_info in pdfGenerator:", e);
    }
    return extra || {};
};

/**
 * Calcule le tarif de l'abonnement en fonction du forfait du client
 */
const getPlanTariff = (plan) => {
    const p = (plan || '').toLowerCase();
    // Les prix affichés sont HT. Le TTC = HT × 1.20 (TVA 20%)
    if (p.includes('scan')) return { ht: 24, ttc: (24 * 1.2).toFixed(2), tva: (24 * 0.2).toFixed(2), name: 'Scan+' };
    if (p.includes('physique') || p.includes('reexpedition')) return { ht: 38, ttc: (38 * 1.2).toFixed(2), tva: (38 * 0.2).toFixed(2), name: 'Physique+' };
    return { ht: 20, ttc: (20 * 1.2).toFixed(2), tva: (20 * 0.2).toFixed(2), name: 'Notification' };
};

/**
 * Génère l'Attestation de Domiciliation officielle au format PDF
 */
export const generateAttestationPdf = async (clientData) => {
    try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const extra = getClientExtraInfo(clientData);
        const planDetails = getPlanTariff(clientData.plan);
        
        // Coordonnées et dates
        const rawDate = clientData.since || new Date().toISOString().split('T')[0];
        const dateSignature = new Date(rawDate).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const dateDuJour = new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const clientName = extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant');
        const companyName = String(clientData.company || extra.nomSociete || 'Société en cours de constitution');
        const formeJuridique = extra.formeJuridique || 'EI / Société';
        const sirenText = extra.siren ? `SIREN ${extra.siren}` : 'en cours de constitution au Greffe';
        const clientAddress = clientData.address || extra.adressePerso || "Adresse personnelle non renseignée";
        const clientActivity = extra.activite || "Activités de services et de conseil";

        const buildPdf = (imgData = null) => {
            // -- FOND & BORDURE DÉCORATIVE --
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.5);
            doc.rect(8, 8, 194, 281); // Cadre général premium

            // -- EN-TÊTE --
            if (imgData) {
                try {
                    doc.addImage(imgData, 'PNG', 15, 15, 45, 15);
                } catch (e) {
                    console.error("Erreur addImage logo PNG dans Attestation", e);
                }
            }

            // Émetteur à droite
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text('DOMICILIATION PAS CHER', 135, 18);
            doc.text('150 Rue Nicolas Louis Vauquelin', 135, 22);
            doc.text('3ème étage, Lot 308 - 31100 Toulouse', 135, 26);
            doc.text('Agrément Préfectoral : CASSIN-DOM-2026-31', 135, 30);
            doc.text('contact@domiciliation-pas-cher.fr', 135, 34);

            // Ligne séparatrice
            doc.setDrawColor(203, 213, 225); // slate-300
            doc.line(15, 40, 195, 40);

            // -- TITRE PRINCIPAL --
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text("ATTESTATION DE DOMICILIATION", 105, 55, { align: 'center' });
            
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text("Délivrée conformément aux dispositions du Décret n° 85-1280 du 5 décembre 1985", 105, 61, { align: 'center' });

            // -- CORPS DE L'ATTESTATION --
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59); // slate-800
            
            let currentY = 75;

            // Paragraphe d'introduction
            const textIntro = "Nous soussignés, la société DOMICILIATION PAS CHER, titulaire de l'Agrément Préfectoral de Domiciliation Commerciale n° CASSIN-DOM-2026-31 délivré par la Préfecture de la Haute-Garonne, certifions par la présente accorder la domiciliation juridique et administrative à :";
            const splitIntro = doc.splitTextToSize(textIntro, 175);
            doc.text(splitIntro, 15, currentY);
            currentY += splitIntro.length * 5.5 + 8;

            // Encadré de la société domiciliée
            doc.setFillColor(248, 250, 252); // slate-50
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(15, currentY, 180, 48, 3, 3, 'FD');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text(companyName, 22, currentY + 8);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(`Forme juridique : ${formeJuridique}`, 22, currentY + 16);
            doc.text(`Statut d'immatriculation : ${sirenText}`, 22, currentY + 22);
            doc.text(`Représentant légal : M./Mme ${clientName}`, 22, currentY + 28);
            
            const splitAddressPerso = doc.splitTextToSize(`Adresse personnelle du gérant : ${clientAddress}`, 165);
            doc.text(splitAddressPerso, 22, currentY + 34);

            currentY += 58;

            // Adresse de domiciliation
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text("L'adresse officielle du siège social de l'entreprise est ainsi fixée à :", 15, currentY);
            currentY += 8;

            doc.setFillColor(239, 246, 255); // blue-50
            doc.setDrawColor(191, 219, 254); // blue-200
            doc.roundedRect(15, currentY, 180, 20, 2, 2, 'FD');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175); // blue-800
            doc.text("150 RUE NICOLAS LOUIS VAUQUELIN, 3È ETAGE, LOT 308", 105, currentY + 8, { align: 'center' });
            doc.text("31100 TOULOUSE, FRANCE", 105, currentY + 14, { align: 'center' });

            currentY += 30;

            // Paragraphe de conclusion
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            
            const textConcl = `Cette domiciliation est accordée pour l'exercice de son activité de « ${clientActivity} », dans le cadre du contrat de domiciliation commerciale conclu le ${dateSignature} pour une durée indéterminée.`;
            const splitConcl = doc.splitTextToSize(textConcl, 175);
            doc.text(splitConcl, 15, currentY);
            currentY += splitConcl.length * 5.5 + 12;

            // Date de délivrance
            doc.setFont("helvetica", "normal");
            doc.text(`Fait à Toulouse, le ${dateDuJour}`, 15, currentY);
            currentY += 15;

            // -- SIGNATURES et TAMPON --
            // Cadre signature
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Pour le Domiciliataire", 130, currentY);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("La Direction de Domiciliation Pas Cher", 130, currentY + 5);

            // Simulation d'un sceau/tampon officiel de l'entreprise
            doc.setDrawColor(37, 99, 235); // blue-600
            doc.setTextColor(37, 99, 235);
            doc.setLineWidth(0.8);
            doc.rect(130, currentY + 12, 50, 25);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text("DOMICILIATION PAS CHER", 155, currentY + 18, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.text("AGRÉÉ PRÉFECTURE", 155, currentY + 23, { align: 'center' });
            doc.text("31100 TOULOUSE", 155, currentY + 28, { align: 'center' });

            // Pied de page
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text("DOMICILIATION PAS CHER - SIRET xxxxx - RCS Toulouse - Agrément Préfectoral CASSIN-DOM-2026-31", 105, 280, { align: 'center' });
            doc.text("Document officiel généré automatiquement. Pour faire valoir ce que de droit.", 105, 284, { align: 'center' });

            doc.save(`Attestation_Domiciliation_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        };

        const img = new Image();
        img.src = logoUrl;
        img.onload = () => {
            buildPdf(img);
        };
        img.onerror = () => {
            console.error("Erreur de chargement du logo pour Attestation");
            buildPdf(null);
        };

    } catch (err) {
        console.error("Erreur génération Attestation PDF :", err);
        alert("Erreur lors de la génération de l'attestation.");
    }
};

/**
 * Génère le Contrat de Domiciliation Commerciale au format PDF (2 pages)
 */
export const generateContratPdf = async (clientData) => {
    try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const extra = getClientExtraInfo(clientData);
        const planDetails = getPlanTariff(clientData.plan);

        const rawDate = clientData.since || new Date().toISOString().split('T')[0];
        const dateDebut = new Date(rawDate).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const clientName = extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant');
        const companyName = String(clientData.company || extra.nomSociete || 'Société en cours de constitution');
        const formeJuridique = extra.formeJuridique || 'EI / Société';
        const sirenText = extra.siren ? `SIREN ${extra.siren}` : 'en cours de constitution';
        const clientAddress = clientData.address || extra.adressePerso || "Adresse personnelle non renseignée";
        const clientActivity = extra.activite || "Activités de services et de conseil";
        const isAnnuel = extra.frequence === 'annuel';

        const buildPdf = (imgData = null) => {
            // PAGE 1
            // Cadre
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.rect(8, 8, 194, 281);

            // Logo
            if (imgData) {
                try {
                    doc.addImage(imgData, 'PNG', 15, 15, 45, 15);
                } catch (e) {}
            }

            // En-tête à droite
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('CONTRAT DE DOMICILIATION', 135, 18);
            doc.text('Référence : CONTRAT-' + clientData.id, 135, 22);
            doc.text('Date de souscription : ' + dateDebut, 135, 26);
            doc.text('Formule : Forfait ' + planDetails.name, 135, 30);

            // Ligne séparatrice
            doc.setDrawColor(203, 213, 225);
            doc.line(15, 36, 195, 36);

            // Titre Contrat
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text("CONTRAT DE DOMICILIATION COMMERCIALE", 105, 48, { align: 'center' });
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text("Réglementé par les articles L. 123-11-2 et suivants du Code de commerce et le Décret n° 85-1280", 105, 53, { align: 'center' });

            // Parties
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text("ENTRE LES SOUSSIGNÉS :", 15, 65);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(51, 65, 85);
            
            const txtPartie1 = "1. La société DOMICILIATION PAS CHER, société par actions simplifiée, au siège social situé au 150 Rue Nicolas Louis Vauquelin, 3ème étage, Lot 308, 31100 Toulouse, représentée par sa direction, titulaire de l'Agrément Préfectoral CASSIN-DOM-2026-31.";
            const splitPartie1 = doc.splitTextToSize(txtPartie1, 175);
            doc.text(splitPartie1, 15, 71);
            doc.setFont("helvetica", "bold");
            doc.text("Ci-après désignée « Le Domiciliataire », d'une part.", 15, 71 + (splitPartie1.length * 4.5));

            let nextY = 71 + (splitPartie1.length * 4.5) + 8;

            doc.setFont("helvetica", "normal");
            const txtPartie2 = `2. La société ${companyName.toUpperCase()}, ${formeJuridique}, ${sirenText}, représentée par M./Mme ${clientName}, demeurant à l'adresse personnelle suivante : ${clientAddress}.`;
            const splitPartie2 = doc.splitTextToSize(txtPartie2, 175);
            doc.text(splitPartie2, 15, nextY);
            doc.setFont("helvetica", "bold");
            doc.text("Ci-après désignée « Le Domicilié », d'autre part.", 15, nextY + (splitPartie2.length * 4.5));

            nextY = nextY + (splitPartie2.length * 4.5) + 12;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text("IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :", 15, nextY);
            
            nextY += 8;

            // ARTICLES
            const articles = [
                {
                    title: "ARTICLE 1 : OBJET DU CONTRAT",
                    body: `Le Domiciliataire met à la disposition du Domicilié ses locaux situés au 150 Rue Nicolas Louis Vauquelin, 3ème étage, Lot 308, 31100 Toulouse, afin d'y fixer son siège social / établissement principal. Le Domicilié s'engage à utiliser effectivement et exclusivement ces locaux à ce titre et à mentionner cette adresse sur tous ses documents commerciaux, factures et papiers à en-tête.`
                },
                {
                    title: "ARTICLE 2 : DURÉE DU CONTRAT",
                    body: "Le présent contrat est conclu pour une durée initiale de trois (3) mois à compter du " + dateDebut + ". À l'expiration de cette période, il se poursuivra par tacite reconduction par périodes de trois mois, sauf résiliation notifiée par l'une des parties moyennant le respect d'un préavis de un (1) mois."
                },
                {
                    title: "ARTICLE 3 : SERVICES FOURNIS ET FORMULE",
                    body: `Le Domicilié a souscrit au forfait « ${planDetails.name} ». Le Domiciliataire s'engage à assurer la réception et le tri des courriers postaux reçus au nom du Domicilié. Selon le forfait souscrit, les services incluent soit la simple mise à disposition du courrier, soit le scan numérique des courriers sous 24h, soit la réexpédition régulière par courrier postal.`
                }
            ];

            articles.forEach(art => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(15, 23, 42);
                doc.text(art.title, 15, nextY);
                nextY += 5;
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9.5);
                doc.setTextColor(51, 65, 85);
                const splitBody = doc.splitTextToSize(art.body, 175);
                doc.text(splitBody, 15, nextY);
                nextY += (splitBody.length * 4.5) + 6;
            });

            // Pied de page P1
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text("Paraphe Domiciliataire : _________                        Paraphe Domicilié : _________", 15, 275);
            doc.text("Page 1 sur 2", 105, 280, { align: 'center' });

            // -- PAGE 2 --
            doc.addPage();
            
            // Cadre
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.rect(8, 8, 194, 281);

            let page2Y = 20;

            const articlesPage2 = [
                {
                    title: "ARTICLE 4 : OBLIGATIONS DU DOMICILIÉ",
                    body: "Le Domicilié s'engage à informer le Domiciliataire de toute modification concernant sa forme juridique, son activité, son adresse personnelle ou son identité. Il s'engage en outre à ne pas stocker de marchandises, matériels ou substances illicites dans les locaux du Domiciliataire. Il donne mandat au Domiciliataire de recevoir pour son compte tous les courriers ordinaires, recommandés et actes administratifs."
                },
                {
                    title: "ARTICLE 5 : CONDITIONS FINANCIÈRES ET MODALITÉS DE PAIEMENT",
                    body: `Le présent contrat est consenti et accepté moyennant le paiement d'un abonnement mensuel correspondant à la formule choisie :
• Tarif mensuel Forfait ${planDetails.name} : ${parseFloat(planDetails.ttc).toFixed(2)} € TTC (soit ${parseFloat(planDetails.ht).toFixed(2)} € HT + ${parseFloat(planDetails.tva).toFixed(2)} € TVA 20%).
 Le règlement s'effectue par prélèvement bancaire automatique ou carte bancaire récurrente Stripe, selon la fréquence de facturation retenue (${isAnnuel ? 'Annuelle' : 'Mensuelle'}). Tout mois entamé est dû dans son intégralité.`
                },
                {
                    title: "ARTICLE 6 : RÉSILIATION ET RUPTURE",
                    body: "En cas de défaut de paiement de tout ou partie d'une mensualité ou d'inexécution par l'une des parties de ses obligations contractuelles, le présent contrat sera résilié de plein droit 15 jours après une mise en demeure par courriel ou lettre recommandée restée sans effet. Le Domiciliataire signalera immédiatement la résiliation au Greffe du Tribunal de Commerce."
                }
            ];

            articlesPage2.forEach(art => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(15, 23, 42);
                doc.text(art.title, 15, page2Y);
                page2Y += 5;
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9.5);
                doc.setTextColor(51, 65, 85);
                const splitBody = doc.splitTextToSize(art.body, 175);
                doc.text(splitBody, 15, page2Y);
                page2Y += (splitBody.length * 4.5) + 6;
            });

            page2Y += 6;

            // Conclusion contractuelle
            doc.setFont("helvetica", "normal");
            doc.text(`Fait en double exemplaire à Toulouse, le ${dateDebut}.`, 15, page2Y);
            page2Y += 15;

            // Blocs de signature
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text("Le Domiciliataire (Domiciliation Pas Cher)", 15, page2Y);
            doc.text("Le Domicilié", 110, page2Y);

            page2Y += 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("(Signature précédée de « Bon pour accord »)", 110, page2Y);

            page2Y += 6;
            doc.text("La Direction", 15, page2Y);
            doc.text(`Pour ${companyName.toUpperCase()}`, 110, page2Y);

            // Simulation tampon signature admin
            doc.setDrawColor(37, 99, 235);
            doc.setTextColor(37, 99, 235);
            doc.setLineWidth(0.6);
            doc.rect(15, page2Y + 6, 45, 20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.text("DOMICILIATION PAS CHER", 37.5, page2Y + 12, { align: 'center' });
            doc.text("CONTRAT SIGNÉ EN LIGNE", 37.5, page2Y + 18, { align: 'center' });

            // Pied de page P2
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text("Page 2 sur 2", 105, 280, { align: 'center' });

            doc.save(`Contrat_Domiciliation_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        };

        const img = new Image();
        img.src = logoUrl;
        img.onload = () => {
            buildPdf(img);
        };
        img.onerror = () => {
            console.error("Erreur de chargement du logo pour Contrat");
            buildPdf(null);
        };

    } catch (err) {
        console.error("Erreur génération Contrat PDF :", err);
        alert("Erreur lors de la génération du contrat.");
    }
};

/**
 * Génère le Contrat signé sous forme de Blob (pour upload Cloudinary).
 * Intègre la signature du client et un bandeau de certification.
 * @param {Object} clientData  - Données du client
 * @param {string} signatureDataUrl - Data URL base64 de la signature
 * @returns {Promise<Blob>}
 */
export const generateSignedContratBlob = (clientData, signatureDataUrl) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const extra = getClientExtraInfo(clientData);
            const planDetails = getPlanTariff(clientData.plan);

            const rawDate = clientData.since || new Date().toISOString().split('T')[0];
            const dateDebut = new Date(rawDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const signedNow = new Date();
            const signedAtDate = signedNow.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const signedAtTime = signedNow.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            const clientName = extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant');
            const companyName = String(clientData.company || extra.nomSociete || 'Société en cours de constitution');
            const formeJuridique = extra.formeJuridique || 'EI / Société';
            const sirenText = extra.siren ? `SIREN ${extra.siren}` : 'en cours de constitution';
            const clientAddress = clientData.address || extra.adressePerso || 'Adresse personnelle non renseignée';
            const isAnnuel = extra.frequence === 'annuel';

            const buildPdf = (logoImg, sigImg) => {
                // ===== PAGE 1 =====
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.5);
                doc.rect(8, 8, 194, 281);

                if (logoImg) {
                    try { doc.addImage(logoImg, 'PNG', 15, 15, 45, 15); } catch (e) {}
                }

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text('CONTRAT DE DOMICILIATION', 135, 18);
                doc.text('Référence : CONTRAT-' + clientData.id, 135, 22);
                doc.text('Date : ' + dateDebut, 135, 26);
                doc.text('Formule : Forfait ' + planDetails.name, 135, 30);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 163, 74);
                doc.text('✔ SIGNÉ ÉLECTRONIQUEMENT', 135, 34);

                doc.setDrawColor(203, 213, 225);
                doc.line(15, 38, 195, 38);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.setTextColor(15, 23, 42);
                doc.text('CONTRAT DE DOMICILIATION COMMERCIALE', 105, 50, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(71, 85, 105);
                doc.text('Réglementé par les articles L. 123-11-2 et suivants du Code de commerce', 105, 55, { align: 'center' });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(15, 23, 42);
                doc.text('ENTRE LES SOUSSIGNÉS :', 15, 67);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(51, 65, 85);

                const txtP1 = "1. La société DOMICILIATION PAS CHER, société par actions simplifiée, au siège social situé au 150 Rue Nicolas Louis Vauquelin, 3ème étage, Lot 308, 31100 Toulouse, représentée par sa direction, titulaire de l'Agrément Préfectoral CASSIN-DOM-2026-31.";
                const sP1 = doc.splitTextToSize(txtP1, 175);
                doc.text(sP1, 15, 73);
                doc.setFont('helvetica', 'bold');
                doc.text("Ci-après désignée « Le Domiciliataire », d'une part.", 15, 73 + sP1.length * 4.5);

                let ny = 73 + sP1.length * 4.5 + 8;
                doc.setFont('helvetica', 'normal');
                const txtP2 = `2. La société ${companyName.toUpperCase()}, ${formeJuridique}, ${sirenText}, représentée par M./Mme ${clientName}, demeurant à : ${clientAddress}.`;
                const sP2 = doc.splitTextToSize(txtP2, 175);
                doc.text(sP2, 15, ny);
                doc.setFont('helvetica', 'bold');
                doc.text("Ci-après désignée « Le Domicilié », d'autre part.", 15, ny + sP2.length * 4.5);

                ny = ny + sP2.length * 4.5 + 12;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(15, 23, 42);
                doc.text('IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :', 15, ny);
                ny += 8;

                const articles = [
                    { title: 'ARTICLE 1 : OBJET DU CONTRAT', body: `Le Domiciliataire met à la disposition du Domicilié ses locaux situés au 150 Rue Nicolas Louis Vauquelin, 3ème étage, Lot 308, 31100 Toulouse, afin d'y fixer son siège social. Le Domicilié s'engage à utiliser effectivement et exclusivement ces locaux à ce titre.` },
                    { title: 'ARTICLE 2 : DURÉE DU CONTRAT', body: `Le présent contrat est conclu pour une durée initiale de trois (3) mois à compter du ${dateDebut}. À l'expiration, il se poursuit par tacite reconduction sauf résiliation avec un préavis d'un (1) mois.` },
                    { title: 'ARTICLE 3 : SERVICES ET FORMULE', body: `Le Domicilié a souscrit au forfait « ${planDetails.name} ». Tarif mensuel : ${parseFloat(planDetails.ttc).toFixed(2)} € TTC (${parseFloat(planDetails.ht).toFixed(2)} € HT + TVA 20%). Fréquence : ${isAnnuel ? 'Annuelle' : 'Mensuelle'}.` },
                ];

                articles.forEach(art => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10.5);
                    doc.setTextColor(15, 23, 42);
                    doc.text(art.title, 15, ny);
                    ny += 5;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9.5);
                    doc.setTextColor(51, 65, 85);
                    const sb = doc.splitTextToSize(art.body, 175);
                    doc.text(sb, 15, ny);
                    ny += sb.length * 4.5 + 6;
                });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text('Paraphe Domiciliataire : _________                        Paraphe Domicilié : _________', 15, 275);
                doc.text('Page 1 sur 2', 105, 280, { align: 'center' });

                // ===== PAGE 2 =====
                doc.addPage();
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.5);
                doc.rect(8, 8, 194, 281);

                let p2y = 20;

                const articles2 = [
                    { title: 'ARTICLE 4 : OBLIGATIONS DU DOMICILIÉ', body: "Le Domicilié s'engage à informer le Domiciliataire de toute modification concernant sa forme juridique, son activité ou son identité. Il donne mandat au Domiciliataire de recevoir pour son compte tous les courriers et actes administratifs." },
                    { title: 'ARTICLE 5 : CONDITIONS FINANCIÈRES', body: `Tarif mensuel : ${parseFloat(planDetails.ttc).toFixed(2)} € TTC. Règlement par prélèvement bancaire ou carte bancaire récurrente Stripe.` },
                    { title: 'ARTICLE 6 : RÉSILIATION', body: "En cas de défaut de paiement, le contrat sera résilié de plein droit 15 jours après mise en demeure. Le Domiciliataire signalera la résiliation au Greffe du Tribunal de Commerce." },
                ];

                articles2.forEach(art => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10.5);
                    doc.setTextColor(15, 23, 42);
                    doc.text(art.title, 15, p2y);
                    p2y += 5;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9.5);
                    doc.setTextColor(51, 65, 85);
                    const sb = doc.splitTextToSize(art.body, 175);
                    doc.text(sb, 15, p2y);
                    p2y += sb.length * 4.5 + 6;
                });

                p2y += 6;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(51, 65, 85);
                doc.text(`Fait en double exemplaire à Toulouse, le ${signedAtDate}.`, 15, p2y);
                p2y += 12;

                // Blocs signatures côte à côte
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10.5);
                doc.setTextColor(15, 23, 42);
                doc.text('Le Domiciliataire (Domiciliation Pas Cher)', 15, p2y);
                doc.text('Le Domicilié', 110, p2y);

                p2y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(71, 85, 105);
                doc.text('(Signature précédée de « Bon pour accord »)', 110, p2y);

                p2y += 6;
                doc.text('La Direction', 15, p2y);
                doc.text(`Pour ${companyName.toUpperCase()}`, 110, p2y);

                // Tampon admin
                doc.setDrawColor(37, 99, 235);
                doc.setTextColor(37, 99, 235);
                doc.setLineWidth(0.6);
                doc.rect(15, p2y + 6, 45, 20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.text('DOMICILIATION PAS CHER', 37.5, p2y + 12, { align: 'center' });
                doc.text('CONTRAT SIGNÉ EN LIGNE', 37.5, p2y + 18, { align: 'center' });
                doc.text('AGRÉÉ PRÉFECTURE 31', 37.5, p2y + 24, { align: 'center' });

                // Signature du client (image)
                if (sigImg) {
                    try {
                        doc.addImage(sigImg, 'PNG', 110, p2y + 6, 80, 22);
                    } catch (e) {
                        doc.setDrawColor(200, 200, 200);
                        doc.rect(110, p2y + 6, 80, 22);
                    }
                }

                // Bandeau certification
                p2y += 32;
                doc.setFillColor(239, 246, 255);
                doc.setDrawColor(191, 219, 254);
                doc.roundedRect(15, p2y, 180, 26, 3, 3, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(30, 64, 175);
                doc.text('✔ SIGNATURE ÉLECTRONIQUE CERTIFIÉE', 105, p2y + 8, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(71, 85, 105);
                doc.text(`Signataire : ${clientName} — ${clientData.email || ''}`, 105, p2y + 14, { align: 'center' });
                doc.text(`Date/heure : ${signedAtDate} à ${signedAtTime} (heure locale) — Conforme règlement eIDAS`, 105, p2y + 20, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text('Page 2 sur 2', 105, 280, { align: 'center' });

                const dataUrl = doc.output('datauristring');
                
                // Convertir la Data URL en un Blob natif 100% pur (compatible arrayBuffer)
                const arr = dataUrl.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], { type: mime });
            };

            // Charger les images en parallèle
            const loadImg = (src) => new Promise((res) => {
                if (!src) return res(null);
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = src;
            });

            const [logoImg, sigImg] = await Promise.all([loadImg(logoUrl), loadImg(signatureDataUrl)]);
            const blob = buildPdf(logoImg, sigImg);
            resolve(blob);
        } catch (err) {
            console.error('generateSignedContratBlob error:', err);
            reject(err);
        }
    });
};

/**
 * Génère le blob PDF d'une Procuration Postale signée en remplissant le document officiel
 */
export const generateSignedProcurationBlob = async (clientData, signatureDataUrl, procurationData) => {
    try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Polices
        doc.setFont("helvetica", "bold");
        
        // --- 1. En-tête ---
        // Logo Officiel La Poste
        const addLogo = () => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = '/logo_laposte.png';
                img.onload = () => {
                    // Dimensionner proportionnellement
                    const ratio = img.width / img.height;
                    const h = 10;
                    const w = h * ratio;
                    doc.addImage(img, 'PNG', 15, 10, w, h);
                    resolve();
                };
                img.onerror = () => {
                    // Fallback texte si l'image ne charge pas
                    doc.setFillColor(30, 58, 138);
                    doc.rect(15, 12, 22, 6, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(8);
                    doc.text("LA POSTE", 26, 16, { align: 'center' });
                    resolve();
                };
            });
        };
        await addLogo();
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(13);
        doc.text("PROCURATION D'UN CLIENT DESTINATAIRE D'ENVOIS POSTAUX CONTRE SIGNATURE A UN PRESTATAIRE", 155, 16, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const introText = "Les envois postaux à remettre contre signature (lettre recommandée...) doivent être distribués par La Poste, au destinataire ou à son mandataire/représentant muni d'une procuration régulière. Parmi les courriers destinés aux clients du Prestataire, peuvent se trouver des objets à remettre contre signature.";
        const splitIntro = doc.splitTextToSize(introText, 270);
        doc.text(splitIntro, 15, 26);
        
        // --- Fonction utilitaire pour dessiner les lignes de champs ---
        const drawField = (label, y, value = '') => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text(label, 15, y);
            
            const startX = 120; // Plus loin pour ne pas chevaucher les labels longs
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(startX, y + 1, 280, y + 1);
            
            if (value) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text(value.toString().toUpperCase(), startX + 5, y - 0.5);
            }
        };

        let currentY = 40;
        
        // --- SECTION 1 : LE CLIENT DESTINATAIRE ---
        doc.setFillColor(0, 0, 0);
        doc.rect(15, currentY - 3, 3, 3, 'F'); // Petit carré à la place de la flèche
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("LE CLIENT DESTINATAIRE ET SON ADRESSE DE DISTRIBUTION", 20, currentY);
        
        doc.setFontSize(8);
        doc.text("N° SIRET :", 220, currentY);
        if(clientData.siret) {
            doc.setFont("helvetica", "normal");
            doc.text(clientData.siret, 235, currentY);
            doc.setFont("helvetica", "bold");
        }
        
        currentY += 8;
        const nomMandant = procurationData.nom || clientData.name || '';
        const companyMandant = clientData.company || nomMandant || '';
        const pRemise = procurationData.pointRemise || '';
        const pComplement = procurationData.complementAdresse || '';
        const pVoie = procurationData.adresseVoie || '';
        const pLieuDit = procurationData.lieuDit || '';
        const pCodePostalVille = procurationData.codePostalVille || '';
        
        drawField("Raison sociale ou Nom d'Enseigne :", currentY, companyMandant); currentY += 6;
        drawField("Point de remise du courrier : (n° appart. , étage, couloir, escalier)", currentY, pRemise); currentY += 6;
        drawField("Complément d'adresse : (résidence, bâtiment, immeuble, tour, entrée,...)", currentY, pComplement); currentY += 6;
        drawField("N°, TYPE (rue, avenue), et NOM DE LA VOIE :", currentY, pVoie); currentY += 6;
        drawField("Lieu dit ou service particulier de distribution : (ex : BP, poste restante)", currentY, pLieuDit); currentY += 6;
        drawField("CODE POSTAL et LOCALITÉ DE DESTINATION :", currentY, pCodePostalVille); currentY += 6;
        drawField("Pays : (pour Andorre, Monaco, Collectivités d'Outre Mer, DOM)", currentY, "FRANCE"); currentY += 10;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Représenté par :", 15, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(nomMandant.toUpperCase(), 45, currentY);
        doc.setDrawColor(200, 200, 200);
        doc.line(40, currentY + 1, 100, currentY + 1);
        
        doc.setFont("helvetica", "bold");
        doc.text("Agissant en qualité de* :", 105, currentY);
        doc.setFont("helvetica", "normal");
        doc.text("DIRIGEANT", 145, currentY);
        doc.line(140, currentY + 1, 190, currentY + 1);
        
        // Cases à cocher
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(200, currentY - 3, 3, 3);
        doc.setFont("helvetica", "bold");
        doc.text("X", 200.5, currentY - 0.5); // Coché
        doc.text("Donne pouvoir", 205, currentY);
        
        doc.rect(240, currentY - 3, 3, 3);
        doc.text("Annule le pouvoir donné", 245, currentY);
        
        currentY += 5;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text("* justifier le pouvoir par la présentation d'une pièce d'identité originale + document légal d'existence juridique si le Dossier de Société postal n'est pas encore constitué à La Poste.", 15, currentY);
        
        // --- SECTION 2 : AU PRESTATAIRE ---
        currentY += 12;
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(0, 0, 0);
        doc.rect(15, currentY - 3, 3, 3, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("AU PRESTATAIRE", 20, currentY);
        
        doc.setFontSize(8);
        doc.text("N° SIRET :", 220, currentY);
        doc.setFont("helvetica", "normal");
        doc.text("380 439 778 00035", 235, currentY);
        
        currentY += 8;
        drawField("Raison sociale ou Nom d'Enseigne :", currentY, "MICRODIDACT / DOMICILIATION PAS CHER"); currentY += 6;
        drawField("Point de remise du courrier : (n° appart. , étage, couloir, escalier)", currentY); currentY += 6;
        drawField("Complément d'adresse : (résidence, bâtiment, immeuble, tour, entrée,...)", currentY); currentY += 6;
        drawField("N°, TYPE (rue, avenue), et NOM DE LA VOIE :", currentY, "15 RUE NICOLAS LOUIS VAUQUELIN"); currentY += 6;
        drawField("Lieu dit ou service particulier de distribution : (ex : BP, poste restante)", currentY); currentY += 6;
        drawField("CODE POSTAL et LOCALITÉ DE DESTINATION :", currentY, "31100 TOULOUSE"); currentY += 6;
        drawField("Pays : (pour Andorre, Monaco, Collectivités d'Outre Mer, DOM)", currentY, "FRANCE"); currentY += 12;

        // --- SECTION 3 : SIGNATURE ---
        doc.setFillColor(0, 0, 0);
        doc.rect(15, currentY - 3, 3, 3, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("POUR RETIRER / RECEVOIR LES ENVOIS DE LA POSTE", 20, currentY);
        
        currentY += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("À :", 15, currentY);
        doc.setFont("helvetica", "normal");
        doc.text("TOULOUSE", 25, currentY);
        doc.setDrawColor(200, 200, 200);
        doc.line(22, currentY + 1, 70, currentY + 1);
        
        doc.setFont("helvetica", "bold");
        doc.text("Le :", 80, currentY);
        const dateObj = new Date();
        const dateStr = dateObj.toLocaleDateString('fr-FR');
        doc.setFont("helvetica", "normal");
        doc.text(dateStr, 90, currentY);
        doc.line(88, currentY + 1, 130, currentY + 1);
        
        doc.setFont("helvetica", "bold");
        doc.text("Signature du Client* :", 150, currentY);
        doc.line(185, currentY + 1, 280, currentY + 1);
        
        if (signatureDataUrl) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.text("Bon pour procuration", 200, currentY - 8);
            
            const imgProps = doc.getImageProperties(signatureDataUrl);
            const maxWidth = 50;
            const maxHeight = 20;
            const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
            const w = imgProps.width * ratio;
            const h = imgProps.height * ratio;
            
            doc.addImage(signatureDataUrl, 'PNG', 200, currentY - 6, w, h);
        }
        
        // --- SECTION 4 : PARTIE RÉSERVÉE LA POSTE ---
        currentY += 15;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text("Partie à remplir par La Poste", 15, currentY);
        
        currentY += 2;
        doc.setFillColor(240, 240, 240);
        doc.rect(15, currentY, 265, 14, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("N° de Dossier de Société du CLIENT :", 20, currentY + 5);
        doc.text("N° de Dossier de Société du PRESTATAIRE :", 150, currentY + 5);
        
        doc.setFont("helvetica", "normal");
        const idP = procurationData.typePiece || '';
        const idNum = procurationData.numeroPiece || '';
        const idDelivrance = procurationData.dateDelivrance || '';
        const idAuth = procurationData.autoriteDelivrance || '';
        
        doc.text(`Description de la pièce d'identité du représentant légal du Client : ${idP} N° ${idNum}`, 20, currentY + 10);
        doc.text(`Délivrée le : ${idDelivrance}  Par : ${idAuth}`, 150, currentY + 10);
        
        // Footer eIDAS
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("* Signature électronique reconnue et certifiée conforme au règlement européen eIDAS.", 15, 206);

        const dataUrl = doc.output('datauristring');
        
        // Convertir la Data URL en un Blob natif
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });

    } catch (err) {
        console.error('Erreur generateSignedProcurationBlob jsPDF:', err);
        throw err;
    }
};
