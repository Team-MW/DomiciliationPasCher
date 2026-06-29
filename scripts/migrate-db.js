import { connect } from '@planetscale/database';
import fs from 'fs';

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

async function migrate() {
    try {
        const conn = connect(config);
        console.log("🚀 Lancement de la migration de la base de données...");
        
        console.log("⚙ Étape 1 : Passage de la colonne url de documents en LONGTEXT...");
        await conn.execute('ALTER TABLE documents MODIFY url LONGTEXT');
        console.log("  ✔ Colonne documents.url modifiée avec succès.");
        
        console.log("⚙ Étape 2 : Passage de la colonne extra_info de clients en LONGTEXT...");
        await conn.execute('ALTER TABLE clients MODIFY extra_info LONGTEXT');
        console.log("  ✔ Colonne clients.extra_info modifiée avec succès.");
        
        console.log("🎉 Migration terminée avec succès !");
        process.exit(0);
    } catch (e) {
        console.error("❌ Erreur de migration :", e);
        process.exit(1);
    }
}

migrate();
