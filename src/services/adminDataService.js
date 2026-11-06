import { fetchWithRetry } from '../utils/api';

/**
 * ADMIN DATA SERVICE — client navigateur.
 *
 * Toutes les opérations base de données passent par POST /api/data (api/data.js), qui
 * vérifie le jeton Clerk et les droits (client : ses propres fiches ; admin : tout).
 * Le navigateur n'a plus aucun identifiant de base de données.
 *
 * Les signatures des méthodes sont celles de l'ancienne version, pour ne pas toucher aux appelants.
 */

export async function callDataApi(method, args = []) {
    const res = await fetchWithRetry('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args }),
    });
    let data = {};
    try {
        data = await res.json();
    } catch {
        data = {};
    }
    if (!res.ok) {
        const err = new Error(data.error || `Erreur serveur (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data.result;
}

const remote = (method) => (...args) => callDataApi(method, args);

const REMOTE_METHODS = [
    // clients
    'getClients', 'getClientById', 'getClientByEmail', 'getClientBySessionId', 'addClient',
    'updateClientClerkId', 'updateDemandeClerkId', 'updateClientProfile', 'updateClientAddress',
    'updateClientStatus', 'updateClientExtraInfo', 'deleteClient', 'getMyAccount',
    'clerkAccountsForClient', 'linkClerkAccount',
    // demandes et souscription
    'getDemandes', 'getInscriptionsNonFinalisees', 'addDemande', 'getDemandeBySessionId',
    'hasPendingDemandeForSession', 'checkPaymentStatus', 'traiterDemande', 'startDocumentRequest',
    'stopDocumentRequest', 'getEmailLogs', 'saveSouscriptionLead', 'getSouscriptionLeadByToken',
    'completeSouscriptionLead', 'deleteDemande',
    // courrier
    'getMail', 'markMailAsRead', 'addClientMail', 'deleteMail', 'getClientMail',
    // documents
    'getDocuments', 'deleteDocument', 'addDocument', 'getClientFolders',
    // réservations
    'getBookings', 'getClientBookings', 'updateBookingStatus', 'addBookingRequest', 'confirmMeetingBooking',
    // réexpéditions
    'getReexpeditions', 'getClientReexpeditions', 'addReexpeditionRequest', 'updateReexpeditionStatus',
    // paiements
    'getPayments', 'addPayment', 'updatePaymentStatus', 'deletePayment',
    // messages
    'getMessages', 'addMessage', 'markMessagesAsRead',
];

export const adminDataService = {
    ...Object.fromEntries(REMOTE_METHODS.map((name) => [name, remote(name)])),

    /** Le schéma est vérifié côté serveur au premier appel authentifié : plus rien à faire ici. */
    async init() {},
    async initBookings() {},

    // --- Appels Stripe (routes dédiées, également authentifiées) ---
    async syncStripePayments(email, stripeCustomerId = null, sinceDate = null) {
        try {
            const cleanEmail = email ? email.trim().toLowerCase() : '';
            let url = stripeCustomerId
                ? `/api/list-payments?email=${encodeURIComponent(cleanEmail)}&customerId=${encodeURIComponent(stripeCustomerId)}`
                : `/api/list-payments?email=${encodeURIComponent(cleanEmail)}`;
            if (sinceDate) url += `&since=${encodeURIComponent(sinceDate)}`;
            url += `&_t=${Date.now()}`; // anti-cache
            const res = await fetchWithRetry(url);
            const data = await res.json();
            return {
                payments: data.payments || [],
                // Jamais 'active' par défaut : une réponse incomplète ou une panne réseau
                // repasserait en actif un client réellement en impayé.
                subscriptionStatus: data.subscriptionStatus || 'non_trouvé',
                foundCustomerId: data.foundCustomerId || null,
            };
        } catch (err) {
            console.error('Erreur sync Stripe:', err);
            return { payments: [], subscriptionStatus: 'non_trouvé', foundCustomerId: null };
        }
    },

    async getStripeFailedPayments() {
        const res = await fetchWithRetry(`/api/stripe-failed-payments?_t=${Date.now()}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Erreur récupération impayés Stripe');
        return data.failures || [];
    },

    async createStripePortalSession(customerId) {
        if (!customerId) return null;
        const res = await fetchWithRetry('/api/create-portal-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Erreur inconnue de Stripe');
        return data.url;
    },

    /** Compteurs base (serveur) + chiffres Stripe (/api/stripe-stats). */
    async getGlobalStats() {
        const counts = await callDataApi('getGlobalStats');

        let monthlyRevenue = 0;
        let revenueHistory = [];
        let mrr = null;
        let activeSubscriptions = null;
        let revenueChangePct = null;
        let source = null;
        let livemode = false;
        try {
            const res = await fetch('/api/stripe-stats');
            if (res.ok) {
                const data = await res.json();
                monthlyRevenue = data.monthlyRevenue || 0;
                revenueHistory = data.revenueHistory || [];
                mrr = data.mrr ?? 0;
                activeSubscriptions = data.activeSubscriptions ?? 0;
                revenueChangePct = data.revenueChangePct ?? null;
                source = data.source || 'stripe';
                livemode = data.livemode === true;
            } else {
                console.warn('Impossible de récupérer les statistiques Stripe');
            }
        } catch (err) {
            console.error("Erreur lors de l'appel à /api/stripe-stats:", err);
        }

        if (revenueHistory.length === 0) {
            const now = new Date();
            const monthNamesShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                revenueHistory.push({ label: `${monthNamesShort[d.getMonth()]} ${d.getFullYear()}`, revenue: 0 });
            }
        }

        return {
            ...counts,
            monthlyRevenue,
            mrr,
            activeSubscriptions,
            revenueChangePct,
            source,
            livemode,
            revenueHistory,
        };
    },
};
