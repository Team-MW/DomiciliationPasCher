import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { getBaseUrl } from './_email-kit.js';
import { deliverEmail } from './_email-core.js';
import { fulfillCheckoutSession, isCheckoutSessionPaid } from './_checkout-fulfillment.js';
import { sendServerError } from './_auth.js';
import { toE164French } from '../shared/phone.js';

const parseExtra = (raw) => {
    try {
        let extra = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof extra === 'string') extra = JSON.parse(extra);
        return extra && typeof extra === 'object' ? extra : {};
    } catch {
        return {};
    }
};

/** Téléphone saisi lors de la commande : demande du tunnel, ou fiche créée par l'admin. */
async function orderPhone(session) {
    const direct = session.customer_details?.phone;
    if (direct) return direct;
    const conn = getDbConn();
    if (!conn) return null;
    try {
        if (session.metadata?.demande_id) {
            const row = (await conn.execute('SELECT extra_info FROM demandes WHERE id = ?', [String(session.metadata.demande_id)])).rows?.[0];
            if (row) return parseExtra(row.extra_info).telephone || null;
            // Demande déjà validée par l'admin : le téléphone est sur la fiche client.
            const email = String(session.customer_details?.email || session.metadata?.email || '').trim().toLowerCase();
            if (email) {
                const client = (await conn.execute('SELECT phone, extra_info FROM clients WHERE LOWER(email) = ? LIMIT 1', [email])).rows?.[0];
                if (client) return client.phone || parseExtra(client.extra_info).telephone || null;
            }
        }
        if (session.metadata?.admin_client_id) {
            const client = (await conn.execute('SELECT phone, extra_info FROM clients WHERE id = ?', [String(session.metadata.admin_client_id)])).rows?.[0];
            if (client) return client.phone || parseExtra(client.extra_info).telephone || null;
        }
    } catch (err) {
        console.warn('[verify-session] téléphone de la commande illisible:', err?.message || err);
    }
    return null;
}

export async function buildOrder(session) {
    const email = String(session.customer_details?.email || session.metadata?.email || '').trim().toLowerCase() || null;
    const phone = toE164French(await orderPhone(session));
    const value = Number.isFinite(Number(session.amount_total)) ? Math.round(Number(session.amount_total)) / 100 : null;
    return {
        transaction_id: session.id,
        value,
        currency: String(session.currency || 'eur').toUpperCase(),
        ...(email ? { email } : {}),
        ...(phone ? { phone_number: phone } : {}),
    };
}

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

        // Données de la commande pour le suivi des conversions (Google Ads « conversions améliorées ») :
        // montant réel, identifiant, email et téléphone du client. Uniquement pour une session PAYÉE, et le
        // session_id (secret long et aléatoire, connu du seul payeur) sert de preuve d'accès.
        const order = isPaid ? await buildOrder(session) : null;

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
            ...(order ? { order } : {}),
        });
    } catch (error) {
        return sendServerError(res, error, 'verify-session');
    }
}
