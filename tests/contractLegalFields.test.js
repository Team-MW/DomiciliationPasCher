import { describe, it, expect } from 'vitest';
import { parseExtraInfo, splitDisplayName, getContractLegalFields } from '../src/utils/contractLegalFields.js';

describe('parseExtraInfo', () => {
    it('accepte objet, JSON et JSON double-encodé', () => {
        expect(parseExtraInfo({ nationalite: 'Française' }).nationalite).toBe('Française');
        expect(parseExtraInfo('{"qualite":"Gérant"}').qualite).toBe('Gérant');
        expect(parseExtraInfo('"{\\"nom\\":\\"Dupont\\"}"').nom).toBe('Dupont');
        expect(parseExtraInfo(null)).toEqual({});
        expect(parseExtraInfo('not-json')).toEqual({});
    });
});

describe('getContractLegalFields', () => {
    it('signale les champs manquants pour un client sans extra_info', () => {
        const fields = getContractLegalFields({
            name: 'Jean Dupont',
            company: '',
            address: '',
            extra_info: null,
        });
        expect(fields.prenom).toBe('Jean');
        expect(fields.nom).toBe('Dupont');
        expect(fields.missing).toEqual(expect.arrayContaining(['company', 'address', 'nationalite', 'qualite', 'dateNaissance', 'lieuNaissance']));
        expect(fields.missing).not.toContain('name');
    });

    it('est complet avec les champs tels qu’enregistrés à l’inscription (sans adressePerso)', () => {
        const fields = getContractLegalFields({
            name: 'Camille Duran - 📞 0612345678',
            company: 'En cours de création',
            address: '',
            extra_info: {
                prenom: 'Camille',
                nom: 'Duran',
                nationalite: 'Française',
                qualite: 'Gérant',
                dateNaissance: '1990-01-01',
                lieuNaissance: 'Paris, France',
                nomSociete: 'En cours de création',
                adresse: '10 Rue de la Paix',
                codePostal: '31000',
                villePerso: 'Toulouse',
                pays: 'France',
            },
        });
        expect(fields.missing).toEqual([]);
        expect(fields.address).toContain('10 Rue de la Paix');
        expect(fields.address).toContain('31000');
        expect(fields.prenom).toBe('Camille');
        expect(fields.nom).toBe('Duran');
    });
});

describe('splitDisplayName', () => {
    it('sépare prénom et nom', () => {
        expect(splitDisplayName('Marie Curie')).toEqual({ prenom: 'Marie', nom: 'Curie' });
    });

    it('ignore le téléphone collé au nom lors de l’approbation admin', () => {
        expect(splitDisplayName('Jean Dupont - 📞 0612345678')).toEqual({ prenom: 'Jean', nom: 'Dupont' });
    });
});
