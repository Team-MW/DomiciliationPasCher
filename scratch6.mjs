import { connect } from '@planetscale/database';
import dotenv from 'dotenv';
dotenv.config();

const config = { url: process.env.DATABASE_URL };

async function checkSchema() {
    const conn = connect(config);
    const res = await conn.execute("SHOW COLUMNS FROM clients WHERE Field = 'extra_info'");
    console.log(res.rows);
}
checkSchema();
