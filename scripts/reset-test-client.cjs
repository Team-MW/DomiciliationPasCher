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
  
  const testEmail = 'benilias757@gmail.com';
  console.log(`\n🔄 Réinitialisation sécurisée du client de test (${testEmail})...`);

  const res = await conn.execute('SELECT id, extra_info FROM clients WHERE email = ?', [testEmail]);
  
  if (res.rows.length === 0) {
    console.error(`❌ ERREUR: Aucun client trouvé avec l'email "${testEmail}" en base.`);
    process.exit(1);
  }

  const row = res.rows[0];
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
     console.log(`✅ Profil extra_info de "${testEmail}" réinitialisé.`);
  }

  const docDel = await conn.execute("DELETE FROM documents WHERE clientId = ?", [row.id]);
  console.log(`✅ Les documents associés à l'ID client "${row.id}" ont été supprimés.`);

  console.log("\n🎉 Le compte de test a été remis à zéro avec succès !\n");
  process.exit(0);
}).catch(e => {
  console.error('❌ DB ERROR:', e.message);
  process.exit(1);
});
