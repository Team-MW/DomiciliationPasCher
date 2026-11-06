#!/usr/bin/env node
/**
 * Vérification complète AVANT CHAQUE PUSH (hook git pre-push) et en CI.
 * Objectif : qu'une version cassée du site ne puisse jamais partir en production.
 *
 *   npm run verify
 *
 * S'arrête au premier échec. Ne jamais contourner avec `git push --no-verify` :
 * si une étape échoue, c'est qu'il y a un vrai problème à corriger.
 */
import { spawnSync } from 'node:child_process';

const STEPS = [
    {
        name: 'Contrôles de déploiement',
        why: 'routes, forfaits, prix, config Vercel, routes API',
        cmd: ['node', 'scripts/deploy-check.mjs'],
    },
    {
        name: 'Sitemap à jour',
        why: 'chaque page publique est déclarée à Google',
        cmd: ['node', 'scripts/generate-sitemap.mjs', '--check'],
    },
    {
        name: 'Lint critique',
        why: 'variables inexistantes, hooks React, code inaccessible…',
        cmd: ['node', 'scripts/lint-critical.mjs'],
    },
    {
        name: 'Tests automatiques',
        why: 'sécurité, paiements, emails, admin, espace client, API',
        cmd: ['npx', 'vitest', 'run', '--pool=threads', '--maxWorkers=1', '--reporter=dot'],
    },
    {
        name: 'Test navigateur',
        why: 'build de production + chaque page ouverte dans Chrome, ordinateur et mobile',
        cmd: ['node', 'scripts/browser-smoke.mjs'],
    },
];

const line = '─'.repeat(64);
const started = Date.now();
const done = [];

console.log(`\n${line}\n🔍 Vérification avant mise en ligne (${STEPS.length} étapes)\n${line}`);

for (const [index, step] of STEPS.entries()) {
    console.log(`\n▶ ${index + 1}/${STEPS.length} ${step.name} — ${step.why}`);
    const t0 = Date.now();
    const result = spawnSync(step.cmd[0], step.cmd.slice(1), { stdio: 'inherit', shell: process.platform === 'win32' });
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);

    if (result.status !== 0) {
        console.error(`\n${line}`);
        console.error(`❌ ÉCHEC à l'étape ${index + 1}/${STEPS.length} : ${step.name} (${seconds} s)`);
        console.error(`   Le push est bloqué : corrigez le problème ci-dessus puis relancez « git push ».`);
        console.error(`   Pour relancer uniquement la vérification : npm run verify`);
        console.error(line);
        process.exit(1);
    }
    done.push(`✅ ${step.name} (${seconds} s)`);
}

const total = ((Date.now() - started) / 1000).toFixed(0);
console.log(`\n${line}`);
for (const d of done) console.log(d);
console.log(`\n✅ Tout est vert en ${total} s : la version peut être mise en ligne.`);
console.log(line);
