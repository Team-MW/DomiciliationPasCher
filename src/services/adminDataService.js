import { conn } from '../lib/db';

/**
 * ADMIN DATA SERVICE - Version PlanetScale
 * Connecté en temps réel à la base de données MySQL.
 */

export const adminDataService = {
    // --- CLIENTS ---
    async getClients() {
        const res = await conn.execute('SELECT * FROM clients ORDER BY since DESC');
        return res.rows;
    },

    async getClientById(id) {
        const res = await conn.execute('SELECT * FROM clients WHERE id = ?', [id]);
        return res.rows[0];
    },

    async getClientByEmail(email) {
        const res = await conn.execute('SELECT * FROM clients WHERE email = ?', [email]);
        return res.rows[0];
    },

    async addClient(clientData) {
        const id = Date.now().toString();
        const since = new Date().toISOString().split('T')[0];

        await conn.execute(
            `INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, clientData.name, clientData.email, clientData.company,
                clientData.city || 'À définir', clientData.plan, 'actif',
                since, clientData.renewal || since, '', 'manual'
            ]
        );
        return { id, ...clientData, status: 'actif', since };
    },

    async updateClientClerkId(clientId, clerkId) {
        await conn.execute(
            'UPDATE clients SET clerkId = ?, clerkStatus = ? WHERE id = ?',
            [clerkId, 'linked', clientId]
        );
    },

    async deleteClient(id) {
        await conn.execute('DELETE FROM clients WHERE id = ?', [id]);
    },

    // --- DEMANDES ---
    async getDemandes() {
        const res = await conn.execute("SELECT * FROM demandes WHERE status = 'en_attente' ORDER BY date DESC");
        return res.rows;
    },

    async addDemande(d) {
        const id = 'req_' + Date.now();
        const date = new Date().toISOString();
        await conn.execute(
            `INSERT INTO demandes (id, clientName, email, company, plan, amount, date, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, d.clientName, d.email, d.company, d.plan, d.amount, date, 'en_attente']
        );
        return { id, ...d, date, status: 'en_attente' };
    },

    async traiterDemande(id) {
        const res = await conn.execute('SELECT * FROM demandes WHERE id = ?', [id]);
        const d = res.rows[0];
        if (d) {
            const clientId = Date.now().toString();
            const since = new Date().toISOString().split('T')[0];

            // Créer le client
            await conn.execute(
                `INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [clientId, d.clientName, d.email, d.company, 'À définir', d.plan, 'actif', since, since, '', 'invitation_sent']
            );

            // Supprimer la demande
            await conn.execute('DELETE FROM demandes WHERE id = ?', [id]);
            return { id: clientId, ...d };
        }
    },

    // --- MAIL ---
    async getMail() {
        const res = await conn.execute('SELECT * FROM mail ORDER BY date DESC');
        return res.rows;
    },

    async getClientMail(clientId) {
        const res = await conn.execute('SELECT * FROM mail WHERE clientId = ? ORDER BY date DESC', [clientId]);
        return res.rows;
    },

    async markMailAsRead(id) {
        await conn.execute("UPDATE mail SET status = 'lu' WHERE id = ?", [id]);
    },

    // --- DOCUMENTS ---
    async getDocuments(clientId) {
        const res = await conn.execute('SELECT * FROM documents WHERE clientId = ? ORDER BY uploadedAt DESC', [clientId]);
        return res.rows;
    },

    async addDocument(clientId, fileInfo) {
        const id = 'doc_' + Date.now();
        const uploadedAt = new Date().toISOString().split('T')[0];
        await conn.execute(
            `INSERT INTO documents (id, clientId, name, size, type, uploadedAt, owner, folder, url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, clientId, fileInfo.name, fileInfo.size, fileInfo.type, uploadedAt, fileInfo.owner, fileInfo.folder || 'Documents', fileInfo.url || '#']
        );
        return { id, clientId, uploadedAt, ...fileInfo };
    },

    async getClientFolders(clientId) {
        const docs = await this.getDocuments(clientId);
        return Array.from(new Set(docs.map(d => d.folder || 'Documents')));
    },

    // --- BOOKINGS ---
    async getBookings() {
        const res = await conn.execute('SELECT * FROM bookings ORDER BY date DESC');
        return res.rows;
    },

    async getClientBookings(clientId) {
        const res = await conn.execute('SELECT * FROM bookings WHERE clientId = ? ORDER BY date DESC', [clientId]);
        return res.rows;
    },

    async addBookingRequest(clientId, b) {
        const id = 'book_' + Date.now();
        const createdAt = new Date().toISOString();
        await conn.execute(
            `INSERT INTO bookings (id, clientId, type, date, duration, status, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, clientId, b.type, b.date, b.duration, 'en_attente', createdAt]
        );
        return { id, clientId, ...b, status: 'en_attente', createdAt };
    },

    // --- STATS ---
    async getGlobalStats() {
        const [clients, mails, demandes] = await Promise.all([
            conn.execute('SELECT COUNT(*) as total FROM clients WHERE status = ?', ['actif']),
            conn.execute("SELECT COUNT(*) as total FROM mail WHERE status = 'non lu'"),
            conn.execute("SELECT COUNT(*) as total FROM demandes WHERE status = 'en_attente'")
        ]);

        const revenueRes = await conn.execute("SELECT plan FROM clients WHERE status = 'actif'");
        const monthlyRevenue = revenueRes.rows.reduce((acc, c) => acc + (c.plan === 'Scan+' ? 28 : 23), 0);

        return {
            activeClients: parseInt(clients.rows[0].total),
            pendingMails: parseInt(mails.rows[0].total),
            pendingDemandes: parseInt(demandes.rows[0].total),
            monthlyRevenue
        };
    },

    // Mock compatibility
    init() { }
};
