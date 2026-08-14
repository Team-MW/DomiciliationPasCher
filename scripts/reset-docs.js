import { connect } from '@planetscale/database';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    if (line && line.includes('=')) {
        const [key, ...vals] = line.split('=');
        let val = vals.join('=').trim();
        // Remove surrounding quotes if they exist
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.substring(1, val.length - 1);
        }
        env[key.trim()] = val;
    }
});

const config = {
    host: env.VITE_DATABASE_HOST,
    username: env.VITE_DATABASE_USERNAME,
    password: env.VITE_DATABASE_PASSWORD
};

const conn = connect(config);

async function run() {
    try {
        const res = await conn.execute("SELECT id, name, extra_info FROM clients");
        
        // Trouver le client le plus récemment modifié qui a des documents signés,
        let targetClient = null;
        for (const row of res.rows) {
            if (row.extra_info) {
                try {
                    const extra = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info) : row.extra_info;
                    if (extra.procurationSigned || extra.contratSigned) {
                        targetClient = { ...row, extra };
                    }
                } catch(e) {}
            }
        }
        
        if (!targetClient) {
            console.log("Aucun client trouvé avec des documents générés.");
            process.exit(0);
        }
        
        console.log(`Client trouvé pour réinitialisation : ${targetClient.name} (${targetClient.id})`);
        
        const newExtra = { ...targetClient.extra };
        delete newExtra.procurationSigned;
        delete newExtra.procurationSignedAt;
        delete newExtra.procurationSignatureUrl;
        delete newExtra.procurationData;
        delete newExtra.procurationSignedUrl;
        delete newExtra.contratSigned;
        delete newExtra.contratSignedAt;
        delete newExtra.contratSignatureUrl;
        delete newExtra.contratSignedUrl;

        await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [JSON.stringify(newExtra), targetClient.id]);
        
        await conn.execute("DELETE FROM documents WHERE clientId = ? AND (name LIKE '%Procuration%' OR name LIKE '%Contrat%')", [targetClient.id]);
        
        console.log("Les documents et statuts de signature ont été complètement effacés pour ce profil !");
    } catch(err) {
        console.error(err);
    }
}
run();
