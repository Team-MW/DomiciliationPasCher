import { connect } from '@planetscale/database';
import { readServerEnvAny } from './_env.js';

/**
 * Connexion PlanetScale pour les handlers API (serveur uniquement).
 *
 * Utiliser de préférence DATABASE_HOST / DATABASE_USERNAME / DATABASE_PASSWORD.
 * Les anciens noms VITE_DATABASE_* restent lus pour ne pas casser un déploiement existant,
 * mais le préfixe VITE_ est trompeur : plus aucun code front ne doit les référencer.
 */
export function getDbConn() {
    const host = readServerEnvAny('DATABASE_HOST', 'VITE_DATABASE_HOST');
    const username = readServerEnvAny('DATABASE_USERNAME', 'VITE_DATABASE_USERNAME');
    const password = readServerEnvAny('DATABASE_PASSWORD', 'VITE_DATABASE_PASSWORD');
    if (!host || !username || !password) return null;
    return connect({ host, username, password, fetch: retryingFetch });
}

/** Repli exponentiel sur les 429 PlanetScale (repris de l'ancien client navigateur). */
async function retryingFetch(url, options) {
    let delay = 300;
    for (let attempt = 0; ; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.status !== 429 || attempt >= 4) return response;
        } catch (err) {
            if (attempt >= 4) throw err;
        }
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
    }
}
