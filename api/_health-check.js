/**
 * Contrôle de santé quotidien : détecte AVANT que le client n'appelle les situations qui le bloquent.
 *
 * 1. Compte de connexion à l'adresse NON vérifiée (relié à un dossier, ou à l'adresse d'un client) :
 *    le client verra « email non vérifié ». Cas Sherine Amri / ipmauto31 (nov. 2026).
 * 2. Client payant sans compte de connexion plusieurs jours après son paiement.
 * 3. Identifiant client Stripe enregistré mais introuvable chez Stripe (paiements invisibles, relances impossibles).
 * 4. Emails en échec dans les dernières 24 h.
 * 5. Prix affiché dans l'espace client ≠ montant réellement prélevé par Stripe (ex. 20 € affiché, 16 € attendu).
 *
 * Un seul email aux admins, seulement s'il y a quelque chose à faire.
 * Seule action automatique : un client au compte non vérifié reçoit le lien « Activer mon accès » (1 clic, preuve signée),
 * au plus une fois tous les 3 jours. Le reste est seulement signalé.
 */
import { createClerkClient } from '@clerk/backend';
import { createLoginTicket, loginLinkUrl, ACTIVATION_LINK_TTL_SECONDS } from './_login-link.js';
import { fetchStripeBilling } from './_stripe-billing.js';
import { reconcilePendingPayment } from './_payment-reconcile.js';
import { readServerEnv } from './_env.js';
import { ADMIN_EMAIL } from './_smtp.js';
import { sendBrandedMail, escapeHtml, emailButton, formatEuro } from './_email-kit.js';
import { buildAccessActivationEmail } from './_email-templates.js';
import { clientPlanPricing } from '../shared/plans.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const NO_ACCOUNT_AFTER_DAYS = 3;

const parseExtra = (raw) => {
    try {
        let extra = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof extra === 'string') extra = JSON.parse(extra);
        return extra && typeof extra === 'object' ? extra : {};
    } catch {
        return {};
    }
};
const clean = (email) => String(email || '').trim().toLowerCase();
const primaryOf = (user) => user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId) || user.emailAddresses?.[0];

/** @returns {Promise<Array<{kind: string, client?: string, email?: string, detail: string}>>} */
export async function collectHealthIssues({ conn, stripe, clerk, now = Date.now() }) {
    const issues = [];
    const clients = (await conn.execute(
        "SELECT id, name, email, plan, status, clerkId, since, extra_info FROM clients WHERE status = 'actif'",
    )).rows || [];
    // Demandes payées pas encore validées : leur compte peut déjà être bloqué « email non vérifié ».
    let pendingDemandes = [];
    try {
        pendingDemandes = ((await conn.execute(
            "SELECT id, clientName AS name, email, clerkId, extra_info FROM demandes WHERE status = 'en_attente'",
        )).rows || []).map((d) => ({ ...d, table: 'demandes' }));
    } catch (err) {
        console.warn('[health] demandes en attente illisibles:', err?.message || err);
    }
    const accounts = [...clients, ...pendingDemandes];

    // 1 + 2. Comptes de connexion
    if (clerk) {
        try {
            const linkedIds = accounts.map((c) => c.clerkId).filter(Boolean);
            const users = new Map();
            for (let i = 0; i < linkedIds.length; i += 100) {
                const page = await clerk.users.getUserList({ userId: linkedIds.slice(i, i + 100), limit: 100 });
                for (const u of page?.data || page || []) users.set(u.id, u);
            }
            // Comptes récents pas encore reliés (le client s'est inscrit, mais l'adresse n'est pas vérifiée).
            const recent = await clerk.users.getUserList({ limit: 100, orderBy: '-created_at' });
            for (const u of recent?.data || recent || []) if (!users.has(u.id)) users.set(u.id, u);

            const byEmail = new Map(accounts.map((c) => [clean(c.email), c]));
            const byClerk = new Map(accounts.filter((c) => c.clerkId).map((c) => [c.clerkId, c]));
            for (const user of users.values()) {
                const primary = primaryOf(user);
                if (!primary || primary.verification?.status === 'verified') continue;
                const client = byClerk.get(user.id) || byEmail.get(clean(primary.emailAddress));
                if (!client) continue;
                issues.push({
                    kind: 'unverified',
                    clientId: client.id,
                    table: client.table || 'clients',
                    clerkUserId: user.id,
                    client: client.name,
                    email: primary.emailAddress,
                    detail: 'Adresse email du compte NON vérifiée : le client est bloqué à la connexion. Fiche client → « Trouver le compte de connexion » → « Marquer comme vérifiée » (après avoir confirmé que c’est bien lui).',
                });
            }

            const accountEmails = new Set([...users.values()].map((u) => clean(primaryOf(u)?.emailAddress)));
            for (const client of clients) {
                if (client.clerkId || accountEmails.has(clean(client.email))) continue;
                const since = Date.parse(client.since || '');
                if (!Number.isFinite(since) || now - since < NO_ACCOUNT_AFTER_DAYS * DAY_MS) continue;
                issues.push({
                    kind: 'no_account',
                    client: client.name,
                    email: client.email,
                    detail: `Dossier actif depuis plus de ${NO_ACCOUNT_AFTER_DAYS} jours sans compte de connexion : le client n’a pas créé son accès (ou avec une autre adresse). Fiche client → « Trouver le compte de connexion », ou renvoyer l’invitation.`,
                });
            }
        } catch (err) {
            issues.push({ kind: 'check_failed', detail: `Contrôle des comptes de connexion impossible : ${err?.message || err}` });
        }
    }

    // 2 bis. Dossiers créés par l'admin, carte non enregistrée : Stripe a-t-il déjà un abonnement ? (sinon, signaler)
    if (stripe) {
        let pendingRows = [];
        try {
            pendingRows = (await conn.execute("SELECT id, name, email, extra_info FROM clients WHERE extra_info LIKE '%\"payment_status\":\"pending\"%' AND status <> 'résilié'")).rows || [];
        } catch (err) {
            console.warn('[health] dossiers en attente de paiement illisibles:', err?.message || err);
        }
        for (const row of pendingRows) {
            const extra = parseExtra(row.extra_info);
            if (extra.payment_status !== 'pending') continue;
            try {
                const billing = await fetchStripeBilling(stripe, { email: row.email, customerId: extra.stripe_customer_id || null });
                const r = await reconcilePendingPayment({ conn, clientId: row.id, billing });
                if (r.changed) continue;
            } catch (err) {
                console.warn('[health] vérification Stripe impossible pour', row.email, err?.message || err);
                continue;
            }
            const requested = Date.parse(extra.payment_requested_at || '');
            const days = Number.isFinite(requested) ? Math.floor((now - requested) / DAY_MS) : null;
            if (days !== null && days < NO_ACCOUNT_AFTER_DAYS) continue;
            issues.push({
                kind: 'payment_pending',
                client: row.name,
                email: row.email,
                detail: `Lien de paiement envoyé${days !== null ? ` il y a ${days} jours` : ''}, aucun abonnement Stripe trouvé pour cet email. Appelez le client ou renvoyez le lien de paiement depuis sa fiche.`,
            });
        }
    }

    // 3 + 5. Identifiants Stripe, et prix affiché = prix prélevé
    if (stripe) {
        for (const client of clients) {
            const extra = parseExtra(client.extra_info);
            const id = extra.stripe_customer_id;
            if (!id) continue;
            let subs;
            try {
                subs = await stripe.subscriptions.list({ customer: id, status: 'active', limit: 5 });
            } catch (err) {
                if (err?.code !== 'resource_missing' && err?.statusCode !== 404) continue; // panne Stripe : pas une anomalie du dossier
                issues.push({
                    kind: 'stripe_missing',
                    client: client.name,
                    email: client.email,
                    detail: `Identifiant client Stripe ${id} introuvable dans Stripe : paiements invisibles dans le dossier et relances d’impayés impossibles. Corrigez l’identifiant dans la fiche (ou retirez-le).`,
                });
                continue;
            }
            const price = (subs?.data || [])[0]?.items?.data?.[0]?.price;
            if (!price?.unit_amount) continue;
            const pricing = clientPlanPricing(client.plan, extra);
            const expectedTtc = price.recurring?.interval === 'year' ? pricing.ttcYear : pricing.ttcMonth;
            const billedTtc = price.unit_amount / 100;
            if (Math.abs(billedTtc - expectedTtc) < 0.01) continue;
            issues.push({
                kind: 'price_mismatch',
                client: client.name,
                email: client.email,
                detail: `L’espace client affiche ${pricing.name} à ${formatEuro(expectedTtc)} TTC${pricing.legacy ? ' (ancien tarif)' : ''}, mais Stripe prélève ${formatEuro(billedTtc)} TTC. Fiche client : « Passer au tarif actuel » si le client doit payer le nouveau prix, sinon corrigez la formule.`,
            });
        }
    }

    // 4. Emails en échec (24 h)
    try {
        const since = new Date(now - DAY_MS).toISOString();
        const failed = (await conn.execute(
            "SELECT to_email, type, error FROM email_logs WHERE status = 'failed' AND sent_at >= ? ORDER BY sent_at DESC LIMIT 20",
            [since],
        )).rows || [];
        for (const row of failed) {
            issues.push({ kind: 'email_failed', email: row.to_email, detail: `Email « ${row.type || '?'} » non envoyé : ${row.error || 'erreur inconnue'}` });
        }
    } catch {
        // table absente : aucun email encore envoyé
    }

    return issues;
}

const TITLES = {
    unverified: 'Clients bloqués par « email non vérifié »',
    no_account: 'Clients actifs sans compte de connexion',
    payment_pending: 'Lien de paiement envoyé, carte toujours non enregistrée',
    price_mismatch: 'Prix affiché différent du prix prélevé',
    stripe_missing: 'Identifiants Stripe introuvables',
    email_failed: 'Emails non envoyés (24 h)',
    check_failed: 'Contrôles impossibles',
};

export function buildHealthReportEmail(issues, { baseUrl }) {
    const adminUrl = `${String(baseUrl || '').replace(/\/$/, '')}/admin`;
    const groups = Object.keys(TITLES).map((kind) => [kind, issues.filter((i) => i.kind === kind)]).filter(([, list]) => list.length);
    const line = (i) => [i.client, i.email].filter(Boolean).join(' · ');
    const html = `
        <h2 style="margin-top:0;color:#B91C1C;">${issues.length} point${issues.length > 1 ? 's' : ''} à traiter</h2>
        <p>Le contrôle automatique du matin a trouvé des situations qui gênent (ou vont gêner) des clients.</p>
        ${groups.map(([kind, list]) => `
            <h3 style="margin:20px 0 8px;color:#0f172a;">${escapeHtml(TITLES[kind])} (${list.length})</h3>
            <ul style="padding-left:18px;margin:0;">${list.map((i) => `<li style="margin-bottom:8px;">${line(i) ? `<strong>${escapeHtml(line(i))}</strong><br>` : ''}${escapeHtml(i.detail)}</li>`).join('')}</ul>`).join('')}
        ${emailButton(adminUrl, 'Ouvrir l’administration', '#0f172a')}`;
    const text = groups.map(([kind, list]) => `${TITLES[kind]} (${list.length})\n${list.map((i) => `- ${line(i) ? `${line(i)} : ` : ''}${i.detail}`).join('\n')}`).join('\n\n')
        + `\n\nAdministration : ${adminUrl}`;
    return { subject: `Contrôle du site : ${issues.length} point${issues.length > 1 ? 's' : ''} à traiter`, html, text };
}

/** Tâche du cron quotidien. */
export async function runHealthCheck({ conn, stripe, transporter, from, baseUrl }) {
    const secretKey = readServerEnv('CLERK_SECRET_KEY');
    const clerk = secretKey ? createClerkClient({ secretKey }) : null;
    const issues = await collectHealthIssues({ conn, stripe, clerk });
    if (transporter) await sendActivationLinks({ conn, transporter, from, baseUrl, issues, clerk });
    if (!issues.length || !transporter) return { healthIssues: issues.length, healthReportSent: false };
    const mail = buildHealthReportEmail(issues, { baseUrl });
    await sendBrandedMail(transporter, { conn, from, to: ADMIN_EMAIL, type: 'admin_health_report', source: 'auto', ...mail });
    return { healthIssues: issues.length, healthReportSent: true };
}

export const ACTIVATION_RESEND_MS = 3 * DAY_MS;

/**
 * Client bloqué par « email non vérifié » : on lui envoie nous-mêmes le lien « Activer mon accès » (preuve signée de
 * l'adresse) au lieu d'attendre qu'il bute sur l'écran ou appelle. Une fois tous les 3 jours au plus.
 */
export async function sendActivationLinks({ conn, transporter, from, baseUrl, issues, clerk = null, now = Date.now() }) {
    for (const issue of issues) {
        if (issue.kind !== 'unverified' || !issue.clientId || !issue.email) continue;
        try {
            const table = issue.table === 'demandes' ? 'demandes' : 'clients';
            const row = (await conn.execute(table === 'demandes' ? 'SELECT clientName AS name, extra_info FROM demandes WHERE id = ?' : 'SELECT name, extra_info FROM clients WHERE id = ?', [issue.clientId])).rows?.[0];
            if (!row) continue;
            let extra;
            try {
                extra = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info || '{}') : (row.extra_info || {});
                if (typeof extra === 'string') extra = JSON.parse(extra);
            } catch {
                continue; // fiche illisible : on n'écrit rien
            }
            if (!extra || typeof extra !== 'object') continue;
            const last = Date.parse(extra.access_activation_sent_at || '');
            if (Number.isFinite(last) && now - last < ACTIVATION_RESEND_MS) {
                issue.detail = `Lien « Activer mon accès » déjà envoyé le ${new Date(last).toLocaleDateString('fr-FR')} : le client n’a pas encore cliqué. ${issue.detail}`;
                continue;
            }
            // Lien qui CONNECTE directement (jeton Clerk 7 jours) : plus besoin du mot de passe. Sinon, lien d'activation simple.
            let loginUrl = null;
            try {
                const ticket = await createLoginTicket(clerk, issue.clerkUserId, ACTIVATION_LINK_TTL_SECONDS);
                if (ticket) loginUrl = loginLinkUrl(baseUrl, issue.email, ticket);
            } catch (err) {
                console.error('[health] jeton de connexion non créé:', err?.message || err);
            }
            const mail = buildAccessActivationEmail({ nom: row.name, email: issue.email, baseUrl, loginUrl });
            await sendBrandedMail(transporter, { conn, from, to: issue.email, clientEmail: issue.email, type: 'access_activation', source: 'auto', ...mail });
            await conn.execute(`UPDATE ${table} SET extra_info = ? WHERE id = ?`, [JSON.stringify({ ...extra, access_activation_sent_at: new Date(now).toISOString() }), issue.clientId]);
            issue.detail = 'Lien « Activer mon accès » envoyé automatiquement ce matin au client : un clic suffit, rien à faire de votre côté. Si besoin : fiche client → « Vérifier son compte de connexion ».';
        } catch (err) {
            console.error('[health] lien d’activation non envoyé:', err?.message || err);
        }
    }
}
