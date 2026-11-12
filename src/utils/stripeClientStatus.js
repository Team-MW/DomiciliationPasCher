// Statuts d'abonnement Stripe traduisant un problème de paiement.
// `incomplete` = tout premier prélèvement refusé, l'abonnement n'a jamais démarré.
const FAILING_SUB_STATUSES = ['past_due', 'unpaid', 'incomplete'];
const HEALTHY_SUB_STATUSES = ['active', 'trialing'];
const FAILED_CLIENT_STATUSES = ['echec_paiement', 'impayé'];

/**
 * Détermine le statut à écrire sur la fiche client d'après l'état Stripe.
 * Retourne le statut courant si rien ne doit changer.
 *
 * @param {string} currentStatus - statut actuel en base
 * @param {string} subscriptionStatus - statut renvoyé par /api/list-payments
 * @returns {string} statut à appliquer
 */
export function resolveClientStatusFromStripe(currentStatus, subscriptionStatus) {
    if (!subscriptionStatus) return currentStatus;

    // `canceled` ne résilie JAMAIS la fiche ici : Stripe annule un abonnement ~3 semaines après un refus de
    // carte, alors que le client a 2 mois pour régulariser (seul le cron des impayés résilie, à l'échéance).
    // Un ancien abonnement annulé (client passé au virement, réabonnement) ne doit pas non plus fermer l'espace.
    if (FAILING_SUB_STATUSES.includes(subscriptionStatus) && currentStatus === 'actif') {
        return 'echec_paiement';
    }
    if (HEALTHY_SUB_STATUSES.includes(subscriptionStatus) && FAILED_CLIENT_STATUSES.includes(currentStatus)) {
        return 'actif';
    }
    return currentStatus;
}
