import { connect } from '@planetscale/database';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientId, contractRef, signeeName, signeeEmail } = req.body || {};

    if (!clientId || !contractRef || !signeeName || !signeeEmail) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    const dbHost = process.env.VITE_DATABASE_HOST;
    const dbUsername = process.env.VITE_DATABASE_USERNAME;
    const dbPassword = process.env.VITE_DATABASE_PASSWORD;

    if (!dbHost || !dbUsername || !dbPassword) {
        return res.status(500).json({ error: 'Configuration DB manquante' });
    }

    try {
        const conn = connect({ host: dbHost, username: dbUsername, password: dbPassword });
        
        // Capture IP address
        // On Vercel, the real IP is in x-forwarded-for
        let ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'IP Inconnue';
        if (ipAddress.includes(',')) {
            ipAddress = ipAddress.split(',')[0].trim();
        }

        const sql = `
            INSERT INTO signature_logs 
            (client_id, contract_ref, signee_name, signee_email, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await conn.execute(sql, [clientId, contractRef, signeeName, signeeEmail, ipAddress]);
        
        // Also retrieve the exact timestamp recorded in the DB
        const selectSql = `SELECT signed_at FROM signature_logs WHERE id = ?`;
        const selectResult = await conn.execute(selectSql, [result.insertId]);
        let signedAt = new Date().toISOString();
        if (selectResult.rows && selectResult.rows.length > 0) {
            signedAt = selectResult.rows[0].signed_at;
        }

        return res.status(200).json({ 
            success: true, 
            logId: result.insertId,
            ipAddress,
            signedAt 
        });

    } catch (error) {
        console.error('[API log-signature] Error:', error);
        return res.status(500).json({ error: error.message || 'Internal error' });
    }
}
