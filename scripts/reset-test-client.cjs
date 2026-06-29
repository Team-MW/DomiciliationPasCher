const fs = require('fs');

const readEnvVar = (file, key) => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const match = content.match(new RegExp('^' + key + '=(.*)', 'm'));
      if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch (_) {}
  return process.env[key] || null;
};

const host = readEnvVar('.env.local', 'VITE_DATABASE_HOST');
const username = readEnvVar('.env.local', 'VITE_DATABASE_USERNAME');
const password = readEnvVar('.env.local', 'VITE_DATABASE_PASSWORD');

if (!host || !username || !password) {
  console.error("❌ ERREUR: Impossible de lire les credentials DB.");
  process.exit(1);
}

import('@planetscale/database').then(async ({ connect }) => {
  const conn = connect({ host, username, password });
  
  console.log(`\n🔄 Réinitialisation de tous les clients de test...`);

  const res = await conn.execute('SELECT id, extra_info FROM clients');
  let resetCount = 0;

  for (const row of res.rows) {
     let extraInfo = {};
     try {
       extraInfo = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info) : row.extra_info;
     } catch(e) {}
     
     if (extraInfo) {
        delete extraInfo.contractSigned;
        delete extraInfo.contractSignedAt;
        delete extraInfo.contractSignedUrl;
        delete extraInfo.contractSignatureUrl;
        
        delete extraInfo.procurationSigned;
        delete extraInfo.procurationSignedAt;
        delete extraInfo.procurationSignedUrl;
        delete extraInfo.procurationSignatureUrl;
        delete extraInfo.procurationData;
        
        const mergedStr = JSON.stringify(extraInfo);
        await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [mergedStr, row.id]);
        resetCount++;
     }
  }
  console.log(`✅ ${resetCount} profils (extra_info) réinitialisés.`);

  await conn.execute("DELETE FROM documents");
  console.log("✅ Tous les documents ont été supprimés de la base de données.");

  console.log("\n🎉 Tous les comptes ont été remis à zéro. Vous pouvez recharger la page et tester la signature !\n");
  process.exit(0);
}).catch(e => {
  console.error('❌ DB ERROR:', e.message);
  process.exit(1);
});
