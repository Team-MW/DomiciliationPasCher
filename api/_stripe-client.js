import Stripe from 'stripe';
import { readServerEnv } from './_env.js';

export function isLiveSecretKey(key) {
    return typeof key === 'string' && key.startsWith('sk_live_') && key !== 'sk_live_remplace_moi';
}

export function getStripeSecretKey() {
    // process.env (Vercel) puis .env.local en dev local — jamais de fichier pendant les tests.
    const key = readServerEnv('STRIPE_SECRET_KEY');

    if (!key || key === 'sk_live_remplace_moi') {
        throw new Error('La clé secrète Stripe (STRIPE_SECRET_KEY) est manquante ou invalide.');
    }
    if (key.startsWith('pk_')) {
        throw new Error("STRIPE_SECRET_KEY contient une clé publique (pk_) : il faut la clé secrète (sk_).");
    }
    return key;
}

export function getStripe() {
    return new Stripe(getStripeSecretKey());
}
