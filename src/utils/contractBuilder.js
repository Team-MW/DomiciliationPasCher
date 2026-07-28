import { cleanForPdf } from './pdfGenerator';

export const buildContractContent = (doc, clientData, extra, planDetails, isSigned, signatureImage, dateDebut, signedAtDate, imgData) => {
    let currentY = 45;
    let pageCount = 1;

    const isAnnuel = extra.frequence === 'annuel';
    const clientName = cleanForPdf(extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || 'Le Dirigeant'));
    const companyName = cleanForPdf(String(clientData.company || extra.nomSociete || 'Société en cours de constitution'));
    const formeJuridique = cleanForPdf(extra.formeJuridique || 'EI / Société');
    const siretValue = extra.siret || clientData.siret || extra.siren || clientData.siren || '';
    const sirenText = cleanForPdf(siretValue ? (siretValue.replace(/\s/g, '').length >= 14 ? `SIRET ${siretValue}` : `SIREN ${siretValue}`) : 'en cours de constitution');
    const clientAddress = cleanForPdf(clientData.address || extra.adressePerso || 'Adresse personnelle non renseignée');
    const lieuNaissance = cleanForPdf(extra.lieuNaissance || '');
    const dateNaissance = cleanForPdf(extra.dateNaissance ? new Date(extra.dateNaissance).toLocaleDateString('fr-FR') : '');
    const nationalite = cleanForPdf(extra.nationalite || '');

    // Variable d'affichage si infos de naissance absentes
    let textNaissance = "";
    if (dateNaissance && lieuNaissance) {
        textNaissance = `, né(e) le ${dateNaissance} à ${lieuNaissance}, de nationalité ${nationalite ? nationalite : 'Française'}`;
    }

    const drawHeaderFooter = () => {
        // Cadre
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(8, 8, 194, 281);

        // Logo
        if (imgData) {
            try { doc.addImage(imgData, 'PNG', 15, 15, 45, 15); } catch (e) { }
        }

        // En-tête à droite
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('CONTRAT DE DOMICILIATION', 135, 18);
        doc.text('Référence : CONTRAT-' + clientData.id, 135, 22);
        doc.text('Date : ' + dateDebut, 135, 26);
        doc.text('Formule : Forfait ' + planDetails.name, 135, 30);

        // Ligne séparatrice
        doc.setDrawColor(203, 213, 225);
        doc.line(15, 38, 195, 38);

        // Pied de page
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        if (!isSigned) {
            doc.text("Paraphe Domiciliataire : _________                        Paraphe Domicilié : _________", 15, 275);
        }
    };

    const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > 270) {
            doc.addPage();
            pageCount++;
            drawHeaderFooter();
            currentY = 45;
        }
    };

    const addText = (text, size, isBold, color, align = 'left', indent = 15) => {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        
        const lines = doc.splitTextToSize(cleanForPdf(text), 195 - indent - 15);
        checkPageBreak(lines.length * (size / 2.5) + 5);
        
        doc.text(lines, indent, currentY, { align: align === 'center' ? 'center' : 'left' });
        currentY += lines.length * (size / 2.2) + 2;
    };

    const addTitle = (text) => {
        currentY += 4;
        checkPageBreak(10);
        addText(text, 11, true, [15, 23, 42]);
        currentY += 1;
    };

    const addParagraph = (text, indent = 15) => {
        addText(text, 9.5, false, [51, 65, 85], 'left', indent);
        currentY += 2;
    };

    const addBullet = (text) => {
        checkPageBreak(10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        doc.setTextColor(51, 65, 85);
        doc.text("•", 15, currentY);
        addText(text, 9.5, false, [51, 65, 85], 'left', 20);
        currentY += 1;
    };

    // INIT PAGE 1
    drawHeaderFooter();

    // TITRE
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('CONTRAT DE DOMICILIATION COMMERCIALE', 105, 50, { align: 'center' });
    currentY = 62;

    addTitle("ENTRE LES SOUSSIGNÉS :");
    
    addParagraph("La société CASSIN LUDOVIC, exerçant sous le nom commercial domiciliation-pas-chere.com, au capital social de 2 000,00 € immatriculée au Registre du Commerce et des Sociétés de Toulouse sous le numéro 101 512 531 et dont l'établissement (SIRET : 10151253100019) est autorisé à exercer l'activité de domiciliation sous le numéro CASSIN-DOM-2026-31 à l'adresse de domiciliation : 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse, représentée par CASSIN Ludovic agissant en qualité de Président.");
    addText("Ci-après dénommée (« le Domiciliataire ») D'UNE PART,", 9.5, true, [15, 23, 42]);
    currentY += 4;

    addText("ET", 10, true, [15, 23, 42], 'center', 105);
    currentY += 4;

    addParagraph(`La société ${companyName.toUpperCase()}, ${formeJuridique}, ${sirenText}, représentée par ${clientName}${textNaissance}, demeurant au ${clientAddress}, en qualité de Dirigeant/Représentant Légal.`);
    addText("Ci-après dénommée (« le Domicilié »). D'AUTRE PART,", 9.5, true, [15, 23, 42]);
    currentY += 6;

    addTitle("IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :");

    // ARTICLE 1
    addTitle("ARTICLE 1 : OBJET");
    addParagraph("Le présent contrat (le « Contrat ») a pour objet de définir les conditions dans lesquelles le Domiciliataire fournit au Domicilié tout ou partie des prestations décrites à l'article 2 (les « Prestations »).");
    addParagraph("Les Prestations objet du Contrat sont destinées à des professionnels. Le Contrat s'applique, sans restriction ni réserve, à l'ensemble des Prestations assurées par le Domiciliataire.");
    addParagraph("Le Contrat est complété par les Conditions Générales de Vente acceptées par le Domicilié dans le cadre du processus de commande, ainsi que par l'Annexe 1 (Bon de commande) qui précise l'offre souscrite, son tarif et les services inclus.");

    // ARTICLE 2
    addTitle("ARTICLE 2 : PRESTATIONS");
    addText("2.1 – Domiciliation", 10, true, [30, 41, 59]);
    addParagraph("Le Domiciliataire permet au Domicilié d'établir son siège social à l'adresse : Chez CASSIN LUDOVIC, 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse.");
    addParagraph("Le Domicilié communique à ses expéditeurs l'adresse exacte, comprenant le numéro de bureau, mentionnée ci-dessus comme adresse postale, afin de garantir la réception de son courrier par le Domiciliataire et toute notification. Tout courrier qui ne porterait pas précisément l'adresse postale spécifiée pourrait ne pas être réceptionné dans les délais impartis, ou pourrait ne pas être réceptionné et être renvoyé à l'expéditeur par les services postaux.");

    addText("2.2 – Mise à disposition d'une salle de réunion", 10, true, [30, 41, 59]);
    addParagraph("La fourniture au Domicilié de la possibilité de réserver une salle de réunion, garantissant un environnement confidentiel pour les réunions des organes de direction, d'administration ou de surveillance de l'entreprise, ainsi que la tenue, la conservation et la consultation des livres, registres et documents prescrits par les lois et règlements. La réalisation de cette Prestation implique des frais complémentaires optionnels et doit faire l'objet d'une demande écrite préalable du Domicilié au Domiciliataire.");

    addText("2.3 – Réexpédition du courrier", 10, true, [30, 41, 59]);
    addParagraph("Selon l'offre dont bénéficie le Domicilié (précisée en Annexe 1), le Domiciliataire réexpédie le courrier postal du Domicilié au format papier, à l'adresse indiquée par le Domicilié lors de la souscription.");

    addText("2.4 – Numérisation du courrier", 10, true, [30, 41, 59]);
    addParagraph("La transmission par le Domiciliataire au Domicilié de son courrier postal sous format numérique à travers un cloud privé et sécurisé dans l'espace client. À ce titre, le Domicilié donne autorisation au Domiciliataire d'ouvrir le courrier postal en son nom afin de pouvoir réaliser sa numérisation.");

    // ARTICLE 3
    addTitle("ARTICLE 3 : OBLIGATIONS DES PARTIES");
    addText("3.1 – Obligations du Domiciliataire", 10, true, [30, 41, 59]);
    addParagraph("Durant toute la durée du Contrat, le Domiciliataire s'engage à :");
    addBullet("disposer d'un agrément préfectoral lui permettant d'exercer l'activité de domiciliation à jour ;");
    addBullet("être immatriculé au registre du commerce et des sociétés ou au répertoire des métiers, durant l'occupation des locaux ;");
    addBullet("mettre à la disposition du Domicilié des locaux dotés d'une pièce propre à assurer la confidentialité nécessaire et à permettre une réunion régulière ;");
    addBullet("détenir, pour chaque entreprise domiciliée, un dossier contenant les pièces justificatives relatives au domicile de son représentant légal ;");
    addBullet("informer le greffier du tribunal, à l'expiration du contrat ou en cas de résiliation anticipée de celui-ci, de la cessation de la domiciliation ;");
    addBullet("communiquer aux huissiers de justice, munis d'un titre exécutoire, les renseignements propres à joindre le Domicilié ;");
    addBullet("fournir, chaque trimestre, au centre des impôts et aux organismes de recouvrement, une liste des personnes domiciliées ;");
    addBullet("informer le Domicilié de l'approche du terme du Contrat dans un délai raisonnable.");

    addText("3.2 – Obligations du Domicilié", 10, true, [30, 41, 59]);
    addParagraph("Durant toute la durée du Contrat, le Domicilié s'engage à :");
    addBullet("transmettre au Domiciliataire son justificatif d'inscription (Kbis) dans un délai d'un (1) mois à compter de l'obtention ;");
    addBullet("utiliser effectivement et exclusivement les locaux, soit comme siège de l'entreprise, soit comme agence, succursale ou bureau ;");
    addBullet("donner mandat au Domiciliataire, qui l'accepte, de recevoir en son nom toute notification, courrier ou communication officielle ;");
    addBullet("donner procuration postale au Domiciliataire en se soumettant aux conditions imposées par La Poste ;");
    addBullet("fournir au Domiciliataire toutes les pièces justificatives relatives à : son identité, son domicile, coordonnées, etc. ;");
    addBullet("informer sans délai le Domiciliataire de toute modification concernant son activité ou les lieux de réalisation ;");
    addBullet("s'acquitter régulièrement des impôts et taxes liés à la réalisation de son activité ;");
    addBullet("demeurer entièrement responsable des dettes à son égard à la fin du Contrat.");

    addParagraph("Le Domicilié certifie exacts tous les renseignements et documents fournis à l'appui de la signature, certifie ne pas être en situation de liquidation de biens ou redressement judiciaire, et certifie que son représentant légal n'est pas frappé de faillite personnelle ou d'interdiction de gérer.");

    addParagraph("Le Domiciliataire est tenu de mettre en œuvre les obligations de vigilance (LCB-FT). À ce titre, le Domicilié s'engage à transmettre et actualiser les documents suivants : Kbis de moins de 3 mois, Statuts signés à jour, Justificatif de domicile du représentant légal, Copie de la pièce d'identité du représentant et des bénéficiaires effectifs.");

    addText("3.3 – Protection des données personnelles (RGPD)", 10, true, [30, 41, 59]);
    addParagraph("Les données à caractère personnel collectées sont traitées par le Domiciliataire pour les seules finalités de l'exécution du Contrat et du respect de ses obligations légales (LCB-FT). Ces données sont conservées pendant la durée du Contrat augmentée des délais légaux. Conformément au RGPD, le Domicilié dispose d'un droit d'accès, de rectification, d'effacement et de portabilité de ses données.");

    // ARTICLE 4
    addTitle("ARTICLE 4 : ABONNEMENT ET PAIEMENT");
    addText("4.1 – Montant de l'abonnement", 10, true, [30, 41, 59]);
    addParagraph(`Le Domicilié est redevable d'un abonnement correspondant à l'offre souscrite et précisée en Annexe 1, au tarif en vigueur affiché au moment de la souscription. Le Contrat correspondant à un engagement ferme et définitif, aucun remboursement ne pourra être accordé.`);

    addText("4.2 – Modalités de paiement", 10, true, [30, 41, 59]);
    addParagraph(`Le paiement des Prestations est réalisé par prélèvement par carte bancaire. Pour les abonnements mensuels, le paiement est dû à la date anniversaire. Pour les abonnements annuels, le paiement est réalisé en une seule fois. En l'absence de règlement des sommes dues trente (30) jours après la date d'échéance, le Domiciliataire se réserve le droit de suspendre les Prestations ou résilier le Contrat de manière immédiate.`);

    // ARTICLE 5
    addTitle("ARTICLE 5 : DURÉE");
    addParagraph(`Le Contrat est conclu à compter du ${dateDebut} pour la durée précisée en Annexe 1, laquelle ne pourra être inférieure à trois (3) mois conformément à l'article R123-168 du Code de commerce.`);
    addParagraph("Le Contrat se renouvelle, tacitement, par périodes successives, sauf résiliation dans les conditions prévues à l'article 6 du Contrat. L'exécution des Prestations par le Domiciliataire ne débutera qu'à compter du jour où le Domicilié aura transmis les documents et informations sollicités.");

    // ARTICLE 6
    addTitle("ARTICLE 6 : MODALITÉS DE RÉSILIATION");
    addText("6.1 – Résiliation par le Domicilié", 10, true, [30, 41, 59]);
    addParagraph("Le Domicilié pourra résilier le Contrat sur son espace client. La résiliation sera effective sous deux (2) jours ouvrés. Le Domicilié devra produire tout document officiel démontrant le transfert ou la radiation de son siège social (extrait Kbis). À défaut, le Contrat produira ses effets jusqu'à la transmission dudit document.");

    addText("6.2 – Résiliation par le Domiciliataire", 10, true, [30, 41, 59]);
    addParagraph("En cas de manquement par le Domicilié à ses obligations, le Domiciliataire pourra mettre fin à ses Prestations, sans aucune mise en demeure. Les montants déjà payés seront conservés à titre de dommages et intérêts.");

    addTitle("ARTICLE 7 : DIVISIBILITÉ DES ARTICLES");
    addParagraph("Dans l'hypothèse où l'un ou plusieurs des articles de ce Contrat serait considéré comme inapplicable, la totalité des autres articles demeurerait applicable.");

    addTitle("ARTICLE 8 : DROIT APPLICABLE");
    addParagraph("Le Contrat est régi par le droit français. En cas de traduction de ses stipulations, seul le texte français prévaudrait en cas de litige.");

    addTitle("ARTICLE 9 : LITIGES");
    addParagraph("Tous les litiges auxquels le présent Contrat pourrait donner lieu seront soumis à la compétence du tribunal de commerce de Toulouse.");

    currentY += 8;
    checkPageBreak(40);

    // SIGNATURES
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Fait à Toulouse, le ${isSigned ? signedAtDate : dateDebut}`, 15, currentY);
    currentY += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text('Pour le Domiciliataire', 15, currentY);
    doc.text('Pour le Domicilié', 110, currentY);

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('CASSIN Ludovic', 15, currentY);
    doc.text(clientName.toUpperCase(), 110, currentY);

    if (isSigned) {
        doc.text('(Signature précédée de « Bon pour accord »)', 110, currentY + 5);
        // Tampon admin
        doc.setDrawColor(37, 99, 235);
        doc.setTextColor(37, 99, 235);
        doc.setLineWidth(0.6);
        doc.rect(15, currentY + 5, 45, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('DOMICILIATION PAS CHER', 37.5, currentY + 11, { align: 'center' });
        doc.text('CONTRAT SIGNÉ EN LIGNE', 37.5, currentY + 17, { align: 'center' });
        doc.text('AGRÉÉ PRÉFECTURE 31', 37.5, currentY + 23, { align: 'center' });

        if (signatureImage) {
            try { doc.addImage(signatureImage, 'PNG', 110, currentY + 7, 70, 20); } catch (e) {}
        }
    }
    
    // --- ANNEXE 1 ---
    doc.addPage();
    pageCount++;
    drawHeaderFooter();
    currentY = 45;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Annexe 1 — Bon de commande', 105, currentY, { align: 'center' });
    currentY += 8;

    addParagraph("La présente Annexe fait partie intégrante du Contrat de domiciliation auquel elle est rattachée. Elle précise les éléments propres à l'offre souscrite par le Domicilié. En cas de contradiction entre la présente Annexe et le Contrat, les clauses du Contrat prévalent, sauf sur les éléments strictement tarifaires et de services inclus.");
    currentY += 4;

    // Bloc Infos Client
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, currentY, 180, 25, 2, 2, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Dénomination :`, 20, currentY + 8);
    doc.setFont("helvetica", "normal");
    doc.text(companyName, 60, currentY + 8);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Immatricul. :`, 20, currentY + 15);
    doc.setFont("helvetica", "normal");
    doc.text(sirenText, 60, currentY + 15);

    doc.setFont("helvetica", "bold");
    doc.text(`Adresse exp. :`, 20, currentY + 22);
    doc.setFont("helvetica", "normal");
    doc.text(clientAddress, 60, currentY + 22);
    
    currentY += 35;

    // Tableau des Offres (Dessin manuel simple)
    addTitle("Grille des offres (référence catalogue)");
    
    const startY = currentY;
    const col1 = 15;
    const col2 = 90;
    const col3 = 125;
    const col4 = 160;
    const rowHeight = 7;
    
    doc.setFillColor(241, 245, 249);
    doc.rect(col1, currentY, 180, rowHeight * 2, 'FD'); // Header bg
    doc.setDrawColor(203, 213, 225);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Service inclus", col1 + 5, currentY + 6);
    doc.text("Essentiel", col2 + 17, currentY + 6, { align: 'center' });
    doc.text("Scan+", col3 + 17, currentY + 6, { align: 'center' });
    doc.text("Physique+", col4 + 17, currentY + 6, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("20 € HT/mois", col2 + 17, currentY + 12, { align: 'center' });
    doc.text("24 € HT/mois", col3 + 17, currentY + 12, { align: 'center' });
    doc.text("38 € HT/mois", col4 + 17, currentY + 12, { align: 'center' });

    currentY += rowHeight * 2;

    const rows = [
        ["Adresse juridique officielle", "OUI", "OUI", "OUI"],
        ["Réception du courrier", "OUI", "OUI", "OUI"],
        ["Notification d'arrivée", "OUI", "OUI", "OUI"],
        ["Attestation de domiciliation", "OUI", "OUI", "OUI"],
        ["Espace client 24h/24", "OUI", "OUI", "OUI"],
        ["Contrat conforme loi Dutreil", "OUI", "OUI", "OUI"],
        ["Scan numérique", "NON", "OUI", "OUI"],
        ["Réexpédition physique", "NON", "NON", "OUI (mensuelle)"]
    ];

    doc.setFont("helvetica", "normal");
    rows.forEach((row, i) => {
        doc.rect(col1, currentY, 180, rowHeight);
        doc.text(row[0], col1 + 5, currentY + 5);
        doc.text(row[1], col2 + 17, currentY + 5, { align: 'center' });
        doc.text(row[2], col3 + 17, currentY + 5, { align: 'center' });
        doc.text(row[3], col4 + 17, currentY + 5, { align: 'center' });
        
        // Highlight active plan column faintly
        if (planDetails.name === 'Notification') { doc.setFillColor(239, 246, 255); doc.rect(col2, currentY, 35, rowHeight, 'F'); }
        if (planDetails.name === 'Scan+') { doc.setFillColor(239, 246, 255); doc.rect(col3, currentY, 35, rowHeight, 'F'); }
        if (planDetails.name === 'Physique+') { doc.setFillColor(239, 246, 255); doc.rect(col4, currentY, 35, rowHeight, 'F'); }

        // Redraw lines
        doc.line(col2, currentY, col2, currentY + rowHeight);
        doc.line(col3, currentY, col3, currentY + rowHeight);
        doc.line(col4, currentY, col4, currentY + rowHeight);
        
        // Re-write text over highlight
        doc.text(row[0], col1 + 5, currentY + 5);
        doc.text(row[1], col2 + 17, currentY + 5, { align: 'center' });
        doc.text(row[2], col3 + 17, currentY + 5, { align: 'center' });
        doc.text(row[3], col4 + 17, currentY + 5, { align: 'center' });
        
        currentY += rowHeight;
    });

    // Outer border for table
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2); // thin lines
    doc.rect(col1, startY, 180, currentY - startY);

    currentY += 8;
    addParagraph("Durée d'engagement légale : conformément à l'article R123-168 du Code de commerce, la durée minimale de tout contrat de domiciliation est de trois (3) mois, quelle que soit la formule souscrite. La mention commerciale du site est « sans engagement au-delà de la durée légale de 3 mois », conforme à cette obligation.");

    currentY += 8;
    addTitle("Offre souscrite");
    
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(15, currentY, 180, 20, 2, 2, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text(`Forfait souscrit : ${planDetails.name}`, 20, currentY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Tarif : ${parseFloat(planDetails.ht).toFixed(2)} € HT / ${isAnnuel ? 'An' : 'Mois'}`, 20, currentY + 15);
    
    currentY += 35;
    checkPageBreak(30);

    // SIGNATURES FINALES
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Fait à Toulouse, le ${isSigned ? signedAtDate : dateDebut}`, 15, currentY);
    currentY += 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("Le Domicilié", 110, currentY);
    if (isSigned && signatureImage) {
        try { doc.addImage(signatureImage, 'PNG', 110, currentY + 5, 70, 20); } catch (e) {}
    }
    
    // Fix all page footers that were added
    // (Page numbers removed per user request)
};
