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
        if (!email) return null;
        const cleanEmail = email.trim().toLowerCase();
        const res = await conn.execute('SELECT * FROM clients WHERE email = ?', [cleanEmail]);
        return res.rows[0];
    },

    async getClientBySessionId(sessionId) {
        if (!sessionId) return null;
        // On cherche dans le JSON extra_info
        const res = await conn.execute("SELECT * FROM clients WHERE JSON_EXTRACT(extra_info, '$.stripe_session_id') = ?", [sessionId]);
        return res.rows[0];
    },

    async addClient(clientData) {
        const id = Date.now().toString();
        const since = new Date().toISOString().split('T')[0];

        const extraInfoStr = clientData.extra_info ? (typeof clientData.extra_info === 'string' ? clientData.extra_info : JSON.stringify(clientData.extra_info)) : null;
        await conn.execute(
            `INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, clientData.name, clientData.email, clientData.company,
                clientData.city || 'À définir', clientData.plan, 'actif',
                since, clientData.renewal || since, '', 'manual', extraInfoStr
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

    async updateDemandeClerkId(demandeId, clerkId) {
        await conn.execute('UPDATE demandes SET clerkId = ? WHERE id = ?', [clerkId, demandeId]);
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
        // Vérifier si une demande en attente (ou attente paiement) existe déjà pour cet email
        const existing = await conn.execute(
            "SELECT id FROM demandes WHERE email = ? AND (status = 'en_attente' OR status = 'en_attente_paiement') LIMIT 1",
            [d.email]
        );

        const date = new Date().toISOString();
        const city = d.city || 'À définir';
        const extraInfoStr = d.extra_info ? (typeof d.extra_info === 'string' ? d.extra_info : JSON.stringify(d.extra_info)) : null;

        if (existing.rows.length > 0) {
            // Update l'existante
            const id = existing.rows[0].id;
            await conn.execute(
                `UPDATE demandes SET clientName = ?, company = ?, city = ?, plan = ?, amount = ?, date = ?, extra_info = ?, status = 'en_attente_paiement' 
                 WHERE id = ?`,
                [d.clientName, d.company, city, d.plan, d.amount, date, extraInfoStr, id]
            );
            return { id, ...d, city, date, status: 'en_attente_paiement' };
        } else {
            // Créer nouvelle
            const id = 'req_' + Date.now();
            await conn.execute(
                `INSERT INTO demandes (id, clientName, email, company, city, plan, amount, date, status, extra_info) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, d.clientName, d.email, d.company, city, d.plan, d.amount, date, 'en_attente_paiement', extraInfoStr]
            );
            return { id, ...d, city, date, status: 'en_attente_paiement' };
        }
    },

    async confirmDemandePayment(id, sessionId = null, customerId = null) {
        if (sessionId) {
            await conn.execute(
                "UPDATE demandes SET status = 'en_attente', extra_info = JSON_SET(COALESCE(extra_info, '{}'), '$.stripe_session_id', ?, '$.stripe_customer_id', ?) WHERE id = ?",
                [sessionId, customerId, id]
            );
        } else {
            await conn.execute("UPDATE demandes SET status = 'en_attente' WHERE id = ?", [id]);
        }
    },

    async getDemandeBySessionId(sessionId) {
        if (!sessionId) return null;
        const res = await conn.execute("SELECT * FROM demandes WHERE JSON_EXTRACT(extra_info, '$.stripe_session_id') = ?", [sessionId]);
        return res.rows[0];
    },

    async checkPaymentStatus(email) {
        const res = await conn.execute(
            "SELECT id FROM demandes WHERE email = ? AND status = 'en_attente' LIMIT 1",
            [email]
        );
        return res.rows.length > 0;
    },

    async traiterDemande(id) {
        const res = await conn.execute('SELECT * FROM demandes WHERE id = ?', [id]);
        const d = res.rows[0];
        if (d) {
            // Vérifier si un client avec cet email existe déjà
            const existingClientRes = await conn.execute('SELECT id FROM clients WHERE email = ?', [d.email]);
            let clientId;
            const since = new Date().toISOString().split('T')[0];

            if (existingClientRes.rows.length > 0) {
                // Mettre à jour le client existant
                clientId = existingClientRes.rows[0].id;
                await conn.execute(
                    `UPDATE clients SET name = ?, company = ?, city = ?, plan = ?, status = 'actif', renewal = ?, extra_info = ?, clerkId = ?, clerkStatus = 'linked' 
                     WHERE id = ?`,
                    [d.clientName, d.company, d.city || 'À définir', d.plan, since, d.extra_info || null, d.clerkId || '', clientId]
                );
            } else {
                // Créer le nouveau client
                clientId = Date.now().toString();
                const extraInfo = typeof d.extra_info === 'string' ? JSON.parse(d.extra_info) : d.extra_info;
                
                await conn.execute(
                    `INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [clientId, d.clientName, d.email, d.company, d.city || 'À définir', d.plan, 'actif', since, since, d.clerkId || '', d.clerkId ? 'linked' : 'invitation_sent', JSON.stringify(extraInfo)]
                );
            }

            // Créer le paiement initial
            await this.addPayment(clientId, {
                amount: d.amount,
                status: 'payé',
                date: since,
                method: 'Carte (Stripe)'
            });

            // Supprimer la demande
            await conn.execute('DELETE FROM demandes WHERE id = ?', [id]);
            return { id: clientId, ...d };
        }
    },

    async deleteDemande(id) {
        await conn.execute('DELETE FROM demandes WHERE id = ?', [id]);
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

    async deleteDocument(id) {
        await conn.execute('DELETE FROM documents WHERE id = ?', [id]);
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

    // --- PAYMENTS ---
    async getPayments(clientId) {
        const res = await conn.execute('SELECT * FROM payments WHERE clientId = ? ORDER BY date DESC', [clientId]);
        return res.rows;
    },

    async addPayment(clientId, p) {
        const id = 'pay_' + Date.now();
        const date = p.date || new Date().toISOString().split('T')[0];
        const status = p.status || 'payé';
        const method = p.method || 'Carte (Stripe)';
        const amount = p.amount || 0;
        const invoice_ref = p.invoice_ref || `FAC-${date.replace(/-/g, '').substring(0, 6)}-${clientId.substring(0, 4)}`;

        await conn.execute(
            `INSERT INTO payments (id, clientId, amount, status, method, date, invoice_ref) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, clientId, amount, status, method, date, invoice_ref]
        );
        return { id, clientId, amount, status, method, date, invoice_ref };
    },

    async updatePaymentStatus(paymentId, status) {
        await conn.execute('UPDATE payments SET status = ? WHERE id = ?', [status, paymentId]);
    },

    async deletePayment(paymentId) {
        await conn.execute('DELETE FROM payments WHERE id = ?', [paymentId]);
    },

    async syncStripePayments(email) {
        try {
            const res = await fetch(`/api/list-payments?email=${email}`);
            const data = await res.json();
            return data.payments || [];
        } catch (err) {
            console.error("Erreur sync Stripe:", err);
            return [];
        }
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
        const monthlyRevenue = revenueRes.rows.reduce((acc, c) => {
            if (c.plan === 'Scan+') return acc + 24;
            if (c.plan === 'Physique+') return acc + 38;
            return acc + 20;
        }, 0);

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
        } catch (err) {}
        try {
            await conn.execute('ALTER TABLE clients ADD COLUMN phone VARCHAR(50) DEFAULT ""');
        } catch (err) {}
        try {
            await conn.execute('ALTER TABLE clients ADD COLUMN extra_info TEXT');
        } catch (err) {}
        try {
            await conn.execute('ALTER TABLE demandes ADD COLUMN extra_info TEXT');
        } catch (err) {}
        try {
            await conn.execute('ALTER TABLE demandes ADD COLUMN city VARCHAR(100) DEFAULT "À définir"');
        } catch (err) {}
        try {
            await conn.execute('ALTER TABLE demandes ADD COLUMN clerkId VARCHAR(100) DEFAULT ""');
        } catch (err) {}
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
            // Migration: Ajouter 'city' si la table existait DÉJÀ avant notre mise à jour !
            try {
                await conn.execute('DELETE FROM bookings');
            } catch (err) { }
            
            console.log("Bookings table verified and cleared.");
        } catch (err) {
            console.error("BOOKINGS_INIT_ERROR:", err);
        }
    },

    async initPayments() {
        try {
            await conn.execute(`
                CREATE TABLE IF NOT EXISTS payments (
                    id VARCHAR(50) PRIMARY KEY,
                    clientId VARCHAR(50),
                    amount DECIMAL(10, 2),
                    status VARCHAR(20),
                    method VARCHAR(50),
                    date VARCHAR(30),
                    invoice_ref VARCHAR(50)
                )
            `);
            console.log("Payments table verified.");
        } catch (err) {
            console.error("PAYMENTS_INIT_ERROR:", err);
        }
    },

    // Initialisation DB Wait
    async init() {
        await this.initMessaging();
        await this.initProfileFields();
        await this.initBookings();
        await this.initPayments();
    }
};
