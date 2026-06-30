import { connect } from '@planetscale/database';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const conn = connect({ url: process.env.DATABASE_URL });

async function check() {
    const email = 'benilias757@gmail.com';
    const res = await conn.execute('SELECT * FROM clients WHERE email = ?', [email]);
    if (res.rows.length > 0) {
        console.log("Client extra_info:", res.rows[0].extra_info);
    }
    
    const docs = await conn.execute('SELECT * FROM documents WHERE clientId = ?', [res.rows[0].id]);
    console.log("Documents:", docs.rows);
}
check();
