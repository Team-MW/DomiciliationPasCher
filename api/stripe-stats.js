import { getStripe, getStripeSecretKey, isLiveSecretKey } from './_stripe-client.js';

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthBuckets(now = new Date(), count = 6) {
    const lastMonths = [];
    const monthlyData = {};
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = monthKey(d);
        lastMonths.push({
            key,
            label: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
        });
        monthlyData[key] = 0;
    }
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
    return { lastMonths, monthlyData, rangeStartUnix: Math.floor(rangeStart.getTime() / 1000) };
}

/** Encaissé client (centimes) : paiement réussi, capturé, EUR, net de remboursements. */
export function chargeNetCents(charge, { liveOnly = false } = {}) {
    if (!charge || charge.status !== 'succeeded' || !charge.paid) return 0;
    if (liveOnly && charge.livemode === false) return 0;
    if (charge.captured === false) return 0;
    if ((charge.currency || 'eur').toLowerCase() !== 'eur') return 0;
    return Math.max(0, (charge.amount || 0) - (charge.amount_refunded || 0));
}

export function subscriptionItemMrrCents(item) {
    const price = item?.price || item?.plan;
    if (!price) return 0;
    const unit = price.unit_amount ?? price.amount ?? 0;
    const qty = item.quantity ?? 1;
    const interval = price.recurring?.interval || price.interval || 'month';
    const intervalCount = price.recurring?.interval_count || price.interval_count || 1;
    const gross = unit * qty;
    const n = intervalCount || 1;
    if (interval === 'year') return gross / (12 * n);
    if (interval === 'month') return gross / n;
    if (interval === 'week') return (gross * 52) / (12 * n);
    if (interval === 'day') return (gross * 365.25) / (12 * n);
    return gross;
}

export function percentChange(current, previous) {
    if (previous == null || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

export function assembleStripeStats({
    charges = [],
    subscriptions = [],
    now = new Date(),
    liveOnly = false,
} = {}) {
    const { lastMonths, monthlyData } = buildMonthBuckets(now);
    for (const charge of charges) {
        const net = chargeNetCents(charge, { liveOnly });
        if (!net) continue;
        const key = monthKey(new Date(charge.created * 1000));
        if (monthlyData[key] !== undefined) monthlyData[key] += net / 100;
    }

    const revenueHistory = lastMonths.map((m) => ({
        label: m.label,
        revenue: Math.round(monthlyData[m.key] || 0),
    }));

    const thisMonth = revenueHistory[revenueHistory.length - 1]?.revenue || 0;
    const prevMonth = revenueHistory[revenueHistory.length - 2]?.revenue || 0;

    let mrrCents = 0;
    let activeSubscriptions = 0;
    for (const sub of subscriptions) {
        if (liveOnly && sub.livemode === false) continue;
        if (sub.status !== 'active' && sub.status !== 'past_due') continue;
        activeSubscriptions += 1;
        for (const item of sub.items?.data || []) {
            mrrCents += subscriptionItemMrrCents(item);
        }
    }

    return {
        monthlyRevenue: thisMonth,
        mrr: Math.round(mrrCents / 100),
        activeSubscriptions,
        revenueChangePct: percentChange(thisMonth, prevMonth),
        revenueHistory,
        source: 'stripe',
        livemode: liveOnly,
    };
}

async function listAll(iterator) {
    const rows = [];
    for await (const row of iterator) rows.push(row);
    return rows;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const liveOnly = isLiveSecretKey(getStripeSecretKey());
        const stripe = getStripe();
        const now = new Date();
        const { rangeStartUnix } = buildMonthBuckets(now);

        const [charges, subscriptions] = await Promise.all([
            listAll(stripe.charges.list({ created: { gte: rangeStartUnix }, limit: 100 })),
            listAll(stripe.subscriptions.list({ limit: 100 })),
        ]);

        return res.status(200).json(assembleStripeStats({ charges, subscriptions, now, liveOnly }));
    } catch (error) {
        console.error('Erreur Stripe Stats:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
