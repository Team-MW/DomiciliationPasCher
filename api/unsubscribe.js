import { getDbConn } from './_db.js';
import { getBaseUrl, escapeHtml, wrapEmail, emailButton } from './_email-kit.js';
import { SOUSCRIPTION_LEADS_DDL } from '../shared/emailTables.js';

/** Désinscription des relances d'inscription (lien en pied d'email + List-Unsubscribe one-click). */
export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    const baseUrl = getBaseUrl(req);
    const token = String(req.query?.token || '');
    let title = 'Désinscription confirmée';
    let body = 'Vous ne recevrez plus de rappels concernant votre inscription.';
    let status = 200;

    try {
        if (!/^[a-f0-9]{32,64}$/i.test(token)) throw new Error('invalid token');
        const conn = getDbConn();
        if (!conn) throw new Error('db');
        await conn.execute(SOUSCRIPTION_LEADS_DDL);
        await conn.execute(
            'UPDATE souscription_leads SET unsubscribed_at = ? WHERE token = ? AND unsubscribed_at IS NULL',
            [new Date().toISOString(), token],
        );
    } catch (err) {
        console.error('Unsubscribe error:', err.message);
        status = 400;
        title = 'Lien invalide';
        body = 'Ce lien de désinscription est invalide. Écrivez-nous à contact@domiciliation-pas-cher.com.';
    }

    if (req.method === 'POST') return res.status(status).json({ success: status === 200 });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(wrapEmail(`
        <h2 style="margin-top:0;">${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
        ${emailButton(`${baseUrl}/`, 'Retour au site', '#0f172a')}`));
}
