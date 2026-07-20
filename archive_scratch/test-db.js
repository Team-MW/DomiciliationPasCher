import { connect } from '@planetscale/database';
import fs from 'fs';

const content = fs.readFileSync('.env', 'utf-8');
const host = content.match(/VITE_DATABASE_HOST=(.*)/)[1].trim();
const username = content.match(/VITE_DATABASE_USERNAME=(.*)/)[1].trim();
const password = content.match(/VITE_DATABASE_PASSWORD=(.*)/)[1].trim();

const conn = connect({ host, username, password });

async function run() {
  const res = await conn.execute('SELECT email, extra_info FROM clients LIMIT 2');
  console.log(res.rows);
}
run();
