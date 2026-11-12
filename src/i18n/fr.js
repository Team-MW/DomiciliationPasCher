import espaceClient from './espaceClient/index.js';

export default {
  common: {
    errorTitle: 'Cette page n’a pas pu s’afficher',
    errorBody: 'Un incident est survenu (connexion interrompue ou nouvelle version du site). Rechargez la page.',
    reload: 'Recharger la page',
    loading: 'Chargement...',
    backToTop: 'Retour en haut',
    dialogConfirm: 'Confirmation',
    dialogNotice: 'Notification',
    dialogOk: 'OK',
    dialogCancel: 'Annuler',
    authUnavailableTitle: "Service de connexion indisponible",
    authUnavailableText: "Le module de connexion n’a pas pu se charger (réseau instable, bloqueur de publicité ou incident passager). Rechargez la page ; si cela persiste, appelez-nous.",
    dialogClose: 'Fermer',
  },

  nav: {
    links: {
      home: 'Accueil',
      services: 'Services',
      tarifs: 'Tarifs',
      villes: 'Adresses',
      creationEntreprise: "Création d'entreprise",
      fichesPratiques: 'Fiches pratiques',
    },
    megaMenu: {
      viewAll: 'Voir toutes les fiches pratiques →',
      gererEntreprise: 'Gérer son entreprise',
      fiscaliteImposition: 'Fiscalité et imposition',
      transfertSiege: 'Transfert de siège social',
      gouvernance: 'Gouvernance',
      servicesEntreprises: 'Services aux entreprises',
      piegesAstucesGestion: 'Pièges et astuces',
      actualites: 'Actualités',
      reformesLegales: 'Réformes légales',
      podcast: "Paroles d'entrepreneurs",
      entrepreneuriat: 'Entrepreneuriat',
      tech: 'Tech',
      domiciliation: 'Domiciliation',
      lesAdresses: 'Les adresses',
      gestionCourrier: 'Gestion du courrier',
      piegesAstucesDomiciliation: 'Pièges et astuces',
      toutSavoirDomiciliation: 'Tout savoir sur la domiciliation',
      creerEntreprise: 'Créer une entreprise',
      formesJuridiques: 'Les formes juridiques',
      aidesCreation: 'Les aides à la création',
      administrations: 'Les administrations',
      piegesAstucesCreation: 'Pièges et astuces',
      laCreationEntreprise: "La création d'entreprise",
      selectionMois: 'Notre sélection du mois',
      autoEntrepreneurAstuces: "Auto-entrepreneur : 5 astuces pour payer moins d'impôt",
      questCeDomiciliation: "Qu'est-ce que la domiciliation ?",
      coutComptabilite: 'Combien coûte la gestion de votre comptabilité ?',
      creerEntrepriseEnLigne: 'Comment créer son entreprise en ligne ?',
    },
    signIn: 'Se connecter',
    dashboard: 'Mon espace',
    dashboardMobile: 'Mon espace client',
    cta: 'Démarrer →',
    mobileCta: 'Domicilier mon entreprise',
    menuAria: 'Menu',
    callAria: 'Appeler le',
  },

  footer: {
    desc: "Domiciliation d'entreprise à Toulouse dès 16 € HT/mois. Centre agréé par la préfecture (n° AG/DOM/2026/06), souscription 100 % en ligne.",
    stats: {
      entreprises: { value: 'Toulouse', label: 'Adresse officielle' },
      creations: { value: '24 h', label: 'Attestation' },
    },
    columns: {
      services: {
        title: 'Nos services',
        links: [
          'Domiciliation commerciale',
          'Gestion du courrier',
          'Numérisation du courrier',
          'Salle de réunion',
          'Location de bureau',
        ],
      },
      villes: {
        title: 'Notre adresse',
        cities: ['Toulouse'],
      },
    },
    contact: {
      title: 'Contact',
      address: '150 rue Nicolas Louis Vauquelin\nBâtiment B, Lot 308\n31100 Toulouse',
      phone: '09 60 39 69 07',
      email: 'contact@domiciliation-pas-cher.com',
    },
    cta: {
      text: 'Prêt à vous lancer ?',
      button: 'Voir les tarifs',
    },
    legal: {
      mentionsLegales: 'Mentions légales',
      cgv: 'Conditions générales de vente (CGV)',
      cgvPdf: 'CGV en PDF',
      confidentialite: 'Politique de confidentialité',
      manageCookies: "Gérer les cookies",
    },
    copyright: '© {year} Domiciliation-Pas-Cher.com — Tous droits réservés',
    credits: 'Réalisé par microdidact',
  },

  home: {
    pageTitle: "Domiciliation d'entreprise à Toulouse dès 16 € HT/mois — Domiciliation Pas Cher",
    pendingBanner: 'Votre demande de domiciliation est en cours de traitement. Vous recevrez un email dès sa validation.',

    hero: {
      title: 'Domiciliez votre entreprise',
      titleHighlight: 'à Toulouse dès 12,80 € HT/mois',
      priceNote: 'Tarif en paiement annuel (153,60 € HT/an) · 16 € HT/mois en mensuel',
      subtitle: 'Obtenez une adresse juridique officielle à Toulouse. Souscription 100 % en ligne, attestation émise sous 24 h après validation de votre dossier.',
      ctaPrimary: 'Commencer maintenant',
      ctaSecondary: 'Découvrir nos services',
    },

    guarantees: [
      'Résiliable après 3 mois (préavis 1 mois)',
      '100 % légal',
      'Attestation sous 24 h',
      'Déductible fiscalement',
    ],

    heroCard: {
      title: 'Votre adresse professionnelle',
      subtitle: 'Attestation sous 24 h',
      badge: 'Actif',
      cities: ['Toulouse'],
      priceLabel: 'À partir de',
      priceValue: '16',
      priceUnit: '€ HT/mois',
      float1: {
        title: "Durée d'inscription",
        value: 'Moins de 5 minutes',
      },
      float2: {
        title: 'Conforme',
        value: 'Loi Dutreil 2003',
      },
      socialProof: '+2 000',
      socialProofText: 'entrepreneurs nous font confiance',
    },

    trustBar: {
      label: 'Agréé et conforme',
      items: ['Agrément préfectoral', 'Loi Dutreil 2003', '100 % légal', 'Prix garanti 12 mois', 'Charge déductible'],
    },

    stats: [
      { prefix: '', target: 16, suffix: ' €', label: 'HT/mois, formule Essentiel' },
      { prefix: '', target: 24, suffix: ' h', label: "Délai d'attestation" },
      { prefix: '', target: 12, suffix: ' mois', label: 'Prix garanti' },
      { prefix: '', target: 0, suffix: ' €', label: "Frais d'ouverture de dossier" },
    ],

    features: {
      eyebrow: 'Nos prestations',
      title: 'Une solution complète',
      titleHighlight: 'pour votre entreprise',
      subtitle: "De la domiciliation légale à la location d'espaces professionnels : tout ce dont vous avez besoin, au juste prix.",
      items: [
        {
          title: 'Adresse juridique officielle',
          desc: 'Une adresse de siège social à Toulouse, utilisable sur votre Kbis et tous vos documents officiels.',
        },
        {
          title: 'Gestion du courrier',
          desc: "Réception, stockage et notification par email avec photo de l'enveloppe pour chaque courrier. Numérisation incluse dans les formules Confort et Premium.",
        },
        {
          title: 'Salle de réunion',
          desc: 'Espace professionnel équipé (vidéoprojecteur, WiFi fibre, café) pour recevoir vos clients et tenir vos assemblées, dès 25 € HT de l’heure.',
        },
        {
          title: 'Location de bureau',
          desc: "Bureau privatif calme, à l'heure, à la demi-journée ou à la journée. WiFi inclus, sans abonnement.",
        },
        {
          title: 'Centre agréé',
          desc: "Agrément préfectoral n° AG/DOM/2026/06. Contrat conforme à l'article R123-168 du Code de commerce et à la loi Dutreil.",
        },
        {
          title: 'Attestation sous 24 h',
          desc: 'Souscription 100 % en ligne en moins de 5 minutes. Votre attestation de domiciliation est émise sous 24 h après validation de votre dossier.',
        },
      ],
      extraServicesTitle: 'Nos services complémentaires',
    },

    extraServices: [
      { label: 'Réexpédition du courrier' },
      { label: 'Réception de colis' },
      { label: 'Conseil en création' },
      { label: 'Salle de réunion' },
    ],

    steps: {
      eyebrow: 'Processus simplifié',
      title: 'Domiciliez-vous',
      titleHighlight: 'en 4 étapes',
      subtitle: 'Un parcours 100 % en ligne, pensé pour vous faire gagner du temps dès le premier jour.',
      items: [
        {
          n: '01',
          tag: 'Au choix',
          title: 'Choisissez votre formule',
          desc: 'Essentiel, Confort ou Premium : la formule adaptée à votre activité, pour votre adresse à Toulouse.',
        },
        {
          n: '02',
          tag: '100 % en ligne',
          title: 'Complétez votre dossier',
          desc: 'Renseignez le formulaire en ligne et joignez vos pièces justificatives en quelques minutes.',
        },
        {
          n: '03',
          tag: 'Conforme',
          title: 'Signez votre contrat',
          desc: 'Signez électroniquement votre contrat de domiciliation, sans aucun déplacement.',
        },
        {
          n: '04',
          tag: 'Sous 24 h',
          title: 'Recevez votre attestation',
          desc: 'Votre attestation de domiciliation est émise sous 24 h après validation de votre dossier, prête pour votre immatriculation.',
        },
      ],
    },

    pricing: {
      eyebrow: 'Tarification transparente',
      title: 'La domiciliation',
      titleHighlight: 'au juste prix',
      desc: 'Pas de frais cachés, pas de mauvaise surprise.',
      descHighlight: 'À partir de 16 € HT/mois',
      descSuffix: ", engagement légal de 3 mois puis préavis d’1 mois.",
      cta: 'Découvrir toutes nos offres',
      trust: ['Résiliable après 3 mois (préavis 1 mois)', 'Attestation sous 24 h', "Sans frais d'ouverture"],
      plans: [
        {
          name: 'Essentiel',
          price: '16',
          period: '€ HT/mois',
          desc: "L'adresse officielle et la notification de votre courrier, au meilleur prix.",
          features: [
            { text: 'Adresse juridique officielle', bold: true },
            "Notification email avec photo de l’enveloppe",
            'Attestation de domiciliation sous 24 h',
            'Espace client en ligne',
          ],
          cta: 'Choisir Essentiel',
        },
        {
          name: 'Confort',
          badge: 'Recommandé',
          price: '24',
          period: '€ HT/mois',
          desc: 'Votre courrier numérisé, consultable partout.',
          features: [
            "Toute l'offre Essentiel",
            { text: '40 plis numérisés', bold: true, suffix: ' par mois' },
            'Numérisation sous 24 h ouvrées',
            'Réexpédition à la demande (3 € HT + affranchissement)',
          ],
          cta: 'Choisir Confort',
        },
        {
          name: 'Premium',
          price: '38',
          period: '€ HT/mois',
          desc: 'Numérisation étendue, réexpéditions et colis inclus.',
          features: [
            "Toute l'offre Confort",
            { text: '100 plis numérisés', bold: true, suffix: ' par mois' },
            '2 réexpéditions incluses par mois',
            'Colis ≤ 5 kg inclus',
          ],
          cta: 'Choisir Premium',
        },
      ],
    },

    cities: {
      eyebrow: 'Présence locale',
      title: 'Une adresse à',
      titleHighlight: 'Toulouse',
      subtitle: "Bénéficiez d'une adresse de prestige à Toulouse.",
      items: [{ name: 'Toulouse', region: 'Occitanie' }],
      cta: 'En savoir plus sur notre adresse',
    },

    testimonials: {
      eyebrow: 'Confiance',
      title: 'Une domiciliation locale et transparente',
      subtitle: 'Centre agréé à Toulouse. Pas d’avis inventés : nous préférons la conformité (DGCCRF) à des notes marketing.',
      items: [],
      platforms: [],
    },

    faqs: {
      eyebrow: 'FAQ',
      title: 'Questions',
      titleHighlight: 'fréquentes',
      intro: "Tout ce que vous devez savoir sur la domiciliation d'entreprise en France.",
      cta: 'Voir nos offres',
      items: [
        {
          q: "Qu'est-ce que la domiciliation d'entreprise ?",
          a: "La domiciliation consiste à attribuer une adresse administrative et juridique à votre entreprise. Elle est obligatoire pour l'immatriculation de votre société et l'obtention de votre Kbis.",
        },
        {
          q: "Combien de temps pour recevoir l'attestation ?",
          a: 'Votre attestation de domiciliation est émise sous 24 h après validation de votre dossier complet (contrat signé et pièces justificatives).',
        },
        {
          q: 'La domiciliation est-elle légale ?',
          a: "Oui, totalement. Nous sommes un centre de domiciliation agréé par la préfecture (agrément n° AG/DOM/2026/06), conforme à la loi Dutreil du 1er août 2003 et à l'article R123-168 du Code de commerce.",
        },
        {
          q: "Puis-je changer d'adresse ou résilier ?",
          a: "Oui. Le contrat comporte une durée minimale légale de 3 mois (art. R123-168 du Code de commerce). Au-delà, vous pouvez résilier depuis votre espace client avec un préavis d'un mois. Les sommes déjà versées ne sont pas remboursables.",
        },
        {
          q: 'Quels documents sont nécessaires ?',
          a: "Une pièce d'identité du représentant légal (et des bénéficiaires effectifs), un justificatif de domicile de moins de 3 mois, les statuts ou le projet de statuts, et le Kbis si la société est déjà immatriculée. Tout se fait en ligne, sans déplacement.",
        },
        {
          q: 'Comment fonctionne la gestion du courrier ?',
          a: "Nous réceptionnons et stockons vos courriers, et vous notifions par email à chaque arrivée avec une photo de l'enveloppe. La numérisation est incluse dans les formules Confort (40 plis/mois) et Premium (100 plis/mois), puis 0,50 € HT par pli supplémentaire. La réexpédition est disponible pour toutes les formules (3 € HT + affranchissement), avec 2 envois par mois inclus dans Premium. Vous pouvez aussi retirer votre courrier sur place, du lundi au vendredi de 9 h à 18 h, sur rendez-vous.",
        },
      ],
    },

    finalCta: {
      title: 'Prêt à franchir le pas ?',
      subtitle: 'Rejoignez plus de 2 000 entrepreneurs. Démarrez en 5 minutes, dès 12,80 € HT/mois en paiement annuel.',
      ctaPrimary: 'Commencer maintenant',
      ctaSecondary: 'Découvrir nos services →',
      badges: ['Résiliable après 3 mois (préavis 1 mois)', 'Attestation sous 24 h', 'Support réactif', '100 % légal'],
    },

    successModal: {
      title: 'Paiement réussi !',
      subtitle: 'Votre adresse est réservée',
      warningTitle: '⚠️ Étape obligatoire',
      warningText:
        "Pour obtenir votre attestation de domiciliation (indispensable pour immatriculer votre entreprise au greffe) et suivre votre courrier, créez dès maintenant votre espace client.",
      info: "Cette étape prend moins d'une minute : elle relie votre paiement à votre compte client.",
      cta: 'Créer mon espace client',
      pendingSubtitle: "Paiement reçu, dossier en cours d’enregistrement",
      checkingTitle: "Vérification de votre paiement…",
      checkingText: "Quelques secondes, ne fermez pas cette page.",
      unknownTitle: "Nous n’avons pas pu vérifier votre paiement",
      unknownText: "Si votre banque a validé le paiement, il est bien enregistré et nous le confirmons automatiquement : ne payez pas une seconde fois. Réessayez la vérification ou créez votre espace client dès maintenant. Un doute ? Appelez-nous au 09 60 39 69 07.",
      retry: "Réessayer",
      unpaidTitle: "Paiement non finalisé",
      unpaidText: "Votre paiement n’a pas été validé par la banque et aucun montant n’a été prélevé. Vous pouvez reprendre votre souscription là où vous en étiez.",
      resume: "Reprendre ma souscription",
    },
  },

  tarifs: {
    pageTitle: 'Tarifs Domiciliation — À partir de 16€ HT/mois — DomiciliationPasCher',

    header: {
      eyebrow: "Tarifs transparents",
      title: "Domiciliation d'entreprise",
      titleHighlight: "à Toulouse",
      agreement: "Agréée par la préfecture · n° AG/DOM/2026/06 · 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse",
      subtitle: "Sans frais d'ouverture · Prix garanti 12 mois",
    },

    toggle: {"label": "Périodicité", "monthly": "Mensuel", "annual": "Annuel", "annualBadge": "-20 %", "perMonth": "HT/mois", "perYear": "HT/an", "equivMonthly": "soit {price} € HT/mois", "ttcMonth": "soit {price} € TTC/mois", "ttcYear": "soit {price} € TTC/an", "showDetails": "Voir le détail", "hideDetails": "Masquer le détail"},

    room: {"title": "Réservez notre salle de réunion : 25 € HT/heure.", "text": "Réservation par email, 48 h à l'avance. Annulation gratuite jusqu'à 24 h avant."},

    plans: [
      {
        id: 'essentiel',
        highlights: ["Adresse officielle à Toulouse", "Attestation de domiciliation", "Notification + photo de l'enveloppe", "Retrait sur place, sur rendez-vous"],
        popular: false,
        name: 'Essentiel',
        price: '16',
        period: "HT/mois",
        subtitle: "Adresse officielle + notification de votre courrier",
        cta: "Choisir Essentiel",
        note: "Engagement de 3 mois, puis résiliation avec un préavis d’un mois",
        features: [
          { ok: true, text: "Adresse juridique officielle (siège social)" },
          { ok: true, text: "Réception et stockage du courrier" },
          { ok: true, text: "Notification email avec photo de l'enveloppe" },
          { ok: true, text: "Attestation de domiciliation" },
          { ok: true, text: "Espace client 24h/24" },
          { ok: true, text: "Retrait sur place sur rendez-vous" },
          { ok: false, text: "Numérisation du courrier" },
          { ok: true, text: "Réexpédition : 3€ HT + affranchissement" },
          { ok: true, text: "Colis ≤ 5 kg : 3€ HT par colis" },
          { ok: true, text: "Contrat conforme art. R123-168 du Code de commerce" },
          { ok: true, text: "Salle de réunion réservable : 25 € HT/h, y compris pour vos assemblées générales" },
        ],
      },
      {
        id: 'scan-plus',
        highlights: ["Tout l'Essentiel", "Votre courrier scanné (40/mois)", "Consultable en ligne 24h/24", "Idéal si vous ne passez pas sur place"],
        popular: true,
        badge: "Recommandé",
        name: 'Confort',
        price: '24',
        period: "HT/mois",
        subtitle: "Adresse + numérisation de votre courrier",
        cta: "Choisir Confort",
        note: "Engagement de 3 mois, puis résiliation avec un préavis d’un mois",
        features: [
          { ok: true, text: "Adresse juridique officielle (siège social)" },
          { ok: true, text: "Réception et stockage du courrier" },
          { ok: true, text: "Notification email avec photo de l'enveloppe" },
          { ok: true, text: "Attestation de domiciliation" },
          { ok: true, text: "Espace client 24h/24" },
          { ok: true, text: "Retrait sur place sur rendez-vous" },
          { ok: true, text: "Numérisation : 40 plis/mois" },
          { ok: true, text: "Réexpédition : 3€ HT + affranchissement" },
          { ok: true, text: "Colis ≤ 5 kg : 3€ HT par colis" },
          { ok: true, text: "Contrat conforme art. R123-168 du Code de commerce" },
          { ok: true, text: "Salle de réunion réservable : 25 € HT/h, y compris pour vos assemblées générales" },
        ],
      },
      {
        id: 'physique',
        highlights: ["Tout Confort", "100 courriers scannés/mois", "2 réexpéditions par mois incluses", "Réception de vos colis"],
        popular: false,
        name: 'Premium',
        price: '38',
        period: "HT/mois",
        subtitle: "Numérisation étendue, réexpéditions et colis inclus",
        cta: "Choisir Premium",
        note: "Engagement de 3 mois, puis résiliation avec un préavis d’un mois",
        features: [
          { ok: true, text: "Adresse juridique officielle (siège social)" },
          { ok: true, text: "Réception et stockage du courrier" },
          { ok: true, text: "Notification email avec photo de l'enveloppe" },
          { ok: true, text: "Attestation de domiciliation" },
          { ok: true, text: "Espace client 24h/24" },
          { ok: true, text: "Retrait sur place sur rendez-vous" },
          { ok: true, text: "Numérisation : 100 plis/mois" },
          { ok: true, text: "2 réexpéditions/mois incluses (affranchissement au réel)" },
          { ok: true, text: "Colis ≤ 5 kg inclus" },
          { ok: true, text: "Contrat conforme art. R123-168 du Code de commerce" },
          { ok: true, text: "Salle de réunion réservable : 25 € HT/h, y compris pour vos assemblées générales" },
        ],
      },
    ],

    options: {
      eyebrow: 'À la carte',
      title: 'Options',
      titleHighlight: 'complémentaires',
      subtitle: 'Ajoutez des services à votre formule de base selon vos besoins.',
      items: [
        {
          icon: '📬',
          name: "Numérisation hors forfait",
          price: "0,50€",
          period: "HT/pli",
          desc: "Au-delà du quota de votre formule (Confort : 40, Premium : 100 plis/mois). Quotas non reportables, scan sous 24 h ouvrées.",
        },
        {
          icon: '📦',
          name: "Réexpédition du courrier",
          price: "3€",
          period: "HT/envoi",
          desc: "Disponible pour toutes les formules, affranchissement refacturé au réel. 2 envois/mois inclus dans Premium. (Ce n'est pas un frais de changement de siège.)",
        },
        {
          icon: '🗃️',
          name: "Réception de colis ≤ 5 kg",
          price: "3€",
          period: "HT/colis",
          desc: "Inclus dans Premium. Conservés 15 jours, puis retournés ou 2€ HT/jour. Refusés : plus de 5 kg, marchandises dangereuses ou illicites, denrées périssables, objets de valeur.",
        },
      ],
    },

    spaces: {
      eyebrow: 'Espaces professionnels',
      title: "Location d'espaces de",
      titleHighlight: 'travail',
      subtitle: 'Accédez à nos espaces pour vos réunions et rendez-vous clients, sans abonnement.',
      reserveCta: 'Réserver →',
      items: [
        {
          icon: '🤝',
          name: 'Salle de Réunion',
          prices: [
            { duration: '1 heure', amount: '25€ HT' },
            { duration: 'Demi-journée (4h)', amount: '75€ HT' },
            { duration: 'Journée complète (8h)', amount: '140€ HT' },
          ],
          features: [
            "Jusqu'à 10 personnes",
            'Vidéoprojecteur & écran',
            'WiFi fibre haut débit',
            'Café & eau offerts',
            'Accueil professionnel',
          ],
        },
        {
          icon: '💼',
          name: 'Bureau Privatif',
          prices: [
            { duration: '1 heure', amount: '25€ HT' },
            { duration: 'Demi-journée (4h)', amount: '75€ HT' },
            { duration: 'Journée complète (8h)', amount: '140€ HT' },
          ],
          features: [
            'Bureau individuel privatif',
            'Connexion WiFi incluse',
            'Environnement calme garanti',
            'Climatisé en été',
            'Imprimante disponible',
          ],
        },
      ],
    },

    faqs: {
      eyebrow: 'Questions fréquentes',
      title: 'Tout ce que vous devez',
      titleHighlight: 'savoir',
      items: [
        {
          q: "Qu'est-ce que la domiciliation d'entreprise ?",
          a: "La domiciliation consiste à fixer le siège social ou l'adresse administrative de votre entreprise à une adresse qui n'est pas nécessairement votre lieu de résidence ou de travail.",
        },
        {
          q: 'La domiciliation est-elle légale ?',
          a: "Oui, parfaitement légale en vertu de la loi Dutreil de 2003. Nous sommes un centre de domiciliation agréé, et vous pouvez utiliser notre adresse pour l'immatriculation de votre société.",
        },
        {
          q: "Où est située l'adresse ?",
          a: "Notre adresse prestigieuse est située à Toulouse, le fleuron de l'industrie aéronautique européenne.",
        },
        {
          q: 'Combien de temps pour recevoir mon attestation ?',
          a: 'Votre attestation de domiciliation est envoyée sous 24h après la signature de votre contrat en ligne.',
        },
        {
          q: 'Y a-t-il un engagement de durée ?',
          a: "Oui : la loi impose une durée minimale de 3 mois (art. R123-168 du Code de commerce). Ensuite, vous pouvez résilier depuis votre espace client avec un préavis d'un mois. Les sommes versées ne sont pas remboursées en cas de résiliation.",
        },
        {
          q: "Y a-t-il une remise en cas de paiement annuel ?",
          a: "Oui : 20 % de remise en payant à l'année, soit 153,60 € HT (Essentiel), 230,40 € HT (Confort) ou 364,80 € HT (Premium) par an.",
        },
        { q: "Y a-t-il des frais d'ouverture ?", a: "Non, aucun." },
        { q: "Quand puis-je venir chercher mon courrier ?", a: "Du lundi au vendredi, de 9h à 18h, sur rendez-vous pris par email au moins 24 h à l'avance (48 h pour un colis volumineux)." },
        { q: "Puis-je recevoir des colis ?", a: "Oui, jusqu'à 5 kg. Inclus en Premium, 3 € HT par colis sinon. Conservés 15 jours." },
        { q: "L'abonnement annuel est-il remboursable ?", a: "Non. Vos services continuent jusqu'à la fin de la période payée." },
        { q: "Comment réserver la salle de réunion ?", a: "Par email, 48 h à l'avance, au tarif de 25 € HT de l'heure. Annulation gratuite jusqu'à 24 h avant." },
        { q: "Quels documents fournir ?", a: "Pièce d'identité, justificatif de domicile, statuts ou Kbis, et la procuration La Poste dans votre espace client." },
        { q: "Quand sont facturés les extras ?", a: "Le mois suivant, détaillés ligne par ligne sur votre facture (HT, TVA et TTC)." },
        { q: "Puis-je changer de formule ?", a: "Oui, depuis votre espace client, rubrique Abonnement. Le changement est immédiat et la différence est calculée au prorata." },
      ],
    },

    trust: {
      items: [
        { icon: '🔒', text: '100% sécurisé' },
        { icon: '📄', text: 'Attestation sous 24h' },
        { icon: '✅', text: 'Conforme loi Dutreil' },
        { icon: '↩️', text: "Résiliable après 3 mois" },
      ],
      payment: 'Paiements sécurisés par Stripe',
    },

    cta: {
      title: 'Prêt à démarrer ?',
      subtitle: 'Inscrivez-vous en ligne en 5 minutes. Aucun déplacement requis.',
      primary: 'Choisir mon adresse →',
      secondary: 'Nos services',
    },
  },

  villes: {
    pageTitle: 'Notre adresse de domiciliation à Toulouse — Domiciliation Pas Cher',

    hero: {
      eyebrow: 'Présence locale',
      title: 'Notre adresse à',
      titleHighlight: 'Toulouse',
      desc: "Une adresse de siège social à Toulouse pour votre entreprise, attestation émise sous 24 h après validation de votre dossier.",
    },

    addressLabel: 'Adresse de domiciliation',

    benefits: [
      {
        title: 'Adresse officielle',
        desc: 'Adresse légalement valide pour votre immatriculation et votre Kbis.',
      },
      {
        title: 'Attestation rapide',
        desc: 'Attestation émise sous 24 h après validation de votre dossier, sans déplacement.',
      },
      {
        title: 'Courrier suivi',
        desc: "Notification par email avec photo de l'enveloppe pour chaque courrier reçu.",
      },
      {
        title: 'Prix garanti',
        desc: "Aucun frais d'ouverture de dossier, prix de l'abonnement garanti 12 mois.",
      },
    ],

    cities: [
      {
        name: 'Toulouse',
        region: 'Occitanie',
        desc: "Surnommée la « Ville rose », Toulouse est le cœur de l'industrie aéronautique européenne. Une adresse dynamique et stratégique.",
        avantages: ['Capitale aéronautique', "Bassin d'emploi tech", 'Économie dynamique'],
        zip: '31',
        priceLabel: 'À partir de',
        priceValue: '16 €',
        priceUnit: ' HT/mois',
        cta: 'Choisir Toulouse',
      },
    ],

    helpCta: {
      title: 'Une question sur notre adresse ?',
      desc: 'Nos conseillers répondent à vos questions sur la domiciliation à Toulouse et vous aident à choisir la formule adaptée.',
      button: 'Parler à un conseiller',
      trust: 'Réponse sous 1 jour ouvré',
      modalTitle: 'Parler à un conseiller',
      modalHint: 'Laissez vos coordonnées : un conseiller vous recontacte rapidement.',
      name: 'Nom complet',
      email: 'E-mail',
      phone: 'Téléphone',
      message: 'Votre message (optionnel)',
      city: 'Ville de votre entreprise (optionnel)',
      submit: 'Envoyer ma demande',
      sending: 'Envoi en cours…',
      success: 'Merci ! Nous vous recontactons très bientôt.',
      error: 'Impossible d’envoyer la demande. Réessayez ou écrivez-nous à contact@domiciliation-pas-cher.com',
      cancel: 'Annuler',
      required: 'Champ requis',
      emailInvalid: 'E-mail invalide',
    },
  },

  about: {
    pageTitle: 'À propos : notre histoire et nos valeurs — Domiciliation Pas Cher',

    hero: {
      eyebrow: 'Notre histoire',
      title: 'Votre partenaire de confiance',
      titleHighlight: 'à Toulouse',
      subtitle:
        "Domiciliation-Pas-Cher.com est née d'une conviction simple : créer une entreprise ne doit pas coûter une fortune. Nous proposons une adresse de domiciliation à Toulouse, au juste prix.",
    },

    stats: [
      { value: 'Agréé', label: 'par la préfecture' },
      { value: 'Toulouse', label: 'Adresse officielle' },
      { value: '24 h', label: 'Attestation' },
      { value: '0 €', label: "Frais d'ouverture" },
      { value: '16 €', label: 'HT/mois, à partir de' },
    ],

    mission: {
      eyebrow: 'Notre mission',
      title: 'Simplifier la création',
      titleHighlight: "d'entreprise en France",
      paragraphs: [
        "Nous croyons que chaque entrepreneur mérite une adresse professionnelle de qualité, sans se ruiner. C'est pourquoi nous avons créé une plateforme 100 % en ligne qui rend la domiciliation accessible, rapide et sans contrainte.",
        'Basés à Toulouse, nous réceptionnons votre courrier, vous le signalons dès son arrivée et le numérisons ou le réexpédions selon votre formule.',
      ],
      highlights: [
        'Centre de domiciliation agréé',
        'Conforme à la loi Dutreil 2003',
        'Prix garanti 12 mois',
        'Abonnement déductible de vos charges',
      ],
      cards: [
        '📍 Une adresse à Toulouse',
        '🇫🇷 Adresse prestigieuse',
        '⚡ Attestation sous 24 h',
      ],
    },

    values: {
      eyebrow: 'Ce qui nous définit',
      title: 'Nos',
      titleHighlight: 'valeurs',
      items: [
        {
          icon: '💡',
          title: 'Accessibilité',
          desc: 'Une domiciliation professionnelle accessible à tous les entrepreneurs, dès 16 € HT/mois.',
        },
        {
          icon: '🔒',
          title: 'Fiabilité',
          desc: 'Centre de domiciliation agréé par la préfecture, conforme aux obligations légales françaises.',
        },
        {
          icon: '⚡',
          title: 'Rapidité',
          desc: 'Inscription en ligne en 5 minutes, attestation sous 24 h. Zéro paperasse inutile.',
        },
        {
          icon: '🤝',
          title: 'Proximité',
          desc: 'Une équipe disponible et réactive pour accompagner chaque entrepreneur.',
        },
      ],
    },

    cta: {
      title: "Rejoignez notre communauté d'entrepreneurs",
      subtitle: 'Plus de 2 000 entrepreneurs nous font déjà confiance. À votre tour !',
      button: 'Démarrer maintenant →',
    },
  },

  services: {
    pageTitle: "Nos services : domiciliation, courrier et création d'entreprise — Domiciliation Pas Cher",

    header: {
      eyebrow: 'Nos services',
      title: 'Nos services adaptés à',
      titleHighlight: 'chaque étape de votre projet',
      subtitle:
        "De la domiciliation légale à l'accompagnement à la création de votre entreprise : nous vous accompagnons à chaque étape.",
      links: {
        domiciliation: 'Tout savoir sur la domiciliation',
        creation: "Tout savoir sur la création d'entreprise",
      },
    },

    domiciliation: {
      eyebrow: 'Étape par étape',
      title: 'Comment obtenir',
      titleHighlight: 'votre domiciliation ?',
      subtitle: 'Un processus simple, 100 % en ligne, conçu pour vous faire gagner du temps dès le premier jour.',
      steps: [
        {
          n: '1',
          title: 'Choisissez votre formule',
          desc: 'Essentiel, Confort ou Premium, en paiement mensuel ou annuel (−20 %). Aucun frais d’ouverture de dossier.',
          cta: { label: 'Commencer maintenant', to: '/tarifs' },
        },
        {
          n: '2',
          title: 'Complétez votre dossier',
          desc: 'Renseignez vos informations, joignez les pièces justificatives demandées, puis réglez en ligne par paiement sécurisé.',
        },
        {
          n: '3',
          title: 'Signez votre contrat',
          desc: 'Signez électroniquement votre contrat de domiciliation et complétez la procuration postale dans votre espace client.',
        },
        {
          n: '4',
          title: 'Recevez votre attestation',
          desc: "Votre attestation de domiciliation est émise sous 24 h après validation de votre dossier. Une fois votre Kbis obtenu, déposez-le dans votre espace client pour finaliser votre domiciliation.",
        },
      ],
      card: {
        title: 'Domiciliation officielle',
        subtitle: 'Adresse juridique valide pour votre Kbis',
        items: [
          'Souscription 100 % en ligne',
          'Attestation sous 24 h',
          'Centre agréé par la préfecture',
          'Résiliable après 3 mois (préavis 1 mois)',
          'Dès 16 € HT/mois',
        ],
        cta: 'Commencer maintenant →',
      },
    },

    courrier: {
      eyebrow: 'Gestion du courrier',
      title: 'Comment fonctionne',
      titleHighlight: 'le courrier ?',
      subtitle: 'Découvrez le fonctionnement de notre service courrier en 5 étapes.',
      steps: [
        { n: '1', title: 'Réception', desc: 'Nous réceptionnons votre courrier à notre adresse de Toulouse, en toute sécurité.' },
        { n: '2', title: 'Identification', desc: 'Chaque courrier est identifié et enregistré dans votre espace client.' },
        { n: '3', title: 'Notification', desc: "Vous recevez une notification par email, avec une photo de l'enveloppe, pour chaque courrier reçu." },
        { n: '4', title: 'Numérisation', desc: 'Avec les formules Confort (40 plis/mois) et Premium (100 plis/mois), votre courrier est numérisé sous 24 h ouvrées et disponible dans votre espace client.' },
        { n: '5', title: 'Réexpédition ou retrait', desc: "Sur demande, votre courrier est réexpédié à l'adresse de votre choix (3 € HT + affranchissement, 2 envois/mois inclus dans Premium) ou retiré sur place sur rendez-vous." },
      ],
      options: [
        {
          icon: '📬',
          name: 'Numérisation',
          desc: 'Incluse dans Confort (40 plis/mois) et Premium (100 plis/mois)',
          price: '0,50 €',
          period: 'HT/pli au-delà',
        },
        {
          icon: '📦',
          name: 'Réexpédition du courrier',
          desc: "Envoi à l'adresse de votre choix, affranchissement au réel (2/mois inclus dans Premium)",
          price: '3 €',
          period: 'HT/envoi',
        },
      ],
    },

    creation: {
      eyebrow: "Création d'entreprise",
      title: 'Créez votre entreprise',
      titleHighlight: 'en 5 étapes',
      subtitle: "Un accompagnement personnalisé, du premier rendez-vous à l'obtention de votre Kbis.",
      steps: [
        {
          n: '1',
          title: 'Réservez un rendez-vous offert',
          desc: 'Choisissez un créneau de 30 minutes avec un conseiller, par téléphone ou en visioconférence.',
        },
        {
          n: '2',
          title: 'Faites le point sur votre projet',
          desc: 'Statut juridique, fiscalité, rémunération : votre conseiller étudie votre projet et vous présente un chiffrage clair des démarches.',
        },
        {
          n: '3',
          title: 'Domiciliez votre future société',
          desc: "Souscrivez en ligne à la formule de votre choix. L'attestation de domiciliation, émise sous 24 h après validation de votre dossier, est indispensable à l'immatriculation.",
        },
        {
          n: '4',
          title: 'Constituez votre dossier',
          desc: "Statuts, annonce légale, dépôt au Guichet unique de l'INPI : selon l'accompagnement choisi, nous vous guidons ou prenons en charge les formalités.",
        },
        {
          n: '5',
          title: 'Finalisez votre domiciliation',
          desc: 'Une fois votre Kbis obtenu, déposez-le avec vos statuts dans votre espace client : votre domiciliation est alors complète et conforme.',
        },
      ],
      card: {
        title: 'Créez votre entreprise',
        subtitle: 'Un accompagnement de A à Z',
        items: [
          'Premier rendez-vous de 30 minutes offert',
          'Chiffrage clair avant tout engagement',
          'Accompagnement sur mesure',
        ],
        cta: 'Prendre rendez-vous →',
      },
    },

    formes: {
      eyebrow: 'Guide pratique',
      title: 'Les formes',
      titleHighlight: 'juridiques',
      subtitle: 'Vous êtes perdu(e) sur les formes juridiques ? On vous explique tout !',
      intro: 'Découvrez tout ce que vous devez savoir sur la {label} pour choisir la bonne structure pour votre projet.',
      cta: 'Domicilier ma {label} →',
      ctaNote: 'Attestation sous 24 h · Dès 16 € HT/mois',
      items: [
        {
          id: 'sasu',
          label: 'SASU',
          color: '#1A56DB',
          sections: [
            {
              title: 'Définition',
              text: "Une SASU (société par actions simplifiée unipersonnelle) est une société commerciale disposant d'une personnalité juridique propre, à la différence des entreprises individuelles.",
            },
            {
              title: 'Imposition',
              text: "Une SASU est imposée à l'IS (impôt sur les sociétés) par défaut lors de sa création. L'entrepreneur peut opter librement pour une imposition à l'IR (impôt sur le revenu) pendant 5 exercices fiscaux maximum.",
            },
            {
              title: 'Pour qui ?',
              text: "Une SASU est adaptée pour l'exercice de nombreuses activités commerciales, civiles, artisanales et agricoles. Elle est particulièrement adaptée aux entrepreneurs souhaitant exercer une activité commerciale à leur propre compte, sans s'installer en nom propre.",
            },
            {
              title: 'Avantages',
              text: "Une SASU est particulièrement simple à gérer au quotidien car toute décision ne relève que de la volonté de l'associé unique. La rédaction des statuts confère une grande liberté à l'entrepreneur pour définir l'organisation et le fonctionnement interne de l'entreprise !",
            },
            {
              title: 'Le capital',
              text: "Une SASU ne comporte qu'un seul associé et ne nécessite aucun capital social minimum en numéraire ni en nature. Au moins la moitié des apports en numéraire doivent être libérés lors de la création de la société.",
            },
          ],
        },
        {
          id: 'sarl',
          label: 'SARL',
          color: '#0EA5E9',
          sections: [
            {
              title: 'Définition',
              text: 'La SARL (société à responsabilité limitée) est une forme juridique très répandue en France. Elle peut être constituée de 2 à 100 associés dont la responsabilité est limitée au montant de leurs apports.',
            },
            {
              title: 'Imposition',
              text: "La SARL est soumise à l'IS (impôt sur les sociétés) par défaut. Sous conditions, les SARL de famille peuvent opter pour l'IR (impôt sur le revenu).",
            },
            {
              title: 'Pour qui ?',
              text: 'La SARL convient aux petites et moyennes entreprises avec plusieurs associés souhaitant encadrer strictement les droits et devoirs de chacun via les statuts et la loi.',
            },
            {
              title: 'Avantages',
              text: "Cadre juridique solide et rassurant pour les partenaires et créanciers. Les associés ne sont responsables qu'à hauteur de leurs apports. Régime social favorable pour le gérant majoritaire.",
            },
            {
              title: 'Le capital',
              text: "Pas de capital minimum légal (1 € symbolique possible). En pratique, un capital suffisant crédibilise l'entreprise auprès des banques et partenaires.",
            },
          ],
        },
        {
          id: 'eurl',
          label: 'EURL',
          color: '#10B981',
          sections: [
            {
              title: 'Définition',
              text: "L'EURL (entreprise unipersonnelle à responsabilité limitée) est une SARL ne comportant qu'un seul associé. Elle offre la protection de la responsabilité limitée à un entrepreneur individuel.",
            },
            {
              title: 'Imposition',
              text: "L'EURL est imposée par défaut à l'IR (impôt sur le revenu) si l'associé unique est une personne physique. Elle peut opter pour l'IS sur option.",
            },
            {
              title: 'Pour qui ?',
              text: "Idéale pour les entrepreneurs souhaitant exercer seuls tout en protégeant leur patrimoine personnel, avec un cadre juridique plus structuré qu'une entreprise individuelle.",
            },
            {
              title: 'Avantages',
              text: "Protection du patrimoine personnel, possibilité d'évoluer vers une SARL en cas d'entrée d'associés, statut social du gérant, crédibilité auprès des partenaires.",
            },
            {
              title: 'Le capital',
              text: "Aucun capital minimum légal requis. Un capital adapté à l'activité est cependant recommandé pour rassurer les partenaires commerciaux et bancaires.",
            },
          ],
        },
        {
          id: 'ei',
          label: 'Auto-entrepreneur / EI',
          color: '#F59E0B',
          sections: [
            {
              title: 'Définition',
              text: "L'entreprise individuelle (EI) est la forme la plus simple pour exercer une activité en son nom propre. Depuis 2022, le statut unique protège le patrimoine personnel de l'entrepreneur.",
            },
            {
              title: 'Imposition',
              text: "L'EI est imposée à l'IR (impôt sur le revenu) dans la catégorie BIC, BNC ou BA selon l'activité. L'option pour l'IS est possible sous conditions.",
            },
            {
              title: 'Pour qui ?',
              text: 'Idéale pour démarrer rapidement une activité sans formalités complexes. Recommandée pour les activités à faible risque financier et les auto-entrepreneurs.',
            },
            {
              title: 'Avantages',
              text: 'Création rapide et peu coûteuse, gestion administrative simplifiée, aucune obligation de capital. Depuis 2022, le patrimoine personnel est protégé par défaut.',
            },
            {
              title: 'Le capital',
              text: "Aucun capital requis. L'entrepreneur engage ses apports personnels dans l'activité, mais son patrimoine personnel est désormais protégé grâce à la réforme de 2022.",
            },
          ],
        },
        {
          id: 'sas',
          label: 'SAS',
          color: '#8B5CF6',
          sections: [
            {
              title: 'Définition',
              text: "La SAS (société par actions simplifiée) est une société commerciale qui offre une grande souplesse aux associés. Elle doit être constituée d'au moins deux associés.",
            },
            {
              title: 'Imposition',
              text: "La SAS est soumise par défaut à l'IS (impôt sur les sociétés). Elle peut opter pour l'IR sous certaines conditions (pour une durée de 5 ans maximum).",
            },
            {
              title: 'Pour qui ?',
              text: "Elle est idéale pour les projets ambitieux, les startups ou les entreprises prévoyant d'accueillir des investisseurs, grâce à la flexibilité de ses statuts.",
            },
            {
              title: 'Avantages',
              text: "Une très grande liberté statutaire qui permet d'organiser la gouvernance sur mesure. Le dirigeant (Président) bénéficie du statut d'assimilé salarié, offrant une meilleure protection sociale.",
            },
            {
              title: 'Le capital',
              text: "Aucun capital social minimum n'est exigé, 1 € symbolique suffit pour la constituer. Le capital peut être variable et composé d'apports en numéraire ou en nature.",
            },
          ],
        },
        {
          id: 'sci',
          label: 'SCI',
          color: '#EC4899',
          sections: [
            {
              title: 'Définition',
              text: 'La SCI (société civile immobilière) est une société civile permettant à plusieurs personnes de détenir, gérer et transmettre un patrimoine immobilier commun.',
            },
            {
              title: 'Imposition',
              text: "Par défaut, la SCI est transparente fiscalement et soumise à l'IR au niveau des associés. Elle peut opter pour l'IS selon la stratégie fiscale souhaitée.",
            },
            {
              title: 'Pour qui ?',
              text: "Parfaite pour les familles souhaitant gérer un patrimoine immobilier ensemble ou pour les entrepreneurs séparant leur immobilier d'entreprise de leur activité commerciale.",
            },
            {
              title: 'Avantages',
              text: "Facilite la gestion et la transmission progressive d'un patrimoine immobilier, notamment par donation de parts. Permet d'éviter la situation d'indivision et ses blocages.",
            },
            {
              title: 'Le capital',
              text: "Capital libre, constitué d'apports en numéraire ou en nature (biens immobiliers). Aucun montant minimum n'est imposé par la loi.",
            },
          ],
        },
        {
          id: 'association',
          label: 'Association',
          color: '#F97316',
          sections: [
            {
              title: 'Définition',
              text: "Une association loi 1901 est le groupement d'au moins deux personnes qui mettent en commun leurs connaissances ou leur activité dans un but autre que de partager des bénéfices.",
            },
            {
              title: 'Imposition',
              text: "En principe, l'association n'est pas soumise aux impôts commerciaux (IS, TVA, CET) si sa gestion est désintéressée et qu'elle ne concurrence pas le secteur privé.",
            },
            {
              title: 'Pour qui ?',
              text: 'Pour les projets à but non lucratif : clubs sportifs, activités culturelles, actions caritatives, syndicats ou rassemblements de professionnels.',
            },
            {
              title: 'Avantages',
              text: 'Simplicité de création et de fonctionnement. Possibilité de recevoir des dons, des cotisations et des subventions publiques. Cadre très souple.',
            },
            {
              title: 'Le capital',
              text: "Pas de capital social. L'association fonctionne avec les cotisations de ses membres, des dons, des subventions et les revenus de ses éventuelles activités.",
            },
          ],
        },
      ],
    },

    faqs: {
      eyebrow: 'Questions fréquentes',
      title: 'Vos questions,',
      titleHighlight: 'nos réponses',
      items: [
        {
          q: 'Puis-je commencer ma domiciliation sans avoir créé ma société au préalable ?',
          a: "Oui. Il suffit de renseigner la forme juridique envisagée dans le formulaire d'inscription et de fournir votre projet de statuts. Une fois la société immatriculée, déposez dans votre espace client un exemplaire des statuts déposés au greffe et votre Kbis.",
        },
        {
          q: 'Est-il possible de changer le nom de ma société ?',
          a: "Oui. Une entreprise individuelle ou une société peut changer de dénomination ou de nom commercial à tout moment, selon une procédure encadrée par la loi. Pour actualiser votre attestation de domiciliation, indiquez le changement de nom dans votre espace client et joignez les statuts et l'extrait Kbis mis à jour.",
        },
        {
          q: 'Comment fonctionne la gestion de mon courrier ?',
          a: "Vous recevez une notification par email avec une photo de l'enveloppe pour chaque courrier reçu. Avec les formules Confort et Premium, votre courrier est numérisé (40 ou 100 plis/mois) et consultable dans votre espace client. Le courrier physique peut être retiré sur place sur rendez-vous ou réexpédié à l'adresse de votre choix (3 € HT + affranchissement, 2 envois/mois inclus dans Premium).",
        },
        {
          q: 'Est-il possible de réserver une salle de réunion ?',
          a: "Oui. Notre salle de réunion à Toulouse se réserve à l'heure (25 € HT), à la demi-journée ou à la journée, y compris pour vos assemblées générales. Réservez au moins 48 h à l'avance, depuis votre espace client ou par email à contact@domiciliation-pas-cher.com.",
        },
      ],
    },

    cta: {
      title: "Démarrez votre domiciliation dès aujourd'hui",
      subtitle: 'Souscription en ligne · Attestation sous 24 h · Dès 16 € HT/mois',
      primary: 'Voir les tarifs →',
      secondary: 'En savoir plus sur nous →',
    },
  },

  fichesPratiques: {
    pageTitle: 'Fiches pratiques : guides pour entrepreneurs — Domiciliation Pas Cher',
    eyebrow: 'Centre de ressources',
    title: 'Fiches',
    titleHighlight: 'pratiques',
    subtitle: 'Tout ce dont vous avez besoin pour créer, gérer et développer votre entreprise sereinement.',
    cta: {
      title: 'Prêt à lancer votre activité ?',
      subtitle: 'Rejoignez les plus de 2 000 entrepreneurs qui nous confient leur domiciliation.',
      button: 'Découvrir nos offres',
    },
    backLink: 'Retour aux fiches pratiques',
    expertTip: '💡 Conseil d\'expert',
    expertTipText: "N'attendez pas d'être submergé pour structurer vos démarches. Une bonne domiciliation est le socle d'une entreprise solide et crédible face au marché.",
    genericContent: "L'entrepreneuriat est un parcours exigeant mais passionnant. Chez Domiciliation Pas Cher, notre mission est de vous simplifier la vie administrative pour que vous puissiez vous concentrer sur ce qui compte vraiment : votre croissance.",
    genericContent2: "Chaque situation étant unique, nous vous recommandons de vous faire accompagner par un professionnel (expert-comptable, avocat) pour les décisions propres à votre structure juridique. Pour toute question sur votre domiciliation, notre équipe est à votre écoute.",
    sidebar: {
      needHelp: 'Besoin d\'aide ?',
      helpDesc: 'Nos conseillers vous accompagnent dans toutes vos démarches de domiciliation.',
      helpCta: 'Voir nos offres',
      similarArticles: 'Articles similaires',
    },
    fiches: {
      'fiscalite-et-imposition': {
        title: 'Fiscalité et imposition : comprendre les bases',
        category: 'Gérer son entreprise',
        content: "La fiscalité est un pilier de la gestion d'entreprise. Entre l'impôt sur les sociétés (IS) et l'impôt sur le revenu (IR), le choix impacte directement votre trésorerie. Les points clés à connaître : seuils de TVA, crédits d'impôt et obligations déclaratives annuelles, pour rester en règle avec l'administration fiscale.",
        icon: '📊'
      },
      'transfert-de-siege-social': {
        title: 'Transférer son siège social : la marche à suivre',
        category: 'Gérer son entreprise',
        content: "Transférer votre siège social nécessite une procédure rigoureuse : décision des associés, modification des statuts, publication d'une annonce légale et dépôt du dossier au Guichet unique. Bien préparé, le transfert se fait sans interrompre votre activité.",
        icon: '🏢'
      },
      'gouvernance': {
        title: 'La gouvernance : bien organiser les décisions de votre société',
        category: 'Gérer son entreprise',
        content: "La gouvernance définit la répartition des pouvoirs au sein de votre société. Que vous soyez en SAS ou en SARL, la structuration des décisions (présidence, gérance, assemblées) est essentielle à la pérennité et à la transparence de votre entreprise, notamment face aux investisseurs.",
        icon: '⚖️'
      },
      'services-aux-entreprises': {
        title: 'Les services essentiels pour gagner en productivité',
        category: 'Gérer son entreprise',
        content: "Domiciliation, logiciels de gestion, stockage en ligne ou assistance juridique : les services aux entreprises permettent de déléguer les tâches chronophages. Tour d'horizon des services qui vous aident à vous concentrer sur votre cœur de métier.",
        icon: '🛠️'
      },
      'pieges-et-astuces-gestion': {
        title: 'Gestion : évitez les pièges classiques et gagnez du temps',
        category: 'Gérer son entreprise',
        content: "Négliger le suivi de trésorerie ou rater une échéance Urssaf peut coûter cher. Automatisez vos rappels de facturation et structurez vos tableaux de bord dès le premier jour pour une gestion saine et sereine.",
        icon: '🚩'
      },
      'reformes-legales': {
        title: 'Réformes légales : ce qui change pour vous',
        category: 'Actualités',
        content: "Loi de finances, facturation électronique, évolution des seuils des régimes micro : l'environnement législatif bouge. Restez informé pour anticiper les impacts sur votre structure et bénéficier des aides disponibles.",
        icon: '📜'
      },
      'podcast': {
        title: "Paroles d'entrepreneurs : s'inspirer des parcours de créateurs",
        category: 'Actualités',
        content: "Podcasts, témoignages, retours d'expérience : écouter ceux qui sont passés par là reste l'un des meilleurs moyens d'apprendre. Comment tirer parti de ces récits pour éviter les erreurs les plus fréquentes et nourrir votre propre projet.",
        icon: '🎙️'
      },
      'entrepreneuriat': {
        title: "L'entrepreneuriat en France : état des lieux",
        category: 'Actualités',
        content: "Malgré un contexte économique exigeant, la création d'entreprise reste très dynamique en France. Tendances par secteur, profil des nouveaux créateurs et opportunités de croissance, de l'économie circulaire à l'intelligence artificielle.",
        icon: '🚀'
      },
      'tech': {
        title: 'Tech et innovation : les outils indispensables',
        category: 'Actualités',
        content: "De l'automatisation à la cybersécurité, la technologie est votre meilleure alliée. Les outils en ligne incontournables pour sécuriser vos données et faire évoluer votre activité.",
        icon: '💻'
      },
      'les-adresses': {
        title: 'Choisir son adresse : image et stratégie',
        category: 'Domiciliation',
        content: "L'adresse de votre siège social est la vitrine de votre entreprise. Comment le choix de l'adresse influence votre image, et pourquoi une adresse à Toulouse, dès 16 € HT/mois, peut être un atout.",
        icon: '📍'
      },
      'gestion-du-courrier': {
        title: 'Gestion du courrier : rapidité et confidentialité',
        category: 'Domiciliation',
        content: "Notification avec photo de l'enveloppe, numérisation, réexpédition ou retrait sur place : comment votre courrier est traité, et quelle formule choisir selon le volume que vous recevez.",
        icon: '✉️'
      },
      'pieges-et-astuces-domiciliation': {
        title: 'Domiciliation : les erreurs à ne pas commettre',
        category: 'Domiciliation',
        content: "Vérifiez toujours l'agrément préfectoral de votre domiciliataire. Cette fiche vous aide à repérer les offres trop belles pour être vraies et à lire attentivement les clauses d'un contrat de domiciliation.",
        icon: '🔍'
      },
      'tout-savoir-sur-la-domiciliation': {
        title: 'Le guide complet de la domiciliation commerciale',
        category: 'Domiciliation',
        content: "Pourquoi se domicilier ? Quelles sont les obligations du domiciliataire et du domicilié ? Les réponses aux questions essentielles, de l'immatriculation au Kbis jusqu'à la tenue des assemblées générales.",
        icon: '📘'
      },
      'formes-juridiques': {
        title: 'SASU, EURL, SARL : quelle forme juridique choisir ?',
        category: 'Créer une entreprise',
        content: "Le choix du statut juridique est la première décision stratégique du créateur. Protection du patrimoine, régime social du dirigeant et souplesse statutaire : les critères pour faire le bon choix selon votre projet.",
        icon: '📋'
      },
      'aides-a-la-creation': {
        title: 'Les aides à la création : ARCE, ACRE et financements',
        category: 'Créer une entreprise',
        content: "Saviez-vous que vous pouvez bénéficier d'exonérations de charges ou d'un capital de départ via France Travail ? Tour d'horizon des dispositifs d'aide à la création et des subventions régionales.",
        icon: '🎁'
      },
      'les-administrations': {
        title: "Guichet unique et INPI : s'y retrouver dans l'administration",
        category: 'Créer une entreprise',
        content: "Depuis 2023, les formalités d'entreprise passent par le Guichet unique de l'INPI. Préparez vos pièces justificatives pour éviter les rejets de dossier et obtenir votre SIRET rapidement.",
        icon: '🏛️'
      },
      'pieges-et-astuces-creation': {
        title: 'Création : astuces pour un lancement réussi',
        category: 'Créer une entreprise',
        content: "Ne confondez pas chiffre d'affaires et bénéfice ! Quelques conseils pour bien rédiger vos statuts et choisir la date de clôture d'exercice la plus adaptée à votre activité.",
        icon: '💡'
      },
      'la-creation-d-entreprise': {
        title: "Lancer son projet : de l'idée au premier client",
        category: 'Créer une entreprise',
        content: "Créer son entreprise est un marathon. Validation du marché, premier business plan, premiers clients : les étapes pour transformer votre idée en une entreprise rentable.",
        icon: '🏁'
      },
      'auto-entrepreneur-astuces-impot': {
        title: "Auto-entrepreneur : les 5 astuces pour payer moins d'impôt",
        category: 'Sélection du mois',
        content: "Versement libératoire, abattement forfaitaire, seuils de franchise de TVA : 5 leviers concrets pour optimiser légalement la fiscalité de votre micro-entreprise.",
        icon: '💰'
      },
      'qu-est-ce-que-la-domiciliation': {
        title: "Qu'est-ce que la domiciliation ? Définition simple",
        category: 'Sélection du mois',
        content: "La domiciliation permet de séparer vie privée et vie professionnelle. Pourquoi de nombreux créateurs choisissent un centre de domiciliation agréé pour leur siège social.",
        icon: '❓'
      },
      'cout-gestion-comptabilite': {
        title: 'Combien coûte réellement la gestion de votre comptabilité ?',
        category: 'Sélection du mois',
        content: "Expert-comptable traditionnel ou logiciel en ligne ? Comparaison des coûts selon votre volume de factures et vos besoins de conseil.",
        icon: '💸'
      },
      'creer-entreprise-en-ligne': {
        title: 'Comment créer son entreprise en ligne ?',
        category: 'Sélection du mois',
        content: "Fini les formulaires papier : les formalités de création se font en ligne, sur le Guichet unique de l'INPI. Les étapes à suivre et les points à vérifier pour rester serein sur la conformité juridique.",
        icon: '🖱️'
      },
    },
  },
  souscription: {
  "back": "Retour",
  "prevStep": "Étape précédente",
  "chosenPlan": "Forfait choisi",
  "secureForm": "Formulaire sécurisé SSL",
  "step1ofN": "Étape 1 sur",
  "project": {
    "title": "Quel est votre projet ?",
    "subtitle": "Sélectionnez la situation qui correspond à votre cas",
    "creation": "Création d'entreprise (Consultation)",
    "transfer": "Je transfère mon siège social",
    "legalForm": "Forme juridique"
  },
  "contact": {
    "title": "Vos coordonnées",
    "subtitle": "Informations du représentant légal",
    "lastName": "Nom",
    "firstName": "Prénom",
    "email": "Email",
    "phone": "Téléphone",
    "birthDate": "Date de naissance",
    "birthPlace": "Lieu de naissance",
    "personalAddress": "Adresse personnelle"
  },
  "company": {
    "title": "Votre entreprise",
    "subtitle": "Informations sur votre société",
    "companyName": "Nom de la société",
    "siren": "SIREN (optionnel)",
    "activity": "Activité principale",
    "nationality": "Nationalité",
    "quality": "Qualité"
  },
  "domiciliation": {
    "title": "Choix de l'adresse",
    "subtitle": "Sélectionnez la ville pour votre domiciliation"
  },
  "documents": {
    "title": "Pièces justificatives",
    "subtitle": "Téléchargez vos documents pour finaliser votre dossier",
    "idCard": "Pièce d'identité (Recto/Verso)",
    "proofOfAddress": "Justificatif de domicile (- 3 mois)"
  },
  "summary": {
    "title": "Récapitulatif & Demande",
    "subtitle": "Vérifiez vos informations avant de confirmer",
    "plan": "Forfait",
    "paymentFrequency": "Fréquence de paiement",
    "monthly": "Mensuel",
    "annual": "Annuel (-20 %)",
    "total": "Total",
    "acceptCgv": "J'accepte les Conditions Générales de Vente",
    "submitCreation": "Confirmer la demande de RDV ->",
    "submitPayment": "Payer {price} de façon sécurisée ->",
    "processing": "Traitement en cours...",
    "needCgv": "Acceptez les CGV pour continuer"
  }
},
  creation: {
    badge: '✨ Conseil et accompagnement',
    title: 'Créer ou se faire conseiller :',
    titleHighlight: 'on vous accompagne',
    subtitle: "Deux accompagnements pour bien démarrer votre société. Choisissez le vôtre et réservez un échange de 30 minutes avec un conseiller.",
    cardCta: 'Prendre rendez-vous',
    cards: [
      {
        id: 'creation',
        title: "Création d'entreprise",
        desc: 'Nous montons votre société de A à Z et déposons votre dossier au Guichet unique.',
        features: [
          'Rédaction sur mesure des statuts',
          'Accompagnement au dépôt du capital',
          "Publication de l'annonce légale",
          'Immatriculation et obtention du Kbis',
        ],
        tag: '📋 Formalités prises en charge',
      },
      {
        id: 'conseil',
        featured: true,
        badge: 'Idéal pour démarrer',
        title: 'Conseil en création',
        desc: 'Un conseiller analyse votre projet et vous oriente vers la structure la plus adaptée.',
        features: [
          'Choix du statut : SASU, SAS, SARL, EURL…',
          'Optimisation fiscale et sociale du dirigeant',
          'Simulation de votre rémunération nette',
          'Feuille de route et budget détaillés',
        ],
        tag: '🎁 Premier échange offert',
      },
    ],
    reassurance: [
      '30 minutes offertes',
      'Visioconférence ou téléphone',
      'Sans engagement',
      'Conseiller dédié',
    ],
  },

  rendezVous: {
    pageTitle: "Prendre rendez-vous : création d'entreprise — Domiciliation Pas Cher",
    eyebrow: 'Rendez-vous conseil',
    title: 'Réservez votre créneau',
    titleHighlight: 'de 30 minutes',
    subtitle: "Choisissez la date et l'heure qui vous conviennent. Un conseiller étudie avec vous votre projet de création d'entreprise.",
    benefits: [
      { icon: '🎯', title: 'Diagnostic personnalisé', desc: 'Le statut juridique le plus adapté à votre activité.' },
      { icon: '💰', title: 'Chiffrage transparent', desc: 'Le coût réel de votre création, sans frais cachés.' },
      { icon: '🚀', title: "Plan d'action clair", desc: 'Les étapes et délais pour obtenir votre Kbis.' },
    ],
    loading: 'Chargement du calendrier…',
    errorTitle: 'Prise de rendez-vous en ligne indisponible',
    errorBody: 'Le calendrier en ligne ne peut pas être affiché pour le moment. Appelez-nous ou écrivez-nous : nous vous proposerons un créneau.',
    contactCta: 'Écrire à contact@domiciliation-pas-cher.com',
    openCalendly: 'Ouvrir le calendrier dans un nouvel onglet',
    backLink: 'Retour aux tarifs',
  },

  seo: {
    home: { description: "Domiciliation d'entreprise à Toulouse dès 16 € HT/mois : adresse de siège social officielle, centre agréé, attestation sous 24 h, gestion du courrier et souscription 100 % en ligne." },
    tarifs: { description: "Comparez nos formules de domiciliation à Toulouse : Essentiel, Confort et Premium. Prix transparents dès 16 € HT/mois, −20 % en paiement annuel, sans frais d'ouverture." },
    villes: { description: "Domiciliez votre entreprise au 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse : une adresse officielle pour votre Kbis, vos banques et vos clients." },
    services: { description: "Domiciliation, notification et numérisation du courrier, réexpédition, salle de réunion et accompagnement à la création d'entreprise : tous nos services à Toulouse." },
    about: { description: "Découvrez Domiciliation Pas Cher : centre de domiciliation agréé à Toulouse, nos valeurs et notre engagement pour une domiciliation simple, fiable et accessible." },
    rendezVous: { description: "Réservez un rendez-vous gratuit de 30 minutes avec un conseiller pour votre création d'entreprise : choix du statut juridique, chiffrage transparent et plan d'action jusqu'au Kbis." },
    fichesPratiques: { description: "Fiches pratiques pour entrepreneurs : fiscalité, transfert de siège social, gouvernance, domiciliation, création d'entreprise et actualités légales." },
  },

  promoBanner: {
    ariaLabel: "Offre en cours",
    desktop: "-20 % sur tous les abonnements en paiement annuel",
    mobile: "-20 % en paiement annuel",
    cta: "Voir les offres",
    close: "Fermer le bandeau",
  },

  cookieConsent: {
    ariaLabel: "Gestion des cookies",
    title: "Votre vie privée compte",
    text: "Nous utilisons des cookies de mesure d’audience et publicitaires (Google) uniquement avec votre accord. Vous pouvez accepter ou refuser, et modifier votre choix à tout moment via « Gérer les cookies » en bas de page.",
    textShort: "Cookies Google (audience et publicité) uniquement avec votre accord, modifiable en bas de page.",
    learnMore: "En savoir plus",
    accept: "Tout accepter",
    refuse: "Tout refuser",
  },

  espaceClient: espaceClient('fr'),
};
