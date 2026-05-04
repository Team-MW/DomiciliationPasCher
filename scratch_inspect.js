
import { conn } from './src/lib/db.js';

async function inspect() {
    try {
        const res = await conn.execute("SELECT id, clientName, email, status, date FROM demandes");
        console.log("--- DEMANDES ACTUELLES ---");
        console.table(res.rows);
    } catch (err) {
        console.error("Erreur:", err);
    }
}

inspect();
