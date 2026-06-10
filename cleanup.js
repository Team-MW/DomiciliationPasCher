import { connect } from '@planetscale/database';
import fs from 'fs';

async function run() {
    let url = process.env.DATABASE_URL;
    if (!url && fs.existsSync('.env.local')) {
        const c = fs.readFileSync('.env.local', 'utf8');
        const m = c.match(/DATABASE_URL=(.*)/);
        if (m) {
            url = m[1].trim();
            if (url.startsWith("'") && url.endsWith("'")) url = url.slice(1, -1);
            if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1);
        }
    }
    const conn = connect({ url });
    
    const clients = await conn.execute('SELECT id, since FROM clients');
    let deleted = 0;
    
    for (const row of clients.rows) {
        if (!row.since) continue;
        const res = await conn.execute('DELETE FROM payments WHERE clientId = ? AND date < ?', [row.id, row.since]);
        if (res.rowsAffected > 0) {
            console.log(`Deleted ${res.rowsAffected} old payments for client ${row.id}`);
            deleted += res.rowsAffected;
        }
    }
    console.log(`Cleanup complete. Total deleted: ${deleted}`);
}
run();
