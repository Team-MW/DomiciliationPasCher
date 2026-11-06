#!/usr/bin/env node
/**
 * Verrou des fichiers protégés (hook pre-commit).
 *
 * Les fichiers de génération de documents fonctionnent et sont verrouillés : un commit qui les modifie est refusé,
 * SAUF si la version exacte du fichier a été approuvée par le propriétaire (empreinte SHA-256 enregistrée dans
 * scripts/protected-approvals.json). Toute modification ultérieure change l'empreinte → le verrou se remet en place.
 *
 *   node scripts/check-protected-files.mjs                      → contrôle les fichiers indexés (appelé par le hook)
 *   node scripts/check-protected-files.mjs --approve <fichier>  → approuve la version ACTUELLE du fichier (à ne faire
 *                                                                 qu'après relecture et accord du propriétaire)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PROTECTED_FILES = ['src/utils/pdfGenerator.js', 'src/utils/cloudinary.js'];
const APPROVALS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'protected-approvals.json');

export const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');

export function loadApprovals(file = APPROVALS_FILE) {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return data && typeof data.approved === 'object' ? data.approved : {};
    } catch {
        return {};
    }
}

/**
 * Fichiers protégés présents dans le commit dont la version n'est PAS approuvée.
 * @param {string[]} staged chemins indexés
 * @param {(file: string) => string} readStaged contenu indexé d'un fichier
 * @param {Record<string, {sha256: string}>} approvals
 */
export function findViolations(staged, readStaged, approvals) {
    return PROTECTED_FILES
        .filter((file) => staged.includes(file))
        .filter((file) => approvals[file]?.sha256 !== sha256(readStaged(file)));
}

function main() {
    const args = process.argv.slice(2);
    if (args[0] === '--approve') {
        const file = args[1];
        if (!PROTECTED_FILES.includes(file)) {
            console.error(`Fichier non protégé ou inconnu : ${file}`);
            process.exit(1);
        }
        const current = fs.readFileSync(file);
        const data = { approved: loadApprovals() };
        data.approved[file] = { sha256: sha256(current), approvedOn: new Date().toISOString().slice(0, 10) };
        fs.writeFileSync(APPROVALS_FILE, `${JSON.stringify(data, null, 2)}\n`);
        console.log(`✅ Version actuelle de ${file} approuvée (${data.approved[file].sha256.slice(0, 12)}…).`);
        return;
    }

    const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' }).split('\n').filter(Boolean);
    const readStaged = (file) => execFileSync('git', ['show', `:${file}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
    const violations = findViolations(staged, readStaged, loadApprovals());
    if (violations.length === 0) {
        const approved = PROTECTED_FILES.filter((f) => staged.includes(f));
        if (approved.length) console.log(`🔓 Fichier(s) protégé(s) modifié(s) mais approuvé(s) par le propriétaire : ${approved.join(', ')}`);
        return;
    }
    for (const file of violations) {
        console.error(`❌ ERREUR: modification non approuvée d'un fichier protégé (${file}) !`);
    }
    console.error('❌ La génération de documents (PDF / Cloudinary) est verrouillée car elle fonctionne.');
    console.error('❌ Si le propriétaire a validé ce changement : node scripts/check-protected-files.mjs --approve <fichier>, puis recommitez.');
    console.error('❌ Commit annulé.');
    process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
