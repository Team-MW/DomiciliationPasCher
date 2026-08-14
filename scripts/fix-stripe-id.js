import { conn } from '../src/lib/db.js';

async function fix() {
    try {
        const id = 'cus_Uv5RWUWxUR6xbx';
        console.log(`Recherche des clients avec l'ID Stripe ${id}...`);
        
        const res = await conn.execute(`SELECT id, name, extra_info FROM clients WHERE JSON_EXTRACT(extra_info, '$.stripe_customer_id') = ?`, [id]);
        
        if (res.rows.length === 0) {
            console.log("Aucun client trouvé avec cet ID.");
            process.exit(0);
        }
        
        for (const client of res.rows) {
            console.log(`Correction du client : ${client.name} (ID: ${client.id})`);
            let extra = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
            if (typeof extra === 'string') extra = JSON.parse(extra);
            
            extra.stripe_customer_id = null;
            
            await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify(extra), client.id]);
            console.log("✅ ID Stripe effacé avec succès !");
        }
    } catch (e) {
        console.error("Erreur:", e);
    }
    process.exit(0);
}

fix();
