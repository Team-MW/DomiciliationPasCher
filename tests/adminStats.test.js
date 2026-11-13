// Onglet admin « Statistiques » : calculs (shared/adminStats.js) et lignes compactes du serveur (getStatsDashboard).
import { describe, it, expect } from 'vitest';
import { buildDashboard, monthBuckets, monthKeyOf, monthlyHtOf, toCsv } from '../shared/adminStats.js';
import { createDataService } from '../api/_data-service.js';
import { createSqlJsConn } from './helpers/sqlJsConn.js';

const NOW = new Date('2026-11-13T10:00:00.000Z');

const raw = {
    clients: [
        { id: 'a', plan: 'essentiel', status: 'actif', since: '2026-11-03', city: 'Toulouse', hasAccount: true, frequence: 'mensuel', grille: '2026-11', paidAt: '2026-11-03T09:00:00.000Z', contractSigned: true, procurationSigned: false },
        { id: 'b', plan: 'Scan+', status: 'actif', since: '2026-05-10', city: 'Toulouse', hasAccount: true, frequence: 'annuel', grille: null, contractSigned: true, procurationSigned: true },
        { id: 'c', plan: 'physique', status: 'echec_paiement', since: '2026-09-01', city: 'Paris', hasAccount: false, frequence: 'mensuel', grille: '2026-11' },
        { id: 'd', plan: 'essentiel', status: 'résilié', since: '2025-12-01', city: 'Toulouse', hasAccount: true, frequence: 'mensuel', grille: null, terminatedAt: '2026-10-15' },
    ],
    demandes: [{ status: 'en_attente', date: '2026-11-12T14:30:00.000Z' }, { status: 'en_attente_paiement', date: '2026-11-01T08:00:00.000Z' }],
    payments: [{ amount: 19.2, status: 'payé', date: '2026-11-03' }],
    mail: [{ date: '2026-11-05', hasScan: true, status: 'lu' }, { date: '2026-11-06', hasScan: false, status: 'non lu' }, { date: '2026-10-06', hasScan: false, status: 'lu' }],
    bookings: [{ date: '2026-11-20', status: 'en_attente', createdAt: '2026-11-10T10:00:00.000Z' }],
    messages: [{ sender: 'client', createdAt: '2026-11-11T10:00:00.000Z', status: 'sent' }, { sender: 'admin', createdAt: '2026-11-11T11:00:00.000Z', status: 'read' }],
    emails: [{ type: 'approval', status: 'sent', sentAt: '2026-11-03T09:05:00.000Z' }, { type: 'new_mail', status: 'sent', sentAt: '2026-11-05T09:05:00.000Z' }, { type: 'new_mail', status: 'error', sentAt: '2026-11-06T09:05:00.000Z' }],
    leads: [{ createdAt: '2026-11-02T18:00:00.000Z', completedAt: '2026-11-03T09:00:00.000Z' }, { createdAt: '2026-11-12T20:00:00.000Z' }],
    reexpeditions: [{ status: 'en_attente', createdAt: '2026-11-11' }],
};

describe('adminStats : briques', () => {
    it('mois de Paris et libellés', () => {
        expect(monthKeyOf('2026-11-13T23:30:00.000Z')).toBe('2026-11');
        expect(monthKeyOf('2026-10-31T23:30:00.000Z')).toBe('2026-11'); // 00:30 à Paris
        expect(monthKeyOf('n’importe quoi')).toBeNull();
        const b = monthBuckets(3, NOW);
        expect(b.map((x) => x.key)).toEqual(['2026-09', '2026-10', '2026-11']);
        expect(b[2].label).toBe('nov. 26');
    });

    it('mensualité HT : grille actuelle, ancien tarif, annuel ramené au mois', () => {
        expect(monthlyHtOf({ plan: 'essentiel', grille: '2026-11', frequence: 'mensuel' })).toBe(16);
        expect(monthlyHtOf({ plan: 'essentiel', grille: null, frequence: 'mensuel' })).toBe(20);
        expect(monthlyHtOf({ plan: 'physique', grille: '2026-11', frequence: 'annuel' })).toBe(30.4);
    });

    it('CSV avec point-virgule et guillemets', () => {
        expect(toCsv([{ mois: 'nov. 26', n: 3, note: 'a;b' }])).toBe('mois;n;note\nnov. 26;3;"a;b"');
        expect(toCsv([])).toBe('');
    });
});

describe('adminStats : tableau de bord', () => {
    const dash = buildDashboard(raw, { months: 6, now: NOW, stripe: { mrr: 60, monthlyRevenue: 40, activeSubscriptions: 3, revenueChangePct: 10, revenueHistory: [{ key: '2026-11', revenue: 40 }] } });

    it('chiffres clés', () => {
        expect(dash.kpis.activeClients.value).toBe(2);
        expect(dash.kpis.newClients30.value).toBe(1);
        // 16 (Essentiel grille) + 20 (Scan+ ancien tarif annuel = 10 mensualités de 24 €, ramené au mois) + 38 (Premium en impayé, compté) = 74
        expect(dash.kpis.mrrHt.value).toBe(74);
        expect(dash.kpis.unpaid.value).toBe(1);
        expect(dash.kpis.pendingValidation.value).toBe(1);
        expect(dash.kpis.conversion30.value).toBe(100); // 2 paiements (client a + demande payée) pour 2 inscriptions
        expect(dash.kpis.accounts.value).toBe(67);
        expect(dash.kpis.mail30.value).toBe(2);
        expect(dash.kpis.emails30.hint).toMatch(/1 échec/);
        expect(dash.kpis.stripeMrr.value).toBe(60);
        expect(dash.kpis.revenueMonth.value).toBe(40);
    });

    it('séries mensuelles cohérentes (dernier mois = novembre)', () => {
        const last = dash.buckets.length - 1;
        expect(dash.monthly.newClients[last]).toBe(1);
        expect(dash.monthly.terminated[last - 1]).toBe(1); // résiliation en octobre
        expect(dash.monthly.activeCum[last]).toBe(3); // a, b, c (d résilié)
        expect(dash.monthly.activeCum[last - 2]).toBe(3); // septembre : b, c, d encore actif
        expect(dash.monthly.scans[last]).toBe(1);
        expect(dash.monthly.photos[last]).toBe(1);
        expect(dash.monthly.stripeRevenue[last]).toBe(40);
        expect(dash.monthly.stripeRevenue[last - 1]).toBeNull();
        expect(dash.monthly.emails.map((s) => s.name)).toEqual(['Courrier', 'Compte']);
    });

    it('répartitions, entonnoir, carte de chaleur, export', () => {
        expect(dash.splits.plans.map((p) => `${p.name}:${p.value}`)).toEqual(['Essentiel:1', 'Confort:1', 'Premium:1']);
        expect(dash.splits.billing).toEqual([{ name: 'Mensuel', value: 2 }, { name: 'Annuel', value: 1 }]);
        expect(dash.splits.statuses[0]).toEqual({ name: 'Actif', value: 2 });
        // Paiements sur 6 mois : client a (payé le 3/11), client c (validé en septembre), demande payée en attente = 3 ; validés : a et c.
        expect(dash.funnel.map((f) => f.value)).toEqual([2, 3, 2, 1, 1, 0]);
        expect(dash.heatmap.total).toBe(5); // 2 inscriptions + 2 demandes + 1 paiement daté
        expect(dash.csvRows).toHaveLength(6);
        expect(Object.keys(dash.csvRows[0])).toContain('encaisse_stripe_ttc');
    });

    it('sans aucune donnée : tout vaut 0 ou « — », rien ne plante', () => {
        const empty = buildDashboard({}, { months: 12, now: NOW });
        expect(empty.kpis.activeClients.value).toBe(0);
        expect(empty.kpis.conversion30.value).toBeNull();
        expect(empty.monthly.activeCum).toHaveLength(12);
        expect(empty.funnel.every((f) => f.value === 0)).toBe(true);
        expect(empty.monthly.emails).toEqual([]);
    });
});

describe('getStatsDashboard (serveur) : lignes compactes, sans extra_info ni fichiers', async () => {
    it('projette les indicateurs utiles et tolère les tables absentes', async () => {
        const conn = await createSqlJsConn();
        const service = createDataService({ conn });
        await service.init();
        await conn.execute("INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) VALUES ('c1', 'A', 'a@x.fr', 'X', 'Toulouse', 'essentiel', 'actif', '2026-11-03', '2026-11-03', 'user_1', 'linked', ?)",
            [JSON.stringify({ frequence: 'annuel', grille_tarifaire: '2026-11', contractSigned: true, paid_at: '2026-11-03T09:00:00.000Z', kbisUrl: 'data:application/pdf;base64,AAAA' })]);
        await conn.execute("INSERT INTO mail (id, clientId, company, type, `from`, date, status, preview) VALUES ('m1', 'c1', 'X', 'Lettre', 'URSSAF', '2026-11-05', 'non lu', 'data:application/pdf;base64,BBBB')");
        await conn.execute("INSERT INTO mail (id, clientId, company, type, `from`, date, status, preview) VALUES ('m2', 'c1', 'X', 'Colis', 'Amazon', '2026-11-06', 'lu', '')");
        const data = await service.getStatsDashboard();
        expect(data.clients).toEqual([expect.objectContaining({ id: 'c1', plan: 'essentiel', status: 'actif', hasAccount: true, frequence: 'annuel', grille: '2026-11', contractSigned: true, procurationSigned: false, paidAt: '2026-11-03T09:00:00.000Z', city: 'Toulouse' })]);
        expect(JSON.stringify(data)).not.toMatch(/AAAA|BBBB|extra_info/);
        expect(data.mail.map((m) => m.hasScan)).toEqual([true, false]);
        expect(Array.isArray(data.emails)).toBe(true);
        expect(Array.isArray(data.leads)).toBe(true);
    });
});
