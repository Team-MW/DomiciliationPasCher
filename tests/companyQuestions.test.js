// Questions légales du domiciliataire (art. R123-168) : validation, résumé admin, trois langues.
import { describe, it, expect } from 'vitest';
import {
    COMPANY_QUESTION_FIELDS as F, COMPANY_QUESTION_LABELS, EMPTY_COMPANY_QUESTIONS,
    validateCompanyQuestions, hasCompanyQuestions, summarizeCompanyQuestions,
} from '../shared/companyQuestions.js';

describe('validateCompanyQuestions', () => {
    it('vide : les deux questions sont requises', () => {
        const e = validateCompanyQuestions(EMPTY_COMPANY_QUESTIONS);
        expect(e[F.accountingLocation]).toBe('Choisissez une réponse');
        expect(e[F.activityLocations]).toBe('Choisissez au moins une réponse');
        expect(hasCompanyQuestions(EMPTY_COMPANY_QUESTIONS)).toBe(false);
        expect(hasCompanyQuestions({})).toBe(false);
    });
    it('expert-comptable : cabinet + adresse ; local professionnel : adresse', () => {
        const e = validateCompanyQuestions({ [F.accountingLocation]: 'expert_comptable', [F.activityLocations]: ['local_professionnel'] });
        expect(Object.keys(e).sort()).toEqual([F.accountingAddress, F.accountingFirm, F.activityAddress].sort());
        const ok = validateCompanyQuestions({
            [F.accountingLocation]: 'expert_comptable', [F.accountingFirm]: 'Cabinet X', [F.accountingAddress]: '1 rue A, 31000 Toulouse',
            [F.activityLocations]: ['local_professionnel', 'en_ligne'], [F.activityAddress]: '2 rue B, 31000 Toulouse',
        });
        expect(ok).toEqual({});
    });
    it('domicile : aucune adresse à saisir ; valeur inconnue refusée ; message traduit', () => {
        expect(validateCompanyQuestions({ [F.accountingLocation]: 'domicile', [F.activityLocations]: ['domicile'] })).toEqual({});
        expect(validateCompanyQuestions({ [F.accountingLocation]: 'bureau', [F.activityLocations]: ['mars'] }, 'en')).toEqual({
            [F.accountingLocation]: 'Choose one answer', [F.activityLocations]: 'Choose at least one answer',
        });
    });
});

describe('summarizeCompanyQuestions (récap tunnel + fiche admin)', () => {
    it('reprend l’adresse personnelle pour « à mon domicile »', () => {
        const s = summarizeCompanyQuestions({ [F.accountingLocation]: 'domicile', [F.activityLocations]: ['domicile', 'clients_chantiers'] }, { homeAddress: '5 rue C, 31000 Toulouse' });
        expect(s.accounting).toBe('À mon domicile — 5 rue C, 31000 Toulouse');
        expect(s.activity).toBe('À mon domicile (5 rue C, 31000 Toulouse) · Chez mes clients ou sur des chantiers');
    });
    it('cabinet et local : nom, adresses ; extra enregistré en base (adressePerso) suffit', () => {
        const extra = {
            adressePerso: '5 rue C, 31000 Toulouse',
            [F.accountingLocation]: 'expert_comptable', [F.accountingFirm]: 'Cabinet X', [F.accountingAddress]: '1 rue A, 31000 Toulouse',
            [F.activityLocations]: ['local_professionnel', 'en_ligne'], [F.activityAddress]: '2 rue B',
        };
        const s = summarizeCompanyQuestions(extra);
        expect(s.accounting).toBe('Chez mon expert-comptable — Cabinet X — 1 rue A, 31000 Toulouse');
        expect(s.activity).toBe('Dans un local professionnel (2 rue B) · En ligne uniquement');
        expect(hasCompanyQuestions(extra)).toBe(true);
        expect(summarizeCompanyQuestions({ [F.accountingLocation]: 'autre', [F.accountingAddress]: '9 av. D' }, { lang: 'ru' }).accounting).toBe('По другому адресу — 9 av. D');
    });
    it('les trois langues ont les mêmes clés et options', () => {
        const keys = (o) => Object.keys(o).sort();
        for (const lang of ['en', 'ru']) {
            expect(keys(COMPANY_QUESTION_LABELS[lang])).toEqual(keys(COMPANY_QUESTION_LABELS.fr));
            expect(keys(COMPANY_QUESTION_LABELS[lang].accountingOptions)).toEqual(keys(COMPANY_QUESTION_LABELS.fr.accountingOptions));
            expect(keys(COMPANY_QUESTION_LABELS[lang].activityOptions)).toEqual(keys(COMPANY_QUESTION_LABELS.fr.activityOptions));
        }
    });
});
