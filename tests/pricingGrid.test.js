// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import {
    PLAN_CATALOG, LEGACY_PLAN_CATALOG, PRICING_GRID, EXTRA_FEES_HT, annualHt, planAmountTtc,
    clientPlanPricing, canRequestPhysicalForward, resolvePlanId, isCurrentPricing,
} from '../shared/plans.js';
import { sanitizeClientExtra } from '../api/_client-extra.js';
import { createDataService } from '../api/_data-service.js';
import { buildContractContent } from '../src/utils/contractBuilder.js';

const CURRENT = { grille_tarifaire: PRICING_GRID };

describe('Grille tarifaire du contrat de novembre 2026', () => {
    it('formules et prix mensuels HT conformes à l’Annexe 1', () => {
        expect(Object.values(PLAN_CATALOG).map((p) => [p.id, p.name, p.ht])).toEqual([
            ['essentiel', 'Essentiel', 16],
            ['scan-plus', 'Confort', 24],
            ['physique', 'Premium', 38],
        ]);
    });

    it('paiement annuel : remise de 20 % (153,60 / 230,40 / 364,80 € HT)', () => {
        expect(annualHt(16)).toBe(153.6);
        expect(annualHt(24)).toBe(230.4);
        expect(annualHt(38)).toBe(364.8);
        expect(planAmountTtc(16, 'month')).toBe(19.2);
        expect(planAmountTtc(16, 'year')).toBe(184.32);
        expect(planAmountTtc(38, 'year')).toBe(437.76);
    });

    it('quotas et services inclus par formule', () => {
        expect(PLAN_CATALOG.essentiel).toMatchObject({ scanQuota: 0, forwardsIncluded: 0, parcelsIncluded: false });
        expect(PLAN_CATALOG['scan-plus']).toMatchObject({ scanQuota: 40, forwardsIncluded: 0, parcelsIncluded: false });
        expect(PLAN_CATALOG.physique).toMatchObject({ scanQuota: 100, forwardsIncluded: 2, parcelsIncluded: true });
        expect(EXTRA_FEES_HT).toEqual({ scanPerPage: 0.5, forward: 3, parcel: 3, parcelStoragePerDay: 2, meetingRoomHour: 25 });
    });

    it('les nouveaux et les anciens noms désignent la même formule', () => {
        expect(resolvePlanId('Confort')).toBe('scan-plus');
        expect(resolvePlanId('Scan+')).toBe('scan-plus');
        expect(resolvePlanId('Premium')).toBe('physique');
        expect(resolvePlanId('Physique+')).toBe('physique');
        expect(resolvePlanId('Essentiel')).toBe('essentiel');
    });
});

describe('Les clients existants gardent leur prix', () => {
    it('client sans marqueur de grille → ancienne grille (Essentiel 20 €, annuel = 10 mois)', () => {
        const p = clientPlanPricing('Essentiel', {});
        expect(p).toMatchObject({ name: 'Essentiel', ht: 20, annualHt: 200, ttcMonth: 24, ttcYear: 240, legacy: true });
        expect(clientPlanPricing('Scan+', {})).toMatchObject({ name: 'Scan+', ht: 24, legacy: true });
        expect(clientPlanPricing('Physique+', {}).ttcYear).toBe(456);
        expect(LEGACY_PLAN_CATALOG.essentiel.ht).toBe(20);
    });

    it('client souscrit avec la grille actuelle → nouveaux prix', () => {
        expect(clientPlanPricing('Essentiel', CURRENT)).toMatchObject({ name: 'Essentiel', ht: 16, annualHt: 153.6, ttcMonth: 19.2, legacy: false });
        expect(clientPlanPricing('Confort', CURRENT)).toMatchObject({ name: 'Confort', ht: 24, legacy: false });
    });

    it('réexpédition : toutes formules sur la grille actuelle, Scan+/Physique+ seulement sur l’ancienne', () => {
        expect(canRequestPhysicalForward('Essentiel', CURRENT)).toBe(true);
        expect(canRequestPhysicalForward('Essentiel', {})).toBe(false);
        expect(canRequestPhysicalForward('Scan+', {})).toBe(true);
    });

    it('un client ne peut ni retirer ni poser lui-même le marqueur de grille', () => {
        const clean = sanitizeClientExtra({ grille_tarifaire: PRICING_GRID, tarif_ht: 1, telephone: '0600000000' });
        expect(clean).toEqual({ telephone: '0600000000' });
    });

    it('une demande payée via Checkout passe sur la grille actuelle (prix réellement payé)', async () => {
        const execute = vi.fn(async (sql) => {
            if (/^SELECT status, extra_info FROM demandes/.test(sql)) return { rows: [{ status: 'en_attente_paiement', extra_info: '{"frequence":"mensuel"}' }] };
            return { rows: [], rowsAffected: 1 };
        });
        await createDataService({ conn: { execute } }).confirmDemandePayment('d1', 'cs_test_1', 'cus_1');
        const update = execute.mock.calls.find(([sql]) => /^UPDATE demandes SET status/.test(sql));
        expect(isCurrentPricing(JSON.parse(update[1][0]))).toBe(true);
    });
});

describe('Contrat PDF généré selon la grille du client', () => {
    const client = { id: 'T1', plan: 'Confort', company: 'ACME', name: 'Jean Dupont', since: '2026-11-06' };
    const base = { prenom: 'Jean', nom: 'Dupont', adressePerso: '1 rue A, 31000 Toulouse' };
    const render = (extra, planDetails = { name: 'Scan+', ht: 24 }) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
        buildContractContent(doc, client, extra, planDetails, false, null, '6 novembre 2026', '6 novembre 2026', null);
        return doc.output();
    };

    it('grille actuelle → nouveau contrat (Confort, 40 plis, −20 %, mise en demeure de 8 jours)', () => {
        const pdf = render({ ...base, ...CURRENT, frequence: 'annuel' });
        expect(pdf).toContain('Formule souscrite : Confort');
        expect(pdf).toContain('230,40');
        expect(pdf).toContain('Remise annuelle de 20 %');
        expect(pdf).toContain('40 plis/mois');
        expect(pdf).toContain('2 par mois incluses');
        expect(pdf).toContain('Fin du Contrat'); // article 6.3, absent de l'ancien contrat
        expect(pdf).not.toContain('Physique+');
    });

    it('ancien client PAS ENCORE signé → nouveau texte, avec SON prix d’origine et le nom actuel', () => {
        const pdf = render({ ...base });
        expect(pdf).toContain('Formule souscrite : Confort');
        expect(pdf).toContain('Fin du Contrat');
        expect(pdf).toContain('24,00');
        expect(pdf).not.toContain('Contrat conforme loi Dutreil');
    });

    it('contrat DÉJÀ SIGNÉ avec l’ancien texte → regénéré à l’identique (sa signature reste sous le texte signé)', () => {
        const pdf = render({ ...base, contractSigned: true, contractSignedAt: '2026-05-01T10:00:00Z' });
        expect(pdf).toContain('Forfait souscrit : Scan+');
        expect(pdf).toContain('Contrat conforme loi Dutreil');
        expect(pdf).not.toContain('Fin du Contrat');
    });

    it('contrat signé avec le texte actuel (version notée par le serveur) → texte actuel', () => {
        const pdf = render({ ...base, ...CURRENT, contractSigned: true, contract_version: '2026-11' });
        expect(pdf).toContain('Formule souscrite : Confort');
        expect(pdf).not.toContain('Contrat conforme loi Dutreil');
    });

    it('ancien client Essentiel non signé : tarif d’origine 20 € HT conservé dans l’Annexe', () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
        buildContractContent(doc, { ...client, plan: 'Essentiel' }, { ...base }, { name: 'Essentiel', ht: 20 }, false, null, 'x', 'x', null);
        expect(doc.output()).toContain('Tarif : 20,00');
    });
});

import { currentQuotaPeriodStart, scanQuotaFor } from '../shared/plans.js';

describe('Quotas : période et quota applicables (CGV art. 3)', () => {
    const d = (y, m, day) => new Date(y, m - 1, day);

    it('la période repart à chaque date anniversaire, pas le 1er du mois', () => {
        expect(currentQuotaPeriodStart('2026-03-15', d(2026, 11, 20))).toEqual(d(2026, 11, 15));
        expect(currentQuotaPeriodStart('2026-03-15', d(2026, 11, 10))).toEqual(d(2026, 10, 15));
        expect(currentQuotaPeriodStart('2026-03-15', d(2026, 11, 15))).toEqual(d(2026, 11, 15));
    });

    it('anniversaire le 31 : ramené au dernier jour des mois courts', () => {
        expect(currentQuotaPeriodStart('2026-01-31', d(2026, 3, 5))).toEqual(d(2026, 2, 28));
    });

    it('jamais avant la date de souscription', () => {
        expect(currentQuotaPeriodStart('2026-11-20', d(2026, 11, 25))).toEqual(d(2026, 11, 20));
    });

    it('quota selon la formule et la grille', () => {
        expect(scanQuotaFor('Essentiel', CURRENT)).toBe(0);
        expect(scanQuotaFor('Confort', CURRENT)).toBe(40);
        expect(scanQuotaFor('Premium', CURRENT)).toBe(100);
        expect(scanQuotaFor('Scan+', {})).toBeNull(); // ancienne grille : numérisation sans quota
        expect(scanQuotaFor('Essentiel', {})).toBe(0);
    });
});
