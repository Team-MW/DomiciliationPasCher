// Source unique de vérité pour la détection des impayés Stripe.
// Utilisée par /api/stripe-failed-payments (affichage admin) et par le cron quotidien
// (relance email). Dupliquer cette logique est ce qui a produit les divergences passées.

import { earliestIsoDate } from '../shared/paymentGrace.js';

// Statuts d'abonnement qui traduisent un problème de paiement.
export const FAILING_SUB_STATUSES = ['past_due', 'unpaid', 'incomplete'];

const toDateString = (unix) => (unix ? new Date(unix * 1000).toISOString().split('T')[0] : null);
const idOf = (ref) => (typeof ref === 'string' ? ref : ref?.id || null);
const isTerminated = (obj) => obj?.metadata?.dpc_domicile_terminated === '1';

/**
 * Balaie le compte Stripe et retourne un impayé normalisé par client.
 * @param {import('stripe').Stripe} stripe
 */
export async function scanFailedPayments(stripe) {
    const failures = new Map();
    const customerIds = new Set();

    const upsert = (customerId, data) => {
        if (!customerId) return;
        customerIds.add(customerId);
        const prev = failures.get(customerId) || {};
        failures.set(customerId, {
            ...prev,
            ...data,
            customerId,
            failedAt: earliestIsoDate(prev.failedAt, data.failedAt),
            alreadyTerminated: Boolean(prev.alreadyTerminated || data.alreadyTerminated),
        });
    };

    for (const status of FAILING_SUB_STATUSES) {
        for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
            const item = sub.items?.data?.[0];
            upsert(idOf(sub.customer), {
                subscriptionId: sub.id,
                subscriptionStatus: sub.status,
                interval: item?.plan?.interval || item?.price?.recurring?.interval || null,
                // current_period_end a migré sur l'item d'abonnement dans l'API Stripe actuelle.
                periodEnd: toDateString(item?.current_period_end ?? sub.current_period_end),
                failedAt: toDateString(item?.current_period_start ?? sub.current_period_start),
                alreadyTerminated: isTerminated(sub),
            });
        }
    }

    // Une facture `open` avec au moins une tentative de prélèvement est un échec réel ;
    // sans tentative, elle est simplement en attente d'échéance.
    for await (const inv of stripe.invoices.list({ status: 'open', limit: 100 })) {
        if (!inv.attempt_count) continue;
        upsert(idOf(inv.customer), invoiceFailure(inv, toDateString(inv.next_payment_attempt)));
    }

    for await (const inv of stripe.invoices.list({ status: 'uncollectible', limit: 100 })) {
        upsert(idOf(inv.customer), invoiceFailure(inv, null));
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
