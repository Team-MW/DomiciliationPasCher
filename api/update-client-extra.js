import { getDbConn } from './_db.js';
import { requireUser, getOwnership, sendServerError } from './_auth.js';
import { sanitizeClientExtra } from './_client-extra.js';
import { CONTRACT_VERSION, hasSignedContract } from '../shared/contract.js';

/**
 * Enregistrement des preuves de signature (contrat, procuration) dans extra_info.
 * Réservé au titulaire de la fiche (ou à l'admin) ; les clés sensibles sont filtrées.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientId, extraInfo } = req.body || {};
    if (!clientId || !extraInfo || typeof extraInfo !== 'object') {
        return res.status(400).json({ error: 'Missing parameters: clientId and extraInfo are required' });
    }

    const conn = getDbConn();
    if (!conn) {
        console.error('[update-client-extra] Configuration DB manquante');
        return res.status(500).json({ error: 'Configuration DB manquante' });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    try {
        if (!user.isAdmin) {
            const ownership = await getOwnership(conn, user);
            if (!ownership.ids.has(String(clientId))) return res.status(403).json({ error: 'Accès refusé' });
        }

        const selectRes = await conn.execute('SELECT extra_info FROM clients WHERE id = ?', [clientId]);
        const row = selectRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Client introuvable' });
        let existing = {};
        try {
            existing = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info) : (row.extra_info || {});
            if (typeof existing === 'string') existing = JSON.parse(existing);
        } catch {
            existing = {};
        }

        // Les URLs de signature (base64) et de document signé DOIVENT être conservées.
        // Un client ne peut se déclarer signataire qu'après une preuve récente dans signature_logs.
        let allowSignature = false;
        if (!user.isAdmin) {
            const proof = await conn.execute(
                'SELECT id FROM signature_logs WHERE client_id = ? AND signed_at >= (NOW() - INTERVAL 1 HOUR) LIMIT 1',
                [clientId]
            ).catch(() => ({ rows: [] }));
            allowSignature = Boolean(proof.rows?.length);
        }
        const cleanExtra = user.isAdmin ? { ...extraInfo } : sanitizeClientExtra(extraInfo, { allowSignature });
        const merged = { ...existing, ...cleanExtra };
        // Première signature du contrat : on note la version du texte signé (sert à le regénérer à l'identique).
        if (!hasSignedContract(existing) && hasSignedContract(merged) && !existing.contract_version) {
            merged.contract_version = CONTRACT_VERSION;
        }
        await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify(merged), clientId]);
        return res.status(200).json({ success: true, merged });
    } catch (error) {
        return sendServerError(res, error, 'update-client-extra');
    }
}
