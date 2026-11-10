import espaceClient from './espaceClient/index.js';

export default {
  common: {
    errorTitle: 'This page could not be displayed',
    errorBody: 'Something went wrong (connection lost or a new version of the site). Please reload the page.',
    reload: 'Reload the page',
    loading: 'Loading...',
    backToTop: 'Back to top',
    dialogConfirm: 'Confirmation',
    dialogNotice: 'Notice',
    dialogOk: 'OK',
    dialogCancel: 'Cancel',
    dialogClose: 'Close',
  },

  nav: {
    links: {
      home: 'Home',
      services: 'Services',
      tarifs: 'Pricing',
      villes: 'Addresses',
      creationEntreprise: 'Company Creation',
      fichesPratiques: 'Practical Guides',
    },
    megaMenu: {
      viewAll: 'View all practical guides →',
      gererEntreprise: 'Manage your business',
      fiscaliteImposition: 'Taxation',
      transfertSiege: 'Headquarters transfer',
      gouvernance: 'Governance',
      servicesEntreprises: 'Business services',
      piegesAstucesGestion: 'Tips & Tricks',
      actualites: 'News',
      reformesLegales: 'Legal reforms',
      podcast: "Entrepreneurs' stories",
      entrepreneuriat: 'Entrepreneurship',
      tech: 'Tech',
      domiciliation: 'Business Address',
      lesAdresses: 'Our locations',
      gestionCourrier: 'Mail management',
      piegesAstucesDomiciliation: 'Tips & Tricks',
      toutSavoirDomiciliation: 'Everything about business addresses',
      creerEntreprise: 'Create a business',
      formesJuridiques: 'Legal forms',
      aidesCreation: 'Creation grants',
      administrations: 'Administrations',
      piegesAstucesCreation: 'Tips & Tricks',
      laCreationEntreprise: "Business creation",
      selectionMois: 'Our monthly selection',
      autoEntrepreneurAstuces: "Micro-entrepreneurs: 5 tips to pay less tax",
      questCeDomiciliation: "What is a business address?",
      coutComptabilite: 'How much does accounting cost?',
      creerEntrepriseEnLigne: 'How to create your business online?',
    },
    signIn: 'Log in',
    dashboard: 'My area',
    dashboardMobile: 'My client area',
    cta: 'Get started →',
    mobileCta: 'Register my business',
    menuAria: 'Menu',
    callAria: 'Call',
  },

  footer: {
    desc: 'Business domiciliation in Toulouse from €16 excl. VAT/month. Prefecture-approved centre (approval no. AG/DOM/2026/06), 100% online sign-up.',
    stats: {
      entreprises: { value: 'Toulouse', label: 'Official address' },
      creations: { value: '24 h', label: 'Certificate' },
    },
    columns: {
      services: {
        title: 'Our services',
        links: [
          'Business domiciliation',
          'Mail handling',
          'Mail scanning',
          'Meeting room',
          'Office rental',
        ],
      },
      villes: {
        title: 'Our address',
        cities: ['Toulouse'],
      },
    },
    contact: {
      title: 'Contact',
      address: '150 rue Nicolas Louis Vauquelin\nBâtiment B, Lot 308\n31100 Toulouse',
      phone: '+33 9 60 39 69 07',
      email: 'contact@domiciliation-pas-cher.com',
    },
    cta: {
      text: 'Ready to get started?',
      button: 'View pricing',
    },
    legal: {
      mentionsLegales: 'Legal notice',
      cgv: 'Terms and conditions',
      confidentialite: 'Privacy policy',
      manageCookies: "Manage cookies",
    },
    copyright: '© {year} Domiciliation-Pas-Cher.com — All rights reserved',
    credits: 'Created by microdidact',
  },

  home: {
    pageTitle: 'Business domiciliation in Toulouse from €16 excl. VAT/month — Domiciliation Pas Cher',
    pendingBanner: 'Your domiciliation request is being processed. You will receive an email as soon as it is approved.',

    hero: {
      title: 'Domicile your business',
      titleHighlight: 'in Toulouse from €16 excl. VAT/month',
      subtitle: 'Get an official legal address in Toulouse. 100% online sign-up, certificate issued within 24 hours once your file is approved.',
      ctaPrimary: 'Get started',
      ctaSecondary: 'Discover our services',
    },

    guarantees: [
      'Cancel after 3 months (1-month notice)',
      '100% legal',
      'Certificate within 24 h',
      'Tax deductible',
    ],

    heroCard: {
      title: 'Your business address',
      subtitle: 'Certificate within 24 h',
      badge: 'Active',
      cities: ['Toulouse'],
      priceLabel: 'From',
      priceValue: '16',
      priceUnit: '€ excl. VAT/month',
      float1: {
        title: 'Sign-up time',
        value: 'Under 5 minutes',
      },
      float2: {
        title: 'Compliant',
        value: 'Dutreil Act 2003',
      },
      socialProof: '2,000+',
      socialProofText: 'entrepreneurs trust us',
    },

    trustBar: {
      label: 'Approved and compliant',
      items: ['Prefecture approval', 'Dutreil Act 2003', '100% legal', 'Price guaranteed 12 months', 'Deductible expense'],
    },

    stats: [
      { prefix: '€', target: 16, suffix: '', label: 'excl. VAT/month, Essentiel plan' },
      { prefix: '', target: 24, suffix: ' h', label: 'Certificate turnaround' },
      { prefix: '', target: 12, suffix: ' months', label: 'Price guarantee' },
      { prefix: '€', target: 0, suffix: '', label: 'Set-up fees' },
    ],

    features: {
      eyebrow: 'Our services',
      title: 'A complete solution',
      titleHighlight: 'for your business',
      subtitle: 'From legal domiciliation to professional workspace rental: everything you need, at a fair price.',
      items: [
        {
          title: 'Official legal address',
          desc: 'A registered office address in Toulouse, usable on your Kbis and all your official documents.',
        },
        {
          title: 'Mail handling',
          desc: 'Reception, storage and email notification with a photo of the envelope for every item. Scanning included in the Confort and Premium plans.',
        },
        {
          title: 'Meeting room',
          desc: 'Equipped professional space (projector, fibre WiFi, coffee) to meet clients and hold your general meetings, from €25 excl. VAT per hour.',
        },
        {
          title: 'Office rental',
          desc: 'Quiet private office by the hour, half day or full day. WiFi included, no subscription.',
        },
        {
          title: 'Approved centre',
          desc: 'Prefecture approval no. AG/DOM/2026/06. Contract compliant with article R123-168 of the French Commercial Code and the Dutreil Act.',
        },
        {
          title: 'Certificate within 24 h',
          desc: '100% online sign-up in under 5 minutes. Your domiciliation certificate is issued within 24 hours once your file is approved.',
        },
      ],
      extraServicesTitle: 'Our additional services',
    },

    extraServices: [
      { label: 'Mail forwarding' },
      { label: 'Parcel reception' },
      { label: 'Company formation advice' },
      { label: 'Meeting room' },
    ],

    steps: {
      eyebrow: 'Simple process',
      title: 'Get domiciled',
      titleHighlight: 'in 4 steps',
      subtitle: 'A 100% online process, designed to save you time from day one.',
      items: [
        {
          n: '01',
          tag: 'Your choice',
          title: 'Choose your plan',
          desc: 'Essentiel, Confort or Premium: the plan that suits your business, for your Toulouse address.',
        },
        {
          n: '02',
          tag: '100% online',
          title: 'Complete your file',
          desc: 'Fill in the online form and upload your supporting documents in a few minutes.',
        },
        {
          n: '03',
          tag: 'Compliant',
          title: 'Sign your contract',
          desc: 'Sign your domiciliation contract electronically, without travelling.',
        },
        {
          n: '04',
          tag: 'Within 24 h',
          title: 'Receive your certificate',
          desc: 'Your domiciliation certificate is issued within 24 hours once your file is approved, ready for your company registration.',
        },
      ],
    },

    pricing: {
      eyebrow: 'Transparent pricing',
      title: 'Domiciliation',
      titleHighlight: 'at a fair price',
      desc: 'No hidden fees, no bad surprises.',
      descHighlight: 'From €16 excl. VAT/month',
      descSuffix: ', 3-month legal minimum term, then 1 month’s notice.',
      cta: 'See all our plans',
      trust: ['Cancel after 3 months (1-month notice)', 'Certificate within 24 h', 'No set-up fees'],
      plans: [
        {
          name: 'Essentiel',
          price: '€16',
          period: 'excl. VAT/month',
          desc: 'Official address and mail notifications at the best price.',
          features: [
            { text: 'Official legal address', bold: true },
            'Email notification with a photo of the envelope',
            'Domiciliation certificate within 24 h',
            'Online client area',
          ],
          cta: 'Choose Essentiel',
        },
        {
          name: 'Confort',
          badge: 'Recommended',
          price: '€24',
          period: 'excl. VAT/month',
          desc: 'Your mail scanned and available anywhere.',
          features: [
            'Everything in Essentiel',
            { text: '40 items scanned', bold: true, suffix: ' per month' },
            'Scanned within 24 business hours',
            'Forwarding on request (€3 excl. VAT + postage)',
          ],
          cta: 'Choose Confort',
        },
        {
          name: 'Premium',
          price: '€38',
          period: 'excl. VAT/month',
          desc: 'Extended scanning, forwarding and parcels included.',
          features: [
            'Everything in Confort',
            { text: '100 items scanned', bold: true, suffix: ' per month' },
            '2 forwardings included per month',
            'Parcels up to 5 kg included',
          ],
          cta: 'Choose Premium',
        },
      ],
    },

    cities: {
      eyebrow: 'Local presence',
      title: 'An address in',
      titleHighlight: 'Toulouse',
      subtitle: 'Benefit from a prestigious address in Toulouse.',
      items: [{ name: 'Toulouse', region: 'Occitanie' }],
      cta: 'Learn more about our address',
    },

    testimonials: {
      eyebrow: 'Trust',
      title: 'Local and transparent domiciliation',
      subtitle: 'Approved centre in Toulouse. No invented reviews: we prefer compliance (DGCCRF) over marketing scores.',
      items: [],
      platforms: [],
    },

    faqs: {
      eyebrow: 'FAQ',
      title: 'Frequently asked',
      titleHighlight: 'questions',
      intro: 'Everything you need to know about business domiciliation in France.',
      cta: 'View our plans',
      items: [
        {
          q: 'What is business domiciliation?',
          a: 'Domiciliation gives your business an administrative and legal address. It is mandatory to register your company and obtain your Kbis.',
        },
        {
          q: 'How long does it take to receive the certificate?',
          a: 'Your domiciliation certificate is issued within 24 hours once your complete file (signed contract and supporting documents) is approved.',
        },
        {
          q: 'Is domiciliation legal?',
          a: 'Yes, completely. We are a domiciliation centre approved by the prefecture (approval no. AG/DOM/2026/06), compliant with the Dutreil Act of 1 August 2003 and article R123-168 of the French Commercial Code.',
        },
        {
          q: 'Can I change address or cancel?',
          a: 'Yes. The contract has a 3-month legal minimum term (art. R123-168 of the French Commercial Code). After that, you can cancel from your client area with one month’s notice. Amounts already paid are non-refundable.',
        },
        {
          q: 'What documents are required?',
          a: 'ID for the legal representative (and beneficial owners), proof of address less than 3 months old, the articles of association or draft articles, and the Kbis if the company is already registered. Everything is done online, no travel required.',
        },
        {
          q: 'How does mail handling work?',
          a: 'We receive and store your mail and notify you by email on each arrival with a photo of the envelope. Scanning is included in the Confort (40 items/month) and Premium (100 items/month) plans, then €0.50 excl. VAT per extra item. Forwarding is available on all plans (€3 excl. VAT + postage), with 2 dispatches per month included in Premium. You can also collect your mail on site, Monday to Friday from 9 am to 6 pm, by appointment.',
        },
      ],
    },

    finalCta: {
      title: 'Ready to take the leap?',
      subtitle: 'Join more than 2,000 entrepreneurs. Get started in 5 minutes, from €16 excl. VAT/month.',
      ctaPrimary: 'Get started',
      ctaSecondary: 'Discover our services →',
      badges: ['Cancel after 3 months (1-month notice)', 'Certificate within 24 h', 'Responsive support', '100% legal'],
    },

    successModal: {
      title: 'Payment successful!',
      subtitle: 'Your address is reserved',
      warningTitle: '⚠️ Required step',
      warningText:
        'To obtain your domiciliation certificate (required to register your company with the registry) and follow your mail, create your client area now.',
      info: 'This takes less than a minute: it links your payment to your client account.',
      cta: 'Create my client area',
    },
  },

  tarifs: {
    pageTitle: 'Domiciliation Pricing — Starting at 16€/month — DomiciliationPasCher',

    header: {
      eyebrow: "Transparent pricing",
      title: "Business domiciliation",
      titleHighlight: "in Toulouse",
      agreement: "Approved by the prefecture · no. AG/DOM/2026/06 · 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse",
      subtitle: "No setup fees · Price guaranteed for 12 months",
    },

    toggle: {"label": "Billing", "monthly": "Monthly", "annual": "Annual", "annualBadge": "-20%", "perMonth": "excl. VAT/month", "perYear": "excl. VAT/year", "equivMonthly": "i.e. €{price} excl. VAT/month", "ttcMonth": "i.e. €{price} incl. VAT/month", "ttcYear": "i.e. €{price} incl. VAT/year", "showDetails": "See details", "hideDetails": "Hide details"},

    room: {"title": "Book our meeting room: €25 excl. VAT/hour.", "text": "Book by email, 48 hours in advance. Free cancellation up to 24 hours before."},

    plans: [
      {
        id: 'essentiel',
        highlights: ["Official address in Toulouse", "Domiciliation certificate", "Notification + photo of the envelope", "On-site pickup, by appointment"],
        popular: false,
        name: 'Essentiel',
        price: '16',
        period: "excl. VAT/month",
        subtitle: "Official address + mail notifications",
        cta: "Choose Essentiel",
        note: "3-month legal minimum, then cancel with 1 month’s notice",
        features: [
          { ok: true, text: "Official legal address (registered office)" },
          { ok: true, text: "Mail reception and storage" },
          { ok: true, text: "Email notification with a photo of the envelope" },
          { ok: true, text: "Domiciliation certificate" },
          { ok: true, text: "24/7 client area" },
          { ok: true, text: "On-site pickup by appointment" },
          { ok: false, text: "Mail scanning" },
          { ok: true, text: "Forwarding: €3 excl. VAT + postage" },
          { ok: true, text: "Parcels ≤ 5 kg: €3 excl. VAT each" },
          { ok: true, text: "Contract compliant with art. R123-168 of the French Commercial Code" },
          { ok: true, text: "Bookable meeting room: €25 excl. VAT/hour, including for your general meetings" },
        ],
      },
      {
        id: 'scan-plus',
        highlights: ["Everything in Essentiel", "Your mail scanned (40/month)", "Available online 24/7", "Ideal if you never come by"],
        popular: true,
        badge: "Recommended",
        name: 'Confort',
        price: '24',
        period: "excl. VAT/month",
        subtitle: "Address + mail scanning",
        cta: "Choose Confort",
        note: "3-month legal minimum, then cancel with 1 month’s notice",
        features: [
          { ok: true, text: "Official legal address (registered office)" },
          { ok: true, text: "Mail reception and storage" },
          { ok: true, text: "Email notification with a photo of the envelope" },
          { ok: true, text: "Domiciliation certificate" },
          { ok: true, text: "24/7 client area" },
          { ok: true, text: "On-site pickup by appointment" },
          { ok: true, text: "Scanning: 40 items/month" },
          { ok: true, text: "Forwarding: €3 excl. VAT + postage" },
          { ok: true, text: "Parcels ≤ 5 kg: €3 excl. VAT each" },
          { ok: true, text: "Contract compliant with art. R123-168 of the French Commercial Code" },
          { ok: true, text: "Bookable meeting room: €25 excl. VAT/hour, including for your general meetings" },
        ],
      },
      {
        id: 'physique',
        highlights: ["Everything in Confort", "100 letters scanned/month", "2 forwardings per month included", "Parcel reception"],
        popular: false,
        name: 'Premium',
        price: '38',
        period: "excl. VAT/month",
        subtitle: "Extended scanning, forwarding and parcels included",
        cta: "Choose Premium",
        note: "3-month legal minimum, then cancel with 1 month’s notice",
        features: [
          { ok: true, text: "Official legal address (registered office)" },
          { ok: true, text: "Mail reception and storage" },
          { ok: true, text: "Email notification with a photo of the envelope" },
          { ok: true, text: "Domiciliation certificate" },
          { ok: true, text: "24/7 client area" },
          { ok: true, text: "On-site pickup by appointment" },
          { ok: true, text: "Scanning: 100 items/month" },
          { ok: true, text: "2 forwardings/month included (postage at cost)" },
          { ok: true, text: "Parcels ≤ 5 kg included" },
          { ok: true, text: "Contract compliant with art. R123-168 of the French Commercial Code" },
          { ok: true, text: "Bookable meeting room: €25 excl. VAT/hour, including for your general meetings" },
        ],
      },
    ],

    options: {
      eyebrow: 'A la carte',
      title: 'Additional',
      titleHighlight: 'Options',
      subtitle: 'Add services to your base plan according to your needs.',
      items: [
        {
          icon: '📬',
          name: "Extra scanning",
          price: "€0.50",
          period: "excl. VAT/item",
          desc: "Beyond your plan quota (Confort: 40, Premium: 100 items/month). Unused quota is not carried over; scanning within 24 business hours.",
        },
        {
          icon: '📦',
          name: "Mail forwarding",
          price: "€3",
          period: "excl. VAT/dispatch",
          desc: "Available on all plans, postage re-invoiced at cost. 2 dispatches/month included in Premium. (This is not a head-office change fee.)",
        },
        {
          icon: '🗃️',
          name: "Parcel reception ≤ 5 kg",
          price: "€3",
          period: "excl. VAT/parcel",
          desc: "Included in Premium. Kept for 15 days, then returned or €2 excl. VAT/day. Refused: over 5 kg, dangerous or illicit goods, perishables, valuables.",
        },
      ],
    },

    spaces: {
      eyebrow: 'Professional spaces',
      title: "Workspace",
      titleHighlight: 'Rental',
      subtitle: 'Access our spaces for your meetings and client appointments, without a subscription.',
      reserveCta: 'Reserve →',
      items: [
        {
          icon: '🤝',
          name: 'Meeting Room',
          prices: [
            { duration: '1 hour', amount: '25€ excl. VAT' },
            { duration: 'Half-day (4h)', amount: '75€ excl. VAT' },
            { duration: 'Full day (8h)', amount: '140€ excl. VAT' },
          ],
          features: [
            "Up to 10 people",
            'Projector & screen',
            'High-speed fiber WiFi',
            'Free coffee & water',
            'Professional reception',
          ],
        },
        {
          icon: '💼',
          name: 'Private Office',
          prices: [
            { duration: '1 hour', amount: '25€ excl. VAT' },
            { duration: 'Half-day (4h)', amount: '75€ excl. VAT' },
            { duration: 'Full day (8h)', amount: '140€ excl. VAT' },
          ],
          features: [
            'Private individual office',
            'WiFi connection included',
            'Guaranteed quiet environment',
            'Air-conditioned in summer',
            'Printer available',
          ],
        },
      ],
    },

    faqs: {
      eyebrow: 'Frequently Asked Questions',
      title: 'Everything you need to',
      titleHighlight: 'know',
      items: [
        {
          q: "What is business domiciliation?",
          a: "Domiciliation involves setting the head office or administrative address of your company at an address that is not necessarily your residence or workplace.",
        },
        {
          q: 'Is domiciliation legal?',
          a: "Yes, perfectly legal under the 2003 Dutreil Law. We are an approved domiciliation center, and you can use our address to register your company.",
        },
        {
          q: "Where is the address located?",
          a: "Our prestigious address is located in Toulouse, the jewel of the European aerospace industry.",
        },
        {
          q: 'How long does it take to receive my certificate?',
          a: 'Your domiciliation certificate is sent within 24 hours after signing your contract online.',
        },
        {
          q: 'Is there a minimum commitment period?',
          a: "Yes: the law requires a minimum term of 3 months (art. R123-168 of the French Commercial Code). After that, you can cancel from your client area with one month’s notice. Amounts paid are not refunded upon cancellation.",
        },
        {
          q: "Is there a discount for annual payment?",
          a: "Yes: 20% off when you pay yearly, i.e. €153.60 (Essentiel), €230.40 (Confort) or €364.80 (Premium) excl. VAT per year.",
        },
        { q: "Are there any setup fees?", a: "No, none." },
        { q: "When can I collect my mail?", a: "Monday to Friday, 9am to 6pm, by appointment booked by email at least 24 hours in advance (48 hours for a bulky parcel)." },
        { q: "Can I receive parcels?", a: "Yes, up to 5 kg. Included in Premium, otherwise €3 excl. VAT per parcel. Kept for 15 days." },
        { q: "Is the annual subscription refundable?", a: "No. Your services continue until the end of the paid period." },
        { q: "How do I book the meeting room?", a: "By email, 48 hours in advance, at €25 excl. VAT per hour. Free cancellation up to 24 hours before." },
        { q: "Which documents do I need to provide?", a: "ID document, proof of address, articles of association or Kbis, and the La Poste mail proxy in your client area." },
      ],
    },

    trust: {
      items: [
        { icon: '🔒', text: '100% secure' },
        { icon: '📄', text: 'Certificate under 24h' },
        { icon: '✅', text: 'Dutreil Law compliant' },
        { icon: '↩️', text: "Cancel after 3 months" },
      ],
      payment: 'Secure payments by Stripe',
    },

    cta: {
      title: 'Ready to start?',
      subtitle: 'Register online in 5 minutes. No travel required.',
      primary: 'Choose my address →',
      secondary: 'Our services',
    },
  },

  villes: {
    pageTitle: 'Our domiciliation address in Toulouse — Domiciliation Pas Cher',

    hero: {
      eyebrow: 'Local presence',
      title: 'Our address in',
      titleHighlight: 'Toulouse',
      desc: 'A registered office address in Toulouse for your business, with your certificate issued within 24 hours once your file is approved.',
    },

    addressLabel: 'Domiciliation address',

    benefits: [
      {
        title: 'Official address',
        desc: 'A legally valid address for your company registration and Kbis.',
      },
      {
        title: 'Fast certificate',
        desc: 'Certificate issued within 24 hours once your file is approved, no travel needed.',
      },
      {
        title: 'Mail tracking',
        desc: 'Email notification with a photo of the envelope for every item received.',
      },
      {
        title: 'Price guarantee',
        desc: 'No set-up fees, subscription price guaranteed for 12 months.',
      },
    ],

    cities: [
      {
        name: 'Toulouse',
        region: 'Occitanie',
        desc: 'Nicknamed the “Pink City”, Toulouse is the heart of the European aerospace industry. A dynamic and strategic address.',
        avantages: ['Aerospace capital', 'Tech job market', 'Dynamic economy'],
        zip: '31',
        priceLabel: 'From',
        priceValue: '€16',
        priceUnit: ' excl. VAT/month',
        cta: 'Choose Toulouse',
      },
    ],

    helpCta: {
      title: 'A question about our address?',
      desc: 'Our advisors answer your questions about domiciliation in Toulouse and help you choose the right plan.',
      button: 'Talk to an advisor',
      trust: 'Reply within 1 business day',
      modalTitle: 'Talk to an advisor',
      modalHint: 'Leave your details and an advisor will get back to you shortly.',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      message: 'Your message (optional)',
      city: 'City of your business (optional)',
      submit: 'Send my request',
      sending: 'Sending…',
      success: 'Thank you! We will get back to you very soon.',
      error: 'Unable to send your request. Please try again or email us at contact@domiciliation-pas-cher.com',
      cancel: 'Cancel',
      required: 'Required field',
      emailInvalid: 'Invalid email',
    },
  },

  about: {
    pageTitle: 'About us: our story and values — Domiciliation Pas Cher',

    hero: {
      eyebrow: 'Our story',
      title: 'Your trusted partner',
      titleHighlight: 'in Toulouse',
      subtitle:
        'Domiciliation-Pas-Cher.com was born from a simple belief: starting a business should not cost a fortune. We offer a domiciliation address in Toulouse at a fair price.',
    },

    stats: [
      { value: 'Approved', label: 'by the prefecture' },
      { value: 'Toulouse', label: 'Official address' },
      { value: '24 h', label: 'Certificate' },
      { value: '€0', label: 'Set-up fees' },
      { value: '€16', label: 'excl. VAT/month, from' },
    ],

    mission: {
      eyebrow: 'Our mission',
      title: 'Making company formation',
      titleHighlight: 'simpler in France',
      paragraphs: [
        'We believe every entrepreneur deserves a quality business address without breaking the bank. That is why we built a 100% online platform that makes domiciliation affordable, fast and hassle-free.',
        'Based in Toulouse, we receive your mail, notify you as soon as it arrives, and scan or forward it depending on your plan.',
      ],
      highlights: [
        'Approved domiciliation centre',
        'Compliant with the 2003 Dutreil Act',
        'Price guaranteed for 12 months',
        'Subscription deductible as a business expense',
      ],
      cards: [
        '📍 An address in Toulouse',
        '🇫🇷 Prestigious address',
        '⚡ Certificate within 24 h',
      ],
    },

    values: {
      eyebrow: 'What defines us',
      title: 'Our',
      titleHighlight: 'values',
      items: [
        {
          icon: '💡',
          title: 'Accessibility',
          desc: 'Professional domiciliation accessible to every entrepreneur, from €16 excl. VAT/month.',
        },
        {
          icon: '🔒',
          title: 'Reliability',
          desc: 'A prefecture-approved domiciliation centre, compliant with French legal obligations.',
        },
        {
          icon: '⚡',
          title: 'Speed',
          desc: 'Sign up online in 5 minutes, certificate within 24 h. No unnecessary paperwork.',
        },
        {
          icon: '🤝',
          title: 'Proximity',
          desc: 'An available and responsive team to support every entrepreneur.',
        },
      ],
    },

    cta: {
      title: 'Join our community of entrepreneurs',
      subtitle: 'More than 2,000 entrepreneurs already trust us. Your turn!',
      button: 'Get started →',
    },
  },

  services: {
    pageTitle: 'Our services: domiciliation, mail and company formation — Domiciliation Pas Cher',

    header: {
      eyebrow: 'Our services',
      title: 'Services tailored to',
      titleHighlight: 'every stage of your project',
      subtitle:
        'From legal domiciliation to support with forming your company: we are with you at every step.',
      links: {
        domiciliation: 'All about domiciliation',
        creation: 'All about company formation',
      },
    },

    domiciliation: {
      eyebrow: 'Step by step',
      title: 'How to get',
      titleHighlight: 'your domiciliation?',
      subtitle: 'A simple, 100% online process designed to save you time from day one.',
      steps: [
        {
          n: '1',
          title: 'Choose your plan',
          desc: 'Essentiel, Confort or Premium, paid monthly or annually (20% off). No set-up fees.',
          cta: { label: 'Get started', to: '/tarifs' },
        },
        {
          n: '2',
          title: 'Complete your file',
          desc: 'Enter your details, upload the required supporting documents, then pay online through our secure payment.',
        },
        {
          n: '3',
          title: 'Sign your contract',
          desc: 'Sign your domiciliation contract electronically and complete the postal power of attorney in your client area.',
        },
        {
          n: '4',
          title: 'Receive your certificate',
          desc: 'Your domiciliation certificate is issued within 24 hours once your file is approved. Once you have your Kbis, upload it to your client area to finalise your domiciliation.',
        },
      ],
      card: {
        title: 'Official domiciliation',
        subtitle: 'A valid legal address for your Kbis',
        items: [
          '100% online sign-up',
          'Certificate within 24 h',
          'Prefecture-approved centre',
          'Cancel after 3 months (1-month notice)',
          'From €16 excl. VAT/month',
        ],
        cta: 'Get started →',
      },
    },

    courrier: {
      eyebrow: 'Mail handling',
      title: 'How does',
      titleHighlight: 'mail handling work?',
      subtitle: 'Discover how our mail service works in 5 steps.',
      steps: [
        { n: '1', title: 'Reception', desc: 'We securely receive your mail at our Toulouse address.' },
        { n: '2', title: 'Identification', desc: 'Each item is identified and logged in your client area.' },
        { n: '3', title: 'Notification', desc: 'You receive an email notification with a photo of the envelope for every item received.' },
        { n: '4', title: 'Scanning', desc: 'With the Confort (40 items/month) and Premium (100 items/month) plans, your mail is scanned within 24 business hours and available in your client area.' },
        { n: '5', title: 'Forwarding or collection', desc: 'On request, your mail is forwarded to the address of your choice (€3 excl. VAT + postage, 2 dispatches/month included in Premium) or collected on site by appointment.' },
      ],
      options: [
        {
          icon: '📬',
          name: 'Scanning',
          desc: 'Included in Confort (40 items/month) and Premium (100 items/month)',
          price: '€0.50',
          period: 'excl. VAT/extra item',
        },
        {
          icon: '📦',
          name: 'Mail forwarding',
          desc: 'Sent to the address of your choice, postage at cost (2/month included in Premium)',
          price: '€3',
          period: 'excl. VAT/dispatch',
        },
      ],
    },

    creation: {
      eyebrow: 'Company formation',
      title: 'Start your company',
      titleHighlight: 'in 5 steps',
      subtitle: 'Personalised support, from your first appointment to obtaining your Kbis.',
      steps: [
        {
          n: '1',
          title: 'Book a free appointment',
          desc: 'Pick a 30-minute slot with an advisor, by phone or video call.',
        },
        {
          n: '2',
          title: 'Review your project',
          desc: 'Legal structure, taxation, remuneration: your advisor reviews your project and gives you a clear estimate of the formalities.',
        },
        {
          n: '3',
          title: 'Domicile your future company',
          desc: 'Sign up online for the plan of your choice. The domiciliation certificate, issued within 24 hours once your file is approved, is required for registration.',
        },
        {
          n: '4',
          title: 'Prepare your file',
          desc: 'Articles of association, legal notice, filing with the INPI one-stop shop: depending on the support you choose, we guide you or handle the formalities for you.',
        },
        {
          n: '5',
          title: 'Finalise your domiciliation',
          desc: 'Once you have your Kbis, upload it with your articles of association to your client area: your domiciliation is then complete and compliant.',
        },
      ],
      card: {
        title: 'Start your company',
        subtitle: 'End-to-end support',
        items: [
          'First 30-minute appointment free',
          'Clear estimate before any commitment',
          'Tailored support',
        ],
        cta: 'Book an appointment →',
      },
    },

    formes: {
      eyebrow: 'Practical Guide',
      title: 'Legal',
      titleHighlight: 'Forms',
      subtitle: 'Lost about legal forms? We explain everything!',
      intro: 'Discover everything you need to know about {label} to choose the right structure for your project.',
      cta: 'Domicile my {label} →',
      ctaNote: 'Certificate within 24 h · From €16 excl. VAT/month',
      items: [
        {
          id: 'sasu',
          label: 'SASU',
          color: '#1A56DB',
          sections: [
            {
              title: 'Definition',
              text: "A SASU (simplified joint-stock company with a single shareholder) is a commercial company with its own legal personality, unlike individual businesses.",
            },
            {
              title: 'Taxation',
              text: "A SASU is subject to corporate tax (IS) by default upon creation. The entrepreneur can freely opt for income tax (IR) for a maximum of 5 fiscal years.",
            },
            {
              title: 'For whom?',
              text: "A SASU is suitable for many commercial, civil, artisanal, and agricultural activities. It is particularly suited for entrepreneurs wishing to run a commercial activity on their own without setting up as a sole proprietorship.",
            },
            {
              title: 'Advantages',
              text: "A SASU is very simple to manage daily as all decisions rely solely on the single shareholder. Drafting the bylaws offers great freedom to define the internal organization!",
            },
            {
              title: 'Capital',
              text: "A SASU has only one shareholder and requires no minimum share capital. At least half of the cash contributions must be paid up upon creation.",
            },
          ],
        },
        {
          id: 'sarl',
          label: 'SARL',
          color: '#0EA5E9',
          sections: [
            {
              title: 'Definition',
              text: 'The SARL (limited liability company) is a very common legal form in France. It can have 2 to 100 partners whose liability is limited to their contributions.',
            },
            {
              title: 'Taxation',
              text: "A SARL is subject to corporate tax (IS) by default. Under conditions, family SARLs can opt for income tax (IR).",
            },
            {
              title: 'For whom?',
              text: 'A SARL suits small and medium enterprises with multiple partners wanting to strictly regulate rights and duties through bylaws and law.',
            },
            {
              title: 'Advantages',
              text: "Solid and reassuring legal framework for partners and creditors. Partners are only liable up to their contributions. Favorable social regime for the majority manager.",
            },
            {
              title: 'Capital',
              text: "No legal minimum capital (symbolic €1 possible). In practice, sufficient capital gives the company credibility with banks and partners.",
            },
          ],
        },
        {
          id: 'eurl',
          label: 'EURL',
          color: '#10B981',
          sections: [
            {
              title: 'Definition',
              text: "An EURL (single-member limited liability company) is a SARL with only one partner. It offers limited liability protection to a sole entrepreneur.",
            },
            {
              title: 'Taxation',
              text: "An EURL is taxed by default on income tax (IR) if the single partner is a natural person. It can opt for corporate tax (IS).",
            },
            {
              title: 'For whom?',
              text: "Ideal for entrepreneurs wanting to work alone while protecting their personal assets, with a more structured legal framework than a sole proprietorship.",
            },
            {
              title: 'Advantages',
              text: "Protection of personal assets, ability to evolve into a SARL if partners join, social status of the manager, credibility with partners.",
            },
            {
              title: 'Capital',
              text: "No legal minimum capital required. However, capital appropriate to the activity is recommended to reassure commercial and banking partners.",
            },
          ],
        },
        {
          id: 'ei',
          label: 'Auto-entrepreneur / EI',
          color: '#F59E0B',
          sections: [
            {
              title: 'Definition',
              text: "The sole proprietorship (EI) is the simplest form for conducting business in your own name. Since 2022, the unique status protects the entrepreneur's personal assets.",
            },
            {
              title: 'Taxation',
              text: "An EI is taxed under income tax (IR) in the BIC, BNC, or BA category depending on the activity. Opting for corporate tax (IS) is possible under conditions.",
            },
            {
              title: 'For whom?',
              text: 'Ideal for quickly starting an activity without complex formalities. Recommended for low financial risk activities and auto-entrepreneurs.',
            },
            {
              title: 'Advantages',
              text: 'Fast and inexpensive creation, simplified administrative management, no capital requirement. Since 2022, personal assets are protected by default.',
            },
            {
              title: 'Capital',
              text: "No capital required. The entrepreneur invests personal funds, but personal assets are now protected thanks to the 2022 reform.",
            },
          ],
        },
        {
          id: 'sas',
          label: 'SAS',
          color: '#8B5CF6',
          sections: [
            {
              title: 'Definition',
              text: "The SAS (simplified joint-stock company) is a commercial company offering great flexibility to partners. It must have at least two partners.",
            },
            {
              title: 'Taxation',
              text: "The SAS is subject to corporate tax (IS) by default. It can opt for income tax (IR) under certain conditions (for a maximum of 5 years).",
            },
            {
              title: 'For whom?',
              text: "Ideal for ambitious projects, startups, or companies expecting to bring in investors, thanks to flexible bylaws.",
            },
            {
              title: 'Advantages',
              text: "Great statutory freedom allowing tailored governance. The leader (President) has an assimilated-employee status, offering better social protection.",
            },
            {
              title: 'Capital',
              text: "No minimum share capital is required; a symbolic €1 is enough. Capital can be variable and made of cash or in-kind contributions.",
            },
          ],
        },
        {
          id: 'sci',
          label: 'SCI',
          color: '#EC4899',
          sections: [
            {
              title: 'Definition',
              text: 'An SCI (civil real estate company) is a civil company allowing several people to own, manage, and transmit common real estate.',
            },
            {
              title: 'Taxation',
              text: "By default, an SCI is tax transparent and subject to income tax (IR) at the partner level. It can opt for IS depending on the desired tax strategy.",
            },
            {
              title: 'For whom?',
              text: "Perfect for families wishing to manage real estate together or entrepreneurs separating business real estate from their commercial activity.",
            },
            {
              title: 'Advantages',
              text: "Facilitates management and transmission of real estate (successive tax allowances). Avoids joint ownership blockages.",
            },
            {
              title: 'Capital',
              text: "Free capital, consisting of cash or in-kind contributions (real estate). No minimum amount is imposed by law.",
            },
          ],
        },
        {
          id: 'association',
          label: 'Association',
          color: '#F97316',
          sections: [
            {
              title: 'Definition',
              text: "A 1901 law association is a group of at least two people pooling knowledge or activity for a purpose other than sharing profits.",
            },
            {
              title: 'Taxation',
              text: "In principle, the association is not subject to commercial taxes (IS, VAT, CET) if its management is disinterested and it doesn't compete with the private sector.",
            },
            {
              title: 'For whom?',
              text: 'For non-profit projects: sports clubs, cultural activities, charities, unions, or professional gatherings.',
            },
            {
              title: 'Advantages',
              text: 'Simple creation and operation. Ability to receive donations, fees, and public subsidies. Very flexible framework.',
            },
            {
              title: 'Capital',
              text: "No share capital. The association operates with member fees, donations, subsidies, and income from potential activities.",
            },
          ],
        },
      ],
    },

    faqs: {
      eyebrow: 'Frequently asked questions',
      title: 'Your questions,',
      titleHighlight: 'our answers',
      items: [
        {
          q: 'Can I start my domiciliation before my company is formed?',
          a: 'Yes. Simply enter the intended legal form in the sign-up form and provide your draft articles of association. Once the company is registered, upload a copy of the articles filed with the registry and your Kbis to your client area.',
        },
        {
          q: 'Can I change my company name?',
          a: 'Yes. A sole proprietorship or a company can change its corporate or trade name at any time, following a procedure governed by law. To update your domiciliation certificate, record the name change in your client area and attach the updated articles of association and Kbis.',
        },
        {
          q: 'How does mail handling work?',
          a: 'You receive an email notification with a photo of the envelope for every item received. With the Confort and Premium plans, your mail is scanned (40 or 100 items/month) and available in your client area. Physical mail can be collected on site by appointment or forwarded to the address of your choice (€3 excl. VAT + postage, 2 dispatches/month included in Premium).',
        },
        {
          q: 'Can I book a meeting room?',
          a: 'Yes. Our meeting room in Toulouse can be booked by the hour (€25 excl. VAT), half day or full day, including for your general meetings. Book at least 48 hours in advance, from your client area or by email at contact@domiciliation-pas-cher.com.',
        },
      ],
    },

    cta: {
      title: 'Start your domiciliation today',
      subtitle: 'Online sign-up · Certificate within 24 h · From €16 excl. VAT/month',
      primary: 'View pricing →',
      secondary: 'Learn more about us →',
    },
  },

  fichesPratiques: {
    pageTitle: 'Practical guides for entrepreneurs — Domiciliation Pas Cher',
    eyebrow: 'Resource centre',
    title: 'Practical',
    titleHighlight: 'guides',
    subtitle: 'Everything you need to start, run and grow your business with confidence.',
    cta: {
      title: 'Ready to launch your business?',
      subtitle: 'Join the more than 2,000 entrepreneurs who trust us with their domiciliation.',
      button: 'Discover our plans',
    },
    backLink: 'Back to practical guides',
    expertTip: '💡 Expert tip',
    expertTipText: "Don't wait until you are overwhelmed to organise your paperwork. A good domiciliation is the foundation of a solid business that is credible in the market.",
    genericContent: 'Entrepreneurship is a demanding but exciting journey. At Domiciliation Pas Cher, our mission is to simplify your admin so you can focus on what really matters: your growth.',
    genericContent2: 'Every situation is unique, so we recommend seeking advice from a professional (accountant, lawyer) for decisions specific to your legal structure. For any question about your domiciliation, our team is here to help.',
    sidebar: {
      needHelp: 'Need help?',
      helpDesc: 'Our advisors support you with every step of your domiciliation.',
      helpCta: 'View our plans',
      similarArticles: 'Related articles',
    },
    fiches: {
      'fiscalite-et-imposition': {
        title: 'Taxation: understanding the basics',
        category: 'Running your business',
        content: 'Taxation is a pillar of business management. Choosing between corporate tax (IS) and income tax (IR) directly affects your cash flow. Key points to know: VAT thresholds, tax credits and annual filing obligations, so you stay compliant with the tax authorities.',
        icon: '📊'
      },
      'transfert-de-siege-social': {
        title: 'Transferring your registered office: the steps to follow',
        category: 'Running your business',
        content: 'Transferring your registered office requires a rigorous procedure: shareholder decision, amendment of the articles, publication of a legal notice and filing with the one-stop shop. Well prepared, the transfer happens without interrupting your business.',
        icon: '🏢'
      },
      'gouvernance': {
        title: 'Governance: organising decision-making in your company',
        category: 'Running your business',
        content: 'Governance defines how power is shared within your company. Whether you run an SAS or an SARL, structuring decisions (chair, management, general meetings) is essential to the longevity and transparency of your business, especially towards investors.',
        icon: '⚖️'
      },
      'services-aux-entreprises': {
        title: 'Essential services to boost your productivity',
        category: 'Running your business',
        content: 'Domiciliation, management software, cloud storage or legal assistance: business services let you delegate time-consuming tasks. An overview of the services that help you focus on your core business.',
        icon: '🛠️'
      },
      'pieges-et-astuces-gestion': {
        title: 'Management: avoid the classic pitfalls and save time',
        category: 'Running your business',
        content: 'Neglecting cash-flow monitoring or missing an Urssaf deadline can be costly. Automate your invoicing reminders and set up your dashboards from day one for sound, stress-free management.',
        icon: '🚩'
      },
      'reformes-legales': {
        title: 'Legal reforms: what changes for you',
        category: 'News',
        content: 'Finance acts, e-invoicing, changes to micro-business thresholds: the legal environment keeps moving. Stay informed to anticipate the impact on your business and take advantage of available support schemes.',
        icon: '📜'
      },
      'podcast': {
        title: "Entrepreneurs' stories: learning from founders' journeys",
        category: 'News',
        content: 'Podcasts, testimonials, lessons learned: listening to those who have been there is one of the best ways to learn. How to use these stories to avoid the most common mistakes and enrich your own project.',
        icon: '🎙️'
      },
      'entrepreneuriat': {
        title: 'Entrepreneurship in France: the current landscape',
        category: 'News',
        content: 'Despite a challenging economic climate, business creation remains very dynamic in France. Trends by sector, profile of new founders and growth opportunities, from the circular economy to artificial intelligence.',
        icon: '🚀'
      },
      'tech': {
        title: 'Tech and innovation: the essential tools',
        category: 'News',
        content: 'From automation to cybersecurity, technology is your best ally. The must-have online tools to secure your data and grow your business.',
        icon: '💻'
      },
      'les-adresses': {
        title: 'Choosing your address: image and strategy',
        category: 'Domiciliation',
        content: 'Your registered office address is the showcase of your business. How the choice of address shapes your image, and why an address in Toulouse, from €16 excl. VAT/month, can be an asset.',
        icon: '📍'
      },
      'gestion-du-courrier': {
        title: 'Mail handling: speed and confidentiality',
        category: 'Domiciliation',
        content: 'Notification with a photo of the envelope, scanning, forwarding or on-site collection: how your mail is handled, and which plan to choose based on the volume you receive.',
        icon: '✉️'
      },
      'pieges-et-astuces-domiciliation': {
        title: 'Domiciliation: mistakes to avoid',
        category: 'Domiciliation',
        content: "Always check your domiciliation provider's prefecture approval. This guide helps you spot offers that are too good to be true and read the clauses of a domiciliation contract carefully.",
        icon: '🔍'
      },
      'tout-savoir-sur-la-domiciliation': {
        title: 'The complete guide to business domiciliation',
        category: 'Domiciliation',
        content: 'Why use a domiciliation address? What are the obligations of the provider and of the domiciled company? Answers to the essential questions, from registration and the Kbis to holding general meetings.',
        icon: '📘'
      },
      'formes-juridiques': {
        title: 'SASU, EURL, SARL: which legal form should you choose?',
        category: 'Starting a business',
        content: "Choosing a legal structure is a founder's first strategic decision. Asset protection, the director's social security status and flexibility of the articles: the criteria to make the right choice for your project.",
        icon: '📋'
      },
      'aides-a-la-creation': {
        title: 'Start-up support: ARCE, ACRE and funding',
        category: 'Starting a business',
        content: 'Did you know you may be eligible for social charge exemptions or start-up capital through France Travail? An overview of business creation support schemes and regional grants.',
        icon: '🎁'
      },
      'les-administrations': {
        title: 'One-stop shop and INPI: finding your way through the administration',
        category: 'Starting a business',
        content: "Since 2023, company formalities go through the INPI one-stop shop. Prepare your supporting documents to avoid rejections and get your SIRET number quickly.",
        icon: '🏛️'
      },
      'pieges-et-astuces-creation': {
        title: 'Starting up: tips for a successful launch',
        category: 'Starting a business',
        content: "Don't confuse revenue with profit! A few tips to draft your articles of association properly and choose the financial year-end best suited to your business.",
        icon: '💡'
      },
      'la-creation-d-entreprise': {
        title: 'Launching your project: from idea to first customer',
        category: 'Starting a business',
        content: 'Starting a business is a marathon. Market validation, a first business plan, first customers: the steps to turn your idea into a profitable company.',
        icon: '🏁'
      },
      'auto-entrepreneur-astuces-impot': {
        title: 'Micro-entrepreneurs: 5 tips to pay less tax',
        category: 'Pick of the month',
        content: 'Flat-rate withholding, standard allowance, VAT exemption thresholds: 5 practical levers to legally optimise the taxation of your micro-business.',
        icon: '💰'
      },
      'qu-est-ce-que-la-domiciliation': {
        title: 'What is domiciliation? A simple definition',
        category: 'Pick of the month',
        content: 'Domiciliation lets you separate your private and professional lives. Why many founders choose an approved domiciliation centre for their registered office.',
        icon: '❓'
      },
      'cout-gestion-comptabilite': {
        title: 'How much does bookkeeping really cost?',
        category: 'Pick of the month',
        content: 'Traditional accountant or online software? A cost comparison based on your invoice volume and your advisory needs.',
        icon: '💸'
      },
      'creer-entreprise-en-ligne': {
        title: 'How to start a company online?',
        category: 'Pick of the month',
        content: 'No more paper forms: company formalities are completed online through the INPI one-stop shop. The steps to follow and the points to check to stay legally compliant.',
        icon: '🖱️'
      },
    },
  },
  souscription: {
  "back": "Back",
  "prevStep": "Previous step",
  "chosenPlan": "Chosen plan",
  "secureForm": "SSL secure form",
  "step1ofN": "Step 1 of",
  "project": {
    "title": "What is your project?",
    "subtitle": "Select the situation that fits your case",
    "creation": "Company creation (Consultation)",
    "transfer": "I am transferring my registered office",
    "legalForm": "Legal form"
  },
  "contact": {
    "title": "Your contact details",
    "subtitle": "Legal representative information",
    "lastName": "Last name",
    "firstName": "First name",
    "email": "Email",
    "phone": "Phone",
    "birthDate": "Birth date",
    "birthPlace": "Birth place",
    "personalAddress": "Personal address"
  },
  "company": {
    "title": "Your company",
    "subtitle": "Information about your company",
    "companyName": "Company name",
    "siren": "SIREN (optional)",
    "activity": "Main activity",
    "nationality": "Nationality",
    "quality": "Quality"
  },
  "domiciliation": {
    "title": "Address choice",
    "subtitle": "Select the city for your domiciliation"
  },
  "documents": {
    "title": "Supporting documents",
    "subtitle": "Upload your documents to complete your file",
    "idCard": "ID card (Front/Back)",
    "proofOfAddress": "Proof of address (- 3 months)"
  },
  "summary": {
    "title": "Summary & Request",
    "subtitle": "Check your information before confirming",
    "plan": "Plan",
    "paymentFrequency": "Payment frequency",
    "monthly": "Monthly",
    "annual": "Annual (20% off)",
    "total": "Total",
    "acceptCgv": "I accept the General Terms of Sale",
    "submitCreation": "Confirm appointment request ->",
    "submitPayment": "Pay {price} securely ->",
    "processing": "Processing...",
    "needCgv": "Accept the Terms of Sale to continue"
  }
},
  creation: {
    badge: '✨ Advice and support',
    title: 'Start or get advice:',
    titleHighlight: 'we support you',
    subtitle: 'Two services to get your company off to a good start. Pick yours and book a 30-minute call with an advisor.',
    cardCta: 'Book an appointment',
    cards: [
      {
        id: 'creation',
        title: 'Company formation',
        desc: 'We set up your company from start to finish and file your application with the one-stop shop.',
        features: [
          'Tailor-made articles of association',
          'Help with the share capital deposit',
          'Publication of the legal notice',
          'Registration and Kbis extract',
        ],
        tag: '📋 Formalities handled for you',
      },
      {
        id: 'conseil',
        featured: true,
        badge: 'Ideal to get started',
        title: 'Formation advice',
        desc: 'An advisor reviews your project and points you to the most suitable structure.',
        features: [
          'Choosing your status: SASU, SAS, SARL, EURL…',
          'Tax and social optimisation for the director',
          'Simulation of your net pay',
          'Detailed roadmap and budget',
        ],
        tag: '🎁 First call free',
      },
    ],
    reassurance: [
      '30 free minutes',
      'Video call or phone',
      'No commitment',
      'Dedicated advisor',
    ],
  },

  rendezVous: {
    pageTitle: 'Book an appointment: company formation — Domiciliation Pas Cher',
    eyebrow: 'Advisory appointment',
    title: 'Book your',
    titleHighlight: '30-minute slot',
    subtitle: 'Pick the date and time that suit you. An advisor will review your company formation project with you.',
    benefits: [
      { icon: '🎯', title: 'Personalised review', desc: 'The legal structure best suited to your activity.' },
      { icon: '💰', title: 'Transparent estimate', desc: 'The real cost of forming your company, with no hidden fees.' },
      { icon: '🚀', title: 'Clear action plan', desc: 'The steps and timeline to obtain your Kbis.' },
    ],
    loading: 'Loading calendar…',
    errorTitle: 'Online booking unavailable',
    errorBody: 'The online calendar cannot be displayed right now. Call or email us and we will suggest a time slot.',
    contactCta: 'Email contact@domiciliation-pas-cher.com',
    openCalendly: 'Open the calendar in a new tab',
    backLink: 'Back to pricing',
  },

  seo: {
    home: { description: 'Business domiciliation in Toulouse from €16 excl. VAT/month: official registered office address, approved centre, certificate within 24 h, mail handling and 100% online sign-up.' },
    tarifs: { description: 'Compare our domiciliation plans in Toulouse: Essentiel, Confort and Premium. Transparent pricing from €16 excl. VAT/month, 20% off with annual payment, no set-up fees.' },
    villes: { description: 'Domicile your company at 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse: an official address for your Kbis, your banks and your customers.' },
    services: { description: 'Domiciliation, mail notification and scanning, forwarding, meeting room and company formation support: all our services in Toulouse.' },
    about: { description: 'Discover Domiciliation Pas Cher: an approved domiciliation centre in Toulouse, our values and our commitment to simple, reliable and affordable domiciliation.' },
    rendezVous: { description: 'Book a free 30-minute appointment with an advisor for your company formation: choice of legal structure, transparent estimate and an action plan through to your Kbis.' },
    fichesPratiques: { description: 'Practical guides for entrepreneurs: taxation, registered office transfer, governance, domiciliation, company formation and legal news.' },
  },

  cookieConsent: {
    ariaLabel: "Cookie settings",
    title: "Your privacy matters",
    text: "We use audience measurement and advertising cookies (Google) only with your consent. You can accept or refuse, and change your choice at any time via “Manage cookies” at the bottom of the page.",
    learnMore: "Learn more",
    accept: "Accept all",
    refuse: "Refuse all",
  },

  espaceClient: espaceClient('en'),
};
