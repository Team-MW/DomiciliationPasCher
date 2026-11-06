/**
 * Garde-fou des scripts de maintenance.
 *
 * Ces scripts lisent .env.local et agissent sur les VRAIES données (base PlanetScale de
 * production, compte Stripe). Ils refusent de s'exécuter sans confirmation explicite :
 *
 *   CONFIRM=oui node scripts/maintenance/<script>
 *
 * Voir scripts/maintenance/README.md et AI_INSTRUCTIONS.md (« Scripts de maintenance »).
 */
const path = require('path');

const name = path.basename(process.argv[1] || 'script');

if (process.env.CONFIRM !== 'oui') {
    console.error(`\n⛔ ${name} agit sur les données réelles (base de production / Stripe).`);
    console.error('   Lisez d\'abord scripts/maintenance/README.md, puis relancez avec :');
    console.error(`   CONFIRM=oui node scripts/maintenance/${name}\n`);
    process.exit(1);
}

console.warn(`⚠️  ${name} : exécution confirmée (CONFIRM=oui).`);
