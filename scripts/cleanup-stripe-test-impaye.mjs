/**
 * Supprime le client Stripe de test créé pour valider l'affichage des impayés.
 * Usage : node scripts/cleanup-stripe-test-impaye.mjs
 * Refuse de tourner sur une clé autre que sk_test_.
 */
import Stripe from 'stripe';
import fs from 'fs';

const key = (process.env.STRIPE_SECRET_KEY
    || fs.readFileSync('.env.local', 'utf-8').match(/^STRIPE_SECRET_KEY=(.*)$/m)?.[1] || '')
    .trim().replace(/^['"]|['"]$/g, '');

if (!key.startsWith('sk_test')) {
    console.error('Arrêt : ce script ne tourne qu\'avec une clé Stripe de test.');
    process.exit(1);
}

const stripe = new Stripe(key);
const state = JSON.parse(fs.readFileSync('.audit_cleanup.json', 'utf-8'));

await stripe.subscriptions.cancel(state.sub).catch(e => console.warn('abonnement:', e.message));
await stripe.customers.del(state.customer).catch(e => console.warn('client:', e.message));
await stripe.products.update(state.product, { active: false }).catch(e => console.warn('produit:', e.message));

fs.unlinkSync('.audit_cleanup.json');
console.log('Client Stripe de test supprimé.');
