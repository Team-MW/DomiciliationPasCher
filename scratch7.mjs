import { connect } from '@planetscale/database';
import dotenv from 'dotenv';
dotenv.config();

const config = { url: process.env.DATABASE_URL };

async function checkSigs() {
    const conn = connect(config);
    const res = await conn.execute("SELECT id, name, extra_info FROM clients LIMIT 5");
    res.rows.forEach(r => {
        const extra = r.extra_info ? JSON.parse(r.extra_info) : null;
        console.log("Client:", r.name, "| Signed:", extra?.contractSigned, "| HasSigUrl:", !!extra?.contractSignatureUrl);
    });
}
checkSigs();
