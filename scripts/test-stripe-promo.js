import Stripe from 'stripe';
import fs from 'fs';

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

function loadEnv() {
    const env = {};
    for (const filename of ['.env', '.env.local']) {
        if (fs.existsSync(filename)) {
            const content = fs.readFileSync(filename, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) env[match[1].trim()] = match[2].trim();
            });
        }
    }
    return env;
}

const env = loadEnv();
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSimulation() {
    console.log(`${colors.cyan}============================================================`);
    console.log(`🚀 SIMULATION STRIPE : TEST DU CODE PROMO "1 MOIS GRATUIT"`);
    console.log(`============================================================${colors.reset}`);

    if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
        console.error(`${colors.red}❌ ERREUR: Ce script doit être exécuté avec une clé secrète de TEST (sk_test_).${colors.reset}`);
        return;
    }

    try {
        console.log(`\n${colors.yellow}1. Configuration du Test...${colors.reset}`);
        
        // 1. Création d'un produit et prix mensuel de test (20€/mois)
        const product = await stripe.products.create({ name: 'Abonnement Mensuel Test' });
        const priceMonthly = await stripe.prices.create({
            unit_amount: 2000,
            currency: 'eur',
            recurring: { interval: 'month' },
            product: product.id,
        });

        // 2. Création d'un prix annuel de test (240€/an)
        const priceAnnually = await stripe.prices.create({
            unit_amount: 24000,
            currency: 'eur',
            recurring: { interval: 'year' },
            product: product.id,
        });

        // 3. Création du Coupon (100% de réduction, valable "Une fois")
        const coupon = await stripe.coupons.create({
            percent_off: 100,
            duration: 'once', // Une fois !
            name: '1er Mois / 1er Paiement Offert'
        });

        console.log(`  ${colors.green}✔ Produit et Coupon (100% OFF - 1 fois) créés.${colors.reset}`);

        // --- SIMULATION 1 : ABONNEMENT MENSUEL ---
        console.log(`\n${colors.blue}=== SIMULATION 1 : ABONNEMENT MENSUEL (Attendu : 1er mois 0€, 2ème mois 20€) ===${colors.reset}`);
        
        // Création d'une horloge de test
        let testClock = await stripe.testHelpers.testClocks.create({
            frozen_time: Math.floor(Date.now() / 1000),
        });

        let customer = await stripe.customers.create({
            email: 'mensuel-test@mwcrea.com',
            test_clock: testClock.id,
        });

        // On attache une fausse carte de crédit
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: { token: 'tok_visa' }, // Jeton magique de test
        });
        await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
        await stripe.customers.update(customer.id, {
            invoice_settings: { default_payment_method: paymentMethod.id },
        });

        let subMonthly = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceMonthly.id }],
            coupon: coupon.id,
            expand: ['latest_invoice'],
        });

        let firstInvoice = subMonthly.latest_invoice;
        console.log(`  [AUJOURD'HUI] Facture générée : ${firstInvoice.total / 100}€ (Montant prélevé : ${firstInvoice.amount_paid / 100}€)`);
        
        if (firstInvoice.total === 0) {
            console.log(`  ${colors.green}✔ SUCCÈS : Le 1er mois est bien facturé 0€ !${colors.reset}`);
        } else {
            console.log(`  ${colors.red}❌ ÉCHEC : Le 1er mois n'est pas à 0€ !${colors.reset}`);
        }

        console.log(`  ${colors.yellow}>> Avance rapide d'un mois dans le temps (Stripe Test Clocks)...${colors.reset}`);
        
        // Avancer le temps de 32 jours
        const nextMonth = Math.floor(Date.now() / 1000) + (32 * 24 * 60 * 60);
        await stripe.testHelpers.testClocks.advance(testClock.id, { frozen_time: nextMonth });
        
        // Attendre que Stripe génère la facture (ça prend quelques secondes en asynchrone)
        process.stdout.write("  Calcul en cours chez Stripe ");
        for(let i=0; i<15; i++) {
            await sleep(500);
            process.stdout.write(".");
        }
        console.log("");

        const invoicesMonthly = await stripe.invoices.list({ customer: customer.id, limit: 10 });
        const secondInvoice = invoicesMonthly.data.find(inv => inv.id !== firstInvoice.id && inv.total > 0);
        
        if (secondInvoice) {
            console.log(`  [DANS 1 MOIS] Nouvelle facture générée : ${secondInvoice.total / 100}€ (Statut: ${secondInvoice.status})`);
            if (secondInvoice.total === 2000) {
                 console.log(`  ${colors.green}✔ SUCCÈS : Le 2ème mois est bien facturé 20€ au tarif normal, la promo est terminée !${colors.reset}`);
            }
        } else {
            console.log(`  ${colors.yellow}⚠️ La deuxième facture n'est pas encore disponible dans l'horloge (Délai Stripe). Mais la règle 'once' la remettra à 20€. ${colors.reset}`);
        }

        // --- SIMULATION 2 : ABONNEMENT ANNUEL ---
        console.log(`\n${colors.blue}=== SIMULATION 2 : ABONNEMENT ANNUEL (ATTENTION DANGER) ===${colors.reset}`);
        console.log(`  Que se passe-t-il si un client utilise le code 100% (valable "1 fois") sur un abonnement ANNUEL ?`);
        
        let subAnnually = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceAnnually.id }],
            coupon: coupon.id, // On applique le même coupon de 100%
            expand: ['latest_invoice'],
        });

        let firstAnnuallyInvoice = subAnnually.latest_invoice;
        console.log(`  [AUJOURD'HUI] Facture annuelle générée : ${firstAnnuallyInvoice.total / 100}€`);
        
        if (firstAnnuallyInvoice.total === 0) {
            console.log(`  ${colors.red}⚠️ DANGER : L'année ENTIÈRE est gratuite (0€) ! Car la facture concerne 1 an, et la promo annule 100% de la "première facture".${colors.reset}`);
        }
        
        console.log(`\n${colors.cyan}============================================================`);
        console.log(`💡 CONCLUSION & BONNES PRATIQUES POUR STRIPE :`);
        console.log(`1. Pour les abonnements MENSUELS, le coupon 100% (Durée=Une fois) marche parfaitement (1er mois gratuit).`);
        console.log(`2. Pour éviter que le coupon ne rende une ANNÉE entière gratuite, vous devez restreindre le code promo !`);
        console.log(`   -> Dans Stripe, lors de la création du code, activez : "Appliquer à des produits spécifiques".`);
        console.log(`   -> Sélectionnez UNIQUEMENT les forfaits "Mensuels" et PAS les forfaits annuels.`);
        console.log(`============================================================${colors.reset}\n`);

    } catch (err) {
        console.error(`${colors.red}Erreur: ${err.message}${colors.reset}`);
    }
}

runSimulation();
