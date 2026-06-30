import { connect } from '@planetscale/database';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const conn = connect({ url: process.env.DATABASE_URL });

async function resetDocs() {
    try {
        const email = 'benilias757@gmail.com';
        const res = await conn.execute('SELECT * FROM clients WHERE email = ?', [email]);
        if (res.rows.length === 0) return;
        const client = res.rows[0];
        
        let extra = {};
        if (client.extra_info) {
            extra = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
        }
        
        // Remove ALL procuration-related keys
        delete extra.procurationSigned;
        delete extra.procurationSignedAt;
        delete extra.procurationSignatureUrl;
        delete extra.procurationSignedUrl;
        delete extra.procurationData;
        delete extra.hasSignedProcuration;
        delete extra.procurationPdfUrl;
        delete extra.procurationDocId;
        
        await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify(extra), client.id]);
        
        // Force delete from documents table
        const delRes = await conn.execute('DELETE FROM documents WHERE clientId = ? AND name LIKE "%Procuration%"', [client.id]);
        console.log(`Deleted ${delRes.rowsAffected} procuration documents.`);
        
        console.log("Force Reset OK. New extra_info:", extra);
    } catch (e) {
        console.error(e);
    }
}
resetDocs();
