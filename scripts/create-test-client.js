import { connect } from '@planetscale/database';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
    if (line && line.includes('=') && !line.trim().startsWith('#')) {
        const [key, ...vals] = line.split('=');
        let val = vals.join('=').trim();
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.substring(1, val.length - 1);
        }
        env[key.trim()] = val;
    }
});

async function main() {
    const config = {
        host: env.VITE_DATABASE_HOST,
        username: env.VITE_DATABASE_USERNAME,
        password: env.VITE_DATABASE_PASSWORD,
        fetch: fetch
    };
    const conn = connect(config);
    
    await conn.execute(
        "INSERT INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus, extra_info, address, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            Date.now().toString(),
            "Compte Test",
            "davidcassindpc@gmail.com",
            "Compte Test David",
            "Toulouse",
            "Scan+",
            "actif",
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0],
            "",
            "manual",
            JSON.stringify({ offre: "scan" }),
            "Adresse Test",
            "0600000000"
        ]
    );
    console.log("Client inséré avec succès.");
}

main().catch(console.error);
