import { createClerkClient, verifyToken } from '@clerk/backend';
import { readServerEnv } from './_env.js';

/**
 * Authentification des handlers API.
 *
 * Le front envoie le jeton de session Clerk dans `Authorization: Bearer <jwt>`
 * (voir src/utils/apiAuth.js). Ici on vérifie la signature du jeton, puis on lit
 * l'email principal de l'utilisateur chez Clerk : c'est la seule identité de
 * confiance. Un email, un clientId ou un customerId envoyé dans le body n'en est pas une.
 */

const DEFAULT_ADMIN_EMAILS = 'mwcrea.agency@gmail.com';
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const userCache = new Map();

let clerkClient = null;
let verifierOverride = null;

/** Tests uniquement : remplace la vérification Clerk par une fonction (token) => user | null. */
export function __setAuthVerifierForTests(fn) {
    verifierOverride = fn;
    userCache.clear();
}

function getSecretKey() {
    const secretKey = readServerEnv('CLERK_SECRET_KEY');
    if (!secretKey) throw new Error('CLERK_SECRET_KEY manquant');
    return secretKey;
}

function getClerk() {
    if (clerkClient) return clerkClient;
    clerkClient = createClerkClient({ secretKey: getSecretKey() });
    return clerkClient;
}

export function getAdminEmails() {
    // Même liste que le front (redirection vers /app/admin), mais vérifiée ici côté serveur.
    // À ne pas confondre avec ADMIN_EMAIL (_smtp.js) : destinataires des notifications internes.
    const raw = readServerEnv('VITE_ADMIN_EMAILS') || DEFAULT_ADMIN_EMAILS;
    return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email) {
    if (!email) return false;
    return getAdminEmails().includes(String(email).trim().toLowerCase());
}

function readBearer(req) {
    const header = req.headers?.authorization || req.headers?.Authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(String(header));
    return match ? match[1].trim() : null;
}

async function verify(token) {
    if (verifierOverride) return verifierOverride(token);

    // Vérifie signature et expiration du jeton de session (clés JWKS de l'instance Clerk).
    const payload = await verifyToken(token, { secretKey: getSecretKey() });
    const clerk = getClerk();
    const userId = payload?.sub;
    if (!userId) return null;

    const cached = userCache.get(userId);
    if (cached && cached.expires > Date.now()) return cached.user;

    const clerkUser = await clerk.users.getUser(userId);
    const primary = clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId);
    // Un email non vérifié n'est pas une preuve d'identité : on refuse de s'en servir.
    const verified = primary?.verification?.status === 'verified';
    const email = verified ? String(primary.emailAddress || '').trim().toLowerCase() : '';
    const user = { userId, email };
    userCache.set(userId, { user, expires: Date.now() + USER_CACHE_TTL_MS });
    return user;
}

/**
 * Renvoie { userId, email, isAdmin } ou null si aucun jeton valide.
 * Ne répond jamais lui-même : à utiliser quand l'authentification est optionnelle.
 */
export async function getAuthUser(req) {
    const token = readBearer(req);
    if (!token) return null;
    try {
        const user = await verify(token);
        if (!user?.userId) return null;
        return { ...user, isAdmin: isAdminEmail(user.email) };
    } catch (err) {
        console.warn('[auth] jeton refusé:', err?.message || err);
        return null;
    }
}

/** Exige un utilisateur connecté. Répond 401 et renvoie null sinon. */
export async function requireUser(req, res) {
    const user = await getAuthUser(req);
    if (!user || !user.email) {
        res.status(401).json({ error: 'Authentification requise' });
        return null;
    }
    return user;
}

/** Exige un administrateur. Répond 401/403 et renvoie null sinon. */
export async function requireAdmin(req, res) {
    const user = await getAuthUser(req);
    if (!user || !user.email) {
        res.status(401).json({ error: 'Authentification requise' });
        return null;
    }
    if (!user.isAdmin) {
        res.status(403).json({ error: 'Accès réservé à l’administration' });
        return null;
    }
    return user;
}

/**
 * Ce que l'utilisateur possède : fiches clients / demandes au même email vérifié, ou déjà
 * liées à son compte Clerk. Renvoie { ids, emails, stripeCustomerIds } (des Set).
 */
export async function getOwnership(conn, user) {
    const ids = new Set();
    const emails = new Set();
    const stripeCustomerIds = new Set();
    if (!user) return { ids, emails, stripeCustomerIds };
    if (user.email) emails.add(user.email);
    if (!conn) return { ids, emails, stripeCustomerIds };

    const email = user.email || '';
    const clerkId = user.userId || '';
    const collect = (rows) => {
        for (const row of rows || []) {
            ids.add(String(row.id));
            if (row.email) emails.add(String(row.email).trim().toLowerCase());
            const raw = String(row.extra_info || '');
            for (const m of raw.matchAll(/cus_[A-Za-z0-9]+/g)) stripeCustomerIds.add(m[0]);
        }
    };
    const where = "(email = ? AND email <> '') OR (clerkId = ? AND clerkId <> '')";
    const clients = await conn.execute(`SELECT id, email, extra_info FROM clients WHERE ${where}`, [email, clerkId]);
    collect(clients.rows);
    try {
        const demandes = await conn.execute(`SELECT id, email, extra_info FROM demandes WHERE ${where}`, [email, clerkId]);
        collect(demandes.rows);
    } catch {
        // base ancienne sans demandes.clerkId : l'email suffit
        const demandes = await conn.execute("SELECT id, email, extra_info FROM demandes WHERE email = ? AND email <> ''", [email]);
        collect(demandes.rows);
    }
    return { ids, emails, stripeCustomerIds };
}

/** Le customer Stripe appartient-il à l'utilisateur (fiche liée, ou même email côté Stripe) ? */
export async function userOwnsStripeCustomer({ stripe, conn, user, customerId, ownership }) {
    if (!customerId || !user) return false;
    if (user.isAdmin) return true;
    const owned = ownership || await getOwnership(conn, user);
    if (owned.stripeCustomerIds.has(customerId)) return true;
    try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
            return owned.emails.has(String(customer.email || '').trim().toLowerCase());
        }
    } catch {
        return false;
    }
    return false;
}

/** Message d'erreur générique côté client ; le détail reste dans les logs. */
export function sendServerError(res, err, context = 'API') {
    console.error(`[${context}]`, err);
    return res.status(500).json({ error: 'Erreur serveur, réessayez plus tard.' });
}
