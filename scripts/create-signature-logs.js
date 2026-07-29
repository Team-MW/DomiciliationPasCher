import { connect } from '@planetscale/database';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    const env = {};
    for (const filename of ['.env', '.env.local']) {
        if (fs.existsSync(filename)) {
            const content = fs.readFileSync(filename, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
                if (match) {
                    let val = match[2].trim();
                    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                    env[match[1]] = val;
                }
            });
        }
    }
    return env;
}

const env = loadEnv();

const config = {
    host: env.VITE_DATABASE_HOST,
    username: env.VITE_DATABASE_USERNAME,
    password: env.VITE_DATABASE_PASSWORD
};

const conn = connect(config);

async function run() {
    try {
        console.log("Creating signature_logs table...");
        const sql = `
            CREATE TABLE IF NOT EXISTS signature_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id VARCHAR(255) NOT NULL,
                contract_ref VARCHAR(255) NOT NULL,
                ip_address VARCHAR(255) NOT NULL,
                signee_name VARCHAR(255) NOT NULL,
                signee_email VARCHAR(255) NOT NULL,
                signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX client_id_idx (client_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await conn.execute(sql);
        console.log("✅ Table signature_logs created successfully.");
    } catch (e) {
        console.error("❌ Error creating table:", e.message);
    }
}

run();
