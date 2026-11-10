import { signupUrl } from './_email-templates.js'; // le lien de paiement est arrivé dans la boîte du client : il prouve l'adresse
import { getStripe } from './_stripe-client.js';
import { getDbConn } from './_db.js';
import { getBaseUrl, escapeHtml, wrapEmail, emailButton, sendBrandedMail, PHONE_DISPLAY } from './_email-kit.js';
import { getTransporter, getSmtpConfig, ADMIN_EMAIL } from './_smtp.js';
import { clientPlanPricing } from '../shared/plans.js';
import { adminPaymentPatch } from './_checkout-fulfillment.js';

function parseExtra(raw) {
    try {
        let extra = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof extra === 'string') extra = JSON.parse(extra);
        return extra && typeof extra === 'object' ? extra : {};
    } catch {
        return {};
    }
}

function page(res, status, title, body, baseUrl) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(wrapEmail(`
        <h2 style="margin-top:0;">${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
        ${emailButton(`${baseUrl}/`, 'Retour au site', '#0f172a')}`));
}

function redirect(res, url) {
    res.setHeader('Location', url);
    return res.status(303).send('');
}

async function findClientByToken(conn, token) {
    const res = await conn.execute(
        'SELECT id, name, email, plan, extra_info FROM clients WHERE extra_info LIKE ? LIMIT 5',
        [`%${token}%`],
    );
    return (res.rows || [])
        .map((row) => ({ ...row, extra: parseExtra(row.extra_info) }))
        .find((row) => row.extra.payment_token === token) || null;
}

/**
 * Lien envoyé au client dont le dossier a été créé par l'admin :
 * GET /api/pay?token=…              → nouvelle session Stripe Checkout (abonnement), redirection 303.
 * GET /api/pay?token=…&session_id=… → retour Stripe : enregistre le paiement puis renvoie vers /inscription.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    const baseUrl = getBaseUrl(req);
    const token = String(req.query?.token || '');
    if (!/^[a-f0-9]{32,64}$/i.test(token)) {
        return page(res, 400, 'Lien invalide', `Ce lien de paiement est invalide. Contactez-nous au ${PHONE_DISPLAY}.`, baseUrl);
    }

    try {
        const conn = getDbConn();
        if (!conn) throw new Error('Base de données non configurée');
        const client = await findClientByToken(conn, token);
        if (!client) {
            return page(res, 404, 'Lien expiré', `Ce lien de paiement n’est plus valide. Contactez-nous au ${PHONE_DISPLAY}.`, baseUrl);
        }
        const stripe = getStripe();

        if (req.query.session_id) {
            const session = await stripe.checkout.sessions.retrieve(String(req.query.session_id));
            if (session.metadata?.admin_client_id !== client.id || session.status !== 'complete') {
                return redirect(res, `${baseUrl}/api/pay?token=${token}`);
            }
            if (client.extra.stripe_session_id === session.id) {
                return redirect(res, signupUrl(baseUrl, client.email));
            }
            const patch = adminPaymentPatch(session, client.extra);
            await conn.execute(
                'UPDATE clients SET extra_info = ? WHERE id = ?',
                [JSON.stringify({ ...client.extra, ...patch }), client.id],
            );
            const transporter = getTransporter();
            if (transporter) {
                try {
                    await sendBrandedMail(transporter, {
                        conn,
                        from: getSmtpConfig()?.from,
                        to: ADMIN_EMAIL,
                        clientEmail: client.email,
                        type: 'admin_payment_received',
                        subject: `Abonnement démarré — ${client.name || client.email}`,
                        html: `<h2 style="margin-top:0;">Abonnement démarré</h2>
                            <p><strong>${escapeHtml(client.name || '—')}</strong> (${escapeHtml(client.email)}) a enregistré sa carte : l'abonnement Stripe est actif.</p>`,
                    });
                } catch (mailErr) {
                    console.error('Pay link: notification admin non envoyée', mailErr.message);
                }
            }
            return redirect(res, signupUrl(baseUrl, client.email));
        }

        if (client.extra.payment_status === 'paid') {
            return redirect(res, `${baseUrl}/connexion`);
        }

        // Prix applicable à ce client : grille actuelle, ou ancienne grille s'il a été créé avant.
        const plan = clientPlanPricing(client.plan, client.extra);
        const interval = client.extra.frequence === 'annuel' ? 'year' : 'month';
        const email = String(client.email || '').trim().toLowerCase();

        let customerId = client.extra.stripe_customer_id || null;
        if (!customerId && email) {
            const existing = await stripe.customers.list({ email, limit: 1 });
            customerId = existing.data[0]?.id
                || (await stripe.customers.create({ email, name: client.name || undefined })).id;
        }

        // Déjà abonné (le client a payé sans revenir sur le site, ou clique deux fois sur le lien) :
        // on n'ouvre PAS une 2e session, ce qui créerait un 2e abonnement et un 2e prélèvement.
        if (customerId) {
            try {
                const active = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
                const existingSub = active?.data?.[0];
                if (existingSub) {
                    const patch = {
                        payment_status: 'paid',
                        paid_at: new Date().toISOString(),
                        stripe_customer_id: customerId,
                        stripe_subscription_id: existingSub.id,
                    };
                    await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify({ ...client.extra, ...patch }), client.id]);
                    return redirect(res, signupUrl(baseUrl, client.email));
                }
            } catch (subErr) {
                // Stripe injoignable : on continue comme avant plutôt que de bloquer un client qui veut payer.
                console.error('Pay link: vérification des abonnements impossible', subErr.message);
            }
        }

        const metadata = { admin_client_id: client.id, email, clientName: client.name || '', planId: plan.id };
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: customerId || undefined,
            customer_email: customerId ? undefined : email,
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: 'eur',
                    product_data: { name: `Domiciliation ${plan.name} — ${interval === 'year' ? 'annuel' : 'mensuel'}` },
                    unit_amount: Math.round((interval === 'year' ? plan.ttcYear : plan.ttcMonth) * 100),
                    recurring: { interval },
                },
            }],
            success_url: `${baseUrl}/api/pay?token=${token}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/`,
            metadata,
            subscription_data: { metadata },
        });
        return redirect(res, session.url);
    } catch (err) {
        console.error('Pay link error:', err);
        return page(res, 500, 'Paiement indisponible', `Une erreur est survenue. Réessayez dans quelques minutes ou contactez-nous au ${PHONE_DISPLAY}.`, baseUrl);
    }
}
