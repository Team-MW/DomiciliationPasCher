import { connect } from '@planetscale/database';

export default async function handler(req, res) {
  console.log('[API] /api/update-client-extra called, method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId, extraInfo } = req.body || {};

  if (!clientId || !extraInfo) {
    console.warn('[API] Missing parameters', { clientId, extraInfo });
    return res.status(400).json({ error: 'Missing parameters: clientId and extraInfo are required' });
  }

  const dbHost = process.env.VITE_DATABASE_HOST;
  const dbUsername = process.env.VITE_DATABASE_USERNAME;
  const dbPassword = process.env.VITE_DATABASE_PASSWORD;

  if (!dbHost || !dbUsername || !dbPassword) {
    console.error('[API] Configuration DB manquante');
    return res.status(500).json({ error: 'Configuration DB manquante' });
  }

  try {
    const conn = connect({ host: dbHost, username: dbUsername, password: dbPassword });
    
    // Fetch existing extra_info
    const selectRes = await conn.execute('SELECT extra_info FROM clients WHERE id = ?', [clientId]);
    const row = selectRes.rows[0];
    let existing = {};
    if (row && row.extra_info) {
      try {
        existing = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info) : row.extra_info;
      } catch (_) {}
    }
    
    // Les URLs de signature (base64) et de document signé (Cloudinary)
    // DOIVENT être conservées pour permettre le téléchargement et la regénération.
    const cleanExtra = { ...extraInfo };
    const merged = { ...existing, ...cleanExtra };
    const mergedStr = JSON.stringify(merged);
    
    await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [mergedStr, clientId]);
    
    console.log('[API] Update successful for', clientId);
    return res.status(200).json({ success: true, merged });
  } catch (error) {
    console.error('[API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
