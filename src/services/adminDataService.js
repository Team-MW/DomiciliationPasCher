/**
 * ADMIN DATA SERVICE
 * Simule un backend robuste avec persistence via localStorage.
 * Permet au dashboard d'être réellement fonctionnel (CRUD).
 */

const STORAGE_KEYS = {
    CLIENTS: 'dpc_admin_clients',
    MAIL: 'dpc_admin_mail',
    DEMANDES: 'dpc_admin_demandes',
    DOCUMENTS: 'dpc_admin_documents'
};

// Initialisation des données mockées si vides
const INITIAL_DATA = {
    clients: [
        { id: '1', name: 'Marie Lambert', email: 'marie.l@gmail.com', company: 'ML Consulting', city: 'Lyon', plan: 'Scan+', status: 'actif', since: '2024-11-15', renewal: '2025-11-15', stats: { mail: 12, spent: 450 } },
        { id: '2', name: 'Thomas Bernard', email: 'thomas.b@startup.io', company: 'Bernard Tech', city: 'Paris', plan: 'Essentiel', status: 'actif', since: '2024-10-02', renewal: '2025-10-02', stats: { mail: 5, spent: 230 } },
    ],
    mail: [
        { id: 'm1', clientId: '1', company: 'ML Consulting', type: 'Recommandé', from: 'URSSAF', date: '2025-03-04', status: 'non lu', preview: null },
        { id: 'm2', clientId: '1', company: 'ML Consulting', type: 'Lettre Simple', from: 'Banque Populaire', date: '2025-03-01', status: 'lu', preview: null },
        { id: 'm3', clientId: '2', company: 'Bernard Tech', type: 'Pli Administratif', from: 'Impôts Gouv', date: '2025-03-03', status: 'non lu', preview: null },
    ],
    demandes: [
        { id: 'req1', clientName: 'Jean Dupont', email: 'j.dupont@web.fr', company: 'Dupont Web', plan: 'Scan+', amount: '28.00', date: '2025-03-04T10:15:00', status: 'en_attente' },
        { id: 'req2', clientName: 'Alice Roche', email: 'alice@design.com', company: 'Alice Studio', plan: 'Essentiel', amount: '23.00', date: '2025-03-04T09:20:00', status: 'en_attente' },
    ],
    documents: {
        '1': [
            { id: 'd1', name: 'KBIS_2024.pdf', size: '250KB', type: 'application/pdf', uploadedAt: '2024-11-16', owner: 'client', url: '#' },
            { id: 'd2', name: 'IDCard_Recto.jpg', size: '1.2MB', type: 'image/jpeg', uploadedAt: '2024-11-16', owner: 'client', url: '#' },
            { id: 'd3', name: 'Contrat_Domiciliation.pdf', size: '1.5MB', type: 'application/pdf', uploadedAt: '2024-11-15', owner: 'admin', url: '#' }
        ],
        '2': [
            { id: 'd4', name: 'Contrat_Essentiel.pdf', size: '800KB', type: 'application/pdf', uploadedAt: '2024-10-02', owner: 'admin', url: '#' }
        ]
    }
};

const get = (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};

const set = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

export const adminDataService = {
    init() {
        if (!get(STORAGE_KEYS.CLIENTS)) set(STORAGE_KEYS.CLIENTS, INITIAL_DATA.clients);
        if (!get(STORAGE_KEYS.MAIL)) set(STORAGE_KEYS.MAIL, INITIAL_DATA.mail);
        if (!get(STORAGE_KEYS.DEMANDES)) set(STORAGE_KEYS.DEMANDES, INITIAL_DATA.demandes);
        if (!get(STORAGE_KEYS.DOCUMENTS)) set(STORAGE_KEYS.DOCUMENTS, INITIAL_DATA.documents);
    },

    // --- CLIENTS ---
    getClients() { return get(STORAGE_KEYS.CLIENTS) || []; },
    getClientById(id) {
        const clients = this.getClients();
        return clients.find(c => c.id === id);
    },
    updateClient(id, updates) {
        const clients = this.getClients();
        const index = clients.findIndex(c => c.id === id);
        if (index !== -1) {
            clients[index] = { ...clients[index], ...updates };
            set(STORAGE_KEYS.CLIENTS, clients);
        }
    },
    getClientByEmail(email) {
        const clients = this.getClients();
        return clients.find(c => c.email.toLowerCase() === email.toLowerCase());
    },

    // --- DEMANDES (Après paiement Stripe) ---
    getDemandes() { return get(STORAGE_KEYS.DEMANDES) || []; },
    addDemande(demande) {
        const demandes = this.getDemandes();
        const newDemande = {
            id: 'req_' + Date.now(),
            date: new Date().toISOString(),
            status: 'en_attente',
            ...demande
        };
        set(STORAGE_KEYS.DEMANDES, [newDemande, ...demandes]);
        return newDemande;
    },
    async traiterDemande(id) {
        let demandes = this.getDemandes();
        const d = demandes.find(item => item.id === id);
        if (d) {
            // Simulation temps de réponse API Clerk
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Créer le client avec ses accès Clerk simulés
            const newClient = {
                id: Date.now().toString(),
                name: d.clientName,
                email: d.email,
                company: d.company,
                city: 'À définir',
                plan: d.plan,
                status: 'actif',
                clerkId: `user_${Math.random().toString(36).substr(2, 9)}`,
                clerkStatus: 'invitation_sent',
                since: new Date().toISOString().split('T')[0],
                stats: { mail: 0, spent: parseFloat(d.amount) }
            };

            const clients = this.getClients();
            set(STORAGE_KEYS.CLIENTS, [newClient, ...clients]);

            // Marquer la demande comme traitée
            demandes = demandes.filter(item => item.id !== id);
            set(STORAGE_KEYS.DEMANDES, demandes);
            return newClient;
        }
    },

    // --- DOCUMENTS (Cloudinary Simulator) ---
    getDocuments(clientId) {
        const docs = get(STORAGE_KEYS.DOCUMENTS) || {};
        return docs[clientId] || [];
    },
    addDocument(clientId, fileInfo) {
        const allDocs = get(STORAGE_KEYS.DOCUMENTS) || {};
        const clientDocs = allDocs[clientId] || [];
        const newDoc = {
            id: 'doc_' + Date.now(),
            uploadedAt: new Date().toISOString().split('T')[0],
            ...fileInfo
        };
        allDocs[clientId] = [newDoc, ...clientDocs];
        set(STORAGE_KEYS.DOCUMENTS, allDocs);
        return newDoc;
    },

    // --- MAIL ---
    getMail() { return get(STORAGE_KEYS.MAIL) || []; },
    getClientMail(clientId) {
        const allMail = this.getMail();
        return allMail.filter(m => m.clientId === clientId);
    },
    markMailAsRead(id) {
        const allMail = this.getMail();
        const index = allMail.findIndex(m => m.id === id);
        if (index !== -1) {
            allMail[index].status = 'lu';
            set(STORAGE_KEYS.MAIL, allMail);
        }
    },

    // --- STATS ---
    getGlobalStats() {
        const clients = this.getClients();
        const mails = this.getMail();
        const demandes = this.getDemandes();
        return {
            totalClients: clients.length,
            activeClients: clients.filter(c => c.status === 'actif').length,
            pendingMails: mails.filter(m => m.status === 'non lu').length,
            pendingDemandes: demandes.length,
            monthlyRevenue: clients.filter(c => c.status === 'actif').reduce((acc, c) => acc + (c.plan === 'Scan+' ? 28 : 23), 0)
        };
    }
};
