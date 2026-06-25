import fs from 'fs';
import { connect } from '@planetscale/database';

const env = fs.readFileSync('.env', 'utf8');
const hostMatch = env.match(/VITE_DATABASE_HOST='?([^'\n]+)'?/);
const userMatch = env.match(/VITE_DATABASE_USERNAME='?([^'\n]+)'?/);
const passMatch = env.match(/VITE_DATABASE_PASSWORD='?([^'\n]+)'?/);

const config = {
    host: hostMatch ? hostMatch[1] : null,
    username: userMatch ? userMatch[1] : null,
    password: passMatch ? passMatch[1] : null
};

if (!config.host) {
    console.error("Missing config", config);
    process.exit(1);
}

const conn = connect(config);

async function check() {
    try {
        const res = await conn.execute("DESCRIBE documents");
        console.log("Documents Table:");
        console.table(res.rows);
    } catch (e) {
        console.error("Error querying DB:", e.message);
    }
}

check();
