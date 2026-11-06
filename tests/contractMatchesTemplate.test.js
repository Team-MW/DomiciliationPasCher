// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildContractContent } from '../src/utils/contractBuilder.js';

/** Faux jsPDF : enregistre tous les textes écrits. */
function fakeDoc() {
    const texts = [];
    return new Proxy({ texts }, {
        get(t, prop) {
            if (prop === 'texts') return t.texts;
            if (prop === 'text') return (v) => { t.texts.push(Array.isArray(v) ? v.join(' ') : String(v)); };
            if (prop === 'splitTextToSize') return (v) => [String(v)];
            if (prop === 'getTextWidth') return () => 10;
            if (prop === 'getNumberOfPages') return () => 1;
            if (prop === 'internal') return { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
            return () => undefined;
        },
    });
}
const normalize = (s) => s.replace(/[  ]/g, ' ').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').toLowerCase();

function generated(plan, ht, frequence = 'mensuel') {
    const doc = fakeDoc();
    const client = { id: 'c1', name: 'Ada Lovelace', company: 'ACME SAS', plan, since: '2026-11-06', extra_info: '{}' };
    const extra = { prenom: 'Ada', nom: 'Lovelace', siren: '123456789', dateNaissance: '1990-01-01', lieuNaissance: 'Paris', nationalite: 'Française', qualite: 'Présidente', frequence, grille_tarifaire: '2026-11', contract_version: '2026-11' };
    buildContractContent(doc, client, extra, { name: plan, ht }, false, null, '6 novembre 2026', '6 novembre 2026', null);
    return normalize(doc.texts.join(' '));
}

/**
 * Contrat_domiciliation_modele.pdf (6 nov. 2026) : phrases clés du nouveau contrat, à retrouver telles quelles dans le
 * contrat généré. Si le propriétaire change le contrat, ce test doit être mis à jour avec le nouveau modèle.
 */
const MODEL_PHRASES = [
    "La société CASSIN LUDOVIC, SAS, au capital social de 2 000,00 €",
    "immatriculée au Registre du Commerce et des Sociétés de Toulouse sous le numéro 101 512 531",
    "(SIRET : 101 512 531 00019) est autorisé à exercer l'activité de domiciliation sous le numéro AG/DOM/2026/06",
    "150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse",
    "Les Prestations objet du Contrat sont destinées à des professionnels.",
    "En cas de contradiction, les documents prévalent dans l'ordre suivant : le Contrat, l'Annexe 1, puis les Conditions Générales de Vente.",
    "contrat conclu hors établissement avec un professionnel employant cinq (5) salariés au plus",
    "sur rendez-vous pris par email au moins vingt-quatre (24) heures à l'avance, ou quarante-huit (48) heures pour un colis volumineux",
    "au tarif de 25,00 € HT par heure",
    "au moins quarante-huit (48) heures à l'avance. Toute réservation annulée moins de vingt-quatre (24) heures avant son début est due.",
    "La formule Premium inclut deux (2) réexpéditions par mois, l'affranchissement étant refacturé au coût réel. Toute autre réexpédition est facturée 3,00 € HT, plus le coût réel de l'affranchissement.",
    "Conformément à l'article L441-10 du Code de commerce, toute somme impayée à l'échéance entraîne de plein droit des pénalités de retard égales à trois fois le taux d'intérêt légal",
    "laquelle ne pourra être inférieure à trois (3) mois conformément à l'article R123-168 du Code de commerce",
    "Contrat conforme au Code de commerce (art. R123-168)",
    "2 par mois incluses",
    "Paiement annuel : remise de 20 % sur le prix de l'abonnement (153,60 € HT, 230,40 € HT ou 364,80 € HT par an)",
    "numérisation hors quota 0,50 € par pli ; réexpédition 3,00 € + affranchissement réel ; colis 3,00 € (hors Premium) ; conservation d'un colis au-delà de 15 jours 2,00 € par jour ; salle de réunion 25,00 € par heure",
    "Durée d'engagement légale : conformément à l'article R123-168 du Code de commerce, la durée minimale de tout contrat de domiciliation est de trois (3) mois, quelle que soit la formule souscrite.",
];

describe('Le contrat généré reprend le nouveau contrat (Contrat_domiciliation_modele.pdf)', () => {
    it.each(MODEL_PHRASES)('contient : %s', (phrase) => {
        expect(generated('Confort', 24)).toContain(normalize(phrase));
    });

    it('les données du client remplacent les champs du modèle', () => {
        const text = generated('Premium', 38);
        for (const value of ['acme sas', '123456789', 'ada lovelace', 'paris', 'française', 'présidente', '6 novembre 2026', 'premium']) {
            expect(text).toContain(value);
        }
        expect(text).not.toMatch(/\[(dénomination|siren|prénom nom|date|formule|référence|périodicité)/);
        expect(text).not.toContain('undefined');
    });
});
