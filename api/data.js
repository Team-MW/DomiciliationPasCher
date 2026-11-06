import { createClerkClient } from '@clerk/backend';
import { getDbConn } from './_db.js';
import { getStripe } from './_stripe-client.js';
import { readServerEnv } from './_env.js';
import { getBaseUrl } from './_email-kit.js';
import { deliverEmail } from './_email-core.js';
import { createDataService } from './_data-service.js';
import { getAuthUser, getOwnership, userOwnsStripeCustomer, isAdminEmail } from './_auth.js';
import { sanitizeClientExtra, isSafeDocumentUrl, isTrustedDocumentUrl } from './_client-extra.js';
import { fetchStripeBilling } from './_stripe-billing.js';
import { fulfillCheckoutSession } from './_checkout-fulfillment.js';
import { PLAN_CATALOG, resolvePlanId, planAmountTtc, PRICING_GRID } from '../shared/plans.js';
import { parseExtraInfo } from '../src/utils/contractLegalFields.js';
import { resolveClientStatusFromStripe } from '../src/utils/stripeClientStatus.js';

/**
 * Point d'entrée unique de la couche données : POST /api/data { method, args }.
 *
 * Trois niveaux d'accès :
 *  - public : parcours de souscription avant création du compte ;
 *  - client : utilisateur Clerk connecté, limité à SES fiches (getOwnership) ;
 *  - admin  : email dans VITE_ADMIN_EMAILS, vérifié côté serveur.
 * Toute méthode absente des listes ci-dessous est réservée à l'admin.
 */

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const MAX_BODY_CHARS = 1_500_000; // une signature en base64 tient largement dedans

export { sanitizeClientExtra };

const PUBLIC_METHODS = {
    async saveSouscriptionLead(ctx, [lead]) {
        return ctx.service.saveSouscriptionLead(lead || {});
    },
    async getSouscriptionLeadByToken(ctx, [token]) {
        if (!/^[a-f0-9]{32,64}$/i.test(String(token || ''))) return null;
        return ctx.service.getSouscriptionLeadByToken(token);
    },
    async addDemande(ctx, [d]) {
        const demande = { ...(d || {}) };
        if (!demande.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(demande.email))) {
            throw new HttpError(400, 'Email invalide');
        }
        // Le montant affiché à l'admin est recalculé : il ne vient plus du navigateur.
        const extra = parseExtraInfo(demande.extra_info);
        const catalog = PLAN_CATALOG[resolvePlanId(demande.plan || extra.offre)];
        demande.amount = planAmountTtc(catalog.ht, extra.frequence === 'annuel' ? 'year' : 'month').toFixed(2);
        // Champs posés par le serveur (paiement, signature) retirés ; liens non sûrs retirés
        // (ils sont ouverts tels quels dans l'admin) ; offre alignée sur le forfait choisi.
        // Même liste noire que pour un client connecté (signature, version du contrat, tarifs, clerk…) :
        // un visiteur anonyme ne doit pas pouvoir fabriquer un contrat « signé » ni un identifiant Stripe.
        const safeExtra = sanitizeClientExtra(extra);
        if (typeof extra.email === 'string') safeExtra.email = extra.email.trim().toLowerCase().slice(0, 254);
        safeExtra.offre = catalog.offre;
        safeExtra.grille_tarifaire = PRICING_GRID; // souscrit avec la grille et le contrat actuels
        demande.extra_info = safeExtra;
        const created = await ctx.service.addDemande(demande);
        return { id: created.id, status: created.status };
    },
    async checkPaymentStatus(ctx, [email]) {
        return ctx.service.checkPaymentStatus(email);
    },
    async hasPendingDemandeForSession(ctx, [sessionId]) {
        if (!/^cs_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) return false;
        return ctx.service.hasPendingDemandeForSession(sessionId);
    },
};

// Pour chaque méthode client : index de l'argument qui doit être une fiche possédée.
const CLIENT_OWNED_ARG = {
    getClientMail: 0,
    getDocuments: 0,
    getClientBookings: 0,
    getMessages: 0,
    getClientReexpeditions: 0,
    getPayments: 0,
    getClientFolders: 0,
    addReexpeditionRequest: 0,
    updateClientAddress: 0,
};

const CLIENT_METHODS = {
    /**
     * ADMIN — comptes de connexion (Clerk) qui pourraient être ceux de ce client : par son adresse ET par son nom.
     * Sert quand « le client s'est inscrit mais ne trouve pas son dossier » : adresse relais iCloud (« Masquer mon
     * e-mail »), autre adresse, compte jamais relié… Le compte de l'environnement courant (prod en ligne, dev en local).
     */
    async clerkAccountsForClient(ctx, [clientId]) {
        if (!ctx.user?.isAdmin) throw new HttpError(403, 'Accès réservé à l’administration');
        const client = await ctx.service.getClientById(clientId);
        if (!client) throw new HttpError(404, 'Client introuvable');
        const extra = parseExtraInfo(client.extra_info);
        const lastWord = String(client.name || '').trim().split(/\s+/).pop();
        const terms = [...new Set([extra.nom, lastWord].map((t) => String(t || '').trim()).filter((t) => t.length >= 3))];
        const email = String(client.email || '').trim().toLowerCase();
        const users = await listClerkUsers({ email, terms });
        const accounts = [];
        for (const user of users) {
            const taken = await ctx.conn.execute('SELECT id FROM clients WHERE clerkId = ? AND id <> ? LIMIT 1', [user.id, clientId]);
            accounts.push({
                ...user,
                sameEmail: Boolean(email) && user.email.toLowerCase() === email,
                linkedHere: client.clerkId === user.id,
                linkedElsewhere: Boolean(taken.rows?.length),
            });
        }
        return { clientId, clientEmail: email, accounts };
    },

    /** ADMIN — relie un compte de connexion à la fiche : le client y accède avec CE compte, quelle que soit son adresse. */
    async linkClerkAccount(ctx, [clientId, clerkUserId]) {
        if (!ctx.user?.isAdmin) throw new HttpError(403, 'Accès réservé à l’administration');
        if (!/^user_[A-Za-z0-9]+$/.test(String(clerkUserId || ''))) throw new HttpError(400, 'Identifiant de compte invalide');
        const client = await ctx.service.getClientById(clientId);
        if (!client) throw new HttpError(404, 'Client introuvable');
        const secretKey = readServerEnv('CLERK_SECRET_KEY');
        if (!secretKey) throw new HttpError(500, 'Clerk non configuré');
        try {
            await createClerkClient({ secretKey }).users.getUser(clerkUserId);
        } catch {
            throw new HttpError(404, 'Compte de connexion introuvable dans Clerk');
        }
        const taken = await ctx.conn.execute('SELECT id FROM clients WHERE clerkId = ? AND id <> ? LIMIT 1', [clerkUserId, clientId]);
        if (taken.rows?.length) throw new HttpError(409, 'Ce compte de connexion est déjà relié à un autre dossier');
        await ctx.service.updateClientClerkId(clientId, clerkUserId);
        return { linked: true, clientId, clerkUserId };
    },

    /** Fiche client (ou demande en cours) de l'utilisateur connecté ; lie le compte Clerk. */
    async getMyAccount(ctx, [options]) {
        const { service, conn, user } = ctx;
        const sessionId = /^cs_[A-Za-z0-9_]+$/.test(String(options?.sessionId || '')) ? options.sessionId : null;
        const canLink = (row) => row && (!row.clerkId || row.clerkId === user.userId);

        let client = await service.getClientByEmail(user.email);
        if (!client) {
            const byClerk = await conn.execute("SELECT * FROM clients WHERE clerkId = ? AND clerkId <> '' LIMIT 1", [user.userId]);
            client = byClerk.rows[0];
        }
        // Repli par session Stripe (email de paiement différent de l'email du compte) :
        // uniquement si la fiche n'est encore liée à aucun autre compte.
        if (!client && sessionId && await sessionBelongsToUser(ctx, sessionId)) {
            const bySession = await service.getClientBySessionId(sessionId);
            if (canLink(bySession)) client = bySession;
        }
        if (client) {
            if (!client.clerkId) {
                await service.updateClientClerkId(client.id, user.userId);
                client = { ...client, clerkId: user.userId, clerkStatus: 'linked' };
            }
            return { kind: 'client', record: client };
        }

        let demande = (await conn.execute(
            "SELECT * FROM demandes WHERE status = 'en_attente' AND ((email = ? AND email <> '') OR (clerkId = ? AND clerkId <> '')) ORDER BY date DESC LIMIT 1",
            [user.email, user.userId]
        )).rows[0];
        if (!demande && sessionId && await sessionBelongsToUser(ctx, sessionId)) {
            const bySession = await service.getDemandeBySessionId(sessionId);
            if (canLink(bySession)) demande = bySession;
        }
        if (demande) {
            if (!demande.clerkId) {
                await service.updateDemandeClerkId(demande.id, user.userId);
                demande = { ...demande, clerkId: user.userId };
            }
            return { kind: 'demande', record: demande };
        }
        return null;
    },

    async markMailAsRead(ctx, [mailId]) {
        const mail = await ctx.service.getMailById(mailId);
        if (!mail || !ctx.ownership.ids.has(String(mail.clientId))) throw new HttpError(403, 'Accès refusé');
        return ctx.service.markMailAsRead(mailId);
    },

    async addMessage(ctx, [clientId, msg]) {
        return ctx.service.addMessage(clientId, { content: String(msg?.content ?? '').slice(0, 10000), sender: 'client' });
    },

    async markMessagesAsRead(ctx, [clientId]) {
        return ctx.service.markMessagesAsRead(clientId, 'client');
    },

    async addDocument(ctx, [clientId, fileInfo]) {
        const info = { ...(fileInfo || {}), owner: 'client' };
        // Seulement un fichier hébergé chez nous (Cloudinary, signature locale, PDF/image encodé) : pas un lien arbitraire
        // qu'un client pourrait présenter comme « Contrat signé » et que l'admin ouvrirait.
        if (!isTrustedDocumentUrl(info.url)) throw new HttpError(400, 'URL de document invalide');
        for (const [key, max] of [['name', 255], ['folder', 100], ['type', 100], ['size', 50]]) {
            if (info[key] !== undefined && info[key] !== null) info[key] = String(info[key]).slice(0, max);
        }
        return ctx.service.addDocument(clientId, info);
    },

    async deleteDocument(ctx, [docId]) {
        const doc = await ctx.service.getDocumentById(docId);
        if (!doc || !ctx.ownership.ids.has(String(doc.clientId))) throw new HttpError(403, 'Accès refusé');
        if (doc.owner && doc.owner !== 'client') throw new HttpError(403, 'Document fourni par le centre : suppression impossible');
        return ctx.service.deleteDocument(docId);
    },

    async updateClientExtraInfo(ctx, [clientId, data]) {
        const clean = sanitizeClientExtra(data);
        if (data && Object.prototype.hasOwnProperty.call(data, 'stripe_customer_id')) {
            const requested = data.stripe_customer_id;
            if (requested === null || requested === '') {
                clean.stripe_customer_id = null;
            } else {
                const owns = await userOwnsStripeCustomer({
                    stripe: ctx.getStripe(), conn: ctx.conn, user: ctx.user,
                    customerId: String(requested), ownership: ctx.ownership,
                });
                if (!owns) throw new HttpError(403, 'Client Stripe non rattaché à ce compte');
                clean.stripe_customer_id = String(requested);
            }
        }
        return ctx.service.updateClientExtraInfo(clientId, clean);
    },

    /**
     * Le client ne choisit pas son statut : le serveur le recalcule depuis Stripe
     * (sinon un client en impayé pourrait simplement se repasser « actif »).
     */
    async updateClientStatus(ctx, [clientId]) {
        const client = await ctx.service.getClientById(clientId);
        // Demande pas encore validée : pas de statut client à recalculer.
        if (!client) return { id: clientId, status: null };
        const extra = parseExtraInfo(client.extra_info);
        const billing = await fetchStripeBilling(ctx.getStripe(), {
            email: client.email,
            customerId: extra.stripe_customer_id || null,
        });
        const next = resolveClientStatusFromStripe(client.status, billing.subscriptionStatus);
        if (next !== client.status) await ctx.service.updateClientStatus(clientId, next);
        return { id: clientId, status: next };
    },

    /** Enregistre une réservation payée, à partir de la session Stripe uniquement. */
    async confirmMeetingBooking(ctx, [sessionId]) {
        if (!/^cs_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) throw new HttpError(400, 'Session invalide');
        const session = await ctx.getStripe().checkout.sessions.retrieve(String(sessionId));
        if (session.metadata?.type !== 'meeting_booking') throw new HttpError(400, 'Session sans réservation');
        if (!ctx.user.isAdmin && !ctx.ownership.ids.has(String(session.metadata?.client_id || ''))) {
            throw new HttpError(403, 'Accès refusé');
        }
        const result = await fulfillCheckoutSession(session, { conn: ctx.conn, sendEmail: ctx.sendEmail });
        if (!result.ok) throw new HttpError(402, 'Paiement non confirmé');
        return result.booking;
    },
};

/**
 * Le repli par session Stripe ne lie une fiche au compte que si la session a été payée
 * avec l'email de ce compte : un session_id vu dans une URL partagée ne suffit pas.
 */
async function sessionBelongsToUser(ctx, sessionId) {
    try {
        const session = await ctx.getStripe().checkout.sessions.retrieve(String(sessionId));
        const emails = [session.customer_details?.email, session.customer_email, session.metadata?.email]
            .filter(Boolean).map((e) => String(e).trim().toLowerCase());
        return emails.includes(ctx.user.email);
    } catch {
        return false;
    }
}

// Méthodes internes jamais exposées, même à l'admin.
const NEVER_EXPOSED = new Set(['init', 'confirmDemandePayment']);

let schemaReady = null;

export function createHandler({ getConn = getDbConn, getAuth = getAuthUser } = {}) {
    return async function handler(req, res) {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }
        const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
        const method = String(body?.method || '');
        const args = Array.isArray(body?.args) ? body.args : [];
        if (JSON.stringify(args).length > MAX_BODY_CHARS) {
            return res.status(413).json({ error: 'Requête trop volumineuse' });
        }

        const conn = getConn();
        if (!conn) return res.status(500).json({ error: 'Base de données indisponible' });

        const sendEmail = (emailBody) => deliverEmail(emailBody, { baseUrl: getBaseUrl(req), source: 'manuel' });
        const service = createDataService({ conn, sendEmail, deleteClerkUser, findClerkUserIdsByEmail, isProtectedEmail: isAdminEmail });
        let stripe = null;
        const ctx = { conn, service, sendEmail, getStripe: () => (stripe ||= getStripe()) };

        try {
            if (Object.prototype.hasOwnProperty.call(PUBLIC_METHODS, method)) {
                return res.status(200).json({ result: await PUBLIC_METHODS[method](ctx, args) ?? null });
            }

            const user = await getAuth(req);
            if (!user) return res.status(401).json({ error: 'Authentification requise' });
            // Connecté mais email NON vérifié : on le dit (avant : 401 générique, que le site affichait « Aucun dossier trouvé »).
            if (!user.email) return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
            ctx.user = user;

            if (!schemaReady) schemaReady = service.init().catch(() => { schemaReady = null; });
            await schemaReady;

            // Uniquement les méthodes propres du service (jamais constructor, toString… hérités).
            const isServiceMethod = Object.prototype.hasOwnProperty.call(service, method) && typeof service[method] === 'function';

            if (user.isAdmin) {
                if (Object.prototype.hasOwnProperty.call(CLIENT_METHODS, method) && !isServiceMethod) {
                    ctx.ownership = await getOwnership(conn, user);
                    return res.status(200).json({ result: await CLIENT_METHODS[method](ctx, args) ?? null });
                }
                if (NEVER_EXPOSED.has(method) || !isServiceMethod) {
                    return res.status(404).json({ error: 'Méthode inconnue' });
                }
                return res.status(200).json({ result: await service[method](...args) ?? null });
            }

            const isClientMethod = Object.prototype.hasOwnProperty.call(CLIENT_METHODS, method)
                || Object.prototype.hasOwnProperty.call(CLIENT_OWNED_ARG, method);
            if (!isClientMethod) return res.status(403).json({ error: 'Accès réservé à l’administration' });

            ctx.ownership = await getOwnership(conn, user);
            const ownedIndex = {
                ...CLIENT_OWNED_ARG,
                addMessage: 0, markMessagesAsRead: 0, addDocument: 0,
                updateClientExtraInfo: 0, updateClientStatus: 0,
            }[method];
            if (ownedIndex !== undefined && !ctx.ownership.ids.has(String(args[ownedIndex] ?? ''))) {
                return res.status(403).json({ error: 'Accès refusé' });
            }

            const result = Object.prototype.hasOwnProperty.call(CLIENT_METHODS, method)
                ? await CLIENT_METHODS[method](ctx, args)
                : await service[method](...args);
            return res.status(200).json({ result: result ?? null });
        } catch (err) {
            if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
            // Doublon d'email (création de client) : message affichable, pas un « Erreur serveur » qui pousse à réessayer.
            if (err?.code === 'ER_DUP_ENTRY' || /duplicate entry/i.test(err?.message || '')) {
                return res.status(409).json({ error: 'Cette adresse email est déjà utilisée par un autre client.' });
            }
            // Erreurs métier volontaires (ex. réexpédition hors forfait) : message affichable.
            if (err?.message && /réservée|requise|introuvable/i.test(err.message)) {
                return res.status(400).json({ error: err.message });
            }
            console.error(`[data] ${method}:`, err);
            return res.status(500).json({ error: 'Erreur serveur, réessayez plus tard.' });
        }
    };
}

async function deleteClerkUser(clerkId) {
    const secretKey = readServerEnv('CLERK_SECRET_KEY');
    if (!secretKey) throw new Error('CLERK_SECRET_KEY manquant');
    try {
        await createClerkClient({ secretKey }).users.deleteUser(clerkId);
    } catch (err) {
        if (err?.status !== 404) throw err;
    }
}

/** Comptes Clerk retrouvés par adresse exacte puis par recherche de nom (dédoublonnés). */
async function listClerkUsers({ email, terms = [] }) {
    const secretKey = readServerEnv('CLERK_SECRET_KEY');
    if (!secretKey) throw new HttpError(500, 'Clerk non configuré');
    const clerk = createClerkClient({ secretKey });
    const found = new Map();
    const collect = (result) => { for (const user of (result?.data || result || [])) if (user?.id) found.set(user.id, user); };
    if (email) collect(await clerk.users.getUserList({ emailAddress: [email], limit: 10 }));
    for (const term of terms) collect(await clerk.users.getUserList({ query: term, limit: 10 }));
    return [...found.values()].map((user) => {
        const primary = user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId) || user.emailAddresses?.[0];
        return {
            id: user.id,
            email: primary?.emailAddress || '',
            verified: primary?.verification?.status === 'verified',
            name: [user.firstName, user.lastName].filter(Boolean).join(' '),
            createdAt: user.createdAt || null,
            lastSignInAt: user.lastSignInAt || null,
        };
    });
}

async function findClerkUserIdsByEmail(email) {
    const secretKey = readServerEnv('CLERK_SECRET_KEY');
    if (!secretKey || !email) return [];
    const result = await createClerkClient({ secretKey }).users.getUserList({ emailAddress: [email], limit: 10 });
    return (result?.data || []).map((user) => user.id).filter(Boolean);
}

function safeJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

const defaultHandler = createHandler();

export default async function handler(req, res) {
    return defaultHandler(req, res);
}
