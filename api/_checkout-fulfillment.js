import { createDataService } from './_data-service.js';
import { deliverEmail } from './_email-core.js';
import { meetingPriceHt } from '../src/utils/meetingPrices.js';
import { resolvePlanId } from '../shared/plans.js';
import { parseExtraInfo } from '../src/utils/contractLegalFields.js';

/**
 * Traitement serveur d'une session Stripe Checkout terminée.
 *
 * Appelé par /api/verify-session (retour du client sur le site) et par /api/stripe-webhook
 * (filet de sécurité si le client ferme l'onglet). Idempotent : rejouer la même session
 * ne confirme pas deux fois, n'envoie pas deux emails et ne crée pas deux réservations.
 */

/** Payée, ou gratuite grâce à un code promo à 100 % (`no_payment_required`). */
export function isCheckoutSessionPaid(session) {
    if (!session) return false;
    if (session.status && session.status !== 'complete') return false;
    return session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
}

export function expectedMeetingAmountCents(meetingType, duration) {
    return Math.round(meetingPriceHt(meetingType, duration) * 100);
}

/**
 * @returns {Promise<{ kind: string, ok: boolean, reason?: string, booking?: object, firstTime?: boolean }>}
 */
export async function fulfillCheckoutSession(session, { conn, baseUrl, sendEmail } = {}) {
    if (!isCheckoutSessionPaid(session)) return { kind: 'unpaid', ok: false, reason: 'not_paid' };
    if (!conn) return { kind: 'error', ok: false, reason: 'no_db' };

    const send = sendEmail || ((body) => deliverEmail(body, { baseUrl }));
    const service = createDataService({ conn, sendEmail: send });
    const meta = session.metadata || {};

    if (meta.type === 'meeting_booking') {
        const clientId = String(meta.client_id || '');
        if (!clientId || !meta.date || !meta.meeting_type || !meta.duration) {
            return { kind: 'booking', ok: false, reason: 'missing_metadata' };
        }
        // Le montant encaissé doit couvrir au moins le tarif HT de la prestation (plancher qui
        // accepte aussi les sessions créées avant le passage au TTC ; depuis, le serveur fixe le prix).
        const expected = expectedMeetingAmountCents(meta.meeting_type, meta.duration);
        if (typeof session.amount_total === 'number' && session.amount_total < expected) {
            console.warn('[fulfillment] montant de réservation incohérent', session.id, session.amount_total, expected);
            return { kind: 'booking', ok: false, reason: 'amount_mismatch' };
        }
        const booking = await service.addBookingRequest(clientId, {
            type: meta.meeting_type,
            date: meta.date,
            duration: meta.duration,
            city: meta.city || 'À définir',
        }, { sessionId: session.id });
        return { kind: 'booking', ok: true, booking, clientId };
    }

    if (meta.demande_id) {
        const demande = await service.getDemandeById(meta.demande_id);
        if (!demande) {
            // Déjà validée par l'admin (la demande devient une fiche client) : rien à faire.
            return { kind: 'demande', ok: true, firstTime: false };
        }
        // La session doit correspondre au forfait de la demande (garde-fou pour les sessions
        // créées avant que checkout ne lise le forfait en base).
        const extra = parseExtraInfo(demande.extra_info);
        const expectedPlan = resolvePlanId(demande.plan || extra.offre);
        const expectedInterval = extra.frequence === 'annuel' ? 'year' : 'month';
        if ((meta.planId && meta.planId !== expectedPlan) || (meta.interval && meta.interval !== expectedInterval)) {
            console.warn('[fulfillment] forfait payé différent de la demande', session.id, meta.planId, expectedPlan);
            return { kind: 'demande', ok: false, reason: 'plan_mismatch' };
        }
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
        const firstTime = await service.confirmDemandePayment(meta.demande_id, session.id, customerId);
        // Code promo utilisé (tunnel ou page Stripe) : repris dans l'Annexe 1 du contrat.
        const discounted = Number(session.total_details?.amount_discount) > 0;
        if (firstTime && (meta.promo_code || discounted) && !extra.code_promo) {
            await setDemandeFlag(conn, meta.demande_id, 'code_promo', String(meta.promo_code || 'Code promo').slice(0, 40));
        }
        const email = String(demande.email || meta.email || session.customer_details?.email || '').trim().toLowerCase();
        // Bienvenue : au premier passage, OU si le premier envoi a échoué (marqueur welcome_pending) :
        // sans ça, un incident SMTP ponctuel faisait perdre définitivement l'email.
        if ((firstTime || extra.welcome_pending) && email) {
            const nom = String(meta.clientName || demande.clientName || '').replace(/\s*-?\s*📞.*$/, '').trim();
            let welcomeSent = false;
            try {
                // Email de bienvenue (type absent) + notification « nouveau client » à l'admin.
                await send({ email, nom });
                welcomeSent = true;
            } catch (err) {
                console.error('[fulfillment] email de bienvenue non envoyé (sera retenté):', err);
            }
            if (!welcomeSent || extra.welcome_pending) {
                await setDemandeFlag(conn, meta.demande_id, 'welcome_pending', welcomeSent ? undefined : true);
            }
            try {
                await service.completeSouscriptionLead(email);
            } catch (err) {
                console.error('[fulfillment] fin des relances inscription:', err);
            }
        }
        return { kind: 'demande', ok: true, firstTime, demandeId: meta.demande_id };
    }

    // Dossier créé par l'admin, payé via /api/pay : si le client ferme l'onglet avant le retour sur le
    // site, c'est le webhook qui enregistre le paiement (sinon le dossier restait « en attente » et
    // recevait des relances alors qu'il avait payé).
    if (meta.admin_client_id) {
        const clientId = String(meta.admin_client_id);
        const res = await conn.execute('SELECT id, name, email, extra_info FROM clients WHERE id = ?', [clientId]);
        const row = res?.rows?.[0];
        if (!row) return { kind: 'admin_payment', ok: false, reason: 'client_not_found' };
        const previous = parseExtraInfo(row.extra_info);
        if (previous.stripe_session_id === session.id) return { kind: 'admin_payment', ok: true, firstTime: false };
        const patch = adminPaymentPatch(session, previous);
        await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify({ ...previous, ...patch }), clientId]);
        try {
            await send({ type: 'admin_payment_received', email: row.email, nom: row.name });
        } catch (err) {
            console.error('[fulfillment] alerte « abonnement démarré » non envoyée:', err);
        }
        return { kind: 'admin_payment', ok: true, firstTime: true, clientId };
    }

    return { kind: 'other', ok: true };
}

/** Champs d'extra_info posés quand un dossier créé par l'admin est payé (partagé avec api/pay.js). */
export function adminPaymentPatch(session, previous = {}) {
    return {
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_customer_id: (typeof session.customer === 'string' ? session.customer : session.customer?.id) || previous.stripe_customer_id,
        stripe_subscription_id: (typeof session.subscription === 'string' ? session.subscription : session.subscription?.id) || null,
        stripe_session_id: session.id,
    };
}

/** Pose (ou retire, si value est undefined) un marqueur dans extra_info d'une demande, sans écraser le reste. */
async function setDemandeFlag(conn, demandeId, key, value) {
    try {
        const res = await conn.execute('SELECT extra_info FROM demandes WHERE id = ?', [demandeId]);
        const row = res?.rows?.[0];
        if (!row) return;
        const extra = parseExtraInfo(row.extra_info);
        if (value === undefined) delete extra[key];
        else extra[key] = value;
        await conn.execute('UPDATE demandes SET extra_info = ? WHERE id = ?', [JSON.stringify(extra), demandeId]);
    } catch (err) {
        console.error(`[fulfillment] marqueur ${key} non enregistré:`, err?.message || err);
    }
}
