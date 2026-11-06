#!/usr/bin/env node
/**
 * Lint « bloquant » : uniquement les règles qui signalent un VRAI bug (plantage ou
 * comportement faux), pas le style. Le reste du lint (variables inutilisées, blocs vides…)
 * reste visible avec `npm run lint` mais ne bloque pas le push.
 *
 *   npm run lint:critical
 */
import { ESLint } from 'eslint';

const CRITICAL_RULES = new Set([
    'no-undef',                    // variable inexistante → ReferenceError à l'exécution
    'react-hooks/rules-of-hooks',  // hook conditionnel → crash React aléatoire
    'no-dupe-keys',                // clé d'objet écrasée silencieusement
    'no-dupe-args',
    'no-dupe-class-members',
    'no-duplicate-case',
    'no-dupe-else-if',
    'no-unreachable',              // code jamais exécuté (souvent un return oublié)
    'no-const-assign',             // TypeError à l'exécution
    'no-func-assign',
    'no-import-assign',
    'no-class-assign',
    'no-self-assign',
    'no-unsafe-finally',
    'no-unsafe-negation',
    'no-unsafe-optional-chaining',
    'valid-typeof',
    'getter-return',
    'constructor-super',
    'no-this-before-super',
    'no-obj-calls',
    'no-setter-return',
    'use-isnan',
    'no-compare-neg-zero',
    'no-sparse-arrays',
    'no-invalid-regexp',
    'no-cond-assign',
    'for-direction',
    'no-loss-of-precision',
]);

// Fichiers verrouillés par le hook pre-commit (génération PDF / Cloudinary) : on ne peut pas
// les corriger ici. Leurs usages signalés sont protégés par des `typeof` (vérifié à la main).
const PROTECTED = [/src\/utils\/pdfGenerator\.js$/, /src\/utils\/cloudinary\.js$/];

// Les règles du cœur d'ESLint sont forcées en « error » même si la config ne les active pas.
const coreRules = Object.fromEntries([...CRITICAL_RULES].filter((r) => !r.includes('/')).map((r) => [r, 'error']));
const eslint = new ESLint({ overrideConfig: { rules: coreRules } });
const results = await eslint.lintFiles(['.']);

const problems = [];
for (const file of results) {
    if (PROTECTED.some((re) => re.test(file.filePath))) continue;
    for (const m of file.messages) {
        if (m.fatal) {
            problems.push({ file: file.filePath, line: m.line, rule: 'syntaxe', message: m.message });
        } else if (m.severity === 2 && CRITICAL_RULES.has(m.ruleId)) {
            problems.push({ file: file.filePath, line: m.line, rule: m.ruleId, message: m.message });
        }
    }
}

const root = process.cwd() + '/';
if (problems.length) {
    console.error(`❌ Lint critique : ${problems.length} bug(s) potentiel(s)`);
    for (const p of problems) {
        console.error(`   ${p.file.replace(root, '')}:${p.line}  [${p.rule}]  ${p.message.split('\n')[0]}`);
    }
    process.exit(1);
}
console.log(`✅ Lint critique : aucun bug détecté (${results.length} fichiers, ${CRITICAL_RULES.size} règles)`);
