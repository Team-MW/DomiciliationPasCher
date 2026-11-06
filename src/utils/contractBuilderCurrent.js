import { cleanForPdf } from './pdfGenerator';
import { resolvePersonalAddress, resolveForwardingAddress } from './contractLegalFields';
import { PLAN_CATALOG, EXTRA_FEES_HT, annualHt, clientPlanPricing } from '../../shared/plans.js';

/**
 * Contrat de domiciliation — version de novembre 2026 (grille Essentiel / Confort / Premium).
 * Texte fourni par le Domiciliataire ; seuls les champs entre crochets sont remplis ici.
 * Prix et quotas lus dans shared/plans.js (jamais en dur).
 */

const euro = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;
const euroShort = (n) => `${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2).replace('.', ',')} €`;

export function describeCurrentPlan(clientData, extra) {
    // Tarif : celui du client (un client souscrit avant novembre 2026 garde son prix d'origine).
    // Nom : toujours le nom actuel de la formule (Scan+ = Confort, Physique+ = Premium).
    const pricing = clientPlanPricing(clientData?.plan, extra);
    const isAnnuel = extra?.frequence === 'annuel';
    let promo = 'Aucune';
    if (isAnnuel) promo = pricing.legacy ? "Tarif annuel d'origine conservé (10 mensualités)" : 'Remise annuelle de 20 %';
    return {
        id: pricing.id,
        name: PLAN_CATALOG[pricing.id].name,
        isAnnuel,
        periodicite: isAnnuel ? 'Annuelle' : 'Mensuelle',
        tarifHt: isAnnuel ? pricing.annualHt : pricing.ht,
        unite: isAnnuel ? 'an' : 'mois',
        promo,
        legacyPrice: pricing.legacy,
    };
}

export const buildCurrentContractContent = (doc, clientData, extra, isSigned, signatureImage, dateDebut, signedAtDate, imgData, signProof = null) => {
    let currentY = 45;
    const plan = describeCurrentPlan(clientData, extra);
    const F = EXTRA_FEES_HT;
    const P = PLAN_CATALOG;

    const clientName = cleanForPdf(extra.nom ? `${extra.prenom || ''} ${extra.nom}`.trim() : (clientData.name || '[Prénom NOM]'));
    const companyName = cleanForPdf(String(clientData.company || extra.nomSociete || '[Dénomination]'));
    const siren = String(extra.siren || extra.siret || clientData.siren || clientData.siret || '').replace(/\s/g, '');
    const villeRcs = cleanForPdf(extra.villeRcs || extra.greffe || extra.ville || 'Toulouse');
    const immatriculation = siren
        ? `immatriculée au Registre du Commerce et des Sociétés de ${villeRcs} sous le numéro ${siren.slice(0, 9)}`
        : 'en cours d’immatriculation';
    const immatriculationCourte = siren ? `SIREN ${siren.slice(0, 9)}` : 'en cours d’immatriculation';
    const clientAddress = cleanForPdf(resolvePersonalAddress(clientData, extra) || '[adresse personnelle]');
    const forwardingAddress = cleanForPdf(resolveForwardingAddress(extra) || 'à renseigner dans l’espace client');
    const dateNaissance = extra.dateNaissance ? cleanForPdf(new Date(extra.dateNaissance).toLocaleDateString('fr-FR')) : '[date de naissance]';
    const lieuNaissance = cleanForPdf(extra.lieuNaissance || '[lieu de naissance]');
    const nationalite = cleanForPdf(extra.nationalite || '[nationalité]');
    const fonction = cleanForPdf(extra.qualite || '[fonction]');
    const dateSignature = isSigned ? signedAtDate : dateDebut;

    const drawHeaderFooter = () => {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(8, 8, 194, 281);
        if (imgData) {
            try { doc.addImage(imgData, 'PNG', 15, 15, 45, 15); } catch { /* logo facultatif */ }
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('CONTRAT DE DOMICILIATION · domiciliation-pas-cher.com', 115, 18);
        doc.text('Référence : CONTRAT-' + clientData.id, 115, 22);
        doc.text('Date : ' + dateDebut, 115, 26);
        doc.text(`Formule : ${plan.name} – ${plan.periodicite}`, 115, 30); // valeurs du catalogue (tiret conservé)
        doc.setDrawColor(203, 213, 225);
        doc.line(15, 38, 195, 38);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        if (!isSigned) {
            doc.text('Paraphe Domiciliataire : _________                        Paraphe Domicilié : _________', 15, 275);
        }
    };

    const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > 270) {
            doc.addPage();
            drawHeaderFooter();
            currentY = 45;
        }
    };

    // La police standard du PDF « mange » l'espace qui suit le symbole € : on la double.
    const fixEuro = (t) => String(t).replace(/€ /g, '€  ');
    const applyStyle = (size, isBold, color) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
    };
    const addText = (text, size, isBold, color, indent = 15) => {
        applyStyle(size, isBold, color);
        const lines = doc.splitTextToSize(fixEuro(cleanForPdf(text)), 195 - indent - 15);
        checkPageBreak(lines.length * (size / 2.5) + 5);
        applyStyle(size, isBold, color); // un saut de page redessine l'en-tête (petit, gris) : on rétablit le style
        doc.text(lines, indent, currentY);
        currentY += lines.length * (size / 2.2) + 2;
    };
    const addTitle = (text) => { currentY += 4; checkPageBreak(10); addText(text, 11, true, [15, 23, 42]); currentY += 1; };
    const addSub = (text) => addText(text, 10, true, [30, 41, 59]);
    const addParagraph = (text, indent = 15) => { addText(text, 9.5, false, [51, 65, 85], indent); currentY += 2; };
    const addBullet = (text) => {
        checkPageBreak(10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(51, 65, 85);
        doc.text('•', 15, currentY);
        addText(text, 9.5, false, [51, 65, 85], 20);
        currentY += 1;
    };

    // ---------------- PAGE 1 ----------------
    drawHeaderFooter();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Contrat de domiciliation', 105, 50, { align: 'center' });
    currentY = 62;

    addTitle('Entre les soussignés :');
    addParagraph("La société CASSIN LUDOVIC, SAS, au capital social de 2 000,00 €, immatriculée au Registre du Commerce et des Sociétés de Toulouse sous le numéro 101 512 531 et dont l'établissement (SIRET : 101 512 531 00019) est autorisé à exercer l'activité de domiciliation sous le numéro AG/DOM/2026/06 à l'adresse de domiciliation : 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse, représentée par Ludovic CASSIN agissant en qualité de Président, ci-après dénommée (« le Domiciliataire »)");
    addText("D'UNE PART,", 9.5, true, [15, 23, 42]);
    currentY += 4;
    addText('ET', 10, true, [15, 23, 42]);
    currentY += 4;
    addParagraph(`La société ${companyName}, ${immatriculation}, représentée par ${clientName}, né(e) le ${dateNaissance} à ${lieuNaissance}, de nationalité ${nationalite}, demeurant au ${clientAddress}, en qualité de ${fonction}, ci-après dénommée (« le Domicilié »).`);
    addText("D'AUTRE PART,", 9.5, true, [15, 23, 42]);
    currentY += 6;
    addTitle('IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :');

    // ---------------- ARTICLE 1 ----------------
    addTitle('ARTICLE 1 : OBJET');
    addParagraph("Le présent contrat (le « Contrat ») a pour objet de définir les conditions dans lesquelles le Domiciliataire fournit au Domicilié tout ou partie des prestations décrites à l'article 2 (les « Prestations »).");
    addParagraph('Les Prestations objet du Contrat sont destinées à des professionnels.');
    addParagraph("Le Contrat s'applique, sans restriction ni réserve, à l'ensemble des Prestations assurées par le Domiciliataire.");
    addParagraph("Le Contrat est complété par les Conditions Générales de Vente acceptées par le Domicilié dans le cadre du processus de commande, ainsi que par l'Annexe 1 (Bon de commande) qui précise l'offre souscrite, son tarif et les services inclus.");
    addParagraph("En cas de contradiction, les documents prévalent dans l'ordre suivant : le Contrat, l'Annexe 1, puis les Conditions Générales de Vente. L'Annexe 1 prévaut toutefois pour les éléments tarifaires et les services inclus.");
    addParagraph("Les Prestations étant fournies à un professionnel, le Domicilié ne bénéficie pas du droit de rétractation, sauf dans le cas prévu à l'article L221-3 du Code de la consommation (contrat conclu hors établissement avec un professionnel employant cinq (5) salariés au plus, pour un service n'entrant pas dans le champ de son activité principale), où il dispose d'un délai de quatorze (14) jours.");

    // ---------------- ARTICLE 2 ----------------
    addTitle('ARTICLE 2 : PRESTATIONS');
    addSub('2.1 Domiciliation');
    addParagraph("Le Domiciliataire permet au Domicilié d'établir son siège social à l'adresse Chez CASSIN LUDOVIC 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse.");
    addParagraph("Le Domicilié communique à ses expéditeurs l'adresse exacte, comprenant le numéro de bureau, mentionnée ci-dessus comme adresse postale, afin de garantir la réception de son courrier par le Domiciliataire et toute notification. Tout courrier qui ne porterait pas précisément l'adresse postale spécifiée pourrait ne pas être réceptionné dans les délais impartis, ou pourrait ne pas être réceptionné et être renvoyé à l'expéditeur par les services postaux.");
    addParagraph("Le Domiciliataire réceptionne et conserve le courrier du Domicilié et l'informe de chaque arrivée par email, avec une photographie de l'enveloppe. Le Domicilié peut retirer son courrier et ses colis sur place, du lundi au vendredi de 9h à 18h, sur rendez-vous pris par email au moins vingt-quatre (24) heures à l'avance, ou quarante-huit (48) heures pour un colis volumineux.");

    addSub("2.2 Mise à disposition d'une salle de réunion");
    addParagraph("La fourniture au Domicilié de la possibilité de réserver une salle de réunion, garantissant un environnement confidentiel pour les réunions des organes de direction, d'administration ou de surveillance de l'entreprise, ainsi que la tenue, la conservation et la consultation des livres, registres et documents prescrits par les lois et règlements.");
    addParagraph(`La réalisation de cette Prestation implique des frais complémentaires optionnels, au tarif de ${euro(F.meetingRoomHour)} HT par heure, et doit faire l'objet d'une demande écrite préalable du Domicilié au Domiciliataire, par email au moins quarante-huit (48) heures à l'avance. Toute réservation annulée moins de vingt-quatre (24) heures avant son début est due.`);

    addSub('2.3 Réexpédition du courrier');
    addParagraph(`Selon la formule souscrite (précisée en Annexe 1), le Domiciliataire réexpédie le courrier postal du Domicilié au format papier, à l'adresse indiquée par le Domicilié dans son espace client. La formule ${P.physique.name} inclut deux (2) réexpéditions par mois, l'affranchissement étant refacturé au coût réel. Toute autre réexpédition est facturée ${euro(F.forward)} HT, plus le coût réel de l'affranchissement.`);

    addSub('2.4 Numérisation du courrier');
    addParagraph("La transmission par le Domiciliataire au Domicilié de son courrier postal sous format numérique à travers un cloud privé et sécurisé dans l'espace client.");
    addParagraph("À ce titre, le Domicilié donne autorisation au Domiciliataire d'ouvrir le courrier postal en son nom afin de pouvoir réaliser sa numérisation.");
    addParagraph(`La numérisation est incluse dans la limite de quarante (${P['scan-plus'].scanQuota}) plis par mois pour la formule ${P['scan-plus'].name} et de cent (${P.physique.scanQuota}) plis par mois pour la formule ${P.physique.name}. Au-delà, chaque pli est facturé ${euro(F.scanPerPage)} HT. Les quotas ne sont pas reportables. La numérisation est réalisée sous vingt-quatre (24) heures ouvrées après réception.`);

    addSub('2.5 Réception des colis');
    addParagraph('Le Domiciliataire réceptionne les colis d\'un poids de cinq (5) kilogrammes au plus. Sont refusés : les colis de plus de cinq (5) kilogrammes, les objets dangereux ou illicites, les denrées périssables et les objets de valeur.');
    addParagraph(`La réception est incluse dans la formule ${P.physique.name} et facturée ${euro(F.parcel)} HT par colis pour les autres formules. Les colis sont conservés quinze (15) jours à compter de leur réception ; au-delà, ils sont retournés à l'expéditeur ou conservés moyennant ${euro(F.parcelStoragePerDay)} HT par jour. Le Domiciliataire n'assure pas la valeur du contenu des colis.`);

    // ---------------- ARTICLE 3 ----------------
    addTitle('ARTICLE 3 : OBLIGATIONS DES PARTIES');
    addSub('3.1 Obligations du Domiciliataire');
    addParagraph("Durant toute la durée du Contrat, le Domiciliataire s'engage à :");
    addBullet("disposer d'un agrément préfectoral lui permettant d'exercer l'activité de domiciliation à jour ;");
    addBullet("être immatriculé au registre du commerce et des sociétés ou au répertoire des métiers, durant l'occupation des locaux ;");
    addBullet("mettre à la disposition du Domicilié des locaux dotés d'une pièce propre à assurer la confidentialité nécessaire et à permettre une réunion régulière des organes chargés de la direction, de l'administration ou de la surveillance de l'entreprise ainsi que la tenue, la conservation et la consultation des livres, registres et documents prescrits par la loi ;");
    addBullet("détenir, pour chaque entreprise domiciliée, un dossier contenant les pièces justificatives relatives au domicile de son représentant légal et à ses coordonnées téléphoniques ainsi qu'à chacun de ses lieux d'activité et du lieu de détention des documents comptables lorsqu'ils ne sont pas conservés chez le Domiciliataire ;");
    addBullet("informer le greffier du tribunal, à l'expiration du contrat ou en cas de résiliation anticipée de celui-ci, de la cessation de la domiciliation de l'entreprise dans ses locaux. Lorsque l'entreprise domiciliée n'a pas pris connaissance de son courrier depuis trois mois, le Domiciliataire en informe également le greffier ou la chambre des métiers et de l'artisanat ;");
    addBullet('communiquer aux huissiers de justice, munis d\'un titre exécutoire, les renseignements propres à joindre le Domicilié ;');
    addBullet("fournir, chaque trimestre, au centre des impôts et aux organismes de recouvrement des cotisations et contributions de sécurité sociale compétents, une liste des personnes qui se sont domiciliées dans ses locaux au cours de cette période ou qui ont mis fin à leur domiciliation ainsi que chaque année, avant le quinze janvier, une liste des personnes domiciliées au 1er janvier ;");
    addBullet("pour les abonnements annuels, informer le Domicilié de l'approche du terme du Contrat au plus tard deux (2) mois avant son échéance, afin de lui permettre d'exercer, le cas échéant, son droit de résiliation.");

    addSub('3.2 Obligations du Domicilié');
    addParagraph("Durant toute la durée du Contrat, dans le cadre de la Prestation de domiciliation, le Domicilié s'engage à :");
    addBullet("transmettre au Domiciliataire son justificatif d'inscription au Registre du Commerce et des Sociétés ou des Métiers ou auprès de toute autre administration compétente dans un délai d'un (1) mois à compter de l'obtention du justificatif ;");
    addBullet("utiliser effectivement et exclusivement les locaux, soit comme siège de l'entreprise, soit si le siège est situé à l'étranger comme agence, succursale ou bureau de représentation.");
    addParagraph("Durant toute la durée du Contrat, dans le cadre des Prestations fournies par le Domiciliataire, en ce compris la Prestation de domiciliation, le Domicilié s'engage à :");
    addBullet("donner mandat au Domiciliataire, qui l'accepte, de recevoir en son nom toute notification, courrier ou communication officielle ;");
    addBullet("donner procuration postale au Domiciliataire, en complétant le formulaire mis à sa disposition dans son espace client et en se soumettant aux conditions imposées par La Poste. Cette procuration postale permettra au Domiciliataire de réceptionner le courrier recommandé adressé au Domicilié. Le Domicilié décharge, par avance, le Domiciliataire de toute responsabilité dans le cadre de l'exécution dudit mandat ;");
    addBullet("fournir au Domiciliataire, dès la signature du Contrat ou dans les meilleurs délais, toutes les pièces justificatives relatives à : son identité, son domicile, à ses coordonnées téléphoniques, au lieu de détention de ses documents comptables, à chacun de ses lieux d'activité, ainsi que son numéro de SIRET ;");
    addBullet("informer sans délai le Domiciliataire de toute modification concernant son activité, les lieux de réalisation de celle-ci et du lieu de détention de ses documents comptables ;");
    addBullet("actualiser et fournir sans délai les pièces justificatives ou informations évoquées dans les deux points ci-dessus lorsque celles-ci ne sont plus à jour, ainsi que tout autre document afférent aux modifications d'adresse, d'état civil personnel, de dénomination sociale, de nom commercial, de sigle (afin d'éviter les homonymes), de forme juridique ou d'objet, de dirigeant, du bénéficiaire des Prestations fournies au titre du Contrat. Dans l'hypothèse où le Domicilié opère des changements de représentants légaux ou de bénéficiaires effectifs, ces changements devront être signalés par le Domicilié au Domiciliataire avant la réalisation de toute modification auprès du Greffe du Tribunal de Commerce ou de la Chambre des Métiers ou toute autre administration compétente ;");
    addBullet("s'acquitter régulièrement des impôts et taxes liés à la réalisation de son activité afin que le Domiciliataire ne puisse être inquiété à ce sujet ;");
    addBullet('demeurer entièrement responsable des dettes à son égard à la fin du Contrat ;');
    addBullet("déclarer sans délai tout changement relatif à sa forme juridique et son objet, ainsi qu'au nom et au domicile personnel des personnes ayant le pouvoir de l'engager à titre habituel.");
    addParagraph("Le Domicilié certifie exacts tous les renseignements et documents fournis à l'appui de la signature et lors de l'exécution du Contrat avec le Domiciliataire, certifie ne pas être en situation de liquidation de biens, redressement judiciaire en ce qui concerne l'entreprise ou les entités qu'il dirige, que ces établissements soient l'objet ou non dudit contrat, certifie que son représentant légal n'est pas à titre personnel frappé de faillite personnelle ou d'interdiction de gérer, atteste l'exactitude de tous les renseignements fournis au Domiciliataire tant en ce qui concerne son état civil ainsi que les entités représentées.");
    addParagraph('Le Domicilié donne son accord pour que les informations fournies puissent être communiquées, sur demande, aux différentes administrations.');
    addParagraph("Le Domiciliataire est tenu de mettre en œuvre les obligations de vigilance énoncées aux articles L. 561-2 et suivants du Code monétaire et financier en matière de lutte contre le blanchiment de capitaux et le financement du terrorisme (« LCB-FT »). À ce titre, le Domicilié s'engage à transmettre au Domiciliataire et actualiser dans les meilleurs délais toute information ou tout document que pourrait solliciter le Domiciliataire dans le cadre de la mise en œuvre de ses obligations en matière de LCB-FT, notamment les documents suivants :");
    addBullet('Kbis de moins de 3 mois ou équivalent ;');
    addBullet('Statuts signés à jour, ou le projet de statuts pour les sociétés en cours de création ;');
    addBullet('Justificatif de domicile du représentant légal de moins de 3 mois ;');
    addBullet("Copie (recto/verso) de la pièce d'identité du représentant légal ;");
    addBullet("Copie (recto/verso) de la pièce d'identité des bénéficiaires effectifs ;");
    addBullet("Tout autre document qui pourrait s'avérer nécessaire dans le cadre de la mise en œuvre par le Domiciliataire de ses obligations en matière de LCB-FT.");

    addSub('3.3 Protection des données personnelles (RGPD)');
    addParagraph("Les données à caractère personnel collectées dans le cadre du présent Contrat (pièces d'identité, justificatifs de domicile, coordonnées, photographies d'enveloppes et numérisations du courrier) sont traitées par le Domiciliataire pour les seules finalités de l'exécution du Contrat et du respect de ses obligations légales, notamment en matière de LCB-FT. Ces données sont conservées pendant la durée du Contrat augmentée des délais de conservation légaux applicables, notamment cinq (5) ans après la fin de la relation pour les pièces relevant de la LCB-FT, et ne sont communiquées qu'aux administrations compétentes ou aux autorités habilitées à en faire la demande. Conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés, le Domicilié dispose d'un droit d'accès, de rectification, d'effacement et de portabilité de ses données, qu'il peut exercer auprès du Domiciliataire.");

    // ---------------- ARTICLE 4 ----------------
    addTitle('ARTICLE 4 : ABONNEMENT ET PAIEMENT');
    addSub("4.1 Montant de l'abonnement");
    addParagraph("Le Domicilié est redevable d'un abonnement correspondant à l'offre souscrite et précisée en Annexe 1 (Bon de commande), au tarif en vigueur affiché au moment de la souscription aux Prestations par le Domicilié.");
    addParagraph("Dans l'hypothèse où l'activité du Domicilié nécessite la réalisation de prestations complémentaires visées à l'article 2 et dans les Conditions Générales de Vente, celles-ci feront l'objet d'un complément de facturation.");
    addParagraph("Les sommes versées ne sont pas remboursables en cas de résiliation par le Domicilié, y compris pour un abonnement annuel résilié en cours de période ; les Prestations restent alors fournies jusqu'au terme de la période payée. Lorsque le Domiciliataire met fin au Contrat sans faute du Domicilié, notamment en cas de cessation d'activité ou de perte de son agrément, il rembourse les sommes correspondant aux mois entiers non utilisés.");

    addSub('4.2 Modalités de paiement');
    addParagraph('Le paiement des Prestations est réalisé par carte bancaire ou par prélèvement SEPA. Le Domicilié maintient un moyen de paiement valide pendant toute la durée du Contrat.');
    addParagraph("Pour les abonnements mensuels, le paiement est dû à la date anniversaire du Contrat. Pour les abonnements annuels, le paiement de l'abonnement est réalisé en une seule fois lors de la souscription aux Prestations, puis à chaque renouvellement.");
    addParagraph("Les prestations complémentaires sont facturées le mois suivant leur réalisation : sur la facture d'abonnement suivante pour les abonnements mensuels, sur une facture distincte en fin de mois pour les abonnements annuels.");
    addParagraph("Lorsque le Contrat est conclu par une personne physique pour le compte d'une société en cours de création, la personne physique ayant agi au nom et pour le compte de ladite société reste seule engagée par la signature du Contrat. Lorsque la preuve d'immatriculation du Domicilié (le Kbis ou équivalent) aura été reçue par le Domiciliataire, le Contrat sera considéré comme conclu dès l'origine par ladite société.");
    addParagraph("En l'absence de règlement des sommes dues quinze (15) jours après la date d'échéance, le Domiciliataire peut suspendre les Prestations, le courrier continuant d'être réceptionné et conservé. En l'absence de règlement trente (30) jours après la date d'échéance, il peut résilier le Contrat après une mise en demeure par email restée sans effet pendant huit (8) jours.");
    addParagraph("Conformément à l'article L441-10 du Code de commerce, toute somme impayée à l'échéance entraîne de plein droit des pénalités de retard égales à trois fois le taux d'intérêt légal ainsi qu'une indemnité forfaitaire pour frais de recouvrement de quarante (40) euros.");

    // ---------------- ARTICLE 5 ----------------
    addTitle('ARTICLE 5 : DURÉE');
    addParagraph(`Le Contrat est conclu à compter du ${dateDebut} pour la durée précisée en Annexe 1, laquelle ne pourra être inférieure à trois (3) mois conformément à l'article R123-168 du Code de commerce.`);
    addParagraph("Le Contrat se renouvelle, tacitement, par périodes successives correspondant à la durée initiale du Contrat (abonnement annuel), à l'exception des Contrats de trois (3) mois qui se renouvellent, tacitement, par périodes successives d'un (1) mois, sauf résiliation dans les conditions prévues à l'article 6 du Contrat.");
    addParagraph("Lorsque le Domicilié bénéficie d'un mois offert dans le cadre d'une offre promotionnelle, ce mois est inclus dans la durée minimale de trois (3) mois.");
    addParagraph("L'exécution des Prestations par le Domiciliataire ne débutera qu'à compter du jour où le Domicilié aura transmis les documents et informations sollicités pour la réalisation de ses obligations figurant à l'article 3.2.");
    addParagraph("Dans l'attente de la transmission de ces éléments ou à défaut de transmission, les montants évoqués à l'article 4.1 seront dus au Domiciliataire.");

    // ---------------- ARTICLE 6 ----------------
    addTitle('ARTICLE 6 : MODALITÉS DE RÉSILIATION');
    addSub('6.1 Résiliation par le Domicilié');
    addParagraph("Le Domicilié peut résilier le Contrat depuis son espace client, avec un préavis d'un (1) mois avant la fin de la période en cours. La résiliation ne peut prendre effet avant l'expiration de la durée minimale de trois (3) mois.");
    addParagraph("Lorsque le Domicilié bénéficie de la Prestation de domiciliation, c'est-à-dire lorsque son siège social est immatriculé dans les locaux du Domiciliataire, afin de valider la résiliation, le Domicilié devra produire tout document officiel démontrant le transfert ou la radiation de son siège social (par exemple un extrait Kbis). À défaut, le Contrat produira ses effets aux conditions en vigueur au jour de la résiliation, et ce, jusqu'à la transmission dudit document.");
    addSub('6.2 Résiliation par le Domiciliataire');
    addParagraph("En cas de manquement du Domicilié à ses obligations prévues aux articles 3.2 ou 4 du Contrat, le Domiciliataire peut résilier le Contrat après une mise en demeure par email restée sans effet pendant huit (8) jours, ou sans délai en cas de manquement grave (fausse déclaration, usage frauduleux de l'adresse, refus de fournir les pièces réglementaires). Les montants déjà payés par le Domicilié restent acquis au Domiciliataire, sans préjudice de toute demande de réparation complémentaire pour le préjudice subi. Le Domicilié reste redevable de tout frais dû en application des articles 2 et 4.");
    addSub('6.3 Fin du Contrat');
    addParagraph("À la fin du Contrat, quelle qu'en soit la cause, le Domiciliataire informe le greffe de la cessation de la domiciliation. Le courrier reçu ensuite est retourné à l'expéditeur avec la mention « n'habite plus à l'adresse indiquée » et les colis sont refusés.");

    addTitle('ARTICLE 7 : DIVISIBILITÉ DES ARTICLES');
    addParagraph("Dans l'hypothèse où l'un ou plusieurs des articles de ce Contrat serait considéré comme inapplicable, la totalité des autres articles demeurerait applicable.");
    addTitle('ARTICLE 8 : DROIT APPLICABLE');
    addParagraph('Le Contrat est régi par le droit français. En cas de traduction de ses stipulations, seul le texte français prévaudrait en cas de litige.');
    addTitle('ARTICLE 9 : LITIGES');
    addParagraph('Tous les litiges auxquels le présent Contrat pourrait donner lieu, concernant tant sa validité, son interprétation, son exécution, sa résiliation, leurs conséquences et leurs suites, seront soumis à la compétence du tribunal de commerce de Toulouse.');

    // ---------------- SIGNATURES ----------------
    currentY += 8;
    checkPageBreak(45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Fait à Toulouse, le ${dateSignature}`, 15, currentY);
    currentY += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Pour le Domiciliataire', 15, currentY);
    doc.text('Pour le Domicilié', 110, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Ludovic CASSIN', 15, currentY);
    doc.text(clientName, 110, currentY);
    if (isSigned) {
        doc.text('(Signature précédée de « Bon pour accord »)', 110, currentY + 5);
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
            try { doc.addImage(signatureImage, 'PNG', 110, currentY + 7, 70, 20); } catch { /* signature facultative */ }
        }
    }

    // ---------------- ANNEXE 1 ----------------
    doc.addPage();
    drawHeaderFooter();
    currentY = 45;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Annexe 1 — Bon de commande', 105, currentY, { align: 'center' });
    currentY += 8;
    addParagraph("La présente Annexe fait partie intégrante du Contrat de domiciliation auquel elle est rattachée. Elle précise les éléments propres à l'offre souscrite par le Domicilié. En cas de contradiction entre la présente Annexe et le Contrat, les clauses du Contrat prévalent, sauf sur les éléments strictement tarifaires et de services inclus.");
    currentY += 2;

    // Identité
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, currentY, 180, 25, 2, 2, 'FD');
    const infoRow = (label, value, y) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(label, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(cleanForPdf(value), 125)[0] || '', 68, y);
    };
    infoRow('Dénomination :', companyName, currentY + 8);
    infoRow('Immatriculation :', immatriculationCourte, currentY + 15);
    infoRow('Adresse de réexpédition :', forwardingAddress, currentY + 22);
    currentY += 33;

    // Grille des offres
    addTitle('Grille des offres (référence catalogue)');
    const col1 = 15, col2 = 92, col3 = 126, col4 = 160, colW = 34, rowH = 7;
    const startY = currentY;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(col1, currentY, 180, rowH * 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Service inclus', col1 + 4, currentY + 6);
    const plansCols = [[P.essentiel, col2], [P['scan-plus'], col3], [P.physique, col4]];
    for (const [p, x] of plansCols) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(p.name, x + colW / 2, currentY + 6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(fixEuro(`${euroShort(p.ht)} HT/mois`), x + colW / 2, currentY + 11.5, { align: 'center' });
    }
    currentY += rowH * 2;

    const scanCell = (p) => (p.scanQuota ? `${p.scanQuota} plis/mois` : 'NON');
    const rows = [
        ['Adresse juridique officielle', 'OUI', 'OUI', 'OUI'],
        ['Réception et conservation du courrier', 'OUI', 'OUI', 'OUI'],
        ["Notification avec photo de l'enveloppe", 'OUI', 'OUI', 'OUI'],
        ['Attestation de domiciliation', 'OUI', 'OUI', 'OUI'],
        ['Espace client 24h/24', 'OUI', 'OUI', 'OUI'],
        ['Retrait sur place sur rendez-vous', 'OUI', 'OUI', 'OUI'],
        ['Contrat conforme au Code de commerce (art. R123-168)', 'OUI', 'OUI', 'OUI'],
        ['Numérisation du courrier', scanCell(P.essentiel), scanCell(P['scan-plus']), scanCell(P.physique)],
        ['Réexpédition physique', 'Payante', 'Payante', `${P.physique.forwardsIncluded} par mois incluses`],
        ['Réception de colis (5 kg max)', `${euroShort(F.parcel)} HT/colis`, `${euroShort(F.parcel)} HT/colis`, 'OUI'],
    ];
    const activeX = { essentiel: col2, 'scan-plus': col3, physique: col4 }[plan.id];
    rows.forEach((row) => {
        if (activeX) { doc.setFillColor(239, 246, 255); doc.rect(activeX, currentY, colW, rowH, 'F'); }
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(col1, currentY, 180, rowH);
        doc.line(col2, currentY, col2, currentY + rowH);
        doc.line(col3, currentY, col3, currentY + rowH);
        doc.line(col4, currentY, col4, currentY + rowH);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(cleanForPdf(row[0]), col1 + 3, currentY + 4.8);
        doc.text(fixEuro(cleanForPdf(row[1])), col2 + colW / 2, currentY + 4.8, { align: 'center' });
        doc.text(fixEuro(cleanForPdf(row[2])), col3 + colW / 2, currentY + 4.8, { align: 'center' });
        doc.text(fixEuro(cleanForPdf(row[3])), col4 + colW / 2, currentY + 4.8, { align: 'center' });
        currentY += rowH;
    });
    doc.setDrawColor(203, 213, 225);
    doc.rect(col1, startY, 180, currentY - startY);
    currentY += 7;

    addParagraph(`Paiement annuel : remise de 20 % sur le prix de l'abonnement (${euro(annualHt(P.essentiel.ht))} HT, ${euro(annualHt(P['scan-plus'].ht))} HT ou ${euro(annualHt(P.physique.ht))} HT par an).`);
    addParagraph(`Prestations complémentaires (HT) : numérisation hors quota ${euro(F.scanPerPage)} par pli ; réexpédition ${euro(F.forward)} + affranchissement réel ; colis ${euro(F.parcel)} (hors ${P.physique.name}) ; conservation d'un colis au-delà de 15 jours ${euro(F.parcelStoragePerDay)} par jour ; salle de réunion ${euro(F.meetingRoomHour)} par heure.`);
    addParagraph("Durée d'engagement légale : conformément à l'article R123-168 du Code de commerce, la durée minimale de tout contrat de domiciliation est de trois (3) mois, quelle que soit la formule souscrite. Résiliation ensuite avec un préavis d'un (1) mois. Paiement non remboursable en cas de résiliation par le Domicilié.");

    // Offre souscrite
    checkPageBreak(50); // titre + encadré + « Fait à » gardés ensemble
    addTitle('Offre souscrite');
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(15, currentY, 180, 28, 2, 2, 'FD');
    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(cleanForPdf(`Formule souscrite : ${plan.name}`), 20, currentY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(cleanForPdf(`Périodicité : ${plan.periodicite}`), 20, currentY + 13);
    doc.text(fixEuro(cleanForPdf(`Tarif : ${euro(plan.tarifHt)} HT / ${plan.unite}`)), 20, currentY + 19);
    doc.text(cleanForPdf(`Offre promotionnelle appliquée : ${plan.promo}`), 20, currentY + 25);
    currentY += 38;
    checkPageBreak(35);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Fait à Toulouse, le ${dateSignature}`, 15, currentY);
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Le Domicilié', 110, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(clientName, 110, currentY + 5);
    if (isSigned && signatureImage) {
        try { doc.addImage(signatureImage, 'PNG', 110, currentY + 8, 70, 20); } catch { /* signature facultative */ }
        if (signProof) {
            const dateObj = new Date(signProof.signedAt);
            const pDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const pTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            doc.text(`Signé électroniquement par ${cleanForPdf(signProof.signeeName || clientName)} le ${pDate} à ${pTime} depuis l'IP ${signProof.ipAddress}`, 110, currentY + 33);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
        }
    }
};
