import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import fr from '../src/i18n/fr.js';
import { HOME_PLAN_IDS } from '../src/pages/Home/Home.jsx';
import { normalizeFrenchPhone, isValidFrenchPhone } from '../src/pages/Souscription/souscriptionPhone.js';
import { isAdminEmail, adminEmails } from '../src/utils/adminEmail.js';
import { fichesData } from '../src/data/fichesData.js';

describe('Accueil : « Choisir <formule> » ouvre le tunnel sur CETTE formule', () => {
    it('l’ordre des formules de l’accueil correspond aux identifiants du catalogue', () => {
        const names = fr.home.pricing.plans.map((p) => p.name);
        expect(names).toEqual(['Essentiel', 'Confort', 'Premium']);
        expect(HOME_PLAN_IDS).toEqual(['essentiel', 'scan-plus', 'physique']);
        const src = fs.readFileSync('src/pages/Home/Home.jsx', 'utf8');
        expect(src).toContain('/souscription?plan=${HOME_PLAN_IDS[planIndex]');
    });

    it('Souscription : le choix de l’URL (?plan, ?frequence) l’emporte sur un ancien brouillon', () => {
        const src = fs.readFileSync('src/pages/Souscription/Souscription.jsx', 'utf8');
        expect(src).toContain("if (searchParams.has('plan')) fromUrl.offre = defaultData.offre;");
        expect(src).toContain("if (searchParams.has('frequence')) fromUrl.frequence = defaultData.frequence;");
    });
});

describe('Téléphone du tunnel', () => {
    it.each([
        ['+33 6 12 34 56 78', '0612345678'],
        ['+33612345678', '0612345678'],
        ['0033612345678', '0612345678'],
        ['06 12 34 56 78', '0612345678'],
        ['06.12.34.56.78', '0612345678'],
        ['0612345678999', '0612345678'],
    ])('« %s » → %s', (input, expected) => {
        expect(normalizeFrenchPhone(input)).toBe(expected);
    });

    it('valide uniquement un vrai numéro français', () => {
        expect(isValidFrenchPhone('0612345678')).toBe(true);
        expect(isValidFrenchPhone('0000000000')).toBe(false);
        expect(isValidFrenchPhone('061234567')).toBe(false);
        expect(isValidFrenchPhone('3361234567')).toBe(false);
    });
});

describe('Administrateurs : même règle que le serveur (espaces et majuscules ignorés)', () => {
    it('un 2e admin saisi avec espace et majuscules est reconnu', () => {
        const raw = 'mwcrea.agency@gmail.com, Second.Admin@Gmail.com';
        expect(adminEmails(raw)).toEqual(['mwcrea.agency@gmail.com', 'second.admin@gmail.com']);
        expect(isAdminEmail('second.admin@gmail.com', raw)).toBe(true);
        expect(isAdminEmail('  MWCREA.agency@gmail.com ', raw)).toBe(true);
        expect(isAdminEmail('intrus@x.fr', raw)).toBe(false);
        expect(isAdminEmail('', raw)).toBe(false);
        expect(isAdminEmail(undefined, raw)).toBe(false);
    });
});

describe('Fiches pratiques', () => {
    it('les noms hérités d’Object.prototype ne sont pas des fiches', () => {
        for (const bad of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
            expect(Object.hasOwn(fichesData, bad)).toBe(false);
        }
        expect(fs.readFileSync('src/pages/FicheDetail/FicheDetail.jsx', 'utf8')).toContain('Object.hasOwn(fichesData, slug)');
    });
});

describe('Admin : garde-fous', () => {
    it('plus de statut inventé « 100 % / 50 % » dans la liste des clients', () => {
        expect(fs.readFileSync('src/pages/Admin/components/ClientsTab.jsx', 'utf8')).not.toMatch(/'100%' : '50%'/);
    });
    it('changer d’onglet ne recharge pas toutes les données', () => {
        const src = fs.readFileSync('src/pages/Admin/Admin.jsx', 'utf8');
        expect(src).toContain('activeTabRef.current');
        expect(src).toMatch(/\}, \[\]\);\s*\n/);
    });
    it('une facture Stripe n’a pas de bouton « Supprimer » (elle reviendrait à la synchro)', () => {
        expect(fs.readFileSync('src/pages/Admin/components/DossierClient.jsx', 'utf8')).toContain("!String(p.id).startsWith('in_') && <button");
    });
    it('l’export Excel lit extra_info comme le reste de l’application (double encodage)', () => {
        const src = fs.readFileSync('src/utils/exportClientsExcel.js', 'utf8');
        expect(src).toContain("import { parseExtraInfo } from './contractLegalFields'");
        expect(src).not.toMatch(/^function parseExtraInfo/m);
    });
});
