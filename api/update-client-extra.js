import { getDbConn } from './_db.js';
import { requireUser, getOwnership, sendServerError } from './_auth.js';
import { sanitizeClientExtra, dropPlaceholders } from './_client-extra.js';
import { CONTRACT_VERSION, hasSignedContract } from '../shared/contract.js';

/** Les deux documents signables : clé de preuve (signature_logs.contract_ref) et clés d'extra_info concernées. */
const SIGNED_KINDS = {
    contract: { ref: 'contrat_domiciliation', keys: /^contract(Signed|SignedAt|SignedUrl|SignatureUrl)$/, flag: 'contractSigned', signedAt: 'contractSignedAt' },
    procuration: { ref: 'procuration_postale', keys: /^procuration(Signed|SignedAt|SignedUrl|SignatureUrl|Data)$/, flag: 'procurationSigned', signedAt: 'procurationSignedAt' },
};

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
            existing = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info || '{}') : (row.extra_info || {});
            if (typeof existing === 'string') existing = JSON.parse(existing);
            if (!existing || typeof existing !== 'object') existing = {};
        } catch {
            // Fiche illisible : écrire maintenant effacerait stripe_customer_id, signatures, grille tarifaire…
            console.error('[update-client-extra] extra_info illisible pour le client', clientId);
            return res.status(500).json({ error: 'Fiche client illisible : modification refusée pour ne rien perdre. Contactez l’administrateur.' });
        }

        // Les URLs de signature (base64) et de document signé DOIVENT être conservées.
        // Un client ne peut se déclarer signataire qu'après une preuve récente dans signature_logs.
        // Une signature n'est acceptée QUE si une preuve récente existe pour CE document (contrat ≠ procuration),
        // jamais pour écraser une signature déjà enregistrée ; et sa date est posée ici, pas par le navigateur.
        const allowedKinds = [];
        if (!user.isAdmin) {
            for (const kind of Object.keys(SIGNED_KINDS)) {
                const wanted = Object.keys(extraInfo || {}).some((key) => SIGNED_KINDS[kind].keys.test(key));
                if (!wanted || existing[SIGNED_KINDS[kind].flag]) continue;
                const proof = await conn.execute(
                    'SELECT id FROM signature_logs WHERE client_id = ? AND contract_ref = ? AND signed_at >= (NOW() - INTERVAL 1 HOUR) LIMIT 1',
                    [clientId, SIGNED_KINDS[kind].ref]
                ).catch(() => ({ rows: [] }));
                if (proof.rows?.length) allowedKinds.push(kind);
            }
        }
        let cleanExtra;
        if (user.isAdmin) {
            cleanExtra = dropPlaceholders(extraInfo);
        } else {
            cleanExtra = sanitizeClientExtra(extraInfo, { allowSignature: allowedKinds.length > 0 });
            for (const [kind, def] of Object.entries(SIGNED_KINDS)) {
                if (!allowedKinds.includes(kind)) {
                    for (const key of Object.keys(cleanExtra)) if (def.keys.test(key)) delete cleanExtra[key];
                } else {
                    cleanExtra[def.signedAt] = new Date().toISOString();
                }
            }
        }
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
