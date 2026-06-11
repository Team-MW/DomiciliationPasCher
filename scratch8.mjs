import { connect } from '@planetscale/database';
import dotenv from 'dotenv';
dotenv.config();

const config = { url: process.env.DATABASE_URL };

async function resetAll() {
    const conn = connect(config);
    const res = await conn.execute("SELECT id, extra_info FROM clients");
    for (const r of res.rows) {
        if (!r.extra_info) continue;
        const e = JSON.parse(r.extra_info);
        let changed = false;

        if (e.contractSigned) {
            delete e.contractSigned;
            delete e.contractSignedAt;
            delete e.contractSignatureUrl;
            delete e.contractSignedUrl;
            changed = true;
            await conn.execute("DELETE FROM documents WHERE clientId = ? AND url = '#local-signature'", [r.id]);
        }

        if (e.procurationSigned) {
            delete e.procurationSigned;
            delete e.procurationSignedAt;
            delete e.procurationSignatureUrl;
            delete e.procurationSignedUrl;
            delete e.procurationData;
            changed = true;
            await conn.execute("DELETE FROM documents WHERE clientId = ? AND url = '#local-procuration'", [r.id]);
        }

        if (changed) {
            await conn.execute("UPDATE clients SET extra_info = ? WHERE id = ?", [JSON.stringify(e), r.id]);
        }
    }
    console.log("All reset");
}
resetAll();
