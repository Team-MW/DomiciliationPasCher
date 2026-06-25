import { connect } from '@planetscale/database';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}='?([^'\\n]+)'?`, 'm'));
    return match ? match[1] : null;
};

const config = {
    host: getEnv('VITE_DATABASE_HOST'),
    username: getEnv('VITE_DATABASE_USERNAME'),
    password: getEnv('VITE_DATABASE_PASSWORD')
};

const conn = connect(config);

async function check() {
    try {
        console.log("DESCRIBE documents...");
        const res = await conn.execute("DESCRIBE documents");
        console.table(res.rows);

        console.log("Altering url column to LONGTEXT...");
        await conn.execute("ALTER TABLE documents MODIFY url LONGTEXT");
        console.log("Successfully altered.");

        const res2 = await conn.execute("DESCRIBE documents");
        console.table(res2.rows);
    } catch (e) {
        console.error("DB Error:", e.message);
    }
}
check();
