import { connect } from '@planetscale/database';
import fs from 'fs';

// --- LOGO ET STYLISATION ---
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    bold: "\x1b[1m"
};

console.log(`
${colors.cyan}${colors.bold}=============================================================
             🧹 NETTOYAGE DES DOCUMENTS ET SIGNATURES
=============================================================${colors.reset}
`);

// --- CHARGEMENT DES VARIABLES D'ENVIRONNEMENT ---
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

if (!config.host || !config.username || !config.password) {
    console.error(`${colors.red}✖ Erreur : Variables de connexion à la base de données manquantes dans les fichiers d'environnement (.env.local / .env)${colors.reset}`);
    process.exit(1);
}

async function runCleanup() {
    try {
        const conn = connect(config);
        
        const testEmail = 'benilias757@gmail.com';
        console.log(`${colors.cyan}⚙ Étape 1 : Recherche du client test '${testEmail}'...${colors.reset}`);
        
        const clientRes = await conn.execute('SELECT id, name FROM clients WHERE email = ?', [testEmail]);
        if (clientRes.rows.length === 0) {
            console.error(`${colors.yellow}⚠ Aucun client trouvé avec l'e-mail '${testEmail}'. Opération annulée.${colors.reset}`);
            process.exit(0);
        }
        
        const client = clientRes.rows[0];
        const clientId = client.id;
        console.log(`  ${colors.green}✔ Client trouvé : '${client.name}' (ID: ${clientId})${colors.reset}`);
        
        console.log(`\n${colors.cyan}⚙ Étape 2 : Suppression des documents du client test '${client.name}'...${colors.reset}`);
        const deleteDocsRes = await conn.execute('DELETE FROM documents WHERE clientId = ?', [clientId]);
        console.log(`  ${colors.green}✔ ${deleteDocsRes.rowsAffected || 0} document(s) de test supprimé(s).${colors.reset}`);
        
        console.log(`\n${colors.cyan}⚙ Étape 3 : Réinitialisation des signatures/informations de contrats du client test...${colors.reset}`);
        const updateClientsRes = await conn.execute("UPDATE clients SET extra_info = '{}' WHERE id = ?", [clientId]);
        console.log(`  ${colors.green}✔ Client test réinitialisé (extra_info réinitialisé).${colors.reset}`);
        
        console.log(`\n${colors.green}${colors.bold}🎉 Nettoyage ciblé effectué avec succès !${colors.reset}\n`);
        process.exit(0);
    } catch (e) {
        console.error(`\n  ${colors.red}✖ Échec du nettoyage ciblé de la base de données :${colors.reset}`, e.message);
        process.exit(1);
    }
}

runCleanup();
