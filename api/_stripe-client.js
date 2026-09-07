import Stripe from 'stripe';
import fs from 'fs';

// En production (Vercel) la clé vient de l'environnement. En local, les handlers sont
// importés par le plugin Vite qui ne charge pas .env.local, d'où la lecture de secours.
const readKeyFromEnvFile = (file, name = 'STRIPE_SECRET_KEY') => {
    try {
        if (!fs.existsSync(file)) return null;
        const match = fs.readFileSync(file, 'utf-8').match(new RegExp(`^${name}=(.*)$`, 'm'));
        if (!match) return null;
        return match[1].trim().replace(/^['"]|['"]$/g, '');
    } catch {
        return null;
    }
};

export function isLiveSecretKey(key) {
    return typeof key === 'string' && key.startsWith('sk_live_') && key !== 'sk_live_remplace_moi';
}

export function getStripeSecretKey() {
    const key =
        process.env.STRIPE_SECRET_KEY ||
        readKeyFromEnvFile('.env.local') ||
        readKeyFromEnvFile('.env');

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
