import { cleanForPdf } from './pdfGenerator';

export const buildContractContent = (doc, clientData, extra, planDetails, isSigned, signatureImage, dateDebut, signedAtDate, imgData, signProof = null) => {
    let currentY = 45;
    let pageCount = 1;

    const isAnnuel = extra.frequence === 'annuel';
    const clientName = cleanForPdf(extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData.name || '[NOM, PRÉNOM]'));
    const companyName = cleanForPdf(String(clientData.company || extra.nomSociete || '[DÉNOMINATION SOCIALE DU DOMICILIÉ]'));
    const siretValue = extra.siret || clientData.siret || extra.siren || clientData.siren || '';
    const sirenText = cleanForPdf(siretValue ? `immatriculée sous le n° ${siretValue.replace(/\s/g, '')}` : 'en cours d\'immatriculation');
    const clientAddress = cleanForPdf(clientData.address || extra.adressePerso || '[ADRESSE PERSONNELLE]');
    const lieuNaissance = cleanForPdf(extra.lieuNaissance || '');
    const dateNaissance = cleanForPdf(extra.dateNaissance ? new Date(extra.dateNaissance).toLocaleDateString('fr-FR') : '');
    const nationalite = cleanForPdf(extra.nationalite || '');
    const qualiteText = cleanForPdf(extra.qualite || '[QUALITÉ]');

    // Toujours afficher ces champs, avec placeholders si vides
    const dateNaissanceText = dateNaissance ? dateNaissance : '[DATE]';
    const lieuNaissanceText = lieuNaissance ? lieuNaissance : '[LIEU DE NAISSANCE]';
    const nationaliteText = nationalite ? nationalite : '[NATIONALITÉ]';

    const textNaissance = `, né(e) le ${dateNaissanceText} à ${lieuNaissanceText}, de nationalité ${nationaliteText}`;

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
    doc.text('Contrat de domiciliation', 105, 50, { align: 'center' });
    currentY = 62;

    addTitle("Entre les soussignés :");

    addParagraph("La société CASSIN LUDOVIC, exerçant sous le nom commercial domiciliation-pas-chere.com, au capital social de 2 000,00 € immatriculée au Registre du Commerce et des Sociétés de Toulouse sous le numéro 101512531 et dont l'établissement (SIRET : 10151253100019) est autorisé à exercer l'activité de domiciliation sous le numéro AG/DOM/2026/06 à l'adresse de domiciliation : 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse, représentée par CASSIN Ludovic agissant en qualité de Président, ci-après dénommée (« le Domiciliataire »)");
    addText("D'UNE PART,", 9.5, true, [15, 23, 42]);
    currentY += 4;

    addText("ET", 10, true, [15, 23, 42]);
    currentY += 4;

    addParagraph(`La société ${companyName.toUpperCase()}, ${sirenText}, représentée par ${clientName}${textNaissance}, demeurant au ${clientAddress}, en qualité de ${qualiteText}, ci-après dénommée (« le Domicilié »).`);
    addText("D'AUTRE PART,", 9.5, true, [15, 23, 42]);
    currentY += 6;

    addTitle("IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :");

    // ARTICLE 1
    addTitle("ARTICLE 1 : OBJET");
    addParagraph("Le présent contrat (le « Contrat ») a pour objet de définir les conditions dans lesquelles le Domiciliataire fournit au Domicilié tout ou partie des prestations décrites à l'article 2 (les « Prestations »).");
    addParagraph("Les Prestations objet du Contrat sont destinées à des professionnels.");
    addParagraph("Le Contrat s'applique, sans restriction ni réserve, à l'ensemble des Prestations assurées par le Domiciliataire.");
    addParagraph("Le Contrat est complété par les Conditions Générales de Vente acceptées par le Domicilié dans le cadre du processus de commande, ainsi que par l'Annexe 1 (Bon de commande) qui précise l'offre souscrite, son tarif et les services inclus.");

    // ARTICLE 2
    addTitle("ARTICLE 2 : PRESTATIONS");
    addText("2.1 – Domiciliation", 10, true, [30, 41, 59]);
    addParagraph("Le Domiciliataire permet au Domicilié d'établir son siège social à l'adresse Chez CASSIN LUDOVIC 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse.");
    addParagraph("Le Domicilié communique à ses expéditeurs l'adresse exacte, comprenant le numéro de bureau, mentionnée ci-dessus comme adresse postale, afin de garantir la réception de son courrier par le Domiciliataire et toute notification. Tout courrier qui ne porterait pas précisément l'adresse postale spécifiée pourrait ne pas être réceptionné dans les délais impartis, ou pourrait ne pas être réceptionné et être renvoyé à l'expéditeur par les services postaux.");

    addText("2.2 – Mise à disposition d'une salle de réunion", 10, true, [30, 41, 59]);
    addParagraph("La fourniture au Domicilié de la possibilité de réserver une salle de réunion, garantissant un environnement confidentiel pour les réunions des organes de direction, d'administration ou de surveillance de l'entreprise, ainsi que la tenue, la conservation et la consultation des livres, registres et documents prescrits par les lois et règlements.");
    addParagraph("La réalisation de cette Prestation implique des frais complémentaires optionnels et doit faire l'objet d'une demande écrite préalable du Domicilié au Domiciliataire.");

    addText("2.3 – Réexpédition du courrier", 10, true, [30, 41, 59]);
    addParagraph("Selon l'offre dont bénéficie le Domicilié (précisée en Annexe 1), le Domiciliataire réexpédie le courrier postal du Domicilié au format papier, à l'adresse indiquée par le Domicilié lors de la souscription.");

    addText("2.4 – Numérisation du courrier", 10, true, [30, 41, 59]);
    addParagraph("La transmission par le Domiciliataire au Domicilié de son courrier postal sous format numérique à travers un cloud privé et sécurisé dans l'espace client.");
    addParagraph("À ce titre, le Domicilié donne autorisation au Domiciliataire d'ouvrir le courrier postal en son nom afin de pouvoir réaliser sa numérisation.");

    // ARTICLE 3
    addTitle("ARTICLE 3 : OBLIGATIONS DES PARTIES");
    addText("3.1 – Obligations du Domiciliataire", 10, true, [30, 41, 59]);
    addParagraph("Durant toute la durée du Contrat, le Domiciliataire s'engage à :");
    addBullet("disposer d'un agrément préfectoral lui permettant d'exercer l'activité de domiciliation à jour ;");
    addBullet("être immatriculé au registre du commerce et des sociétés ou au répertoire des métiers, durant l'occupation des locaux ;");
    addBullet("mettre à la disposition du Domicilié des locaux dotés d'une pièce propre à assurer la confidentialité nécessaire et à permettre une réunion régulière des organes chargés de la direction, de l'administration ou de la surveillance de l'entreprise ainsi que la tenue, la conservation et la consultation des livres, registres et documents prescrits par la loi ;");
    addBullet("détenir, pour chaque entreprise domiciliée, un dossier contenant les pièces justificatives relatives au domicile de son représentant légal et à ses coordonnées téléphoniques ainsi qu'à chacun de ses lieux d'activité et du lieu de détention des documents comptables lorsqu'ils ne sont pas conservés chez le Domiciliataire ;");
    addBullet("informer le greffier du tribunal, à l'expiration du contrat ou en cas de résiliation anticipée de celui-ci, de la cessation de la domiciliation de l'entreprise dans ses locaux. Lorsque l'entreprise domiciliée n'a pas pris connaissance de son courrier depuis trois mois, le Domiciliataire en informe également le greffier ou la chambre des métiers et de l'artisanat ;");
    addBullet("communiquer aux huissiers de justice, munis d'un titre exécutoire, les renseignements propres à joindre le Domicilié ;");
    addBullet("fournir, chaque trimestre, au centre des impôts et aux organismes de recouvrement des cotisations et contributions de sécurité sociale compétents, une liste des personnes qui se sont domiciliées dans ses locaux au cours de cette période ou qui ont mis fin à leur domiciliation ainsi que chaque année, avant le quinze janvier, une liste des personnes domiciliées au 1er janvier ;");
    addBullet("informer le Domicilié de l'approche du terme du Contrat dans un délai raisonnable, et au plus tard deux (2) mois avant son échéance, afin de lui permettre d'exercer, le cas échéant, son droit de résiliation");

    addText("3.2 – Obligations du Domicilié", 10, true, [30, 41, 59]);
    addParagraph("Durant toute la durée du Contrat, dans le cadre de la Prestation de domiciliation, le Domicilié s'engage à :");
    addBullet("transmettre au Domiciliataire son justificatif d'inscription au Registre du Commerce et des Sociétés ou des Métiers ou auprès de toute autre administration compétente dans un délai d'un (1) mois à compter de l'obtention du justificatif ;");
    addBullet("utiliser effectivement et exclusivement les locaux, soit comme siège de l'entreprise, soit si le siège est situé à l'étranger comme agence, succursale ou bureau de représentation.");
    addParagraph("Durant toute la durée du Contrat, dans le cadre des Prestations fournies par le Domiciliataire, en ce compris la Prestation de domiciliation, le Domicilié s'engage à :");
    addBullet("donner mandat au Domiciliataire, qui l'accepte, de recevoir en son nom toute notification, courrier ou communication officielle ;");
    addBullet("donner procuration postale au Domiciliataire. Pour cela, le Domicilié devra se soumettre aux conditions imposées par La Poste en transmettant une procuration officielle auprès des services concernés. Cette procuration postale permettra au Domiciliataire de réceptionner le courrier recommandé adressé au Domicilié. Le Domicilié décharge, par avance, le Domiciliataire de toute responsabilité dans le cadre de l'exécution dudit mandat ;");
    addBullet("fournir au Domiciliataire, dès la signature du Contrat ou dans les meilleurs délais, toutes les pièces justificatives relatives à : son identité, son domicile, à ses coordonnées téléphoniques, au lieu de détention de ses documents comptables, à chacun de ses lieux d'activité, ainsi que son numéro de SIRET ;");
    addBullet("informer sans délai le Domiciliataire de toute modification concernant son activité, les lieux de réalisation de celle-ci et du lieu de détention de ses documents comptables ;");
    addBullet("actualiser et fournir sans délai les pièces justificatives ou informations évoquées dans les deux points ci-dessus lorsque celles-ci ne sont plus à jour, ainsi que tout autre document afférent aux modifications d'adresse, d'état civil personnel, de dénomination sociale, de nom commercial, de sigle (afin d'éviter les homonymes), de forme juridique ou d'objet, de dirigeant, du bénéficiaire des Prestations fournies au titre du Contrat. Dans l'hypothèse où le Domicilié opère des changements de représentants légaux ou de bénéficiaires effectifs, ces changements devront être signalés par le Domicilié au Domiciliataire avant la réalisation de toute modification auprès du Greffe du Tribunal de Commerce ou de la Chambre des Métiers ou toute autre administration compétente ;");
    addBullet("s'acquitter régulièrement des impôts et taxes liés à la réalisation de son activité afin que le Domiciliataire ne puisse être inquiété à ce sujet ;");
    addBullet("demeurer entièrement responsable des dettes à son égard à la fin du Contrat ;");
    addBullet("déclarer sans délai tout changement relatif à sa forme juridique et son objet, ainsi qu'au nom et au domicile personnel des personnes ayant le pouvoir de l'engager à titre habituel.");

    addParagraph("Le Domicilié certifie exacts tous les renseignements et documents fournis à l'appui de la signature et lors de l'exécution du Contrat avec le Domiciliataire, certifie ne pas être en situation de liquidation de biens, redressement judiciaire en ce qui concerne l'entreprise ou les entités qu'il dirige, que ces établissements soient l'objet ou non dudit contrat, certifie que son représentant légal n'est pas à titre personnel frappé de faillite personnelle ou d'interdiction de gérer, atteste l'exactitude de tous les renseignements fournis au Domiciliataire tant en ce qui concerne son état civil ainsi que les entités représentées.");
    addParagraph("Le Domicilié donne son accord pour que les informations fournies puissent être communiquées, sur demande, aux différentes administrations.");
    addParagraph("Le Domiciliataire est tenu de mettre en œuvre les obligations de vigilance énoncées aux articles L. 561-2 et suivants du Code monétaire et financier en matière de lutte contre le blanchiment de capitaux et le financement du terrorisme (« LCB-FT »). À ce titre, le Domicilié s'engage à transmettre au Domiciliataire et actualiser dans les meilleurs délais toute information ou tout document que pourrait solliciter le Domiciliataire dans le cadre de la mise en œuvre de ses obligations en matière de LCB-FT, notamment les documents suivants :");
    addBullet("Kbis de moins de 3 mois ou équivalent ;");
    addBullet("Statuts signés à jour, ou le projet de statuts pour les sociétés en cours de création ;");
    addBullet("Justificatif de domicile du représentant légal de moins de 3 mois ;");
    addBullet("Copie (recto/verso) de la pièce d'identité du représentant légal ;");
    addBullet("Copie (recto/verso) de la pièce d'identité des bénéficiaires effectifs ;");
    addBullet("Tout autre document qui pourrait s'avérer nécessaire dans le cadre de la mise en œuvre par le Domiciliataire de ses obligations en matière de LCB-FT.");

    addText("3.3 – Protection des données personnelles (RGPD)", 10, true, [30, 41, 59]);
    addParagraph("Les données à caractère personnel collectées dans le cadre du présent Contrat (pièces d'identité, justificatifs de domicile, coordonnées) sont traitées par le Domiciliataire pour les seules finalités de l'exécution du Contrat et du respect de ses obligations légales, notamment en matière de LCB-FT. Ces données sont conservées pendant la durée du Contrat augmentée des délais de conservation légaux applicables, et ne sont communiquées qu'aux administrations compétentes ou aux autorités habilitées à en faire la demande. Conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés, le Domicilié dispose d'un droit d'accès, de rectification, d'effacement et de portabilité de ses données, qu'il peut exercer auprès du Domiciliataire.");

    // ARTICLE 4
    addTitle("ARTICLE 4 : ABONNEMENT ET PAIEMENT");
    addText("4.1 – Montant de l'abonnement", 10, true, [30, 41, 59]);
    addParagraph("Le Domicilié est redevable d'un abonnement correspondant à l'offre souscrite et précisée en Annexe 1 (Bon de commande), au tarif en vigueur affiché au moment de la souscription aux Prestations par le Domicilié.");
    addParagraph("Dans l'hypothèse où l'activité du Domicilié nécessite la réalisation de prestations complémentaires visées dans les Conditions Générales de Vente, celles-ci feront l'objet d'un complément de facturation.");
    addParagraph("Le Contrat correspondant à un engagement ferme et définitif, aucun remboursement ne pourra être accordé.");

    addText("4.2 – Modalités de paiement", 10, true, [30, 41, 59]);
    addParagraph("Le paiement des Prestations est réalisé par prélèvement par carte bancaire.");
    addParagraph("Pour les abonnements mensuels, le paiement est dû à la date anniversaire du Contrat.");
    addParagraph("Pour les abonnements annuels et biannuels, le paiement de l'abonnement est réalisé en une seule fois lors de la souscription aux Prestations.");
    addParagraph("Le paiement des frais est dû mensuellement.");
    addParagraph("Lorsque le Contrat est conclu par une personne physique pour le compte d'une société en cours de création, la personne physique ayant agi au nom et pour le compte de ladite société reste seule engagée par la signature du Contrat. Lorsque la preuve d'immatriculation du Domicilié (le Kbis ou équivalent) aura été reçue par le Domiciliataire, le Contrat sera considéré comme conclu dès l'origine par ladite société.");
    addParagraph("En l'absence de règlement des sommes dues au Domiciliataire trente (30) jours après la date d'échéance, le Domiciliataire se réserve le droit de suspendre les Prestations ou résilier le Contrat de manière immédiate et sans autre formalité.");

    // ARTICLE 5
    addTitle("ARTICLE 5 : DURÉE");
    addParagraph(`Le Contrat est conclu à compter du ${dateDebut} pour la durée précisée en Annexe 1, laquelle ne pourra être inférieure à trois (3) mois conformément à l'article R123-168 du Code de commerce.`);
    addParagraph("Le Contrat se renouvelle, tacitement, par périodes successives correspondant à la durée initiale du Contrat (abonnement annuel ou biannuel), à l'exception des Contrats de trois (3) mois qui se renouvellent, tacitement, par périodes successives d'un (1) mois, sauf résiliation dans les conditions prévues à l'article 6 du Contrat.");
    addParagraph("L'exécution des Prestations par le Domiciliataire ne débutera qu'à compter du jour où le Domicilié aura transmis les documents et informations sollicités pour la réalisation de ses obligations figurant à l'article 3.2.");
    addParagraph("Dans l'attente de la transmission de ces éléments ou à défaut de transmission, les montants évoqués à l'article 4.1 seront dus au Domiciliataire.");

    // ARTICLE 6
    addTitle("ARTICLE 6 : MODALITÉS DE RÉSILIATION");
    addText("6.1 – Résiliation par le Domicilié", 10, true, [30, 41, 59]);
    addParagraph("Le Domicilié pourra résilier le Contrat sur son espace client. La résiliation sera effective sous deux (2) jours ouvrés à compter de la demande de résiliation formulée par le Domicilié.");
    addParagraph("Lorsque le Domicilié bénéficie de la Prestation de domiciliation, c'est-à-dire lorsque son siège social est immatriculé dans les locaux du Domiciliataire, afin de valider la résiliation, le Domicilié devra produire tout document officiel démontrant le transfert ou la radiation de son siège social (par exemple un extrait Kbis). À défaut, le Contrat produira ses effets aux conditions en vigueur au jour de la résiliation, et ce, jusqu'à la transmission dudit document.");

    addText("6.2 – Résiliation par le Domiciliataire", 10, true, [30, 41, 59]);
    addParagraph("En cas de manquement par le Domicilié à ses obligations prévues à l'article 3.2 ou des stipulations de l'article 4 du Contrat, le Domiciliataire pourra mettre fin à ses Prestations, sans aucune mise en demeure ni notification préalable. Les montants déjà payés par le Domicilié seront conservés par le Domiciliataire à titre de dommages et intérêts, sans préjudice de demande de réparation complémentaire pour le préjudice subi. Le Domicilié restera redevable de tout frais dû en application des articles 2 et 3.");

    addTitle("ARTICLE 7 : DIVISIBILITÉ DES ARTICLES");
    addParagraph("Dans l'hypothèse où l'un ou plusieurs des articles de ce Contrat serait considéré comme inapplicable, la totalité des autres articles demeurerait applicable.");

    addTitle("ARTICLE 8 : DROIT APPLICABLE");
    addParagraph("Le Contrat est régi par le droit français. En cas de traduction de ses stipulations, seul le texte français prévaudrait en cas de litige.");

    addTitle("ARTICLE 9 : LITIGES");
    addParagraph("Tous les litiges auxquels le présent Contrat pourrait donner lieu, concernant tant sa validité, son interprétation, son exécution, sa résiliation, leurs conséquences et leurs suites, seront soumis à la compétence du tribunal de commerce de Toulouse.");

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
            try { doc.addImage(signatureImage, 'PNG', 110, currentY + 7, 70, 20); } catch (e) { }
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

        // Highlight vvctive plan column faintly
        if (planDetails.name === 'Essentiel') { doc.setFillColor(239, 246, 255); doc.rect(col2, currentY, 35, rowHeight, 'F'); }
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
    addParagraph("Durée d'engagement légale : conformément à l'article R123-168 du Code de commerce, la durée minimale de tout contrat de domiciliation est de trois (3) mois, quelle que soit la formule souscrite. La mention commerciale du site est « Résiliation à tout moment au delà de la durée légale de 3 mois », conforme à cette obligation.");

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
        try { doc.addImage(signatureImage, 'PNG', 110, currentY + 5, 70, 20); } catch (e) { }

        if (signProof) {
            const dateObj = new Date(signProof.signedAt);
            const pDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const pTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const proofText = `Signé électroniquement par ${cleanForPdf(signProof.signeeName || clientName)} le ${pDate} à ${pTime} depuis l'IP ${signProof.ipAddress}`;

            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            doc.text(proofText, 110, currentY + 30);
            doc.setTextColor(0, 0, 0); // Reset
            doc.setFontSize(10);
        }
    }

    // Fix all page footers that were added
    // (Page numbers removed per user request)
};
