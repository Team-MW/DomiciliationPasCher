import fs from 'fs';

/**
 * Lecture des variables serveur.
 *
 * `process.env` est toujours prioritaire. Le repli sur `.env.local` / `.env` n'existe que
 * pour le serveur de dev Vite (qui importe les handlers sans charger ces fichiers) ; il est
 * désactivé sur Vercel pour qu'un fichier déployé par erreur ne remplace jamais la config.
 */
const isDeployed = () => Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
// Pendant les tests (Vitest), jamais de lecture de .env.local : un test ne doit pas pouvoir
// atteindre la vraie base ou le vrai compte Stripe avec les clés du développeur.
const isTestRun = () => Boolean(process.env.VITEST) || process.env.NODE_ENV === 'test';

function readFromFile(file, key) {
    try {
        if (!fs.existsSync(file)) return null;
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = fs.readFileSync(file, 'utf-8').match(new RegExp(`^${escaped}=(.*)$`, 'm'));
        if (!match) return null;
        return match[1].trim().replace(/^['"]|['"]$/g, '');
    } catch {
        return null;
    }
}

export function readServerEnv(key) {
    const fromEnv = process.env[key];
    if (fromEnv) return String(fromEnv).trim().replace(/^['"]|['"]$/g, '');
    if (isDeployed() || isTestRun()) return null;
    return readFromFile('.env.local', key) || readFromFile('.env', key);
}

/** Première variable définie parmi plusieurs noms (ex. DATABASE_HOST puis l'ancien VITE_DATABASE_HOST). */
export function readServerEnvAny(...keys) {
    for (const key of keys) {
        const value = readServerEnv(key);
        if (value) return value;
    }
    return null;
}
