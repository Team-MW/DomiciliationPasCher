/**
 * Test d'intégration Stripe de bout en bout, en mode TEST uniquement.
 *
 * Crée de vrais clients et abonnements Stripe de test, interroge les endpoints du serveur
 * de développement, vérifie ce que le logiciel affiche, puis supprime tout ce qu'il a créé.
 *
 * Usage : npm run dev, puis  node scripts/test-stripe-integration.mjs
 */
import Stripe from 'stripe';
import fs from 'fs';
import { resolveClientStatusFromStripe } from '../src/utils/stripeClientStatus.js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const TAG = 'integration_test_stripe';

const key = (process.env.STRIPE_SECRET_KEY
    || fs.readFileSync('.env.local', 'utf-8').match(/^STRIPE_SECRET_KEY=(.*)$/m)?.[1] || '')
    .trim().replace(/^['"]|['"]$/g, '');

if (!key.startsWith('sk_test')) {
    console.error('Arrêt : ce script exige une clé Stripe de test (sk_test_...).');
    process.exit(1);
}

const stripe = new Stripe(key);
const created = { customers: [], products: [] };

let passed = 0;
let failed = 0;

const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n      attendu : ${JSON.stringify(expected)}\n      obtenu  : ${JSON.stringify(actual)}`}`);
    ok ? passed++ : failed++;
};

const api = async (path) => {
    const res = await fetch(`${BASE_URL}${path}`);
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Réponse non-JSON de ${path} : ${text.slice(0, 120)}`);
    }
};

const listPayments = (email) => api(`/api/list-payments?email=${encodeURIComponent(email)}&_t=${Date.now()}`);
const failedPayments = () => api(`/api/stripe-failed-payments?_t=${Date.now()}`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** L'index de recherche Stripe peut avoir jusqu'à une minute de retard. */
async function listPaymentsWithRetry(email, attempts = 12) {
    for (let i = 0; i < attempts; i++) {
        const data = await listPayments(email);
        if (data.payments.length > 0) return data;
        await sleep(6000);
    }
    return listPayments(email);
}

async function makeCustomer(label, paymentMethod) {
    const email = `it-${label}-${Date.now()}@example.com`;
    const customer = await stripe.customers.create({
        email,
        name: `IT ${label}`,
        payment_method: paymentMethod,
        invoice_settings: { default_payment_method: paymentMethod },
        metadata: { [TAG]: 'true' },
    });
    created.customers.push(customer.id);
    return { customer, email };
}

async function makeSubscription(customerId, amountCents = 2880) {
    const product = await stripe.products.create({ name: `IT domiciliation ${Date.now()}`, metadata: { [TAG]: 'true' } });
    created.products.push(product.id);
    const price = await stripe.prices.create({
        product: product.id, currency: 'eur', unit_amount: amountCents, recurring: { interval: 'month' },
    });
    return stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        metadata: { [TAG]: 'true' },
    });
}

async function cleanup() {
    console.log('\nNettoyage des objets Stripe de test...');
    for (const id of created.customers) {
        await stripe.customers.del(id).catch(e => console.warn('  client', id, e.message));
    }
    for (const id of created.products) {
        await stripe.products.update(id, { active: false }).catch(() => {});
    }
    console.log(`  ${created.customers.length} client(s) supprimé(s).`);
}

async function run() {
    // --- A. Abonnement réglé normalement -------------------------------------
    console.log('\nA. Abonnement payé avec une carte valide');
    const a = await makeCustomer('paye', 'pm_card_visa');
    const subA = await makeSubscription(a.customer.id);
    const payA = await listPayments(a.email);

    check('statut abonnement remonté', payA.subscriptionStatus, 'active');
    check('une seule ligne de paiement (pas de doublon facture/PaymentIntent)', payA.payments.length, 1);
    check('la ligne est marquée payée', payA.payments[0].status, 'payé');
    check('le montant est correct', payA.payments[0].amount, 28.8);
    check('la ligne vient de la facture', payA.payments[0].id.startsWith('in_'), true);
    check('lien de facture fourni', Boolean(payA.payments[0].invoice_url), true);
    check("l'ID client Stripe est retrouvé via l'email", payA.foundCustomerId, a.customer.id);

    const failA = await failedPayments();
    check("n'apparaît pas dans les impayés", failA.failures.some(f => f.customerId === a.customer.id), false);
    check('statut fiche client inchangé', resolveClientStatusFromStripe('actif', payA.subscriptionStatus), 'actif');

    // --- B. Prélèvement refusé ----------------------------------------------
    console.log('\nB. Prélèvement refusé par la banque');
    const b = await makeCustomer('refuse', 'pm_card_chargeCustomerFail');
    const subB = await makeSubscription(b.customer.id);
    const payB = await listPayments(b.email);

    check('statut abonnement remonté', payB.subscriptionStatus, 'incomplete');
    check('la ligne est marquée en échec', payB.payments[0].status, 'échec');
    check('montant dû correct', payB.payments[0].amount, 28.8);

    const failB = await failedPayments();
    const rowB = failB.failures.find(f => f.customerId === b.customer.id);
    check("remonte dans l'onglet Paiements Échoués", Boolean(rowB), true);
    check('montant dû affiché', rowB?.amountDue, 28.8);
    check('nombre de tentatives affiché', rowB?.attemptCount, 1);
    check('email du client rattaché', rowB?.email, b.email);
    check('lien vers la facture Stripe fourni', Boolean(rowB?.invoiceUrl), true);
    check('la fiche client passe en échec de paiement', resolveClientStatusFromStripe('actif', payB.subscriptionStatus), 'echec_paiement');

    // --- C. Régularisation ---------------------------------------------------
    console.log('\nC. Régularisation : le client met une carte valide');
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: b.customer.id });
    await stripe.customers.update(b.customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const invoiceId = typeof subB.latest_invoice === 'string' ? subB.latest_invoice : subB.latest_invoice.id;
    await stripe.invoices.pay(invoiceId);

    const payC = await listPayments(b.email);
    check('abonnement repassé actif', payC.subscriptionStatus, 'active');
    check('la ligne est maintenant payée', payC.payments[0].status, 'payé');
    check('toujours une seule ligne', payC.payments.length, 1);

    const failC = await failedPayments();
    check('disparaît des impayés', failC.failures.some(f => f.customerId === b.customer.id), false);
    check('la fiche client repasse en actif', resolveClientStatusFromStripe('echec_paiement', payC.subscriptionStatus), 'actif');

    // --- D. Résiliation ------------------------------------------------------
    console.log('\nD. Résiliation de l\'abonnement');
    await stripe.subscriptions.cancel(subA.id);
    const payD = await listPayments(a.email);
    check('statut abonnement résilié', payD.subscriptionStatus, 'canceled');
    check('la fiche client passe en résilié', resolveClientStatusFromStripe('actif', payD.subscriptionStatus), 'résilié');
    check('historique de paiement conservé', payD.payments.length, 1);

    // --- E. Paiement unique invité (recherche par métadonnée email) ---------
    console.log('\nE. Paiement unique invité, retrouvé par son email');
    const guestEmail = `it-invite-${Date.now()}@example.com`;
    await stripe.paymentIntents.create({
        amount: 9900,
        currency: 'eur',
        payment_method: 'pm_card_visa',
        confirm: true,
        description: 'IT frais de dossier',
        metadata: { email: guestEmail, [TAG]: 'true' },
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });

    const payE = await listPaymentsWithRetry(guestEmail);
    check('le paiement invité est retrouvé', payE.payments.length, 1);
    check('marqué payé', payE.payments[0]?.status, 'payé');
    check('montant correct', payE.payments[0]?.amount, 99);
    check('reçu Stripe disponible', Boolean(payE.payments[0]?.receipt_url), true);
    check('aucun statut d\'abonnement inventé pour un paiement unique', payE.subscriptionStatus, 'non_trouvé');
    check('le statut de la fiche client reste inchangé', resolveClientStatusFromStripe('echec_paiement', payE.subscriptionStatus), 'echec_paiement');

    // --- F. Client multi-abonnements ----------------------------------------
    console.log('\nF. Client avec un abonnement sain ET un abonnement en échec');
    const f = await makeCustomer('multi', 'pm_card_visa');
    await makeSubscription(f.customer.id);
    const pmFail = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', { customer: f.customer.id });
    await stripe.customers.update(f.customer.id, { invoice_settings: { default_payment_method: pmFail.id } });
    await makeSubscription(f.customer.id, 1500);

    const payF = await listPayments(f.email);
    check("l'impayé n'est pas masqué par l'abonnement sain", payF.subscriptionStatus, 'incomplete');
    check('les deux paiements sont listés', payF.payments.length, 2);
    check('un payé et un en échec', payF.payments.map(p => p.status).sort(), ['payé', 'échec']);
}

try {
    await run();
} catch (err) {
    console.error('\nErreur pendant le test :', err.message);
    failed++;
} finally {
    await cleanup();
}

console.log(`\n${'='.repeat(50)}\nRésultat : ${passed} vérification(s) OK, ${failed} en échec\n${'='.repeat(50)}`);
process.exit(failed > 0 ? 1 : 0);
