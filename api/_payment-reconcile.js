/**
 * Rattache un paiement Stripe à un dossier créé par l'admin resté « carte non enregistrée ».
 *
 * Cas réel : la fiche porte `payment_status: 'pending'` (lien de paiement envoyé), mais Stripe montre un
 * abonnement actif pour cet email (le client a payé sans revenir sur le site, ou le webhook n'est pas passé).
 * Résultat avant : bannière « Paiement en attente » + relances « enregistrez votre carte » à un client qui a payé.
 *
 * `billing` vient de fetchStripeBilling (hasHealthySubscription, healthySubscriptionId, healthyCustomerId…).
 * Relit la fiche juste avant d'écrire (jamais d'écrasement avec des données périmées).
 */
import { parseExtraInfo } from '../src/utils/contractLegalFields.js';

export const PENDING_KEYS = ['payment_token', 'payment_requested_at', 'payment_reminders_sent'];

export function pendingPaymentPatch(extra, billing) {
    if (!extra || extra.payment_status !== 'pending' || !billing?.hasHealthySubscription) return null;
    const next = { ...extra };
    for (const key of PENDING_KEYS) delete next[key];
    next.payment_status = 'paid';
    next.paid_at = billing.healthySubscriptionCreated || new Date().toISOString();
    if (billing.healthyCustomerId) next.stripe_customer_id = billing.healthyCustomerId;
    if (billing.healthySubscriptionId) next.stripe_subscription_id = billing.healthySubscriptionId;
    return next;
}

/**
 * @param {{ conn, clientId, billing, notify?: (info: {email: string, nom: string}) => Promise<void> }} args
 *   `notify` : prévenir le client que son dossier est actif (il n'est pas revenu sur le site après le paiement,
 *   il n'a donc jamais vu « Créer mon accès »). Appelé une seule fois, quand la fiche vient d'être rattachée.
 * @returns {Promise<{changed: boolean}>}
 */
export async function reconcilePendingPayment({ conn, clientId, billing, notify = null }) {
    if (!conn || !clientId || !billing?.hasHealthySubscription) return { changed: false };
    let row;
    try {
        row = (await conn.execute('SELECT email, name, extra_info FROM clients WHERE id = ?', [clientId])).rows?.[0];
    } catch {
        return { changed: false };
    }
    if (!row) return { changed: false };
    let raw;
    try {
        raw = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info || '{}') : (row.extra_info || {});
        if (typeof raw === 'string') raw = JSON.parse(raw);
    } catch {
        return { changed: false }; // fiche illisible : on n'écrit rien
    }
    const extra = parseExtraInfo(raw);
    const next = pendingPaymentPatch(extra, billing);
    if (!next) return { changed: false };
    await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify(next), clientId]);
    if (notify && row.email) {
        try {
            await notify({ email: String(row.email), nom: String(row.name || '').replace(/\s*-?\s*📞.*$/, '') });
        } catch (err) {
            console.error('[reconcile] email « dossier actif » non envoyé:', err?.message || err);
        }
    }
    return { changed: true, subscriptionId: next.stripe_subscription_id || null };
}
