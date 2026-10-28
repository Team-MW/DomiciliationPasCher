import { conn } from '../lib/db';
import { fetchWithRetry } from '../utils/api';
import { sendApprovalEmail, sendDocumentRequestEmail } from './emailService';
import { PLAN_CATALOG, resolvePlanId, canRequestPhysicalForward } from '../../shared/plans.js';
import { computeMissingDocuments } from '../../shared/documentRequest.js';
import { EMAIL_LOGS_DDL, EMAIL_LOGS_ADD_CLIENT_COLUMN, SOUSCRIPTION_LEADS_DDL } from '../../shared/emailTables.js';
import { parseExtraInfo, normalizeSubscriptionExtra, resolvePersonalAddress } from '../utils/contractLegalFields';

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
        const res = await conn.execute(
            "SELECT * FROM clients WHERE JSON_UNQUOTE(JSON_EXTRACT(extra_info, '$.stripe_session_id')) = ?",
            [sessionId]
        );
        return res.rows[0];
    },

    async addClient(clientData) {
        let finalExtraInfo = parseExtraInfo(clientData.extra_info);
        const cleanEmail = clientData.email ? clientData.email.trim().toLowerCase() : '';

        // Création manuelle : On ne crée plus automatiquement de client Stripe.

        const id = Date.now().toString();
        const since = clientData.since || new Date().toISOString().split('T')[0];
        const displayName = (clientData.name || '').trim()
            || [finalExtraInfo.prenom, finalExtraInfo.nom].filter(Boolean).join(' ').trim();
        const company = clientData.company || finalExtraInfo.nomSociete || '';
        const address = String(clientData.address || resolvePersonalAddress({}, finalExtraInfo)).slice(0, 255);
        const phone = String(clientData.phone || finalExtraInfo.telephone || '').slice(0, 50);

        if (!finalExtraInfo.offre && clientData.plan) {
            const catalog = PLAN_CATALOG[resolvePlanId(clientData.plan)];
            if (catalog) finalExtraInfo.offre = catalog.offre;
        }
        if (!finalExtraInfo.email) finalExtraInfo.email = cleanEmail;
        if (!finalExtraInfo.adressePerso && address) finalExtraInfo.adressePerso = address;
        if (!finalExtraInfo.telephone && phone) finalExtraInfo.telephone = phone;

        const extraInfoStr = JSON.stringify(finalExtraInfo);

        await conn.execute(
            `INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info, address, phone) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, displayName, cleanEmail, company,
                clientData.city || 'À définir', clientData.plan, 'actif',
                since, clientData.renewal || since, '', 'manual', extraInfoStr,
                address, phone
            ]
        );
        return {
            id,
            ...clientData,
            name: displayName,
            company,
            email: cleanEmail,
            status: 'actif',
            since,
            address,
            phone,
            extra_info: extraInfoStr,
            clerkStatus: 'manual',
        };
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
        const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
        await conn.execute(
            'UPDATE clients SET name = ?, email = ?, address = ?, phone = ?, company = ?, city = ? WHERE id = ?',
            [data.name || '', cleanEmail, data.address || '', data.phone || '', data.company || '', data.city || '', id]
        );
        return { id, ...data, email: cleanEmail };
    },

    /**
     * Met à jour uniquement l'adresse personnelle. Volontairement distinct de
     * updateClientProfile, qui réécrit aussi nom, email et téléphone : le client n'a le droit
     * de modifier que son adresse, et cette méthode rend cette limite impossible à contourner.
     */
    async updateClientAddress(id, address) {
        const clientRes = await conn.execute('SELECT id FROM clients WHERE id = ?', [id]);
        if (clientRes.rows[0]) {
            await conn.execute('UPDATE clients SET address = ? WHERE id = ?', [address || '', id]);
            return { id, address: address || '' };
        }
        const demRes = await conn.execute('SELECT extra_info FROM demandes WHERE id = ?', [id]);
        if (demRes.rows[0]) {
            const existing = parseExtraInfo(demRes.rows[0].extra_info);
            const merged = { ...existing, adressePerso: address || '' };
            await conn.execute('UPDATE demandes SET extra_info = ? WHERE id = ?', [JSON.stringify(merged), id]);
        }
        return { id, address: address || '' };
    },

    async updateClientStatus(id, newStatus) {
        await conn.execute('UPDATE clients SET status = ? WHERE id = ?', [newStatus, id]);
        return { id, status: newStatus };
    },

    /**
     * Met à jour des champs spécifiques dans extra_info d'un client
     * en fusionnant avec les données existantes.
     */
    async updateClientExtraInfo(clientId, extraData) {
        const res = await conn.execute('SELECT extra_info FROM clients WHERE id = ?', [clientId]);
        if (res.rows[0]) {
            const existing = parseExtraInfo(res.rows[0].extra_info);
            const merged = { ...existing, ...extraData };
            await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify(merged), clientId]);
            return merged;
        }
        const dem = await conn.execute('SELECT extra_info FROM demandes WHERE id = ?', [clientId]);
        if (dem.rows[0]) {
            const existing = parseExtraInfo(dem.rows[0].extra_info);
            const merged = { ...existing, ...extraData };
            await conn.execute('UPDATE demandes SET extra_info = ? WHERE id = ?', [JSON.stringify(merged), clientId]);
            return merged;
        }
        return extraData;
    },

    async deleteClient(id) {
        // 1. Essayer de supprimer le compte Clerk d'abord
        const client = await this.getClientById(id);
        if (client && client.clerkId && client.clerkId !== 'user_unknown') {
            try {
                const resp = await fetchWithRetry('/api/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clerkId: client.clerkId })
                });
                const resData = await resp.json();
                console.log("Résultat suppression Clerk:", resData);
            } catch (err) {
                console.warn("Échec appel API suppression Clerk:", err);
            }
        }

        // 2. Supprimer de la DB locale (avec cascade pour éviter les messages orphelins)
        await conn.execute('DELETE FROM clients WHERE id = ?', [id]);
        await conn.execute('DELETE FROM messages WHERE clientId = ?', [id]);
        await conn.execute('DELETE FROM documents WHERE clientId = ?', [id]);
        await conn.execute('DELETE FROM bookings WHERE clientId = ?', [id]);
        await conn.execute('DELETE FROM payments WHERE clientId = ?', [id]);
    },


    // --- DEMANDES ---
    async getDemandes() {
        const res = await conn.execute("SELECT * FROM demandes WHERE status = 'en_attente' ORDER BY date DESC");
        return res.rows;
    },

    async getInscriptionsNonFinalisees() {
        const unpaid = await conn.execute(
            "SELECT id, clientName, email, company, plan, amount, date FROM demandes WHERE status = 'en_attente_paiement' ORDER BY date DESC"
        );
        const items = unpaid.rows.map(d => ({ ...d, kind: 'paiement' }));
        const known = new Set(items.map(d => (d.email || '').toLowerCase()));
        try {
            await conn.execute(SOUSCRIPTION_LEADS_DDL);
            const leads = await conn.execute(
                `SELECT l.email, l.first_name, l.plan, l.step, l.updated_at, l.reminders_sent, l.unsubscribed_at
                 FROM souscription_leads l
                 WHERE l.completed_at IS NULL
                   AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.email = l.email)
                 ORDER BY l.updated_at DESC LIMIT 100`
            );
            for (const l of leads.rows) {
                if (known.has((l.email || '').toLowerCase())) continue;
                items.push({ ...l, kind: 'formulaire' });
            }
        } catch (err) {
            console.warn('[getInscriptionsNonFinalisees] leads indisponibles:', err.message);
        }
        return items;
    },

    async addDemande(d) {
        const cleanEmail = d.email ? d.email.trim().toLowerCase() : '';
        // Vérifier si une demande en attente (ou attente paiement) existe déjà pour cet email
        const existing = await conn.execute(
            "SELECT id FROM demandes WHERE email = ? AND (status = 'en_attente' OR status = 'en_attente_paiement') LIMIT 1",
            [cleanEmail]
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
            return { id, ...d, email: cleanEmail, city, date, status: 'en_attente_paiement' };
        } else {
            // Créer nouvelle
            const id = 'req_' + Date.now();
            await conn.execute(
                `INSERT INTO demandes (id, clientName, email, company, city, plan, amount, date, status, extra_info) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, d.clientName, cleanEmail, d.company, city, d.plan, d.amount, date, 'en_attente_paiement', extraInfoStr]
            );
            return { id, ...d, email: cleanEmail, city, date, status: 'en_attente_paiement' };
        }
    },

    async confirmDemandePayment(id, sessionId = null, customerId = null) {
        if (!sessionId) {
            await conn.execute("UPDATE demandes SET status = 'en_attente' WHERE id = ?", [id]);
            return;
        }
        const res = await conn.execute('SELECT extra_info FROM demandes WHERE id = ?', [id]);
        const existing = parseExtraInfo(res.rows[0]?.extra_info);
        const merged = {
            ...existing,
            stripe_session_id: sessionId,
            ...(customerId ? { stripe_customer_id: customerId } : {}),
        };
        await conn.execute(
            "UPDATE demandes SET status = 'en_attente', extra_info = ? WHERE id = ?",
            [JSON.stringify(merged), id]
        );
    },

    async getDemandeBySessionId(sessionId) {
        if (!sessionId) return null;
        const res = await conn.execute(
            "SELECT * FROM demandes WHERE JSON_UNQUOTE(JSON_EXTRACT(extra_info, '$.stripe_session_id')) = ?",
            [sessionId]
        );
        return res.rows[0];
    },

    async checkPaymentStatus(email) {
        if (!email) return false;
        const cleanEmail = email.trim().toLowerCase();
        const resDemandes = await conn.execute(
            "SELECT id FROM demandes WHERE email = ? AND status = 'en_attente' LIMIT 1",
            [cleanEmail]
        );
        if (resDemandes.rows.length > 0) return true;

        const resClients = await conn.execute(
            "SELECT id FROM clients WHERE email = ? LIMIT 1",
            [cleanEmail]
        );
        return resClients.rows.length > 0;
    },

    async traiterDemande(id) {
        const res = await conn.execute('SELECT * FROM demandes WHERE id = ?', [id]);
        const d = res.rows[0];
        if (d) {
            // Vérifier si un client avec cet email existe déjà
            const existingClientRes = await conn.execute('SELECT id FROM clients WHERE email = ?', [d.email]);
            let clientId;
            const since = new Date().toISOString().split('T')[0];

            let finalExtraInfo = normalizeSubscriptionExtra(parseExtraInfo(d.extra_info));
            const displayName = [finalExtraInfo.prenom, finalExtraInfo.nom].filter(Boolean).join(' ').trim()
                || String(d.clientName || '').replace(/\s*-?\s*📞.*$/, '').trim();
            const address = resolvePersonalAddress({}, finalExtraInfo).slice(0, 255);
            const phone = String(finalExtraInfo.telephone || '').slice(0, 50);

            // Création manuelle : On ne crée plus automatiquement de client Stripe.

            const extraInfoStr = JSON.stringify(finalExtraInfo);

            if (existingClientRes.rows.length > 0) {
                // Mettre à jour le client existant avec TOUTES les nouvelles infos
                clientId = existingClientRes.rows[0].id;
                await conn.execute(
                    `UPDATE clients SET name = ?, company = ?, city = ?, plan = ?, status = 'actif', renewal = ?, extra_info = ?, clerkId = ?, clerkStatus = 'linked', address = ?, phone = ?
                     WHERE id = ?`,
                    [displayName, d.company, d.city || 'À définir', d.plan, since, extraInfoStr, d.clerkId || '', address, phone, clientId]
                );
            } else {
                // Créer le nouveau client
                clientId = Date.now().toString();
                await conn.execute(
                    `INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info, address, phone) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [clientId, displayName, d.email, d.company, d.city || 'À définir', d.plan, 'actif', since, since, d.clerkId || '', d.clerkId ? 'linked' : 'invitation_sent', extraInfoStr, address, phone]
                );
            }

            let isStripePayment = false;
            if (extraInfoStr && (extraInfoStr.includes('stripe_customer_id') || extraInfoStr.includes('stripe_session_id'))) {
                isStripePayment = true;
            }

            // Créer le paiement initial UNIQUEMENT s'il s'agit d'un ajout manuel
            // Si c'est un client Stripe, la synchronisation récupérera le VRAI paiement (ex: 0€ avec un code promo)
            if (!isStripePayment) {
                await this.addPayment(clientId, {
                    amount: d.amount,
                    status: 'payé',
                    date: since,
                    method: 'Ajout Manuel'
                });
            }

            // Transférer messages, documents, réservations et réexpéditions (même id de demande).
            await conn.execute('UPDATE messages SET clientId = ? WHERE clientId = ?', [clientId, id]);
            await conn.execute('UPDATE documents SET clientId = ? WHERE clientId = ?', [clientId, id]);
            await conn.execute('UPDATE bookings SET clientId = ? WHERE clientId = ?', [clientId, id]);
            await conn.execute('UPDATE reexpeditions SET clientId = ? WHERE clientId = ?', [clientId, id]);

            // Supprimer la demande
            await conn.execute('DELETE FROM demandes WHERE id = ?', [id]);

            // Envoyer l'email d'approbation au client
            let emailSent = false;
            if (d.email) {
                const mailResult = await sendApprovalEmail(d.email, d.clientName);
                emailSent = mailResult?.success !== false;
                try {
                    const docs = await conn.execute('SELECT name FROM documents WHERE clientId = ?', [clientId]);
                    const missing = computeMissingDocuments(['statuts', 'kbis'], { extra: finalExtraInfo, documents: docs.rows || [] });
                    if (missing.length > 0) {
                        await this.startDocumentRequest(
                            { id: clientId, email: d.email, name: displayName, extra_info: finalExtraInfo },
                            missing,
                            { sendNow: false }
                        );
                    }
                } catch (err) {
                    console.error('Demande de documents non envoyée :', err);
                }
            }

            return { ...d, id: clientId, emailSent };
        }
    },

    /**
     * Demande de statuts / Kbis puis relances J+7/30/60/80 par le cron tant que les pièces
     * ne sont pas déposées. Avec sendNow: false, le premier email part au prochain passage
     * quotidien du cron (évite de doubler l'email « Dossier validé »).
     */
    async startDocumentRequest(client, missing, { sendNow = true } = {}) {
        const extra = parseExtraInfo(client.extra_info);
        const isCreation = /creation/i.test(String(extra.typeProjet || ''));
        if (sendNow) {
            await sendDocumentRequestEmail(client.email, client.name, {
                documents: missing,
                isCreation,
                contractSignedAt: extra.contractSignedAt,
            });
        }
        const docRequest = {
            missing,
            is_creation: isCreation,
            requested_at: new Date().toISOString(),
            initial_pending: !sendNow,
            reminders_sent: [],
            completed_at: null,
        };
        const current = await conn.execute('SELECT extra_info FROM clients WHERE id = ?', [client.id]);
        const base = current.rows?.[0] ? parseExtraInfo(current.rows[0].extra_info) : extra;
        await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [
            JSON.stringify({ ...base, doc_request: docRequest }),
            client.id,
        ]);
        return docRequest;
    },

    async stopDocumentRequest(clientId) {
        const res = await conn.execute('SELECT extra_info FROM clients WHERE id = ?', [clientId]);
        const extra = parseExtraInfo(res.rows[0]?.extra_info);
        if (!extra.doc_request) return null;
        const docRequest = { ...extra.doc_request, completed_at: new Date().toISOString() };
        await this.updateClientExtraInfo(clientId, { doc_request: docRequest });
        return docRequest;
    },

    /** Historique des emails envoyés à une adresse (journalisés par l'API). */
    async getEmailLogs(...emails) {
        const addresses = [...new Set(emails.filter(Boolean).map((e) => String(e).trim().toLowerCase()))];
        if (addresses.length === 0) return [];
        try {
            await conn.execute(EMAIL_LOGS_DDL);
            try {
                await conn.execute(EMAIL_LOGS_ADD_CLIENT_COLUMN);
            } catch {
                // colonne déjà présente
            }
            const placeholders = addresses.map(() => '?').join(', ');
            const res = await conn.execute(
                `SELECT * FROM email_logs WHERE to_email IN (${placeholders}) OR client_email IN (${placeholders}) ORDER BY sent_at DESC LIMIT 200`,
                [...addresses, ...addresses]
            );
            return res.rows || [];
        } catch (err) {
            console.error('Historique emails indisponible :', err);
            return [];
        }
    },

    // --- INSCRIPTIONS COMMENCÉES (relances) ---
    async saveSouscriptionLead({ email, token, firstName, plan, step, draft }) {
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail || !token) return;
        await conn.execute(SOUSCRIPTION_LEADS_DDL);
        const now = new Date().toISOString();
        await conn.execute(
            `INSERT INTO souscription_leads (email, token, first_name, plan, step, draft, created_at, updated_at, reminders_sent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), plan = VALUES(plan), step = VALUES(step),
                draft = VALUES(draft), updated_at = VALUES(updated_at)`,
            [cleanEmail, token, firstName || '', plan || 'essentiel', step || 0, JSON.stringify(draft || {}), now, now]
        );
        const res = await conn.execute('SELECT token FROM souscription_leads WHERE email = ?', [cleanEmail]);
        return res.rows[0]?.token || token;
    },

    async getSouscriptionLeadByToken(token) {
        if (!token) return null;
        await conn.execute(SOUSCRIPTION_LEADS_DDL);
        const res = await conn.execute('SELECT * FROM souscription_leads WHERE token = ? LIMIT 1', [token]);
        const lead = res.rows[0];
        if (!lead) return null;
        return { ...lead, draft: parseExtraInfo(lead.draft) };
    },

    async completeSouscriptionLead(email) {
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail) return;
        await conn.execute(SOUSCRIPTION_LEADS_DDL);
        await conn.execute(
            'UPDATE souscription_leads SET completed_at = ? WHERE email = ? AND completed_at IS NULL',
            [new Date().toISOString(), cleanEmail]
        );
    },

    async deleteDemande(id) {
        // Supprimer aussi Clerk si lié
        const res = await conn.execute('SELECT clerkId FROM demandes WHERE id = ?', [id]);
        const clerkId = res.rows[0]?.clerkId;
        if (clerkId && clerkId !== 'user_unknown') {
            try {
                await fetchWithRetry('/api/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clerkId })
                });
            } catch (err) { }
        }
        await conn.execute('DELETE FROM demandes WHERE id = ?', [id]);
        await conn.execute('DELETE FROM messages WHERE clientId = ?', [id]);
    },

    // --- MAIL ---
    async getMail() {
        const res = await conn.execute('SELECT * FROM mail ORDER BY date DESC');
        return res.rows;
    },

    async markMailAsRead(mailId) {
        await conn.execute('UPDATE mail SET status = ? WHERE id = ?', ['lu', mailId]);
    },

    async addClientMail(clientId, data) {
        const id = 'mail_' + Date.now();
        const date = new Date().toISOString().split('T')[0];
        await conn.execute(
            `INSERT INTO mail (id, clientId, company, type, \`from\`, date, status, preview) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, clientId, data.company || '', data.type || 'Lettre simple', data.from || 'Expéditeur inconnu', date, 'non lu', data.preview || '']
        );
        return { id, clientId, company: data.company || '', type: data.type || 'Lettre simple', from: data.from || 'Expéditeur inconnu', date, status: 'non lu', preview: data.preview || '' };
    },

    async deleteMail(id) {
        await conn.execute('DELETE FROM mail WHERE id = ?', [id]);
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
            [
                id, 
                clientId, 
                fileInfo.name || 'document', 
                fileInfo.size || '0 KB', 
                fileInfo.type || '', 
                uploadedAt, 
                fileInfo.owner || 'admin', 
                fileInfo.folder || 'Documents', 
                fileInfo.url || '#'
            ]
        );
        return { id, clientId, uploadedAt, ...fileInfo };
    },

    async getClientFolders(clientId) {
        const docs = await this.getDocuments(clientId);
        return Array.from(new Set(docs.map(d => d.folder || 'Documents')));
    },

    // --- BOOKINGS ---
    async getBookings() {
        const res = await conn.execute(`
            SELECT b.*, c.company as clientName 
            FROM bookings b 
            LEFT JOIN clients c ON b.clientId = c.id 
            ORDER BY b.createdAt DESC
        `);
        return res.rows;
    },

    async getClientBookings(clientId) {
        const res = await conn.execute('SELECT * FROM bookings WHERE clientId = ? ORDER BY `date` DESC', [clientId]);
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

    // --- RÉEXPÉDITIONS PHYSIQUES ---
    async getReexpeditions() {
        try {
            const res = await conn.execute(`
                SELECT r.*, c.company as clientName, c.name as clientContact, c.email as clientEmail, c.plan as clientPlan
                FROM reexpeditions r
                LEFT JOIN clients c ON r.clientId = c.id
                ORDER BY r.createdAt DESC
            `);
            return res.rows;
        } catch (err) {
            console.error('REEXPEDITIONS_FETCH_ERROR:', err);
            return [];
        }
    },

    async getClientReexpeditions(clientId) {
        try {
            const res = await conn.execute(
                'SELECT * FROM reexpeditions WHERE clientId = ? ORDER BY createdAt DESC',
                [clientId]
            );
            return res.rows;
        } catch (err) {
            console.error('REEXPEDITIONS_CLIENT_FETCH_ERROR:', err);
            return [];
        }
    },

    async addReexpeditionRequest(clientId, data) {
        const clientRes = await conn.execute(
            'SELECT id, plan, extra_info FROM clients WHERE id = ?',
            [clientId]
        );
        const client = clientRes.rows[0];
        if (!client) throw new Error('Client introuvable');
        const extra = parseExtraInfo(client.extra_info);
        if (!canRequestPhysicalForward(client.plan, extra)) {
            throw new Error('La réexpédition physique est réservée aux forfaits Scan+ et Physique+.');
        }
        const address = String(data?.address || '').trim();
        if (!address) throw new Error('Adresse de destination requise');
        const notes = String(data?.notes || '').trim();
        const id = 'rexp_' + Date.now();
        const createdAt = new Date().toISOString();
        await conn.execute(
            `INSERT INTO reexpeditions (id, clientId, address, notes, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, clientId, address, notes, 'en_attente', createdAt]
        );
        return { id, clientId, address, notes, status: 'en_attente', createdAt };
    },

    async updateReexpeditionStatus(id, status) {
        await conn.execute('UPDATE reexpeditions SET status = ? WHERE id = ?', [status, id]);
        return { id, status };
    },

    // --- PAYMENTS ---
    async getPayments(clientId) {
        const res = await conn.execute('SELECT * FROM payments WHERE clientId = ? ORDER BY date DESC', [clientId]);
        return res.rows;
    },

    async addPayment(clientId, p) {
        const id = p.id || 'pay_' + Date.now() + Math.random().toString(36).substr(2, 5);
        const amount = p.amount || 0;
        const status = p.status || 'payé';
        const date = p.date || new Date().toISOString().split('T')[0];
        const method = p.method || 'Ajout Manuel';
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

    async syncStripePayments(email, stripeCustomerId = null, sinceDate = null) {
        try {
            const cleanEmail = email ? email.trim().toLowerCase() : '';
            let url = stripeCustomerId
                ? `/api/list-payments?email=${encodeURIComponent(cleanEmail)}&customerId=${encodeURIComponent(stripeCustomerId)}`
                : `/api/list-payments?email=${encodeURIComponent(cleanEmail)}`;
            if (sinceDate) {
                url += `&since=${encodeURIComponent(sinceDate)}`;
            }
            url += `&_t=${Date.now()}`; // Anti-cache
            const res = await fetchWithRetry(url);
            const data = await res.json();
            return {
                payments: data.payments || [],
                // Jamais 'active' par défaut : sinon une réponse incomplète ou une panne réseau
                // repasserait en actif un client réellement en impayé.
                subscriptionStatus: data.subscriptionStatus || 'non_trouvé',
                foundCustomerId: data.foundCustomerId || null
            };
        } catch (err) {
            console.error("Erreur sync Stripe:", err);
            return { payments: [], subscriptionStatus: 'non_trouvé', foundCustomerId: null };
        }
    },

    // Balayage global du compte Stripe : remonte les impayés sans devoir ouvrir chaque dossier.
    async getStripeFailedPayments() {
        try {
            const res = await fetchWithRetry(`/api/stripe-failed-payments?_t=${Date.now()}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.failures || [];
        } catch (err) {
            console.error("Erreur récupération impayés Stripe:", err);
            throw err;
        }
    },

    async cleanupDuplicatePayments() {
        try {
            // Récupérer tous les paiements
            const allPaymentsRes = await conn.execute('SELECT * FROM payments ORDER BY date DESC');
            const allPayments = allPaymentsRes.rows;

            // Grouper par invoice_ref
            const paymentsByRef = new Map();
            for (const payment of allPayments) {
                const ref = payment.invoice_ref;
                if (!paymentsByRef.has(ref)) {
                    paymentsByRef.set(ref, []);
                }
                paymentsByRef.get(ref).push(payment);
            }

            // Identifier les doublons (plus d'un paiement avec le même invoice_ref)
            const duplicates = [];
            for (const [ref, payments] of paymentsByRef) {
                if (payments.length > 1) {
                    // Trier par date (plus récent en premier)
                    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
                    // Garder le premier (plus récent), marquer les autres comme doublons
                    const toKeep = payments[0];
                    const toDelete = payments.slice(1);
                    duplicates.push({ ref, toKeep, toDelete });
                }
            }

            if (duplicates.length === 0) {
                return { success: true, deletedCount: 0, message: 'Aucun doublon trouvé' };
            }

            // Supprimer les doublons
            let deletedCount = 0;
            for (const dup of duplicates) {
                for (const payment of dup.toDelete) {
                    await conn.execute('DELETE FROM payments WHERE id = ?', [payment.id]);
                    deletedCount++;
                }
            }

            return { success: true, deletedCount, message: `${deletedCount} doublons supprimés` };
        } catch (error) {
            console.error('Erreur cleanup doublons:', error);
            return { success: false, error: error.message };
        }
    },

    async createStripePortalSession(customerId) {
        if (!customerId) return null;
        try {
            const res = await fetchWithRetry('/api/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Erreur inconnue de Stripe');
            }
            return data.url;
        } catch (err) {
            console.error("Erreur création session portail Stripe:", err);
            throw err;
        }
    },

    // --- STATS ---
    async getGlobalStats() {
        const [clients, mails, demandes, unreadMsgs, pendingReexp] = await Promise.all([
            conn.execute('SELECT COUNT(*) as total FROM clients WHERE status = ?', ['actif']),
            conn.execute("SELECT COUNT(*) as total FROM mail WHERE status = 'non lu'"),
            conn.execute("SELECT COUNT(*) as total FROM demandes WHERE status = 'en_attente'"),
            conn.execute("SELECT COUNT(*) as total FROM messages WHERE status = 'sent' AND sender = 'client'"),
            conn.execute("SELECT COUNT(*) as total FROM reexpeditions WHERE status = 'en_attente'").catch(() => ({ rows: [{ total: 0 }] })),
        ]);

        let monthlyRevenue = 0;
        let revenueHistory = [];
        let mrr = null;
        let activeSubscriptions = null;
        let revenueChangePct = null;
        let stripeSource = null;
        let stripeLivemode = false;
        
        try {
            const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:5173'
                : '';
                
            const res = await fetch(`${apiBaseUrl}/api/stripe-stats`);
            if (res.ok) {
                const data = await res.json();
                monthlyRevenue = data.monthlyRevenue || 0;
                revenueHistory = data.revenueHistory || [];
                mrr = data.mrr ?? 0;
                activeSubscriptions = data.activeSubscriptions ?? 0;
                revenueChangePct = data.revenueChangePct ?? null;
                stripeSource = data.source || 'stripe';
                stripeLivemode = data.livemode === true;
            } else {
                console.warn("Impossible de récupérer les statistiques Stripe");
            }
        } catch (err) {
            console.error("Erreur lors de l'appel à /api/stripe-stats:", err);
        }

        // --- Fallback au cas où l'API échoue ou retourne un historique vide ---
        if (revenueHistory.length === 0) {
            const now = new Date();
            const monthNamesShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                revenueHistory.push({
                    label: `${monthNamesShort[d.getMonth()]} ${d.getFullYear()}`,
                    revenue: 0
                });
            }
        }

        return {
            activeClients: parseInt(clients.rows[0]?.total || 0),
            pendingDemandes: parseInt(demandes.rows[0]?.total || 0),
            pendingMessages: parseInt(unreadMsgs.rows[0]?.total || 0),
            pendingReexpeditions: parseInt(pendingReexp.rows[0]?.total || 0),
            unreadMail: parseInt(mails.rows[0]?.total || 0),
            monthlyRevenue: monthlyRevenue,
            mrr,
            activeSubscriptions,
            revenueChangePct,
            source: stripeSource,
            livemode: stripeLivemode,
            revenueHistory
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
            try {
                await conn.execute('ALTER TABLE bookings ADD COLUMN city VARCHAR(50) DEFAULT "À définir"');
            } catch (err) { }

            console.log("Bookings table verified.");
        } catch (err) {
            console.error("BOOKINGS_INIT_ERROR:", err);
        }
    },

    async initReexpeditions() {
        try {
            await conn.execute(`
                CREATE TABLE IF NOT EXISTS reexpeditions (
                    id VARCHAR(50) PRIMARY KEY,
                    clientId VARCHAR(50),
                    address TEXT,
                    notes TEXT,
                    status VARCHAR(20),
                    createdAt VARCHAR(30)
                )
            `);
        } catch (err) {
            console.error('REEXPEDITIONS_INIT_ERROR:', err);
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
        await this.initReexpeditions();
    }
};
