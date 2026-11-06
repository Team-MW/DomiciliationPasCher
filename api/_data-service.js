import { PLAN_CATALOG, resolvePlanId, canRequestPhysicalForward, PRICING_GRID } from '../shared/plans.js';
import { computeMissingDocuments } from '../shared/documentRequest.js';
import { EMAIL_LOGS_DDL, EMAIL_LOGS_MIGRATIONS, SOUSCRIPTION_LEADS_DDL } from '../shared/emailTables.js';
import { parseExtraInfo, normalizeSubscriptionExtra, resolvePersonalAddress } from '../src/utils/contractLegalFields.js';

/**
 * COUCHE DONNÉES — SERVEUR UNIQUEMENT.
 *
 * Auparavant ce code tournait dans le navigateur avec les identifiants PlanetScale inclus
 * dans le bundle : n'importe quel visiteur pouvait lire ou modifier toute la base.
 * Il est maintenant exécuté par api/data.js, après authentification et contrôle d'accès.
 *
 * @param {object} deps
 * @param {{ execute: Function }} deps.conn - connexion PlanetScale
 * @param {(body: object) => Promise<any>} [deps.sendEmail] - envoi d'email (deliverEmail)
 * @param {(clerkId: string) => Promise<any>} [deps.deleteClerkUser]
 * @param {(email: string) => Promise<string[]>} [deps.findClerkUserIdsByEmail] - comptes de connexion d'un email
 * @param {(email: string) => boolean} [deps.isProtectedEmail] - emails dont le compte ne doit jamais être supprimé (admins)
 */
export function createDataService({
    conn,
    sendEmail = async () => {},
    deleteClerkUser = async () => {},
    findClerkUserIdsByEmail = async () => [],
    isProtectedEmail = () => false,
}) {
    if (!conn) throw new Error('Connexion base de données indisponible');

    /** Identifiant unique : un Date.now() seul se répète quand deux écritures tombent dans la même milliseconde. */
    const newId = (prefix = '') => `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

    const service = {
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
            const finalExtraInfo = parseExtraInfo(clientData.extra_info);
            const cleanEmail = clientData.email ? clientData.email.trim().toLowerCase() : '';

            // Les clients historiques ont un id numérique (horodatage) : on garde ce format.
            const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
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
            if (!finalExtraInfo.grille_tarifaire) finalExtraInfo.grille_tarifaire = PRICING_GRID;
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

        /** Adresse personnelle uniquement (voir updateClientProfile pour le profil complet, admin). */
        async updateClientAddress(id, address) {
            const value = String(address || '').slice(0, 255);
            const clientRes = await conn.execute('SELECT id FROM clients WHERE id = ?', [id]);
            if (clientRes.rows[0]) {
                await conn.execute('UPDATE clients SET address = ? WHERE id = ?', [value, id]);
                return { id, address: value };
            }
            const demRes = await conn.execute('SELECT extra_info FROM demandes WHERE id = ?', [id]);
            if (demRes.rows[0]) {
                const existing = parseExtraInfo(demRes.rows[0].extra_info);
                const merged = { ...existing, adressePerso: value };
                await conn.execute('UPDATE demandes SET extra_info = ? WHERE id = ?', [JSON.stringify(merged), id]);
            }
            return { id, address: value };
        },

        async updateClientStatus(id, newStatus) {
            await conn.execute('UPDATE clients SET status = ? WHERE id = ?', [newStatus, id]);
            return { id, status: newStatus };
        },

        /** Fusionne des champs dans extra_info (clients, sinon demandes). */
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

        /**
         * Suppression DÉFINITIVE d'un client : fiche, données rattachées à son id, et toutes les
         * traces de son email (demande d'inscription, prospect et relances, journal des emails,
         * preuves de signature) + ses comptes de connexion Clerk.
         * Les comptes des administrateurs ne sont jamais supprimés (dossier de test à leur email).
         * Les fichiers déjà envoyés sur Cloudinary ne sont pas concernés.
         */
        async deleteClient(id) {
            const client = await service.getClientById(id);
            const email = String(client?.email || '').trim().toLowerCase();
            const protectedAccount = Boolean(email) && isProtectedEmail(email);
            const report = { clientId: id, email: email || null, clerkAccountsDeleted: 0, clerkSkipped: protectedAccount };

            // 1. Comptes de connexion : celui lié à la fiche + ceux créés avec le même email.
            if (!protectedAccount) {
                const clerkIds = new Set();
                if (client?.clerkId && client.clerkId !== 'user_unknown') clerkIds.add(client.clerkId);
                if (email) {
                    try {
                        for (const clerkId of await findClerkUserIdsByEmail(email)) clerkIds.add(clerkId);
                    } catch (err) {
                        console.warn('Recherche des comptes Clerk impossible:', err?.message || err);
                    }
                }
                for (const clerkId of clerkIds) {
                    try {
                        await deleteClerkUser(clerkId);
                        report.clerkAccountsDeleted += 1;
                    } catch (err) {
                        console.warn('Suppression du compte Clerk impossible:', err?.message || err);
                    }
                }
            }

            // 2. Données rattachées à l'identifiant du client.
            await conn.execute('DELETE FROM clients WHERE id = ?', [id]);
            await conn.execute('DELETE FROM messages WHERE clientId = ?', [id]);
            await conn.execute('DELETE FROM documents WHERE clientId = ?', [id]);
            await conn.execute('DELETE FROM bookings WHERE clientId = ?', [id]);
            await conn.execute('DELETE FROM payments WHERE clientId = ?', [id]);
            await conn.execute('DELETE FROM mail WHERE clientId = ?', [id]).catch(() => {});
            await conn.execute('DELETE FROM reexpeditions WHERE clientId = ?', [id]).catch(() => {});
            await conn.execute('DELETE FROM signature_logs WHERE client_id = ?', [id]).catch(() => {});

            // 3. Traces de son email dans les autres tables (tables optionnelles : erreurs ignorées).
            if (email) {
                const demandes = await conn.execute('SELECT id FROM demandes WHERE LOWER(email) = ?', [email]).catch(() => ({ rows: [] }));
                for (const row of demandes.rows || []) {
                    await conn.execute('DELETE FROM messages WHERE clientId = ?', [row.id]).catch(() => {});
                }
                await conn.execute('DELETE FROM demandes WHERE LOWER(email) = ?', [email]).catch(() => {});
                await conn.execute('DELETE FROM souscription_leads WHERE LOWER(email) = ?', [email]).catch(() => {});
                await conn.execute('DELETE FROM email_logs WHERE LOWER(client_email) = ? OR LOWER(to_email) = ?', [email, email]).catch(() => {});
                await conn.execute('DELETE FROM signature_logs WHERE LOWER(signee_email) = ?', [email]).catch(() => {});
            }
            return report;
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
            // On ne réutilise qu'une demande encore impayée : une demande déjà payée
            // ('en_attente') ne doit pas pouvoir être écrasée par un nouveau formulaire.
            const existing = await conn.execute(
                "SELECT id FROM demandes WHERE email = ? AND status = 'en_attente_paiement' LIMIT 1",
                [cleanEmail]
            );

            const date = new Date().toISOString();
            const city = d.city || 'À définir';
            const extraInfoStr = d.extra_info ? (typeof d.extra_info === 'string' ? d.extra_info : JSON.stringify(d.extra_info)) : null;

            if (existing.rows.length > 0) {
                const id = existing.rows[0].id;
                await conn.execute(
                    `UPDATE demandes SET clientName = ?, company = ?, city = ?, plan = ?, amount = ?, date = ?, extra_info = ?, status = 'en_attente_paiement'
                     WHERE id = ?`,
                    [d.clientName, d.company, city, d.plan, d.amount, date, extraInfoStr, id]
                );
                return { id, ...d, email: cleanEmail, city, date, status: 'en_attente_paiement' };
            }
            const id = newId('req_');
            await conn.execute(
                `INSERT INTO demandes (id, clientName, email, company, city, plan, amount, date, status, extra_info)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, d.clientName, cleanEmail, d.company, city, d.plan, d.amount, date, 'en_attente_paiement', extraInfoStr]
            );
            return { id, ...d, email: cleanEmail, city, date, status: 'en_attente_paiement' };
        },

        /**
         * Passe la demande en « payée » (en_attente de validation admin).
         * Renvoie true seulement si elle était encore en attente de paiement (premier passage),
         * pour que l'email de bienvenue ne parte qu'une fois.
         */
        async confirmDemandePayment(id, sessionId = null, customerId = null) {
            const res = await conn.execute('SELECT status, extra_info FROM demandes WHERE id = ?', [id]);
            const row = res.rows[0];
            if (!row || row.status !== 'en_attente_paiement') return false;
            const existing = parseExtraInfo(row.extra_info);
            const merged = {
                ...existing,
                // Payée via Checkout = prix de la grille actuelle (même pour une demande ancienne).
                grille_tarifaire: PRICING_GRID,
                ...(sessionId ? { stripe_session_id: sessionId } : {}),
                ...(customerId ? { stripe_customer_id: customerId } : {}),
            };
            // Mise à jour conditionnelle : si le webhook et le retour navigateur arrivent en même
            // temps, un seul des deux passe (et un seul email de bienvenue part).
            const upd = await conn.execute(
                "UPDATE demandes SET status = 'en_attente', extra_info = ? WHERE id = ? AND status = 'en_attente_paiement'",
                [JSON.stringify(merged), id]
            );
            return typeof upd?.rowsAffected === 'number' ? upd.rowsAffected > 0 : true;
        },

        async getDemandeById(id) {
            const res = await conn.execute('SELECT * FROM demandes WHERE id = ?', [id]);
            return res.rows[0];
        },

        async getDemandeBySessionId(sessionId) {
            if (!sessionId) return null;
            const res = await conn.execute(
                "SELECT * FROM demandes WHERE JSON_UNQUOTE(JSON_EXTRACT(extra_info, '$.stripe_session_id')) = ?",
                [sessionId]
            );
            return res.rows[0];
        },

        /** Version publique : indique seulement si une demande payée attend la validation. */
        async hasPendingDemandeForSession(sessionId) {
            const d = await service.getDemandeBySessionId(sessionId);
            return Boolean(d);
        },

        async checkPaymentStatus(email) {
            if (!email) return false;
            const cleanEmail = email.trim().toLowerCase();
            const resDemandes = await conn.execute(
                "SELECT id FROM demandes WHERE email = ? AND status = 'en_attente' LIMIT 1",
                [cleanEmail]
            );
            if (resDemandes.rows.length > 0) return true;
            const resClients = await conn.execute('SELECT id FROM clients WHERE email = ? LIMIT 1', [cleanEmail]);
            return resClients.rows.length > 0;
        },

        async traiterDemande(id) {
            const res = await conn.execute('SELECT * FROM demandes WHERE id = ?', [id]);
            const d = res.rows[0];
            if (!d) return undefined;

            const existingClientRes = await conn.execute('SELECT id FROM clients WHERE email = ?', [d.email]);
            let clientId;
            const since = new Date().toISOString().split('T')[0];

            const finalExtraInfo = normalizeSubscriptionExtra(parseExtraInfo(d.extra_info));
            const displayName = [finalExtraInfo.prenom, finalExtraInfo.nom].filter(Boolean).join(' ').trim()
                || String(d.clientName || '').replace(/\s*-?\s*📞.*$/, '').trim();
            const address = resolvePersonalAddress({}, finalExtraInfo).slice(0, 255);
            const phone = String(finalExtraInfo.telephone || '').slice(0, 50);
            const extraInfoStr = JSON.stringify(finalExtraInfo);

            if (existingClientRes.rows.length > 0) {
                clientId = existingClientRes.rows[0].id;
                await conn.execute(
                    `UPDATE clients SET name = ?, company = ?, city = ?, plan = ?, status = 'actif', renewal = ?, extra_info = ?, clerkId = ?, clerkStatus = 'linked', address = ?, phone = ?
                     WHERE id = ?`,
                    [displayName, d.company, d.city || 'À définir', d.plan, since, extraInfoStr, d.clerkId || '', address, phone, clientId]
                );
            } else {
                clientId = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
                await conn.execute(
                    `INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info, address, phone)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [clientId, displayName, d.email, d.company, d.city || 'À définir', d.plan, 'actif', since, since, d.clerkId || '', d.clerkId ? 'linked' : 'invitation_sent', extraInfoStr, address, phone]
                );
            }

            const isStripePayment = extraInfoStr.includes('stripe_customer_id') || extraInfoStr.includes('stripe_session_id');
            // Paiement initial local uniquement pour un ajout manuel : pour un client Stripe,
            // la synchronisation remonte le vrai paiement (0 € avec un code promo, par exemple).
            if (!isStripePayment) {
                await service.addPayment(clientId, {
                    amount: d.amount,
                    status: 'payé',
                    date: since,
                    method: 'Ajout Manuel'
                });
            }

            await conn.execute('UPDATE messages SET clientId = ? WHERE clientId = ?', [clientId, id]);
            await conn.execute('UPDATE documents SET clientId = ? WHERE clientId = ?', [clientId, id]);
            await conn.execute('UPDATE bookings SET clientId = ? WHERE clientId = ?', [clientId, id]);
            await conn.execute('UPDATE reexpeditions SET clientId = ? WHERE clientId = ?', [clientId, id]);
            await conn.execute('DELETE FROM demandes WHERE id = ?', [id]);

            let emailSent = false;
            if (d.email) {
                try {
                    await sendEmail({ email: d.email, nom: d.clientName || 'Client', type: 'approval' });
                    emailSent = true;
                } catch (err) {
                    console.error('Email de validation non envoyé :', err);
                }
                try {
                    const docs = await conn.execute('SELECT name FROM documents WHERE clientId = ?', [clientId]);
                    const missing = computeMissingDocuments(['statuts', 'kbis'], { extra: finalExtraInfo, documents: docs.rows || [] });
                    if (missing.length > 0) {
                        await service.startDocumentRequest(
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
        },

        /**
         * Demande de statuts / Kbis puis relances par le cron tant que les pièces manquent.
         * Avec sendNow: false, le premier email part au prochain passage quotidien du cron.
         */
        async startDocumentRequest(client, missing, { sendNow = true } = {}) {
            const extra = parseExtraInfo(client.extra_info);
            const isCreation = /creation/i.test(String(extra.typeProjet || ''));
            if (sendNow) {
                await sendEmail({
                    email: client.email,
                    nom: client.name || 'Client',
                    type: 'request_documents',
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
            await service.updateClientExtraInfo(clientId, { doc_request: docRequest });
            return docRequest;
        },

        async getEmailLogs(...emails) {
            const addresses = [...new Set(emails.filter(Boolean).map((e) => String(e).trim().toLowerCase()))];
            if (addresses.length === 0) return [];
            try {
                await conn.execute(EMAIL_LOGS_DDL);
                for (const sql of EMAIL_LOGS_MIGRATIONS) {
                    try {
                        await conn.execute(sql);
                    } catch {
                        // colonne déjà présente
                    }
                }
                const placeholders = addresses.map(() => '?').join(', ');
                const res = await conn.execute(
                    `SELECT * FROM email_logs WHERE to_email IN (${placeholders}) OR client_email IN (${placeholders}) ORDER BY sent_at DESC LIMIT 300`,
                    [...addresses, ...addresses]
                );
                return res.rows || [];
            } catch (err) {
                console.error('Historique emails indisponible :', err);
                return [];
            }
        },

        // --- INSCRIPTIONS COMMENCÉES (relances) ---
        /**
         * Enregistre le brouillon. Ne renvoie plus le jeton déjà stocké pour cet email :
         * il permettait à quiconque tapait l'email d'un tiers de relire son brouillon.
         */
        async saveSouscriptionLead({ email, token, firstName, plan, step, draft }) {
            const cleanEmail = String(email || '').trim().toLowerCase();
            if (!cleanEmail || !token) return;
            await conn.execute(SOUSCRIPTION_LEADS_DDL);
            const now = new Date().toISOString();
            const existing = await conn.execute('SELECT token FROM souscription_leads WHERE email = ?', [cleanEmail]);
            const storedToken = existing.rows[0]?.token;
            if (storedToken && storedToken !== token) {
                // Brouillon d'un autre navigateur (ou d'un tiers) : on ne l'écrase pas.
                return token;
            }
            await conn.execute(
                `INSERT INTO souscription_leads (email, token, first_name, plan, step, draft, created_at, updated_at, reminders_sent)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                 ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), plan = VALUES(plan), step = VALUES(step),
                    draft = VALUES(draft), updated_at = VALUES(updated_at)`,
                [cleanEmail, token, firstName || '', plan || 'essentiel', step || 0, JSON.stringify(draft || {}), now, now]
            );
            return token;
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
            const res = await conn.execute('SELECT clerkId FROM demandes WHERE id = ?', [id]);
            const clerkId = res.rows[0]?.clerkId;
            if (clerkId && clerkId !== 'user_unknown') {
                try {
                    await deleteClerkUser(clerkId);
                } catch (err) {
                    console.warn('Suppression du compte Clerk impossible:', err?.message || err);
                }
            }
            await conn.execute('DELETE FROM demandes WHERE id = ?', [id]);
            await conn.execute('DELETE FROM messages WHERE clientId = ?', [id]);
        },

        // --- MAIL ---
        async getMail() {
            const res = await conn.execute('SELECT * FROM mail ORDER BY date DESC');
            return res.rows;
        },

        async markMailAsRead(id) {
            await conn.execute("UPDATE mail SET status = 'lu' WHERE id = ?", [id]);
        },

        async addClientMail(clientId, data) {
            const id = newId('mail_');
            const date = new Date().toISOString().split('T')[0];
            const row = {
                id,
                clientId,
                company: data.company || '',
                type: data.type || 'Lettre simple',
                from: data.from || 'Expéditeur inconnu',
                date,
                status: 'non lu',
                preview: data.preview || '',
            };
            await conn.execute(
                `INSERT INTO mail (id, clientId, company, type, \`from\`, date, status, preview)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [row.id, row.clientId, row.company, row.type, row.from, row.date, row.status, row.preview]
            );
            return row;
        },

        async deleteMail(id) {
            await conn.execute('DELETE FROM mail WHERE id = ?', [id]);
        },

        async getMailById(id) {
            const res = await conn.execute('SELECT * FROM mail WHERE id = ?', [id]);
            return res.rows[0];
        },

        async getClientMail(clientId) {
            const res = await conn.execute('SELECT * FROM mail WHERE clientId = ? ORDER BY date DESC', [clientId]);
            return res.rows;
        },

        // --- DOCUMENTS ---
        async getDocuments(clientId) {
            const res = await conn.execute('SELECT * FROM documents WHERE clientId = ? ORDER BY uploadedAt DESC', [clientId]);
            return res.rows;
        },

        async getDocumentById(id) {
            const res = await conn.execute('SELECT * FROM documents WHERE id = ?', [id]);
            return res.rows[0];
        },

        async deleteDocument(id) {
            await conn.execute('DELETE FROM documents WHERE id = ?', [id]);
        },

        async addDocument(clientId, fileInfo) {
            const id = newId('doc_');
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
            const docs = await service.getDocuments(clientId);
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

        /**
         * Enregistre une réservation. Avec `sessionId`, l'id est dérivé de la session Stripe :
         * rejouer l'URL de retour (autre navigateur, onglet privé) ne crée pas de doublon.
         */
        async addBookingRequest(clientId, b, { sessionId = null } = {}) {
            const id = sessionId ? `book_${sessionId}`.slice(0, 50) : newId('book_');
            if (sessionId) {
                const already = await conn.execute('SELECT * FROM bookings WHERE id = ?', [id]);
                if (already.rows[0]) return already.rows[0];
            }
            const createdAt = new Date().toISOString();
            const city = b.city || 'À définir';
            // INSERT IGNORE : deux confirmations simultanées de la même session ne lèvent pas d'erreur.
            await conn.execute(
                `INSERT ${sessionId ? 'IGNORE ' : ''}INTO bookings (\`id\`, \`clientId\`, \`city\`, \`type\`, \`date\`, \`duration\`, \`status\`, \`createdAt\`)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, clientId, city, b.type, b.date, b.duration, 'en_attente', createdAt]
            );
            return { id, clientId, city, type: b.type, date: b.date, duration: b.duration, status: 'en_attente', createdAt };
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
                throw new Error('La réexpédition physique n’est pas incluse dans votre contrat actuel (réservée aux forfaits Scan+ et Physique+ de l’ancienne grille).');
            }
            const address = String(data?.address || '').trim();
            if (!address) throw new Error('Adresse de destination requise');
            const notes = String(data?.notes || '').trim();
            const id = newId('rexp_');
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
            const id = p.id || newId('pay_');
            const amount = Number.isFinite(Number(p.amount)) ? Number(p.amount) : 0;
            const status = p.status || 'payé';
            const date = p.date || new Date().toISOString().split('T')[0];
            const method = p.method || 'Ajout Manuel';
            // Avant : FAC-AAAAMM-<4 premiers chiffres de l'id>, identique pour tous les clients
            // créés à la même période (ids = horodatages) → références en collision entre clients.
            const invoice_ref = p.invoice_ref
                || `FAC-${date.replace(/-/g, '').substring(0, 6)}-${String(clientId).slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

            await conn.execute(
                `INSERT INTO payments (id, clientId, amount, status, method, date, invoice_ref)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, clientId, amount, status, method, date, invoice_ref]
            );
            return { id, clientId, amount, status, method, date, invoice_ref };
        },

        async getPaymentById(id) {
            const res = await conn.execute('SELECT * FROM payments WHERE id = ?', [id]);
            return res.rows[0];
        },

        async updatePaymentStatus(paymentId, status) {
            await conn.execute('UPDATE payments SET status = ? WHERE id = ?', [status, paymentId]);
        },

        async deletePayment(paymentId) {
            await conn.execute('DELETE FROM payments WHERE id = ?', [paymentId]);
        },

        // --- STATS (partie base de données ; la partie Stripe vient de /api/stripe-stats) ---
        async getGlobalStats() {
            const [clients, mails, demandes, unreadMsgs, pendingReexp] = await Promise.all([
                conn.execute('SELECT COUNT(*) as total FROM clients WHERE status = ?', ['actif']),
                conn.execute("SELECT COUNT(*) as total FROM mail WHERE status = 'non lu'"),
                conn.execute("SELECT COUNT(*) as total FROM demandes WHERE status = 'en_attente'"),
                conn.execute("SELECT COUNT(*) as total FROM messages WHERE status = 'sent' AND sender = 'client'"),
                conn.execute("SELECT COUNT(*) as total FROM reexpeditions WHERE status = 'en_attente'").catch(() => ({ rows: [{ total: 0 }] })),
            ]);
            return {
                activeClients: parseInt(clients.rows[0]?.total || 0, 10),
                pendingDemandes: parseInt(demandes.rows[0]?.total || 0, 10),
                pendingMessages: parseInt(unreadMsgs.rows[0]?.total || 0, 10),
                pendingReexpeditions: parseInt(pendingReexp.rows[0]?.total || 0, 10),
                unreadMail: parseInt(mails.rows[0]?.total || 0, 10),
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
                console.error('MESSAGES_FETCH_ERROR:', err);
                return [];
            }
        },

        async addMessage(clientId, msg) {
            const id = newId('msg_');
            const createdAt = new Date().toISOString();
            const sender = msg.sender === 'client' ? 'client' : 'admin';
            const content = String(msg.content ?? '');
            await conn.execute(
                `INSERT INTO messages (id, clientId, content, sender, createdAt, status)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id, clientId, content, sender, createdAt, 'sent']
            );
            return { id, clientId, createdAt, content, sender, status: 'sent' };
        },

        async markMessagesAsRead(clientId, readerRole) {
            // L'admin marque comme lus les messages du client, et inversement.
            const senderToMark = readerRole === 'admin' ? 'client' : 'admin';
            try {
                await conn.execute(
                    "UPDATE messages SET status = 'read' WHERE clientId = ? AND sender = ? AND status = 'sent'",
                    [clientId, senderToMark]
                );
            } catch (err) {
                console.error('MARK_READ_ERROR:', err);
            }
        },

        // --- SCHÉMA ---
        async init() {
            const statements = [
                `CREATE TABLE IF NOT EXISTS messages (
                    id VARCHAR(50) PRIMARY KEY, clientId VARCHAR(50), content TEXT,
                    sender VARCHAR(20), createdAt VARCHAR(30), status VARCHAR(20))`,
                'ALTER TABLE clients ADD COLUMN address VARCHAR(255) DEFAULT ""',
                'ALTER TABLE clients ADD COLUMN phone VARCHAR(50) DEFAULT ""',
                'ALTER TABLE clients ADD COLUMN extra_info TEXT',
                'ALTER TABLE demandes ADD COLUMN extra_info TEXT',
                'ALTER TABLE demandes ADD COLUMN city VARCHAR(100) DEFAULT "À définir"',
                'ALTER TABLE demandes ADD COLUMN clerkId VARCHAR(100) DEFAULT ""',
                `CREATE TABLE IF NOT EXISTS bookings (
                    \`id\` VARCHAR(50) PRIMARY KEY, \`clientId\` VARCHAR(50), \`city\` VARCHAR(50),
                    \`type\` VARCHAR(50), \`date\` VARCHAR(30), \`duration\` VARCHAR(30),
                    \`status\` VARCHAR(20), \`createdAt\` VARCHAR(30))`,
                'ALTER TABLE bookings ADD COLUMN city VARCHAR(50) DEFAULT "À définir"',
                `CREATE TABLE IF NOT EXISTS payments (
                    id VARCHAR(50) PRIMARY KEY, clientId VARCHAR(50), amount DECIMAL(10, 2),
                    status VARCHAR(20), method VARCHAR(50), date VARCHAR(30), invoice_ref VARCHAR(50))`,
                `CREATE TABLE IF NOT EXISTS reexpeditions (
                    id VARCHAR(50) PRIMARY KEY, clientId VARCHAR(50), address TEXT, notes TEXT,
                    status VARCHAR(20), createdAt VARCHAR(30))`,
            ];
            for (const sql of statements) {
                try {
                    await conn.execute(sql);
                } catch {
                    // colonne / table déjà présente
                }
            }
        },
    };

    return service;
}
