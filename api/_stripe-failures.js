import { parisDateIso } from '../shared/parisDate.js';
// Source unique de vérité pour la détection des impayés Stripe.
// Utilisée par /api/stripe-failed-payments (affichage admin) et par le cron quotidien
// (relance email). Dupliquer cette logique est ce qui a produit les divergences passées.

import { earliestIsoDate } from '../shared/paymentGrace.js';

// Statuts d'abonnement qui traduisent un problème de paiement.
export const FAILING_SUB_STATUSES = ['past_due', 'unpaid', 'incomplete'];

const toDateString = (unix) => (unix ? parisDateIso(new Date(unix * 1000)) : null);
const idOf = (ref) => (typeof ref === 'string' ? ref : ref?.id || null);
const isTerminated = (obj) => obj?.metadata?.dpc_domicile_terminated === '1';

/**
 * Balaie le compte Stripe et retourne un impayé normalisé par client.
 * @param {import('stripe').Stripe} stripe
 */
export async function scanFailedPayments(stripe) {
    const failures = new Map();
    const customerIds = new Set();

    // Dates et marqueur « résilié » : calculés à la fin, par client (voir plus bas).
    const strongDates = new Map(); // abonnement en échec + factures ouvertes : l'impayé EN COURS
    const weakDates = new Map(); // factures irrécouvrables : seulement s'il n'y a rien d'autre
    const failingSubTerminated = new Map();
    const invoiceTerminated = new Map();
    const addDate = (map, cid, date) => {
        if (!cid || !date) return;
        if (!map.has(cid)) map.set(cid, []);
        map.get(cid).push(date);
    };

    const upsert = (customerId, data) => {
        if (!customerId) return;
        customerIds.add(customerId);
        const { failedAt: _ignoredDate, alreadyTerminated: _ignoredFlag, ...rest } = data;
        failures.set(customerId, { ...(failures.get(customerId) || {}), ...rest, customerId });
    };

    for (const status of FAILING_SUB_STATUSES) {
        for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
            const item = sub.items?.data?.[0];
            const cid = idOf(sub.customer);
            upsert(cid, {
                subscriptionId: sub.id,
                subscriptionStatus: sub.status,
                interval: item?.plan?.interval || item?.price?.recurring?.interval || null,
                // current_period_end a migré sur l'item d'abonnement dans l'API Stripe actuelle.
                periodEnd: toDateString(item?.current_period_end ?? sub.current_period_end),
            });
            addDate(strongDates, cid, toDateString(item?.current_period_start ?? sub.current_period_start));
            failingSubTerminated.set(cid, (failingSubTerminated.get(cid) ?? true) && isTerminated(sub));
        }
    }

    // Une facture `open` avec au moins une tentative de prélèvement est un échec réel ;
    // sans tentative, elle est simplement en attente d'échéance.
    for await (const inv of stripe.invoices.list({ status: 'open', limit: 100 })) {
        if (!inv.attempt_count) continue;
        const cid = idOf(inv.customer);
        upsert(cid, invoiceFailure(inv, toDateString(inv.next_payment_attempt)));
        addDate(strongDates, cid, toDateString(inv.created));
        if (isTerminated(inv)) invoiceTerminated.set(cid, true);
    }

    for await (const inv of stripe.invoices.list({ status: 'uncollectible', limit: 100 })) {
        const cid = idOf(inv.customer);
        // Une facture ouverte en cours de relance reste la référence (montant, lien, compteur) :
        // une vieille facture irrécouvrable ne doit pas l'écraser.
        if (!failures.get(cid)?.invoiceId) upsert(cid, invoiceFailure(inv, null));
        addDate(weakDates, cid, toDateString(inv.created));
        if (isTerminated(inv)) invoiceTerminated.set(cid, true);
    }

    // Date de départ du délai de grâce : l'impayé en cours uniquement. Une vieille facture irrécouvrable
    // (ancien épisode, client réabonné depuis) ne doit pas avancer la résiliation.
    // « Déjà résilié » : si un abonnement est en échec, seul SON marqueur compte (un ancien épisode
    // marqué sur une vieille facture ne doit pas rendre un nouvel impayé invisible).
    const earliest = (dates) => (dates || []).reduce((min, d) => earliestIsoDate(min, d), null);
    for (const [cid, failure] of failures) {
        failure.failedAt = earliest(strongDates.get(cid)) || earliest(weakDates.get(cid)) || null;
        failure.alreadyTerminated = failingSubTerminated.has(cid)
            ? Boolean(failingSubTerminated.get(cid))
            : Boolean(invoiceTerminated.get(cid));
    }

    // Clients qui ont par ailleurs un abonnement sain : une ancienne facture impayée
    // (abonnement résilié puis réabonnement) ne doit pas entraîner leur résiliation.
    const healthyCustomers = new Set();
    for (const status of ['active', 'trialing']) {
        try {
            for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
                const cid = idOf(sub.customer);
                if (failures.has(cid)) healthyCustomers.add(cid);
            }
        } catch (err) {
            console.warn(`Abonnements ${status} illisibles:`, err.message);
        }
    }
    for (const [cid, failure] of failures) {
        failure.hasHealthySubscription = healthyCustomers.has(cid);
    }

    // Un seul aller-retour par client pour récupérer email et nom.
    const contacts = new Map();
    await Promise.all(
        Array.from(customerIds).map(async (cid) => {
            try {
                const customer = await stripe.customers.retrieve(cid);
                if (!customer.deleted) {
                    contacts.set(cid, { email: customer.email || null, name: customer.name || null });
                }
            } catch (err) {
                console.warn(`Client Stripe ${cid} illisible:`, err.message);
            }
        })
    );

    return Array.from(failures.values())
        .map((f) => ({ ...f, ...(contacts.get(f.customerId) || { email: null, name: null }) }))
        .sort((a, b) => (b.failedAt || '').localeCompare(a.failedAt || ''));
}

function invoiceFailure(inv, nextAttempt) {
    return {
        invoiceId: inv.id,
        invoiceNumber: inv.number || null,
        invoiceStatus: inv.status,
        amountDue: (inv.amount_remaining ?? inv.total) / 100,
        currency: inv.currency,
        attemptCount: inv.attempt_count,
        nextAttempt,
        invoiceUrl: inv.hosted_invoice_url || inv.invoice_pdf || null,
        failedAt: toDateString(inv.created),
        // Mémorise la dernière relance envoyée, pour ne pas réexpédier le même email chaque jour.
        lastDunningAttempt: inv.metadata?.dpc_last_dunning_attempt || null,
        alreadyTerminated: isTerminated(inv),
    };
}
