import { connect } from '@planetscale/database';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    url: process.env.DATABASE_URL
};

async function resetSignature() {
    const conn = connect(config);
    const res = await conn.execute("SELECT id, name, extra_info FROM clients");
    
    for (const row of res.rows) {
        let extra = {};
        try {
            extra = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info) : row.extra_info;
        } catch(e) {}
        
        if (extra && extra.contractSigned) {
            console.log("Found client to reset:", row.name, row.id);
            extra.contractSigned = false;
            extra.contractSignedAt = null;
            extra.contractSignedUrl = null;
            
            await conn.execute("UPDATE clients SET extra_info = ? WHERE id = ?", [JSON.stringify(extra), row.id]);
            
            // Also delete the signed contract document from documents table
            await conn.execute("DELETE FROM documents WHERE clientId = ? AND name LIKE '%Contrat signé%'", [row.id]);
            
            console.log("Reset successful for client", row.id);
        }
    }
}

resetSignature().catch(console.error);
