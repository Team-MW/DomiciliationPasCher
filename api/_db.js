import fs from 'fs';
import { connect } from '@planetscale/database';

function readEnv(key) {
    if (process.env[key]) return process.env[key].trim().replace(/^['"]|['"]$/g, '');
    try {
        if (fs.existsSync('.env.local')) {
            const match = fs.readFileSync('.env.local', 'utf-8').match(new RegExp(`^${key}=(.*)`, 'm'));
            if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
        }
    } catch { /* ignore */ }
    return null;
}

/** Connexion PlanetScale pour les handlers API (cron, checkout, etc.). */
export function getDbConn() {
    const host = readEnv('VITE_DATABASE_HOST');
    const username = readEnv('VITE_DATABASE_USERNAME');
    const password = readEnv('VITE_DATABASE_PASSWORD');
    if (!host || !username || !password) return null;
    return connect({ host, username, password });
}
