import fs from 'fs';
import mysql from 'mysql2/promise';

async function cleanup() {
    let url = process.env.DATABASE_URL;
    if (!url) {
        if (fs.existsSync('.env.local')) {
            const content = fs.readFileSync('.env.local', 'utf-8');
            const match = content.match(/DATABASE_URL=(.*)/);
            if (match) url = match[1].trim();
        }
    }

    if (!url) {
        console.error("No DATABASE_URL found");
        return;
    }

    const conn = await mysql.createConnection(url);
    
    // Get all clients with their since date
    const [clients] = await conn.execute('SELECT id, since FROM clients');
    
    let deletedCount = 0;
    for (const client of clients) {
        if (!client.since) continue;
        
        // Convert client.since (YYYY-MM-DD or Unix timestamp or whatever)
        // Usually date in payments is YYYY-MM-DD
        // We delete payments for this client where payment date < client.since
        const [result] = await conn.execute(
            'DELETE FROM payments WHERE clientId = ? AND date < ?',
            [client.id, client.since]
        );
        if (result.affectedRows > 0) {
            console.log(`Deleted ${result.affectedRows} old payments for client ${client.id}`);
            deletedCount += result.affectedRows;
        }
    }
    
    console.log(`Total old payments deleted: ${deletedCount}`);
    await conn.end();
}

cleanup().catch(console.error);
