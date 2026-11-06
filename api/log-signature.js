import { getDbConn } from './_db.js';
import { requireUser, getOwnership, sendServerError } from './_auth.js';

/**
 * Journal probant de signature électronique (horodatage + IP).
 * Le signataire est l'utilisateur connecté : on ne peut plus écrire une preuve au nom d'un tiers.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientId, contractRef, signeeName } = req.body || {};
    if (!clientId || !contractRef || !signeeName) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    const conn = getDbConn();
    if (!conn) {
        return res.status(500).json({ error: 'Configuration DB manquante' });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    try {
        if (!user.isAdmin) {
            const ownership = await getOwnership(conn, user);
            if (!ownership.ids.has(String(clientId))) return res.status(403).json({ error: 'Accès refusé' });
        }

        // Nom réel de la fiche plutôt que le libellé générique « Client » envoyé par le front.
        let name = String(signeeName).slice(0, 200);
        if (!name || name === 'Client') {
            const rec = await conn.execute('SELECT name FROM clients WHERE id = ?', [clientId]);
            name = rec.rows?.[0]?.name || name;
        }
        const signeeEmail = user.isAdmin ? String(req.body.signeeEmail || user.email) : user.email;

        // Sur Vercel, l'IP réelle est la première valeur de x-forwarded-for.
        let ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'IP Inconnue';
        if (ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0].trim();

        const result = await conn.execute(
            `INSERT INTO signature_logs (client_id, contract_ref, signee_name, signee_email, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [clientId, String(contractRef).slice(0, 100), name, signeeEmail, ipAddress]
        );

        const selectResult = await conn.execute('SELECT signed_at FROM signature_logs WHERE id = ?', [result.insertId]);
        const signedAt = selectResult.rows?.[0]?.signed_at || new Date().toISOString();

        return res.status(200).json({ success: true, logId: result.insertId, ipAddress, signedAt });
    } catch (error) {
        return sendServerError(res, error, 'log-signature');
    }
}
