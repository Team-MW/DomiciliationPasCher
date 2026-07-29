import logoUrl from '../assets/DomiciliationPasCher-Logo.png';

/**
 * Nettoie une chaîne de caractères pour s'assurer qu'elle n'induit pas d'erreur d'encodage WinAnsi dans pdf-lib (comme les Emojis)
 */
export const cleanForPdf = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Supprime les paires de surrogates (emojis)
        .replace(/[’‘]/g, "'") // Remplace les apostrophes typographiques par des apostrophes droites
        .replace(/[“”]/g, '"') // Remplace les guillemets typographiques par des guillemets droits
        .split('')
        .filter(char => {
            const code = char.charCodeAt(0);
            return (code >= 32 && code <= 126) || 
                   (code >= 160 && code <= 255) || 
                   code === 8364 || // €
                   code === 338 ||  // Œ
                   code === 339;    // œ
        })
        .join('');
};

/**
 * Extrait de manière sécurisée les informations supplémentaires du client
 */
export const getClientExtraInfo = (clientData) => {
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
export const getPlanTariff = (plan) => {
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

        const clientName = cleanForPdf(extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant'));
        const companyName = cleanForPdf(String(clientData.company || extra.nomSociete || 'Société en cours de constitution'));
        const formeJuridique = cleanForPdf(extra.formeJuridique || 'EI / Société');
        const sirenText = cleanForPdf(extra.siren ? `SIREN ${extra.siren}` : 'en cours de constitution au Greffe');
        const clientAddress = cleanForPdf(clientData.address || extra.adressePerso || "Adresse personnelle non renseignée");
        const clientActivity = cleanForPdf(extra.activite || "Activités de services et de conseil");

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
            doc.text("DOMICILIATION PAS CHER - SIREN 101 512 531 - RCS Toulouse - Agrément Préfectoral CASSIN-DOM-2026-31", 105, 280, { align: 'center' });
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

        const clientName = cleanForPdf(extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant'));
        const companyName = cleanForPdf(String(clientData.company || extra.nomSociete || 'Société en cours de constitution'));
        const formeJuridique = cleanForPdf(extra.formeJuridique || 'EI / Société');
        const sirenText = cleanForPdf(extra.siren ? `SIREN ${extra.siren}` : 'en cours de constitution');
        const clientAddress = cleanForPdf(clientData.address || extra.adressePerso || "Adresse personnelle non renseignée");
        const clientActivity = cleanForPdf(extra.activite || "Activités de services et de conseil");
        const isAnnuel = extra.frequence === 'annuel';

        const buildPdf = async (imgData = null) => {
            const { buildContractContent } = await import('./contractBuilder');
            buildContractContent(doc, clientData, extra, planDetails, false, null, dateDebut, dateDebut, imgData);
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

            const clientName = cleanForPdf(extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant'));
            const companyName = cleanForPdf(String(clientData.company || extra.nomSociete || 'Société en cours de constitution'));
            const formeJuridique = cleanForPdf(extra.formeJuridique || 'EI / Société');
            const sirenText = cleanForPdf(extra.siren ? `SIREN ${extra.siren}` : 'en cours de constitution');
            const clientAddress = cleanForPdf(clientData.address || extra.adressePerso || 'Adresse personnelle non renseignée');
            const isAnnuel = extra.frequence === 'annuel';

            const buildPdf = async (logoImg, sigImg) => {
                const { buildContractContent } = await import('./contractBuilder');
                buildContractContent(doc, clientData, extra, planDetails, true, sigImg, dateDebut, signedAtDate, logoImg);

                const dataUrl = doc.output('datauristring');
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
            const blob = await buildPdf(logoImg, sigImg);
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
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        
        let existingPdfBytes;
        if (typeof window === 'undefined' || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')) {
            const fs = await import('fs');
            existingPdfBytes = fs.readFileSync('public/Formulaire-procuration-postale.pdf');
        } else {
            existingPdfBytes = await fetch('/Formulaire-procuration-postale.pdf').then(res => res.arrayBuffer());
        }

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const extra = getClientExtraInfo(clientData);
        const clientName = extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant');
        
        // Parse Mandant address fields
        const pRemise = procurationData.pointRemise || '';
        const pComplement = procurationData.complementAdresse || '';
        const pVoie = procurationData.adresseVoie || '';
        const pLieuDit = procurationData.lieuDit || '';
        const pCodePostalVille = procurationData.codePostalVille || '';
        
        // Prepare text values
        const mandantNom = clientData.company ? clientData.company.toUpperCase() : (extra.nom || clientData.name || '').toUpperCase();
        const mandantPrenoms = clientData.company ? `(REP. PAR ${clientName.toUpperCase()})` : (extra.prenom || '').toUpperCase();
        const fullName = `${mandantNom} ${mandantPrenoms}`.trim();
        
        const dateStr = new Date().toLocaleDateString('fr-FR');
        const placeStr = (procurationData.lieuNaissance || 'TOULOUSE').toUpperCase();

        // Signature image embedding
        let signatureImage = null;
        if (signatureDataUrl) {
            try {
                const base64Data = signatureDataUrl.split(',')[1];
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                signatureImage = await pdfDoc.embedPng(bytes);
            } catch (sigErr) {
                console.error("Error embedding signature image in procuration:", sigErr);
            }
        }
        
        const page1 = pages[0];
        
        const boxWidth = 12.853;
        function drawInBoxes(text, startX, startY, fontObj, size, maxLen = 38) {
            if (!text) return;
            const cleaned = cleanForPdf(text.toString().toUpperCase());
            for (let i = 0; i < cleaned.length && i < maxLen; i++) {
                page1.drawText(cleaned[i], {
                    x: startX + (i * boxWidth) + 2.5,
                    y: startY + 3.5,
                    size: size,
                    font: fontObj,
                    color: rgb(0, 0, 0)
                });
            }
        }
            
        // 1. Mandant details (Boxes start at X=360.4488)
        drawInBoxes(fullName, 360.4488, 496.9791, helveticaBold, 9);
        drawInBoxes(pRemise, 360.4488, 476.6271, helveticaFont, 9);
        drawInBoxes(pComplement, 360.4488, 455.9871, helveticaFont, 9);
        drawInBoxes(pVoie, 360.4488, 435.9071, helveticaFont, 9);
        drawInBoxes(pLieuDit, 360.4488, 415.3631, helveticaFont, 9);
        
        const cp = pCodePostalVille.split(' ')[0] || '';
        const ville = pCodePostalVille.substring(cp.length).trim() || '';
        drawInBoxes(cp, 360.4488, 394.7551, helveticaFont, 9, 5);
        drawInBoxes(ville, 437.3128, 394.7551, helveticaFont, 9, 32);
        
        // Représenté par & Qualité
        page1.drawText(cleanForPdf(clientName.toUpperCase()), { x: 125, y: 355, size: 8, font: helveticaFont, color: rgb(0, 0, 0) });
        page1.drawText("DIRIGEANT", { x: 410, y: 355, size: 8, font: helveticaFont, color: rgb(0, 0, 0) });
        // Donne pouvoir Checkbox
        page1.drawText('X', { x: 596.5, y: 355, size: 10, font: helveticaBold, color: rgb(0, 0, 0) });

        // 2. Mandataire details
        drawInBoxes('LUDOVIC CASIN', 360.4488, 287.8911, helveticaBold, 9);
        // Point de remise empty
        drawInBoxes('LOT 308', 360.4488, 246.8991, helveticaFont, 9);
        drawInBoxes('150 RUE NICOLAS LOUIS VAUQUELIN', 360.4488, 226.8191, helveticaFont, 9);
        drawInBoxes('31100', 360.4488, 185.6671, helveticaFont, 9, 5);
        drawInBoxes('TOULOUSE', 437.3128, 185.6671, helveticaFont, 9, 32);

        // 3. À / Le
        page1.drawText(cleanForPdf(placeStr), { x: 55, y: 111.7, size: 9, font: helveticaFont, color: rgb(0, 0, 0) });
        page1.drawText(cleanForPdf(dateStr), { x: 235, y: 111.7, size: 9, font: helveticaFont, color: rgb(0, 0, 0) });

        // 5. Signature du Client
        if (signatureImage) {
            page1.drawImage(signatureImage, {
                x: 520,
                y: 93, // Moved up slightly from 85
                width: 120,
                height: 35
            });
            
            // Encart preuve de signature
            if (signProof) {
                const dateObj = new Date(signProof.signedAt);
                const pDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const pTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const proofText = `Signé électroniquement par ${cleanForPdf(signProof.signeeName || fullName)} le ${pDate} à ${pTime} depuis l'IP ${signProof.ipAddress}`;
                
                page1.drawText(proofText, {
                    x: 430,
                    y: 80,
                    size: 6,
                    font: helveticaFont,
                    color: rgb(0.2, 0.2, 0.2)
                });
            }
        }

        // 6. La Poste section (Partie à remplir par La Poste)
        const idP = (procurationData.typePiece || "Carte d'Identité").toUpperCase();
        const idNum = (procurationData.numeroPiece || '').toUpperCase();
        const idDelivrance = (procurationData.dateDelivrance || '').toUpperCase();
        const idAuth = (procurationData.autoriteDelivrance || '').toUpperCase();

        const clientIdVal = clientData.company || clientData.id || '';
        const clientSiret = (procurationData.siret || clientData.siret || '').replace(/\D/g, ''); // Extract only digits
        const clientSiren = (procurationData.siren || '').replace(/\D/g, ''); // Extract only digits
        
        // Helper specifically for bottom boxes which are slightly wider
        function drawInBottomBoxes(text, startX, startY, fontObj, size, maxLen = 15) {
            if (!text) return;
            const cleaned = cleanForPdf(text.toString().toUpperCase());
            const bottomBoxWidth = 14.28; // Increased slightly from 14.1 for better spacing match
            for (let i = 0; i < cleaned.length && i < maxLen; i++) {
                page1.drawText(cleaned[i], {
                    x: startX + (i * bottomBoxWidth) + 3,
                    y: startY + 2.5, // Moved down slightly from 3.5 to center vertically
                    size: size,
                    font: fontObj,
                    color: rgb(0, 0, 0)
                });
            }
        }
        
        // N° Dossier
        drawInBottomBoxes(clientSiren || clientIdVal, 211.5, 70, helveticaFont, 9, 15);
        drawInBottomBoxes('101512531', 646.5, 70, helveticaFont, 9, 15);
        
        // N° SIRET / SIREN (Utilise les petites cases standard, centrage parfait)
        drawInBoxes(clientSiret, 654.5, 513, helveticaFont, 9, 14); // Client SIRET
        drawInBoxes('101512531', 654.5, 304, helveticaFont, 9, 14); // Prestataire SIREN (DOMICILIATION PAS CHER)
        
        page1.drawText(cleanForPdf(idP + (idNum ? ' N° ' + idNum : '')), { x: 165, y: 41, size: 8, font: helveticaFont, color: rgb(0, 0, 0) });
        page1.drawText(cleanForPdf(idDelivrance), { x: 465, y: 41, size: 8, font: helveticaFont, color: rgb(0, 0, 0) });
        page1.drawText(cleanForPdf(idAuth), { x: 650, y: 41, size: 8, font: helveticaFont, color: rgb(0, 0, 0) });

        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (err) {
        console.error('Erreur generateSignedProcurationBlob:', err);
        throw err;
    }
};
