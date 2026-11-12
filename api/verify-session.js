import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { getBaseUrl } from './_email-kit.js';
import { deliverEmail } from './_email-core.js';
import { fulfillCheckoutSession, isCheckoutSessionPaid } from './_checkout-fulfillment.js';
import { sendServerError } from './_auth.js';

/**
 * Retour de paiement Stripe. La confirmation de la demande (et l'email de bienvenue) est
 * faite ici, côté serveur, à partir de la session Stripe — plus depuis le navigateur.
 * Les réservations de salles sont confirmées par api/data.js (confirmMeetingBooking),
 * qui exige que le client connecté soit bien le titulaire de la réservation.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { session_id } = req.query || {};
    if (!session_id || !/^cs_[A-Za-z0-9_]+$/.test(String(session_id))) {
        return res.status(400).json({ error: 'Session ID manquant' });
    }

    try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(String(session_id));
        const isPaid = isCheckoutSessionPaid(session);

        let fulfillment = null;
        if (isPaid && session.metadata?.type !== 'meeting_booking') {
            try {
                fulfillment = await fulfillCheckoutSession(session, { conn: getDbConn(), baseUrl: getBaseUrl(req) });
                // Paiement acquis mais dossier non confirmé (formule différente, demande introuvable…) :
                // même alerte admin que le webhook, sinon le client paie et personne ne le voit.
                if (fulfillment && !fulfillment.ok && fulfillment.reason) {
                    try {
                        await deliverEmail({
                            type: 'admin_payment_problem',
                            email: String(session.customer_details?.email || session.metadata?.email || 'inconnu@example.invalid'),
                            nom: String(session.metadata?.clientName || session.customer_details?.name || ''),
                            notes: fulfillment.reason,
                            documentName: session.id,
                        }, { baseUrl: getBaseUrl(req), source: 'interne' });
                    } catch (mailErr) {
                        console.error('[verify-session] alerte admin non envoyée:', mailErr);
                    }
                }
            } catch (err) {
                // Le paiement est acquis : on n'affiche pas d'échec au client, le webhook rattrapera.
                console.error('[verify-session] traitement de la session impossible:', err);
            }
        }

        return res.status(200).json({
            success: isPaid,
            status: session.payment_status,
            session_id: session.id,
            customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
            confirmed: Boolean(fulfillment?.ok),
            metadata: {
                type: session.metadata?.type || null,
                demande_id: session.metadata?.demande_id || null,
            },
        });
    } catch (error) {
        return sendServerError(res, error, 'verify-session');
    }
}
