import fs from 'fs';
import { Client } from '@planetscale/database';

const dbUrl = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL='(.*)'/)[1];
const conn = new Client({ url: dbUrl }).connection();

async function checkDb() {
    const res = await conn.execute("SELECT * FROM payments WHERE client_id IN (SELECT id FROM clients WHERE email = 'altitoitoccitan@gmail.com')");
    console.log(res.rows);
}
checkDb();
