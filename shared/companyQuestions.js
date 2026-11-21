/**
 * Les deux questions obligatoires du domiciliataire (art. R123-168 du Code de commerce) :
 *  1. où sont conservés les documents comptables du client (un seul choix) ;
 *  2. où le client exerce son activité (plusieurs choix possibles).
 * Posées dans le tunnel (écran « Votre entreprise »), enregistrées dans extra_info de la demande puis
 * de la fiche client, affichées côté admin pour les contrôles. Source unique front + serveur.
 */

/** Clés enregistrées dans extra_info. */
export const COMPANY_QUESTION_FIELDS = {
    accountingLocation: 'docsComptablesLieu',        // 'expert_comptable' | 'domicile' | 'autre'
    accountingFirm: 'docsComptablesCabinet',          // nom du cabinet (expert_comptable)
    accountingAddress: 'docsComptablesAdresse',       // adresse (expert_comptable / autre ; domicile = adresse perso recopiée)
    activityLocations: 'lieuxActivite',               // tableau : 'clients_chantiers' | 'domicile' | 'local_professionnel' | 'en_ligne'
    activityAddress: 'lieuActiviteAdresse',           // adresse du local professionnel
};

export const ACCOUNTING_LOCATION_OPTIONS = ['expert_comptable', 'domicile', 'autre'];
export const ACTIVITY_LOCATION_OPTIONS = ['clients_chantiers', 'domicile', 'local_professionnel', 'en_ligne'];

export const COMPANY_QUESTION_LABELS = {
    fr: {
        legalNote: 'Ces deux réponses sont obligatoires pour tout domiciliataire (article R123-168 du Code de commerce). Elles restent dans votre dossier et ne sont communiquées qu’aux administrations habilitées.',
        accountingTitle: 'Où sont conservés vos documents comptables ? *',
        accountingOptions: {
            expert_comptable: 'Chez mon expert-comptable',
            domicile: 'À mon domicile',
            autre: 'À une autre adresse',
        },
        accountingFirm: 'Nom du cabinet *',
        accountingFirmPlaceholder: 'Ex : Cabinet Dupont Expertise',
        accountingAddress: 'Adresse *',
        accountingAddressPlaceholder: 'Numéro, rue, code postal, ville',
        accountingHomeHint: 'Votre adresse personnelle sera reprise automatiquement.',
        activityTitle: 'Où exercez-vous votre activité ? *',
        activityHint: 'Plusieurs réponses possibles.',
        activityOptions: {
            clients_chantiers: 'Chez mes clients ou sur des chantiers',
            domicile: 'À mon domicile',
            local_professionnel: 'Dans un local professionnel',
            en_ligne: 'En ligne uniquement',
        },
        activityAddress: 'Adresse du local *',
        activityAddressPlaceholder: 'Numéro, rue, code postal, ville',
        required: 'Requis',
        chooseOne: 'Choisissez une réponse',
        chooseAtLeastOne: 'Choisissez au moins une réponse',
        recapAccounting: 'Documents comptables',
        recapActivity: 'Lieux d’activité',
        homeAddress: 'adresse personnelle',
    },
    en: {
        legalNote: 'Both answers are required from every registered-office provider (article R123-168 of the French Commercial Code). They stay in your file and are only disclosed to authorised administrations.',
        accountingTitle: 'Where are your accounting records kept? *',
        accountingOptions: {
            expert_comptable: 'At my accountant’s',
            domicile: 'At my home',
            autre: 'At another address',
        },
        accountingFirm: 'Accounting firm name *',
        accountingFirmPlaceholder: 'E.g. Dupont Accounting',
        accountingAddress: 'Address *',
        accountingAddressPlaceholder: 'Number, street, postcode, city',
        accountingHomeHint: 'Your personal address will be used automatically.',
        activityTitle: 'Where do you carry out your activity? *',
        activityHint: 'Several answers possible.',
        activityOptions: {
            clients_chantiers: 'At my clients’ premises or on sites',
            domicile: 'At my home',
            local_professionnel: 'In business premises',
            en_ligne: 'Online only',
        },
        activityAddress: 'Premises address *',
        activityAddressPlaceholder: 'Number, street, postcode, city',
        required: 'Required',
        chooseOne: 'Choose one answer',
        chooseAtLeastOne: 'Choose at least one answer',
        recapAccounting: 'Accounting records',
        recapActivity: 'Places of activity',
        homeAddress: 'personal address',
    },
    ru: {
        legalNote: 'Оба ответа обязательны для любого домицилиатора (статья R123-168 Торгового кодекса Франции). Они хранятся в вашем досье и передаются только уполномоченным органам.',
        accountingTitle: 'Где хранятся ваши бухгалтерские документы? *',
        accountingOptions: {
            expert_comptable: 'У моего бухгалтера',
            domicile: 'У меня дома',
            autre: 'По другому адресу',
        },
        accountingFirm: 'Название бухгалтерской фирмы *',
        accountingFirmPlaceholder: 'Напр.: Cabinet Dupont Expertise',
        accountingAddress: 'Адрес *',
        accountingAddressPlaceholder: 'Дом, улица, индекс, город',
        accountingHomeHint: 'Ваш личный адрес будет подставлен автоматически.',
        activityTitle: 'Где вы ведёте деятельность? *',
        activityHint: 'Можно выбрать несколько вариантов.',
        activityOptions: {
            clients_chantiers: 'У клиентов или на объектах',
            domicile: 'У меня дома',
            local_professionnel: 'В коммерческом помещении',
            en_ligne: 'Только онлайн',
        },
        activityAddress: 'Адрес помещения *',
        activityAddressPlaceholder: 'Дом, улица, индекс, город',
        required: 'Обязательно',
        chooseOne: 'Выберите один ответ',
        chooseAtLeastOne: 'Выберите хотя бы один ответ',
        recapAccounting: 'Бухгалтерские документы',
        recapActivity: 'Места деятельности',
        homeAddress: 'личный адрес',
    },
};

export function companyQuestionLabels(lang) {
    return COMPANY_QUESTION_LABELS[lang] || COMPANY_QUESTION_LABELS.fr;
}

const F = COMPANY_QUESTION_FIELDS;
const str = (v) => String(v ?? '').trim();
const list = (v) => (Array.isArray(v) ? v.filter((x) => ACTIVITY_LOCATION_OPTIONS.includes(x)) : []);

/** Valeurs vides pour l'état initial du tunnel. */
export const EMPTY_COMPANY_QUESTIONS = {
    [F.accountingLocation]: '',
    [F.accountingFirm]: '',
    [F.accountingAddress]: '',
    [F.activityLocations]: [],
    [F.activityAddress]: '',
};

/** Erreurs de validation (clé = champ), vide si tout est bon. */
export function validateCompanyQuestions(data, lang = 'fr') {
    const L = companyQuestionLabels(lang);
    const e = {};
    const where = str(data?.[F.accountingLocation]);
    if (!ACCOUNTING_LOCATION_OPTIONS.includes(where)) e[F.accountingLocation] = L.chooseOne;
    if (where === 'expert_comptable') {
        if (!str(data?.[F.accountingFirm])) e[F.accountingFirm] = L.required;
        if (!str(data?.[F.accountingAddress])) e[F.accountingAddress] = L.required;
    }
    if (where === 'autre' && !str(data?.[F.accountingAddress])) e[F.accountingAddress] = L.required;
    const places = list(data?.[F.activityLocations]);
    if (!places.length) e[F.activityLocations] = L.chooseAtLeastOne;
    if (places.includes('local_professionnel') && !str(data?.[F.activityAddress])) e[F.activityAddress] = L.required;
    return e;
}

/** Vrai si les deux questions ont été répondues (dossiers créés avant leur ajout : faux). */
export function hasCompanyQuestions(extra) {
    return Object.keys(validateCompanyQuestions(extra || {}, 'fr')).length === 0;
}

/**
 * Résumé lisible des deux réponses, pour le récapitulatif du tunnel et la fiche admin.
 * `homeAddress` : adresse personnelle du dirigeant, reprise pour « à mon domicile ».
 */
export function summarizeCompanyQuestions(extra, { lang = 'fr', homeAddress = '' } = {}) {
    const L = companyQuestionLabels(lang);
    const x = extra || {};
    const where = str(x[F.accountingLocation]);
    const home = str(homeAddress) || str(x.adressePerso) || str(x.adresseComplete);
    let accounting = '';
    if (where === 'expert_comptable') {
        accounting = [L.accountingOptions.expert_comptable, str(x[F.accountingFirm]), str(x[F.accountingAddress])].filter(Boolean).join(' — ');
    } else if (where === 'domicile') {
        accounting = `${L.accountingOptions.domicile}${home ? ` — ${home}` : ''}`;
    } else if (where === 'autre') {
        accounting = [L.accountingOptions.autre, str(x[F.accountingAddress])].filter(Boolean).join(' — ');
    }
    const places = list(x[F.activityLocations]).map((p) => {
        if (p === 'local_professionnel' && str(x[F.activityAddress])) return `${L.activityOptions[p]} (${str(x[F.activityAddress])})`;
        if (p === 'domicile' && home) return `${L.activityOptions[p]} (${home})`;
        return L.activityOptions[p];
    });
    return { accounting, activity: places.join(' · ') };
}
