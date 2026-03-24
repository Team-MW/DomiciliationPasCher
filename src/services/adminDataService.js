import { conn } from '../lib/db';

/**
 * ADMIN DATA SERVICE - Version PlanetScale
 * Connecté en temps réel à la base de données MySQL.
 */

export const adminDataService = {
    // --- CLIENTS ---
    async getClients() {
        const res = await conn.execute(`
            SELECT c.*, 
            (SELECT COUNT(*) FROM messages m WHERE m.clientId = c.id AND m.status = 'sent' AND m.sender = 'client') as unreadCount
            FROM clients c 
            ORDER BY since DESC
        `);
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

    async updateClientProfile(id, data) {
        await conn.execute(
            'UPDATE clients SET name = ?, email = ?, address = ?, phone = ? WHERE id = ?',
            [data.name, data.email, data.address || '', data.phone || '', id]
        );
        return { id, ...data };
    },

    async updateClientStatus(id, newStatus) {
        await conn.execute('UPDATE clients SET status = ? WHERE id = ?', [newStatus, id]);
        return { id, status: newStatus };
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
        const city = d.city || 'À définir';
        await conn.execute(
            `INSERT INTO demandes (id, clientName, email, company, city, plan, amount, date, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, d.clientName, d.email, d.company, city, d.plan, d.amount, date, 'en_attente']
        );
        return { id, ...d, city, date, status: 'en_attente' };
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
                [clientId, d.clientName, d.email, d.company, d.city || 'À définir', d.plan, 'actif', since, since, '', 'invitation_sent']
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
        const res = await conn.execute('SELECT * FROM bookings WHERE clientId = ? ORDER BY `date` DESC', [clientId]);
        return res.rows;
    },

    async getBookings() {
        const res = await conn.execute(`
            SELECT b.*, c.company as clientName 
            FROM bookings b 
            LEFT JOIN clients c ON b.clientId = c.id 
            ORDER BY b.createdAt DESC
        `);
        return res.rows;
    },

    async updateBookingStatus(bookingId, status) {
        await conn.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);
        return { id: bookingId, status };
    },

    async addBookingRequest(clientId, b) {
        const id = 'book_' + Date.now();
        const createdAt = new Date().toISOString();
        const city = b.city || 'À définir';
        await conn.execute(
            `INSERT INTO bookings (\`id\`, \`clientId\`, \`city\`, \`type\`, \`date\`, \`duration\`, \`status\`, \`createdAt\`) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, clientId, city, b.type, b.date, b.duration, 'en_attente', createdAt]
        );
        return { id, clientId, city, ...b, status: 'en_attente', createdAt };
    },

    // --- STATS ---
    async getGlobalStats() {
        const [clients, mails, demandes, unreadMsgs] = await Promise.all([
            conn.execute('SELECT COUNT(*) as total FROM clients WHERE status = ?', ['actif']),
            conn.execute("SELECT COUNT(*) as total FROM mail WHERE status = 'non lu'"),
            conn.execute("SELECT COUNT(*) as total FROM demandes WHERE status = 'en_attente'"),
            conn.execute("SELECT COUNT(*) as total FROM messages WHERE status = 'sent' AND sender = 'client'")
        ]);

        const revenueRes = await conn.execute("SELECT plan FROM clients WHERE status = 'actif'");
        const monthlyRevenue = revenueRes.rows.reduce((acc, c) => acc + (c.plan === 'Scan+' ? 28 : 23), 0);

        return {
            activeClients: parseInt(clients.rows[0].total),
            pendingMails: parseInt(mails.rows[0].total),
            pendingDemandes: parseInt(demandes.rows[0].total),
            pendingMessages: parseInt(unreadMsgs.rows[0].total),
            monthlyRevenue
        };
    },

    // --- MESSAGES ---
    async getMessages(clientId) {
        try {
            const res = await conn.execute(
                'SELECT * FROM messages WHERE clientId = ? ORDER BY createdAt ASC',
                [clientId]
            );
            return res.rows;
        } catch (err) {
            console.error("MESSAGES_FETCH_ERROR:", err);
            // On retourne un tableau vide si la table n'existe pas encore ou erreur
            return [];
        }
    },

    async addMessage(clientId, msg) {
        const id = 'msg_' + Date.now();
        const createdAt = new Date().toISOString();
        const sender = msg.sender || 'admin'; // 'admin' ou 'client'

        // Tentative d'insertion
        await conn.execute(
            `INSERT INTO messages (id, clientId, content, sender, createdAt, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, clientId, msg.content, sender, createdAt, 'sent']
        );

        return { id, clientId, createdAt, ...msg, status: 'sent' };
    },

    async markMessagesAsRead(clientId, readerRole) {
        // Si l'admin lit, il marque les messages envoyés par le 'client' comme 'read'
        // Si le client lit, il marque les messages envoyés par l' 'admin' comme 'read'
        const senderToMark = readerRole === 'admin' ? 'client' : 'admin';
        try {
            await conn.execute(
                "UPDATE messages SET status = 'read' WHERE clientId = ? AND sender = ? AND status = 'sent'",
                [clientId, senderToMark]
            );
        } catch (err) {
            console.error("MARK_READ_ERROR:", err);
        }
    },

    async initMessaging() {
        try {
            await conn.execute(`
                CREATE TABLE IF NOT EXISTS messages (
                    id VARCHAR(50) PRIMARY KEY,
                    clientId VARCHAR(50),
                    content TEXT,
                    sender VARCHAR(20),
                    createdAt VARCHAR(30),
                    status VARCHAR(20)
                )
            `);
            console.log("Messaging table verified.");
        } catch (err) {
            console.error("MESSAGING_INIT_ERROR:", err);
        }
    },

    async initProfileFields() {
        try {
            await conn.execute('ALTER TABLE clients ADD COLUMN address VARCHAR(255) DEFAULT ""');
        } catch (err) {
        }
        try {
            await conn.execute('ALTER TABLE clients ADD COLUMN phone VARCHAR(50) DEFAULT ""');
        } catch (err) {
        }
    },

    async initBookings() {
        try {
            await conn.execute(`
                CREATE TABLE IF NOT EXISTS bookings (
                    \`id\` VARCHAR(50) PRIMARY KEY,
                    \`clientId\` VARCHAR(50),
                    \`city\` VARCHAR(50),
                    \`type\` VARCHAR(50),
                    \`date\` VARCHAR(30),
                    \`duration\` VARCHAR(30),
                    \`status\` VARCHAR(20),
                    \`createdAt\` VARCHAR(30)
                )
            `);
            console.log("Bookings table verified.");
        } catch (err) {
            console.error("BOOKINGS_INIT_ERROR:", err);
        }
    },

    // Initialisation DB Wait
    async init() {
        await this.initMessaging();
        await this.initProfileFields();
        await this.initBookings();
    }
};
