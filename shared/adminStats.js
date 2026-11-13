/**
 * Statistiques de pilotage (onglet admin « Statistiques »).
 *
 * Fonctions PURES : elles transforment les lignes compactes renvoyées par `getStatsDashboard` (serveur)
 * en séries prêtes à tracer. Aucune dépendance React : testables côté Node, réutilisables côté navigateur.
 * Les mois sont calculés en heure de Paris.
 */
import { clientPlanPricing, PLAN_CATALOG } from './plans.js';
import { emailTypeInfo } from './emailTypes.js';

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAY_MS = 24 * 60 * 60 * 1000;
const PARIS = 'Europe/Paris';

const parisParts = (date) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short',
    }).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')), hour: Number(get('hour')) % 24, weekday: get('weekday') };
};

/** Date lisible (ISO, « AAAA-MM-JJ », timestamp) → Date, ou null. */
export function toDate(value) {
    if (value === null || value === undefined || value === '') return null;
    const d = value instanceof Date ? value : new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value);
    return Number.isFinite(d.getTime()) ? d : null;
}

/** « 2026-11 » (Paris) pour une date, sinon null. */
export function monthKeyOf(value) {
    const d = toDate(value);
    if (!d) return null;
    const { year, month } = parisParts(d);
    return `${year}-${String(month).padStart(2, '0')}`;
}

/** Les `count` derniers mois (le mois courant inclus), du plus ancien au plus récent. */
export function monthBuckets(count = 12, now = new Date()) {
    const { year, month } = parisParts(now);
    const out = [];
    for (let i = count - 1; i >= 0; i -= 1) {
        const d = new Date(Date.UTC(year, month - 1 - i, 1));
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        out.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`, year: y, month: m });
    }
    return out;
}

function countBy(items, buckets, getDate, getValue = () => 1) {
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    const out = buckets.map(() => 0);
    for (const item of items || []) {
        const key = monthKeyOf(getDate(item));
        const i = key !== null ? index.get(key) : undefined;
        if (i !== undefined) out[i] += Number(getValue(item)) || 0;
    }
    return out.map((v) => Math.round(v * 100) / 100);
}

const within = (value, from, to) => {
    const d = toDate(value);
    return Boolean(d) && d.getTime() >= from && d.getTime() < to;
};

const ratio = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);

const pct = (value, previous) => {
    if (!previous) return null;
    return Math.round(((value - previous) / previous) * 100);
};

const FAILED = new Set(['echec_paiement', 'impayé']);
const ACTIVE_LIKE = new Set(['actif', 'echec_paiement', 'impayé', 'en_attente_validation']);

/** Mensualité HT réellement facturée à ce client (annuel ramené au mois). */
export function monthlyHtOf(client) {
    const pricing = clientPlanPricing(client.plan, { grille_tarifaire: client.grille, frequence: client.frequence });
    return client.frequence === 'annuel' ? Math.round((pricing.annualHt / 12) * 100) / 100 : pricing.ht;
}

/**
 * @param {object} raw — lignes compactes de getStatsDashboard
 * @param {{ months?: number, now?: Date, stripe?: object|null }} options
 */
export function buildDashboard(raw = {}, { months = 12, now = new Date(), stripe = null } = {}) {
    const clients = raw.clients || [];
    const demandes = raw.demandes || [];
    const mail = raw.mail || [];
    const bookings = raw.bookings || [];
    const messages = raw.messages || [];
    const emails = raw.emails || [];
    const leads = raw.leads || [];
    const reexpeditions = raw.reexpeditions || [];
    const payments = raw.payments || [];

    const buckets = monthBuckets(months, now);
    const nowMs = now.getTime();
    const d30 = nowMs - 30 * DAY_MS;
    const d60 = nowMs - 60 * DAY_MS;
    const d90 = nowMs - 90 * DAY_MS;
    const periodStart = Date.UTC(buckets[0].year, buckets[0].month - 1, 1) - 2 * 60 * 60 * 1000;

    // ── Clients ──
    const active = clients.filter((c) => c.status === 'actif');
    const activeLike = clients.filter((c) => ACTIVE_LIKE.has(c.status));
    const unpaid = clients.filter((c) => FAILED.has(c.status));
    const terminated = clients.filter((c) => c.status === 'résilié');
    const mrrHt = Math.round(activeLike.reduce((sum, c) => sum + monthlyHtOf(c), 0) * 100) / 100;
    const newClients30 = clients.filter((c) => within(c.since, d30, nowMs + DAY_MS)).length;
    const newClientsPrev30 = clients.filter((c) => within(c.since, d60, d30)).length;
    const terminated90 = terminated.filter((c) => within(c.terminatedAt, d90, nowMs + DAY_MS)).length;
    const withAccount = activeLike.filter((c) => c.hasAccount).length;
    const signed = activeLike.filter((c) => c.contractSigned).length;
    const procurations = activeLike.filter((c) => c.procurationSigned).length;
    const pendingPayLink = clients.filter((c) => c.paymentStatus === 'pending' && c.status !== 'résilié').length;

    // ── Demandes / prospects ──
    const paidPending = demandes.filter((d) => d.status === 'en_attente');
    const unpaidDemandes = demandes.filter((d) => d.status === 'en_attente_paiement');
    const leads30 = leads.filter((l) => within(l.createdAt, d30, nowMs + DAY_MS));
    const paid30 = clients.filter((c) => within(c.paidAt || c.since, d30, nowMs + DAY_MS)).length + paidPending.filter((d) => within(d.date, d30, nowMs + DAY_MS)).length;
    const leadsOpen = leads.filter((l) => !l.completedAt && !l.unsubscribedAt && within(l.createdAt, nowMs - 7 * DAY_MS, nowMs + DAY_MS)).length;

    // ── Courrier / messages / emails / salles ──
    const mail30 = mail.filter((m) => within(m.date, d30, nowMs + DAY_MS));
    const mailPrev30 = mail.filter((m) => within(m.date, d60, d30));
    const scans30 = mail30.filter((m) => m.hasScan).length;
    const unreadMail = mail.filter((m) => m.status === 'non lu').length;
    const emails30 = emails.filter((e) => within(e.sentAt, d30, nowMs + DAY_MS));
    const emailsFailed30 = emails30.filter((e) => e.status && e.status !== 'sent' && e.status !== 'ok').length;
    const bookings30 = bookings.filter((b) => within(b.createdAt || b.date, d30, nowMs + DAY_MS)).length;
    const bookingsPending = bookings.filter((b) => b.status === 'en_attente').length;
    const reexpPending = reexpeditions.filter((r) => r.status === 'en_attente').length;
    const clientMsgs30 = messages.filter((m) => m.sender === 'client' && within(m.createdAt, d30, nowMs + DAY_MS)).length;
    const unansweredMsgs = messages.filter((m) => m.sender === 'client' && m.status === 'sent').length;

    const kpis = {
        activeClients: { value: active.length, hint: `${activeLike.length - active.length} en attente ou en impayé` },
        newClients30: { value: newClients30, delta: pct(newClients30, newClientsPrev30), hint: 'vs 30 jours précédents' },
        mrrHt: { value: mrrHt, unit: '€', hint: `≈ ${Math.round(mrrHt * 12).toLocaleString('fr-FR')} € HT par an · ${activeLike.length ? Math.round((mrrHt / activeLike.length) * 100) / 100 : 0} € HT / client` },
        stripeMrr: stripe ? { value: stripe.mrr ?? 0, unit: '€', hint: `${stripe.activeSubscriptions ?? 0} abonnement(s) Stripe actifs (TTC)` } : null,
        revenueMonth: stripe ? { value: stripe.monthlyRevenue ?? 0, unit: '€', delta: stripe.revenueChangePct ?? null, hint: 'encaissé ce mois (Stripe, TTC)' } : null,
        unpaid: { value: unpaid.length, hint: `${terminated90} résiliation(s) sur 90 jours`, tone: unpaid.length ? 'warning' : 'good' },
        pendingValidation: { value: paidPending.length, hint: `${unpaidDemandes.length} demande(s) non payée(s)`, tone: paidPending.length ? 'warning' : 'good' },
        conversion30: { value: ratio(paid30, leads30.length), unit: '%', hint: `${paid30} paiement(s) pour ${leads30.length} inscription(s) commencée(s)` },
        leadsOpen: { value: leadsOpen, hint: 'inscriptions commencées sans paiement (7 jours)' },
        accounts: { value: ratio(withAccount, activeLike.length), unit: '%', hint: `${activeLike.length - withAccount} client(s) sans compte de connexion` },
        contracts: { value: ratio(signed, activeLike.length), unit: '%', hint: `${activeLike.length - signed} contrat(s) non signé(s)` },
        procurations: { value: ratio(procurations, activeLike.length), unit: '%', hint: `${activeLike.length - procurations} procuration(s) manquante(s)` },
        pendingPayLink: { value: pendingPayLink, hint: 'dossiers admin dont la carte n’est pas enregistrée', tone: pendingPayLink ? 'warning' : 'good' },
        mail30: { value: mail30.length, delta: pct(mail30.length, mailPrev30.length), hint: `${scans30} numérisé(s) · ${unreadMail} non lu(s)` },
        bookings30: { value: bookings30, hint: `${bookingsPending} en attente de réponse`, tone: bookingsPending ? 'warning' : undefined },
        messages30: { value: clientMsgs30, hint: `${unansweredMsgs} message(s) client sans réponse`, tone: unansweredMsgs ? 'warning' : undefined },
        reexpPending: { value: reexpPending, hint: 'réexpéditions à traiter', tone: reexpPending ? 'warning' : 'good' },
        emails30: { value: emails30.length, hint: `${emailsFailed30} échec(s) d’envoi`, tone: emailsFailed30 ? 'warning' : undefined },
    };

    // ── Séries mensuelles ──
    const newByMonth = countBy(clients, buckets, (c) => c.since);
    const terminatedByMonth = countBy(terminated, buckets, (c) => c.terminatedAt);
    const activeCum = buckets.map((b) => {
        const end = Date.UTC(b.year, b.month, 1);
        return clients.filter((c) => {
            const s = toDate(c.since);
            if (!s || s.getTime() >= end) return false;
            if (c.status !== 'résilié') return true;
            const t = toDate(c.terminatedAt);
            return Boolean(t) && t.getTime() >= end;
        }).length;
    });
    const scansByMonth = countBy(mail.filter((m) => m.hasScan), buckets, (m) => m.date);
    const photosByMonth = countBy(mail.filter((m) => !m.hasScan), buckets, (m) => m.date);
    const clientMsgByMonth = countBy(messages.filter((m) => m.sender === 'client'), buckets, (m) => m.createdAt);
    const adminMsgByMonth = countBy(messages.filter((m) => m.sender !== 'client'), buckets, (m) => m.createdAt);
    const bookingsByMonth = countBy(bookings, buckets, (b) => b.createdAt || b.date);
    const leadsByMonth = countBy(leads, buckets, (l) => l.createdAt);
    const paymentsByMonth = countBy(payments.filter((p) => p.status === 'payé' || p.status === 'paid'), buckets, (p) => p.date, (p) => p.amount);
    const stripeByMonth = buckets.map((b) => {
        const hit = (stripe?.revenueHistory || []).find((h) => h.key === b.key);
        return hit ? Number(hit.revenue) || 0 : null;
    });

    // Emails : 3 premières catégories + « Autres »
    const catOf = (type) => emailTypeInfo(type)?.category || 'Autres';
    const catTotals = new Map();
    for (const e of emails) catTotals.set(catOf(e.type), (catTotals.get(catOf(e.type)) || 0) + 1);
    const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const keptCats = topCats.slice(0, 3);
    const emailSeries = [...keptCats, ...(topCats.length > 3 ? ['Autres'] : [])].map((cat) => ({
        name: cat,
        values: countBy(emails.filter((e) => (cat === 'Autres' ? !keptCats.includes(catOf(e.type)) : catOf(e.type) === cat)), buckets, (e) => e.sentAt),
    }));

    // ── Répartitions ──
    const planOrder = ['essentiel', 'scan-plus', 'physique'];
    const planCounts = planOrder.map((id) => ({
        id,
        name: PLAN_CATALOG[id].name,
        value: activeLike.filter((c) => clientPlanPricing(c.plan, { grille_tarifaire: c.grille }).id === id).length,
    }));
    const billing = [
        { name: 'Mensuel', value: activeLike.filter((c) => c.frequence !== 'annuel').length },
        { name: 'Annuel', value: activeLike.filter((c) => c.frequence === 'annuel').length },
    ];
    const grid = [
        { name: 'Grille actuelle (nov. 2026)', value: activeLike.filter((c) => Boolean(c.grille)).length },
        { name: 'Ancien tarif conservé', value: activeLike.filter((c) => !c.grille).length },
    ];
    const statusLabels = { actif: 'Actif', en_attente_validation: 'En attente de validation', echec_paiement: 'Échec de paiement', 'impayé': 'Impayé', 'résilié': 'Résilié' };
    const statusCounts = new Map();
    for (const c of clients) statusCounts.set(c.status || 'inconnu', (statusCounts.get(c.status || 'inconnu') || 0) + 1);
    const statuses = [...statusCounts.entries()].map(([k, v]) => ({ name: statusLabels[k] || k, value: v })).sort((a, b) => b.value - a.value);
    const cityCounts = new Map();
    for (const c of activeLike) cityCounts.set(c.city || 'Non renseignée', (cityCounts.get(c.city || 'Non renseignée') || 0) + 1);
    const cities = [...cityCounts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // ── Entonnoir (sur la période affichée) ──
    const inPeriod = (v) => within(v, periodStart, nowMs + DAY_MS);
    const leadsP = leads.filter((l) => inPeriod(l.createdAt)).length;
    const paidP = clients.filter((c) => inPeriod(c.paidAt || c.since)).length + paidPending.filter((d) => inPeriod(d.date)).length;
    const validatedP = clients.filter((c) => inPeriod(c.since));
    const funnel = [
        { name: 'Inscriptions commencées', value: leadsP },
        { name: 'Paiements', value: paidP },
        { name: 'Dossiers validés', value: validatedP.length },
        { name: 'Comptes créés', value: validatedP.filter((c) => c.hasAccount).length },
        { name: 'Contrats signés', value: validatedP.filter((c) => c.contractSigned).length },
        { name: 'Procurations signées', value: validatedP.filter((c) => c.procurationSigned).length },
    ];

    // ── Carte de chaleur : quand les clients s'inscrivent (jour × heure, Paris) ──
    const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const wdIndex = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const heat = weekdays.map(() => Array(24).fill(0));
    let heatTotal = 0;
    for (const v of [...leads.map((l) => l.createdAt), ...demandes.map((d) => d.date), ...clients.map((c) => c.paidAt)]) {
        const d = toDate(v);
        if (!d || d.getTime() < periodStart) continue;
        const { weekday, hour } = parisParts(d);
        const wi = wdIndex[weekday];
        if (wi === undefined) continue;
        heat[wi][hour] += 1;
        heatTotal += 1;
    }

    // ── Tableau mensuel exportable ──
    const csvRows = buckets.map((b, i) => ({
        mois: b.label,
        nouveaux_clients: newByMonth[i],
        resiliations: terminatedByMonth[i],
        clients_actifs: activeCum[i],
        encaisse_stripe_ttc: stripeByMonth[i] ?? '',
        paiements_enregistres: paymentsByMonth[i],
        courriers: scansByMonth[i] + photosByMonth[i],
        numerisations: scansByMonth[i],
        messages_clients: clientMsgByMonth[i],
        reservations: bookingsByMonth[i],
        inscriptions_commencees: leadsByMonth[i],
        emails: emailSeries.reduce((s, serie) => s + serie.values[i], 0),
    }));

    return {
        generatedAt: now.toISOString(),
        months,
        buckets,
        kpis,
        monthly: {
            newClients: newByMonth, terminated: terminatedByMonth, activeCum,
            scans: scansByMonth, photos: photosByMonth,
            clientMessages: clientMsgByMonth, adminMessages: adminMsgByMonth,
            bookings: bookingsByMonth, leads: leadsByMonth, payments: paymentsByMonth,
            stripeRevenue: stripeByMonth, emails: emailSeries,
        },
        splits: { plans: planCounts, billing, grid, statuses, cities },
        funnel,
        heatmap: { weekdays, hours: [...Array(24).keys()], matrix: heat, total: heatTotal },
        csvRows,
    };
}

/** Lignes → CSV (séparateur « ; », compatible Excel français). */
export function toCsv(rows) {
    if (!rows?.length) return '';
    const cols = Object.keys(rows[0]);
    const esc = (v) => {
        const s = String(v ?? '');
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
}
