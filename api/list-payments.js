import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, customerId, since } = req.query;
    if (!email && !customerId) {
        return res.status(400).json({ error: 'Email or CustomerId is required' });
    }

    try {
        let sinceUnix = 0;
        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
                sinceUnix = Math.floor(sinceDate.getTime() / 1000) - (2 * 24 * 60 * 60);
            }
        }

        let secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) secretKey = match[1].trim();
            }
        }

        if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");

        const stripe = new Stripe(secretKey);

        const customerIdsSet = new Set();
        if (customerId) {
            customerIdsSet.add(customerId);
        } else if (email) {
            const customers = await stripe.customers.list({ email: email.trim().toLowerCase(), limit: 100 });
            customers.data.forEach(c => customerIdsSet.add(c.id));
        }
        const customerIds = Array.from(customerIdsSet);

        // Pas de sortie anticipée quand aucune fiche client ne correspond : un paiement invité
        // (payment link, checkout sans compte) n'est rattaché à aucun customer et ne serait
        // jamais retrouvé, alors que c'est précisément le cas que la recherche par email couvre.

        // Un client peut avoir plusieurs abonnements (ou plusieurs fiches Stripe pour le même email).
        // On retient le plus préoccupant afin qu'un impayé ne soit jamais masqué par un autre
        // abonnement encore actif.
        const STATUS_PRIORITY = ['unpaid', 'past_due', 'incomplete', 'trialing', 'active', 'paused', 'canceled', 'incomplete_expired'];
        // 'non_trouvé' signifie « aucun abonnement Stripe » : les appelants laissent alors le
        // statut de la fiche client inchangé, au lieu de le forcer à 'actif' à tort.
        let subscriptionStatus = 'non_trouvé';
        let bestRank = Infinity;
        for (const cid of customerIds) {
            try {
                const subs = await stripe.subscriptions.list({ customer: cid, status: 'all', limit: 100 });
                for (const sub of subs.data) {
                    const rank = STATUS_PRIORITY.indexOf(sub.status);
                    if (rank !== -1 && rank < bestRank) {
                        bestRank = rank;
                        subscriptionStatus = sub.status;
                    }
                }
            } catch (err) {
                console.warn(`Could not fetch subscriptions for ${cid}:`, err.message);
            }
        }

        const allInvoices = [];
        const allPIs = [];
        for (const cid of customerIds) {
            try {
                const paymentIntents = await stripe.paymentIntents.list({
                    customer: cid,
                    limit: 100,
                    expand: ['data.latest_charge'],
                });
                allPIs.push(...paymentIntents.data);

                // `data.payments` est nécessaire pour relier une facture à son PaymentIntent :
                // le champ Invoice.payment_intent n'existe plus dans l'API Stripe actuelle.
                const invoices = await stripe.invoices.list({
                    customer: cid,
                    limit: 100,
                    expand: ['data.payments'],
                });
                allInvoices.push(...invoices.data);
            } catch (err) {
                console.warn(`Could not fetch payments for ${cid}:`, err.message);
            }
        }

        // Récupérer aussi les paiements invités (guest checkouts/payment links) liés à cet email.
        // `receipt_email` n'est pas un champ interrogeable pour les PaymentIntents ; on passe par
        // la métadonnée `email` que /api/checkout écrit sur chaque paiement.
        if (email) {
            const safeEmail = email.trim().toLowerCase().replace(/['\\]/g, '');
            try {
                const searchPIs = await stripe.paymentIntents.search({
                    query: `metadata['email']:'${safeEmail}'`,
                    limit: 100,
                    expand: ['data.latest_charge'],
                });
                allPIs.push(...searchPIs.data);
            } catch (searchErr) {
                console.warn("Stripe search API not available or failed:", searchErr.message);
            }
        }

        const uniquePayments = new Map();
        const invoicePiIds = new Set();

        // 1. Ajouter d'abord les factures (qui gèrent les abonnements et les montants à 0€)
        for (const inv of allInvoices) {
            if (inv.status === 'draft' || inv.status === 'void') continue;

            for (const p of inv.payments?.data || []) {
                const pi = p.payment?.payment_intent;
                if (pi) invoicePiIds.add(typeof pi === 'string' ? pi : pi.id);
            }

            let status = 'échec';
            if (inv.status === 'paid') status = 'payé';
            else if (inv.status === 'open') {
                status = inv.attempt_count > 0 ? 'échec' : 'en attente';
            }
            else if (inv.status === 'uncollectible') status = 'échec';

            uniquePayments.set(inv.id, {
                id: inv.id,
                amount: inv.total / 100, 
                currency: inv.currency,
                status: status,
                date: new Date(inv.created * 1000).toISOString().split('T')[0],
                method: 'Carte (Stripe)',
                invoice_ref: inv.number || `FAC-TMP-${inv.id.substring(3, 9)}`,
                invoice_pdf: inv.invoice_pdf || null,
                hosted_invoice_url: inv.hosted_invoice_url || null,
                invoice_url: inv.invoice_pdf || inv.hosted_invoice_url
            });
        }

        // 2. Ajouter les PaymentIntents uniques (ex: paiements initiaux non liés à une facture récurrente)
        for (const pi of allPIs) {
            if (invoicePiIds.has(pi.id)) continue; // Déjà traité via sa facture
            if (pi.description && pi.description.toLowerCase().includes('subscription')) continue; // Géré par l'Invoice de l'abonnement
            
            // Ignorer les tentatives de paiement abandonnées (évite les fausses alertes 'Impayé')
            if (pi.status === 'requires_payment_method' || pi.status === 'canceled') continue;

            let status = 'échec';
            if (pi.status === 'succeeded') status = 'payé';
            else if (['requires_confirmation', 'requires_action', 'processing'].includes(pi.status)) status = 'en attente';
            else if (['requires_capture'].includes(pi.status)) status = 'échec';

            uniquePayments.set(pi.id, {
                id: pi.id,
                amount: pi.amount / 100,
                currency: pi.currency,
                status: status,
                date: new Date(pi.created * 1000).toISOString().split('T')[0],
                method: pi.payment_method_types?.[0] === 'card' ? 'Carte (Stripe)' : (pi.payment_method_types?.[0] || 'Stripe'),
                invoice_ref: pi.description || `PAIEMENT-${pi.id.substring(3, 9)}`,
                receipt_url: pi.latest_charge?.receipt_url || null
            });
        }

        const payments = Array.from(uniquePayments.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({ 
            payments, 
            subscriptionStatus,
            foundCustomerId: customerIds.length > 0 ? customerIds[0] : null
        });
    } catch (error) {
        console.error('Stripe sync error:', error);
        res.status(500).json({ error: error.message });
    }
}
