export default {
  common: {
    loading: 'Chargement...',
    backToTop: 'Retour en haut',
  },

  nav: {
    links: {
      home: 'Accueil',
      services: 'Services',
      tarifs: 'Tarifs',
      villes: 'Adresses',
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
      podcast: 'Podcast',
      entrepreneuriat: 'Entrepreneuriat',
      seDomicilier: 'SeDomicilier',
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
      autoEntrepreneurAstuces: "Auto-entrepreneur : les 5 astuces pour payer moins d'impôt",
      questCeDomiciliation: "Qu'est-ce que la domiciliation ?",
      coutComptabilite: 'Combien coûte la gestion de votre comptabilité ?',
      creerEntrepriseEnLigne: 'Comment créer son entreprise en ligne ?',
      pourquoiDomicilierIdf: 'Pourquoi domicilier son entreprise en IDF ?',
    },
    signIn: 'Se connecter',
    dashboard: 'ACCÈS ESPACE',
    dashboardMobile: 'Mon espace client',
    cta: 'Démarrer →',
    mobileCta: 'Domicilier mon entreprise',
    menuAria: 'Menu',
  },

  footer: {
    desc: 'La solution de domiciliation la plus compétitive de France. Basés à Toulouse, nous accompagnons les entrepreneurs avec une adresse prestigieuse.',
    stats: {
      entreprises: { value: '+3 000', label: 'Entreprises' },
      creations: { value: '+50', label: 'Créations/semaine' },
    },
    columns: {
      services: {
        title: 'Nos Services',
        links: [
          'Domiciliation commerciale',
          'Gestion du courrier',
          'Scan & numérisation',
          'Salle de réunion',
          'Location de bureau',
        ],
      },
      villes: {
        title: 'Nos Villes',
        cities: ['Toulouse'],
      },
    },
    contact: {
      title: 'Contact',
      address: '150 Rue Nicolas Louis Vauquelin\n3ème étage, Lot 308\n31100 Toulouse',
      phone: '+33 7 45 04 00 26',
      email: 'contact@domiciliation-pas-cher.com',
    },
    cta: {
      text: 'Prêt à vous lancer ?',
      button: 'Voir les tarifs',
    },
    legal: {
      mentionsLegales: 'Mentions légales',
      cgv: 'CGV',
      confidentialite: 'Politique de confidentialité',
    },
    copyright: '© {year} Domiciliation-Pas-Cher.com — Tous droits réservés',
    credits: 'Réalisé par microdidact',
  },

  home: {
    pageTitle: "Domiciliation d'entreprise pas chère — Dès 20€ HT/mois — Domiciliation-Pas-Cher.com",

    hero: {
      title: 'Domiciliez votre entreprise',
      titleHighlight: 'à Toulouse dès 20€ HT/mois',
      subtitle: 'Obtenez une adresse juridique officielle à Toulouse. Inscription 100 % en ligne, attestation émise sous 24 h.',
      ctaPrimary: 'Commencer maintenant',
      ctaSecondary: 'Découvrir nos services',
    },

    guarantees: [
      'Sans engagement',
      '100 % légal',
      'Attestation 24h',
      'Déductible fiscalement',
    ],

    heroCard: {
      title: 'Votre adresse professionnelle',
      subtitle: 'Activée sous 24 heures',
      badge: 'Actif',
      cities: ['Toulouse'],
      priceLabel: 'À partir de',
      priceValue: '20',
      priceUnit: '€ HT/mois',
      float1: {
        title: "Durée d'inscription",
        value: 'Moins de 5 minutes',
      },
      float2: {
        title: 'Conforme',
        value: 'Loi Dutreil 2003',
      },
      socialProof: '+3 000',
      socialProofText: 'entrepreneurs nous font confiance',
    },

    trustBar: {
      label: 'Reconnu et certifié',
      items: ['Centre agréé', 'Loi Dutreil 2003', '100 % légal', 'Eligible ACRE', 'Charge déductible'],
    },

    stats: [
      { prefix: '+', target: 3000, suffix: '', label: 'Entreprises domiciliées' },
      { prefix: '+', target: 50, suffix: '', label: 'Nouvelles créations / semaine' },
      { prefix: '', target: 1, suffix: '', label: 'Métropole française' },
      { prefix: '', target: 20, suffix: '€', label: 'HT / mois seulement' },
    ],

    features: {
      eyebrow: 'Nos prestations',
      title: 'Une solution complète',
      titleHighlight: 'pour votre entreprise',
      subtitle: "De la domiciliation légale à la location d'espaces professionnels — tout ce dont vous avez besoin, au meilleur prix.",
      items: [
        {
          title: 'Adresse juridique officielle',
          desc: 'Une adresse de siège social valide dans la ville de votre choix, utilisable sur votre Kbis et tous vos documents officiels.',
        },
        {
          title: 'Gestion du courrier',
          desc: 'Réception, tri et notification de chaque courrier reçu. Consultez vos lettres scannées depuis votre espace client sécurisé.',
        },
        {
          title: 'Salle de réunion',
          desc: 'Espace professionnel équipé (vidéoprojecteur, WiFi fibre, café) pour accueillir vos clients et partenaires dans les meilleures conditions.',
        },
        {
          title: 'Location de bureau',
          desc: 'Bureau privatif calme à la demi-journée ou à la journée. WiFi inclus, sans engagement de durée.',
        },
        {
          title: 'Centre agréé loi Dutreil',
          desc: 'Domiciliation 100% conforme au cadre légal français. Centre officiellement agréé, tous vos droits sont garantis.',
        },
        {
          title: 'Attestation sous 24h',
          desc: 'Souscription 100% en ligne en moins de 5 minutes. Votre attestation de domiciliation est émise sous 24 heures ouvrées.',
        },
      ],
      extraServicesTitle: 'Nos services complémentaires',
    },

    extraServices: [
      { label: 'Assistance juridique' },
      { label: 'Salles de réunion' },
      { label: 'Standard téléphonique' },
      { label: 'Accès offres partenaires' },
    ],

    steps: {
      eyebrow: 'Processus simplifié',
      title: 'Domiciliez-vous',
      titleHighlight: 'en 4 étapes',
      subtitle: 'Un parcours 100 % en ligne, pensé pour vous faire gagner du temps dès le premier jour.',
      items: [
        {
          n: '01',
          tag: 'Choix libre',
          title: 'Choisissez votre adresse',
          desc: 'Sélectionnez la ville et la formule adaptés à votre activité parmi nos 10 métropoles.',
        },
        {
          n: '02',
          tag: '100% Digital',
          title: 'Complétez votre dossier',
          desc: 'Renseignez votre formulaire en ligne et téléchargez vos pièces justificatives en quelques secondes.',
        },
        {
          n: '03',
          tag: 'Légal & Sûr',
          title: 'Signez votre contrat',
          desc: 'Signez électroniquement votre contrat conforme à la loi Dutreil, sans aucun déplacement.',
        },
        {
          n: '04',
          tag: 'Prêt en 24h',
          title: 'Recevez votre attestation',
          desc: 'Votre attestation officielle est émise sous 24h, prête pour votre immatriculation immédiate.',
        },
      ],
    },

    pricing: {
      eyebrow: 'Tarification transparente',
      title: 'La domiciliation',
      titleHighlight: 'la plus compétitive',
      desc: 'Pas de frais cachés, pas de mauvaise surprise.',
      descHighlight: 'À partir de 20 € HT/mois',
      descSuffix: ', résiliable à tout moment.',
      cta: 'Découvrir toutes nos offres',
      trust: ['Sans engagement', 'Activation sous 24h', 'Satisfait ou remboursé'],
      plans: [
        {
          name: 'Essentiel',
          price: '20',
          period: '€ HT / mois',
          desc: 'Idéal pour le lancement de votre activité.',
          features: [
            { text: 'Adresse juridique officielle', bold: true },
            'Réception du courrier simple',
            'Attestation de domiciliation immédiate',
            'Espace client 100% sécurisé',
          ],
        },
        {
          name: 'Scan+',
          badge: 'Le plus populaire',
          price: '24',
          period: '€ HT / mois',
          desc: 'Gérez tout en ligne, où que vous soyez.',
          features: [
            "Tout l'offre Essentiel",
            { text: 'Scan numérique', bold: true, suffix: ' quotidien' },
            'Notification en temps réel',
            'Archivage à vie des scans',
          ],
          cta: 'Commencer ici',
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
      eyebrow: 'Avis clients',
      title: 'Ils nous font confiance',
      subtitle: 'Plus de 3 000 entrepreneurs ont choisi Domiciliation-Pas-Cher.com pour leur adresse professionnelle.',
      items: [
        {
          name: 'Marie L.',
          role: 'Consultante indépendante',
          city: 'Lyon',
          rating: 5,
          text: "Service impeccable, tarif imbattable. J'ai pu immatriculer ma société en 24h. Je recommande vivement !",
        },
        {
          name: 'Thomas B.',
          role: 'Fondateur startup',
          city: 'Paris',
          rating: 5,
          text: 'La domiciliation avec scan est idéale pour moi qui suis souvent en déplacement. Tout est géré en ligne, zéro stress.',
        },
        {
          name: 'Sophie M.',
          role: 'Auto-entrepreneuse',
          city: 'Marseille',
          rating: 5,
          text: 'Ultra simple à mettre en place. Le support répond rapidement et avec professionnalisme. Très bonne expérience.',
        },
      ],
      platforms: [
        { name: 'Trustpilot', score: '4.8 / 5' },
        { name: 'Google Avis', score: '4.7 / 5' },
        { name: 'Avis Vérifiés', score: '4.6 / 5' },
      ],
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
          a: 'Votre attestation de domiciliation vous est envoyée sous 24h ouvrées après la signature électronique de votre contrat en ligne.',
        },
        {
          q: 'La domiciliation est-elle légale ?',
          a: 'Oui, totalement. Nous sommes un centre de domiciliation officiellement agréé, conforme à la loi Dutreil du 1er août 2003 et à toutes les obligations légales françaises.',
        },
        {
          q: "Puis-je changer d'adresse ou résilier ?",
          a: 'Oui. Vous pouvez changer de ville ou résilier votre contrat à tout moment, sans frais. Un simple préavis d\'un mois suffit.',
        },
        {
          q: 'Quels documents sont nécessaires ?',
          a: "Une pièce d'identité en cours de validité et un justificatif de domicile à votre nom. Tout se fait en ligne, aucun déplacement requis.",
        },
        {
          q: 'Comment fonctionne la gestion du courrier ?',
          a: 'Nous réceptionnons tous vos courriers, vous notifions par email à chaque arrivée et mettons à disposition un scan numérique en option (+5€/mois).',
        },
      ],
    },

    finalCta: {
      title: 'Prêt à franchir le pas ?',
      subtitle: 'Rejoignez plus de 3 000 entrepreneurs. Démarrez en 5 minutes, dès 20 € HT/mois.',
      ctaPrimary: 'Commencer maintenant',
      ctaSecondary: 'Découvrir nos services →',
      badges: ['Sans engagement', 'Attestation 24h', 'Support réactif', '100 % légal'],
    },

    successModal: {
      title: 'Paiement Réussi !',
      subtitle: 'Adresse Réservée avec Succès',
      warningTitle: '⚠️ ACTION OBLIGATOIRE ET IMMÉDIATE',
      warningText:
        "Pour obtenir votre attestation de domiciliation officielle (indispensable pour l'immatriculation au Greffe de votre entreprise) et activer le renvoi/scan de vos courriers, vous devez obligatoirement configurer votre Espace Client Sécurisé dès maintenant.",
      info: 'Cette étape ne prend que 30 secondes et permet de lier de manière définitive votre paiement à votre compte utilisateur légal.',
      cta: '👉 Créer mon Espace Sécurisé (Étape Suivante)',
    },
  },

  tarifs: {
    pageTitle: 'Tarifs Domiciliation — À partir de 20€ HT/mois — DomiciliationPasCher',

    header: {
      eyebrow: 'Tarifs transparents',
      title: 'Des prix clairs,',
      titleHighlight: 'sans mauvaise surprise',
      subtitle: 'Choisissez la formule adaptée à vos besoins. Engagement mensuel, résiliable à tout moment.',
    },

    plans: [
      {
        id: 'essentiel',
        popular: false,
        name: 'Essentiel',
        price: '20',
        period: 'HT/mois',
        subtitle: 'La domiciliation simple et efficace',
        cta: 'Choisir Essentiel',
        note: 'Sans engagement · Résiliation à tout moment',
        features: [
          { ok: true, text: 'Adresse juridique officielle' },
          { ok: true, text: 'Réception du courrier' },
          { ok: true, text: "Notification d'arrivée par email" },
          { ok: true, text: 'Attestation de domiciliation' },
          { ok: true, text: 'Espace client 24h/24' },
          { ok: true, text: 'Contrat legale conforme Dutreil' },
          { ok: false, text: 'Scan des courriers' },
          { ok: false, text: 'Transfert physique' },
        ],
      },
      {
        id: 'scan-plus',
        popular: true,
        badge: '⭐ Plus populaire',
        name: 'Scan+',
        price: '24',
        period: 'HT/mois',
        subtitle: "Gérez votre courrier de n'importe où",
        cta: 'Choisir Scan+',
        note: 'Sans engagement · Résiliation à tout moment',
        features: [
          { ok: true, text: 'Adresse juridique officielle' },
          { ok: true, text: 'Réception du courrier' },
          { ok: true, text: "Notification d'arrivée par email" },
          { ok: true, text: 'Attestation de domiciliation' },
          { ok: true, text: 'Espace client 24h/24' },
          { ok: true, text: 'Contrat legale conforme Dutreil' },
          { ok: true, text: 'Scan numérique de vos courriers' },
          { ok: false, text: 'Transfert physique' },
        ],
      },
      {
        id: 'physique',
        popular: false,
        name: 'Physique+',
        price: '38',
        period: 'HT/mois',
        subtitle: 'Courrier transféré directement chez vous',
        cta: 'Choisir Physique+',
        note: 'Sans engagement · Résiliation à tout moment',
        features: [
          { ok: true, text: 'Adresse juridique officielle' },
          { ok: true, text: 'Réception du courrier' },
          { ok: true, text: "Notification d'arrivée par email" },
          { ok: true, text: 'Attestation de domiciliation' },
          { ok: true, text: 'Espace client 24h/24' },
          { ok: true, text: 'Contrat legale conforme Dutreil' },
          { ok: true, text: 'Scan numérique de vos courriers' },
          { ok: true, text: 'Réexpédition physique mensuelle' },
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
          name: 'Option Scan',
          price: '+4€',
          period: 'HT/mois',
          desc: 'Scannez et consultez vos courriers depuis votre espace client, où que vous soyez dans le monde.',
        },
        {
          icon: '📦',
          name: 'Transfert Physique',
          price: '+18€',
          period: 'HT/mois',
          desc: "Votre courrier vous est renvoyé à l'adresse de votre choix, sous enveloppe, une fois par mois.",
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
            { duration: 'Demi-journée (4h)', amount: '25€ HT' },
            { duration: 'Journée complète (8h)', amount: '40€ HT' },
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
            { duration: 'Demi-journée (4h)', amount: '20€ HT' },
            { duration: 'Journée complète (8h)', amount: '40€ HT' },
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
          a: "Non. Vous pouvez résilier à tout moment avec un préavis d'un mois, sans frais de résiliation.",
        },
      ],
    },

    trust: {
      items: [
        { icon: '🔒', text: '100% sécurisé' },
        { icon: '📄', text: 'Attestation sous 24h' },
        { icon: '✅', text: 'Conforme loi Dutreil' },
        { icon: '↩️', text: 'Résiliable à tout moment' },
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
    pageTitle: 'Notre Ville : Adresse de prestige à Toulouse — DomiciliationPasCher',

    hero: {
      eyebrow: 'Présence Locale',
      title: 'Notre adresse à',
      titleHighlight: 'Toulouse',
      desc: "Une présence stratégique pour votre siège social. Bénéficiez d'une adresse de prestige activée en 24h.",
    },

    benefits: [
      {
        title: 'Adresse Officielle',
        desc: 'Adresse légalement valide pour votre immatriculation Kbis.',
      },
      {
        title: 'Activation rapide',
        desc: 'Votre adresse est activée sous 24h, sans déplacement.',
      },
      {
        title: 'Changement possible',
        desc: 'Changez de ville facilement si vos besoins évoluent.',
      },
      {
        title: 'Multi-villes',
        desc: 'Besoin de plusieurs adresses ? Tarifs dégressifs disponibles.',
      },
    ],

    cities: [
      {
        name: 'Toulouse',
        region: 'Occitanie',
        desc: 'Surnommée la "Ville Rose", Toulouse est le fleuron de l\'industrie aéronautique européenne. Une adresse dynamique et stratégique.',
        avantages: ['Capitale aéronautique', "Bassin d'emploi tech", 'Dynamisme insolent'],
        zip: '31',
        priceLabel: 'À partir de',
        priceValue: '20€',
        priceUnit: ' HT/mois',
        cta: 'Choisir Toulouse',
      },
    ],

    helpCta: {
      title: 'Votre ville ne figure pas dans la liste ?',
      desc: 'Nous étendons notre réseau chaque mois. Contactez nos conseillers pour discuter de vos besoins spécifiques.',
      button: 'Parler à un conseiller',
      trust: 'Réponse en moins de 2h',
    },
  },

  about: {
    pageTitle: 'À Propos de DomiciliationPasCher : Notre Histoire et Nos Valeurs',

    hero: {
      eyebrow: 'Notre histoire',
      title: 'Votre partenaire de confiance',
      titleHighlight: 'depuis Toulouse',
      subtitle:
        "Fondée à Toulouse, Domiciliation-Pas-Cher.com est née d'une conviction simple : créer une entreprise ne doit pas coûter une fortune. Nous proposons les meilleures adresses de France au meilleur prix.",
    },

    stats: [
      { value: '2019', label: 'Année de création' },
      { value: '+3 000', label: 'Entreprises domiciliées' },
      { value: '+50/sem', label: 'Nouvelles créations' },
      { value: '1', label: 'Ville partenaire' },
      { value: '20€', label: 'À partir de HT/mois' },
    ],

    mission: {
      eyebrow: 'Notre mission',
      title: 'Simplifier la création',
      titleHighlight: "d'entreprise en France",
      paragraphs: [
        "Nous croyons que chaque entrepreneur mérite une adresse professionnelle de qualité, sans se ruiner. C'est pourquoi nous avons créé une plateforme 100% en ligne qui rend la domiciliation accessible, rapide et sans contrainte.",
        'Basés à Toulouse, nous proposons une adresse prestigieuse pour offrir à nos clients une flexibilité maximale dans leur implantation.',
      ],
      highlights: [
        'Centre de domiciliation agréé',
        'Conforme à la loi Dutreil 2003',
        '100% éligible aide à la création',
        'Déductible des charges fiscales',
      ],
      cards: [
        '📍 Toulouse, siège historique',
        '🇫🇷 Adresse prestigieuse',
        '⚡ +50 créations / semaine',
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
          desc: 'Domiciliation professionnelle accessible à tous les entrepreneurs, sans barrière de prix.',
        },
        {
          icon: '🔒',
          title: 'Fiabilité',
          desc: 'Centre de domiciliation agréé, conforme à toutes les obligations légales françaises.',
        },
        {
          icon: '⚡',
          title: 'Rapidité',
          desc: 'Inscription en ligne en 5 minutes, attestation sous 24h. Zéro paperasse inutile.',
        },
        {
          icon: '🤝',
          title: 'Proximité',
          desc: 'Une équipe disponible et réactive pour accompagner chaque entrepreneur.',
        },
      ],
    },

    milestones: {
      eyebrow: 'Notre parcours',
      title: 'Une croissance',
      titleHighlight: 'constante',
      items: [
        { year: '2019', title: 'Fondation à Toulouse', desc: 'Création de DomiciliationPasCher avec 50 premiers clients.' },
        { year: '2021', title: 'Expansion nationale', desc: 'Ouverture dans 5 nouvelles villes françaises.' },
        { year: '2023', title: '+1 000 entreprises', desc: 'Cap des 1 000 entreprises domiciliées franchi.' },
        { year: '2025', title: '+3 000 entreprises', desc: 'Leader de la domiciliation abordable en France.' },
      ],
    },

    team: {
      eyebrow: "L'équipe",
      title: 'Des personnes',
      titleHighlight: 'passionnées',
      items: [
        {
          name: 'Alexandre M.',
          role: 'Fondateur & CEO',
          emoji: '👨‍💼',
          desc: "Expert en création d'entreprise avec 10 ans d'expérience dans les services aux professionnels.",
        },
        {
          name: 'Sophie L.',
          role: 'Responsable Opérations',
          emoji: '👩‍💻',
          desc: 'Spécialiste de la gestion administrative, elle supervise toutes les opérations de domiciliation.',
        },
        {
          name: 'Karim B.',
          role: 'Responsable Relations Clients',
          emoji: '👨‍🤝‍👨',
          desc: 'Votre interlocuteur principal pour toute question concernant votre contrat ou votre courrier.',
        },
      ],
    },

    cta: {
      title: "Rejoignez notre communauté d'entrepreneurs",
      subtitle: '+3 000 entreprises nous font déjà confiance. À votre tour !',
      button: 'Démarrer maintenant →',
    },
  },

  services: {
    pageTitle: "Nos Services : Domiciliation & Création d'Entreprise — DomiciliationPasCher",

    header: {
      eyebrow: 'Nos services',
      title: 'Nos services adaptés à',
      titleHighlight: 'chaque étape de votre projet',
      subtitle:
        "De la domiciliation légale à la création complète de votre entreprise — nous vous accompagnons à chaque étape.",
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
          title: 'Répondez à notre questionnaire en ligne',
          desc: "Définissez l'adresse de domiciliation et l'option courrier qui vous convient le mieux. Vous pourrez également ajouter d'autres options comme la gestion des formalités juridiques.",
          cta: { label: 'Commencer maintenant', to: '/tarifs' },
        },
        {
          n: '2',
          title: 'Complétez votre dossier',
          desc: 'Après le paiement en ligne sur notre plateforme 100% sécurisée, complétez votre dossier et joignez les pièces justificatives demandées.',
        },
        {
          n: '3',
          title: 'Recevez votre attestation de domiciliation',
          desc: "Après une vérification de votre dossier, vous recevrez votre attestation de domiciliation nécessaire à l'obtention de votre Kbis.",
        },
        {
          n: '4',
          title: 'Finalisez votre dossier',
          desc: "Finissez de compléter votre profil après l'obtention de votre Kbis. Cette étape est indispensable pour finaliser votre domiciliation.",
        },
      ],
      card: {
        title: 'Domiciliation officielle',
        subtitle: 'Adresse juridique valide pour votre Kbis',
        items: [
          'Inscription 100% en ligne',
          'Attestation sous 24h',
          'Centre agréé loi Dutreil',
          'Sans engagement',
          'Dès 20€ HT/mois',
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
        { n: '1', title: 'Réception', desc: "Nous réceptionnons votre courrier à l'adresse de domiciliation choisie, en toute sécurité." },
        { n: '2', title: 'Identification', desc: 'Chaque courrier est identifié et enregistré dans notre système sous 24h ouvrées.' },
        { n: '3', title: 'Notification', desc: "Vous recevez immédiatement une notification par email à l'arrivée de chaque courrier." },
        { n: '4', title: 'Numérisation', desc: "Avec l'option Scan+, votre courrier est numérisé et disponible depuis votre espace client." },
        { n: '5', title: 'Réexpédition', desc: "Sur demande, votre courrier physique est réexpédié à l'adresse de votre choix (option +18€/mois)." },
      ],
      options: [
        {
          icon: '📬',
          name: 'Option Scan',
          desc: 'Numérisez et consultez votre courrier à distance',
          price: '+4€',
          period: 'HT/mois',
        },
        {
          icon: '📦',
          name: 'Réexpédition physique',
          desc: "Courrier envoyé à l'adresse de votre choix",
          price: '+18€',
          period: 'HT/mois',
        },
      ],
    },

    creation: {
      eyebrow: "Création d'entreprise",
      title: 'Créez votre entreprise',
      titleHighlight: 'en 5 étapes',
      subtitle: "Un accompagnement complet depuis votre questionnaire jusqu'à la réception de votre Kbis.",
      steps: [
        {
          n: '1',
          title: 'Répondez à notre questionnaire en ligne',
          desc: "Définissez l'adresse de domiciliation et l'option courrier qui vous convient le mieux. Vous pourrez également ajouter d'autres options comme la gestion des formalités juridiques.",
        },
        {
          n: '2',
          title: 'Effectuez le paiement en ligne',
          desc: 'Finalisez votre demande en effectuant le paiement sur notre plateforme sécurisée.',
        },
        {
          n: '3',
          title: 'Signez votre contrat de domiciliation',
          desc: 'Le contrat est impératif pour le dossier de création ou transfert de votre société. Votre signature active le service de gestion de vos courriers.',
        },
        {
          n: '4',
          title: 'Recevez votre Kbis et vos statuts',
          desc: "Votre Kbis et vos statuts vous seront envoyés par mail à l'adresse renseignée.",
        },
        {
          n: '5',
          title: 'Finalisez votre domiciliation',
          desc: 'Nous recevrons automatiquement votre Kbis et vos statuts. Votre domiciliation sera alors complète et conforme.',
        },
      ],
      card: {
        title: 'Créez votre entreprise',
        subtitle: 'Accompagnement complet de A à Z',
        items: [
          'Démarches simples et 100% en ligne',
          'Pas de frais cachés',
          'Accompagnement sur mesure',
        ],
        cta: 'Démarrer la création →',
      },
    },

    formes: {
      eyebrow: 'Guide pratique',
      title: 'Les formes',
      titleHighlight: 'juridiques',
      subtitle: 'Vous êtes perdu(e) sur les formes juridiques ? On vous explique tout !',
      intro: 'Découvrez tout ce que vous devez savoir sur la {label} pour choisir la bonne structure pour votre projet.',
      cta: 'Domicilier ma {label} →',
      ctaNote: 'Attestation officielle sous 24h · Dès 20€ HT/mois',
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
              text: "Pas de capital minimum légal (1€ symbolique possible). En pratique, un capital suffisant crédibilise l'entreprise auprès des banques et partenaires.",
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
              text: "Aucun capital social minimum n'est exigé, 1€ symbolique suffit pour la constituer. Le capital peut être variable et composé d'apports en numéraire ou en nature.",
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
              text: "Facilite la gestion et la transmission d'un patrimoine immobilier (abattements successifs). Permet d'éviter la situation d'indivision et ses blocages.",
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
          q: 'Puis-je commencer ma domiciliation sans avoir créé mon statut au préalable ?',
          a: "Oui. Pour cela, il suffit de renseigner un statut juridique parmi ceux proposés dans le formulaire d'inscription. Si votre choix n'est pas encore arrêté, vous pourrez le modifier ultérieurement dans votre espace client en ligne : il suffit de joindre un exemplaire des statuts déposés auprès du greffe du tribunal de commerce ainsi que votre Kbis à jour.",
        },
        {
          q: 'Est-il possible de changer le nom de ma société ?',
          a: "Oui. Une entreprise individuelle ou une société peuvent décider de changer de raison sociale ou de nom commercial à tout moment. Cette démarche obéit à une procédure administrative encadrée par la loi française. Pour actualiser votre attestation de domiciliation, il suffit d'indiquer le changement de nom dans votre espace personnel puis de joindre un exemplaire des statuts et de l'extrait Kbis actualisés.",
        },
        {
          q: 'Comment fonctionne la gestion de mon courrier ?',
          a: "Votre courrier est numérisé et disponible sur votre espace client sans limite de temps. Vous recevez une notification dès réception. Le courrier physique est stocké dans notre centre de gestion et non à l'adresse de domiciliation. Il sera détruit au bout d'un mois si aucune réexpédition n'est demandée. Vous pouvez recevoir votre courrier physique à votre adresse de manière quotidienne, mensuelle ou à la carte en souscrivant à une option.",
        },
        {
          q: 'Est-il possible de réserver une salle de réunion ?',
          a: "Oui. Il est possible de réserver simplement une salle de réunion dans l'un de nos centres d'affaires entièrement équipés. Contactez notre support clients qui vérifiera les disponibilités du centre désiré. Chaque salle de réunion peut être louée à l'heure, à la demi-journée ou à la journée selon vos besoins.",
        },
      ],
    },

    cta: {
      title: "Démarrez votre domiciliation dès aujourd'hui",
      subtitle: 'Inscription en ligne · Attestation sous 24h · Dès 20€ HT/mois',
      primary: 'Voir les tarifs →',
      secondary: 'En savoir plus sur nous →',
    },
  },

  fichesPratiques: {
    pageTitle: 'Fiches Pratiques — Guides pour entrepreneurs — DomiciliationPasCher',
    eyebrow: 'Centre de ressources',
    title: 'Fiches',
    titleHighlight: 'pratiques',
    subtitle: 'Tout ce dont vous avez besoin pour créer, gérer et développer votre entreprise sereinement.',
    cta: {
      title: 'Prêt à lancer votre activité ?',
      subtitle: "Rejoignez les milliers d'entrepreneurs qui nous font confiance pour leur domiciliation.",
      button: 'Découvrir nos offres',
    },
    backLink: 'Retour aux fiches pratiques',
    expertTip: '💡 Conseil d\'expert',
    expertTipText: "N'attendez pas d'être submergé pour structurer vos démarches. Une bonne domiciliation est le socle d'une entreprise solide et crédible face au marché.",
    genericContent: "L'entrepreneuriat est un voyage complexe mais passionnant. Chez DomiciliationPasCher, notre mission est de vous simplifier la vie administrative pour que vous puissiez vous concentrer sur ce qui compte vraiment : votre croissance.",
    genericContent2: 'Chaque situation étant unique, nous vous recommandons de consulter régulièrement nos fiches pratiques ou de contacter notre support pour un accompagnement personnalisé adapté à votre structure juridique.',
    sidebar: {
      needHelp: 'Besoin d\'aide ?',
      helpDesc: 'Nos conseillers vous accompagnent dans toutes vos démarches de domiciliation.',
      helpCta: 'Voir nos offres',
      similarArticles: 'Articles similaires',
    },
    fiches: {
      'fiscalite-et-imposition': {
        title: 'Fiscalité et imposition : Comprendre les bases',
        category: 'Gérer son entreprise',
        content: "La fiscalité est un pilier de la gestion d'entreprise. Entre l'impôt sur les sociétés (IS) et l'impôt sur le revenu (IR), le choix impacte directement votre trésorerie. Cette fiche détaille les seuils de TVA, les crédits d'impôt recherche, et les obligations déclaratives annuelles pour rester en conformité avec l'administration fiscale française.",
        icon: '📊'
      },
      'transfert-de-siege-social': {
        title: 'Transférer son siège social : La marche à suivre',
        category: 'Gérer son entreprise',
        content: "Déménager votre siège social nécessite une procédure rigoureuse : décision en assemblée générale, modification des statuts, publication dans un journal d'annonces légales (JAL), et dépôt du dossier au guichet unique. Découvrez comment optimiser ce transfert sans interrompre votre activité.",
        icon: '🏢'
      },
      'gouvernance': {
        title: 'La gouvernance : Optimiser la gestion de vos instances',
        category: 'Gérer son entreprise',
        content: "La gouvernance définit la répartition des pouvoirs au sein de votre société. Que vous soyez en SAS ou en SARL, la structuration des décisions (conseil d'administration, présidence) est cruciale pour la pérennité et la transparence de votre entreprise face aux investisseurs.",
        icon: '⚖️'
      },
      'services-aux-entreprises': {
        title: 'Les services essentiels pour booster votre productivité',
        category: 'Gérer son entreprise',
        content: "Conciergerie, cloud, logiciels métiers ou assistance juridique : les services aux entreprises permettent de déléguer les tâches chronophages. Nous avons listé les partenaires indispensables pour vous concentrer sur votre cœur de métier.",
        icon: '🛠️'
      },
      'pieges-et-astuces-gestion': {
        title: 'Gestion : Évitez les pièges classiques et gagnez du temps',
        category: 'Gérer son entreprise',
        content: "Négliger le suivi de trésorerie ou rater une échéance Urssaf peut coûter cher. Apprenez à automatiser vos rappels de facturation et à structurer vos tableaux de bord dès le premier jour pour une gestion saine et sereine.",
        icon: '🚩'
      },
      'reformes-legales': {
        title: 'Réformes légales 2024 : Ce qui change pour vous',
        category: 'Actualités',
        content: "Loi de finances, transition écologique, évolution des seuils micro-foncier : l'environnement législatif bouge. Restez informé des dernières mises à jour pour anticiper les impacts sur votre structure et bénéficier des nouvelles aides disponibles.",
        icon: '📜'
      },
      'podcast': {
        title: "L'instant Entrepreneur : Notre podcast inspirant",
        category: 'Actualités',
        content: "Chaque semaine, nous donnons la parole à ceux qui font l'économie de demain. Découvrez des témoignages sans filtre sur les galères et les succès de l'entrepreneuriat à travers nos épisodes audio exclusifs.",
        icon: '🎙️'
      },
      'entrepreneuriat': {
        title: "L'entrepreneuriat en France : État des lieux",
        category: 'Actualités',
        content: "Malgré un contexte économique complexe, la création d'entreprise bat des records. Analyse des tendances par secteur, profil des nouveaux créateurs et opportunités de croissance dans l'économie circulaire et l'IA.",
        icon: '🚀'
      },
      'sedomicilier': {
        title: 'SeDomicilier : Les nouveautés de notre plateforme',
        category: 'Actualités',
        content: "Modernisation de l'espace client, nouvelles adresses, outils de comptabilité intégrés : découvrez comment nous facilitons votre quotidien d'entrepreneur.",
        icon: '🏠'
      },
      'tech': {
        title: 'Tech & Innovation : Les outils indispensables',
        category: 'Actualités',
        content: "De l'automatisation par IA à la cybersécurité, la technologie est votre meilleure alliée. Cette fiche explore les outils SaaS incontournables pour sécuriser vos données et scaler votre offre technologique.",
        icon: '💻'
      },
      'les-adresses': {
        title: 'Choisir son adresse : Prestige et stratégie',
        category: 'Domiciliation',
        content: "L'adresse de votre siège social est la vitrine de votre entreprise. Paris, Lyon ou Toulouse ? Découvrez comment le choix de la ville influence votre image de marque et accédez à nos adresses les plus prestigieuses à prix réduit.",
        icon: '📍'
      },
      'gestion-du-courrier': {
        title: 'Gestion du courrier : Rapidité et confidentialité',
        category: 'Domiciliation',
        content: "Réception physique ou scan numérique ? Apprenez comment fonctionne le tri automatique de vos courriers et découvrez nos services de réexpédition personnalisés pour ne jamais rater un document important.",
        icon: '✉️'
      },
      'pieges-et-astuces-domiciliation': {
        title: 'Domiciliation : Les erreurs à ne pas commettre',
        category: 'Domiciliation',
        content: "Vérifiez toujours l'agrément préfectoral de votre domiciliaire. Cette fiche vous aide à démasquer les offres trop belles pour être vraies et à comprendre les clauses cachées des contrats de domiciliation.",
        icon: '🔍'
      },
      'tout-savoir-sur-la-domiciliation': {
        title: 'Le guide complet de la domiciliation commerciale',
        category: 'Domiciliation',
        content: "Pourquoi se domicilier ? Quelles sont les obligations du domiciliaire ? Ce guide exhaustif répond à toutes vos questions, de l'immatriculation au Kbis jusqu'à la gestion des assemblées générales.",
        icon: '📘'
      },
      'formes-juridiques': {
        title: 'SASU, EURL, SARL : Quelle forme juridique choisir ?',
        category: 'Créer une entreprise',
        content: "Le choix du statut juridique est la première décision stratégique du créateur. Protection du patrimoine, régime social du dirigeant et flexibilité statuaire : comparatif complet pour faire le bon choix selon votre projet.",
        icon: '📋'
      },
      'aides-a-la-creation': {
        title: 'Les aides à la création : ARCE, ACRE et financements',
        category: 'Créer une entreprise',
        content: "Savez-vous que vous pouvez bénéficier d'exonérations de charges ou d'un capital de départ via France Travail ? Tour d'horizon des dispositifs d'aide à la création et des subventions régionales.",
        icon: '🎁'
      },
      'les-administrations': {
        title: "Guichet unique et INPI : Naviguer dans l'administration",
        category: 'Créer une entreprise',
        content: "Depuis 2023, toutes les démarches passent par le Guichet Unique de l'INPI. Apprenez à préparer vos pièces justificatives pour éviter les rejets de dossier et obtenir votre SIRET rapidement.",
        icon: '🏛️'
      },
      'pieges-et-astuces-creation': {
        title: 'Création : Astuces pour un lancement réussi',
        category: 'Créer une entreprise',
        content: "Ne confondez pas chiffre d'affaires et bénéfice ! Nos experts vous livrent leurs secrets pour bien rédiger vos statuts et choisir la date de clôture d'exercice la plus avantageuse pour votre activité.",
        icon: '💡'
      },
      'la-creation-d-entreprise': {
        title: "Lancer son projet : De l'idée au premier client",
        category: 'Créer une entreprise',
        content: "L'entrepreneuriat est un marathon. Méthodologie Lean Startup, validation du marché et premier business plan : suivez nos étapes pour transformer votre concept en une entreprise rentable.",
        icon: '🏁'
      },
      'auto-entrepreneur-astuces-impot': {
        title: "Auto-entrepreneur : Les 5 astuces pour payer moins d'impôt",
        category: 'Sélection du mois',
        content: "Le versement libératoire, l'abattement forfaitaire et la gestion des plafonds de franchise de TVA : 5 stratégies concrètes pour optimiser la fiscalité de votre micro-entreprise légalement.",
        icon: '💰'
      },
      'qu-est-ce-que-la-domiciliation': {
        title: "Qu'est-ce que la domiciliation ? Définition simple",
        category: 'Sélection du mois',
        content: "La domiciliation permet de séparer vie privée et vie professionnelle. Découvrez pourquoi plus de 80% des créatrices et créateurs choisissent un centre de domiciliation pour leur siège social.",
        icon: '❓'
      },
      'cout-gestion-comptabilite': {
        title: 'Combien coûte réellement la gestion de votre comptabilité ?',
        category: 'Sélection du mois',
        content: "Expert-comptable traditionnel ou logiciel en ligne ? Analyse comparative des coûts selon votre volume de factures et vos besoins en conseil stratégique et social.",
        icon: '💸'
      },
      'creer-entreprise-en-ligne': {
        title: 'Comment créer son entreprise en ligne en 2024 ?',
        category: 'Sélection du mois',
        content: "Fini la paperasse papier. Découvrez les plateformes fiables pour immatriculer votre société en moins de 48h sans quitter votre canapé, tout en restant serein sur la conformité juridique.",
        icon: '🖱️'
      },
      'pourquoi-domicilier-en-idf': {
        title: "Pourquoi domicilier son entreprise en IDF ? Les avantages",
        category: 'Sélection du mois',
        content: "L'Île-de-France reste le premier pôle économique européen. Bénéficiez du dynamisme de la capitale, accédez à des réseaux d'investisseurs uniques et boostez votre crédibilité internationale.",
        icon: '🗼'
      },
    },
  },
};
