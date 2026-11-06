// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { sha256, findViolations, loadApprovals, PROTECTED_FILES } from '../scripts/check-protected-files.mjs';

describe('Verrou des fichiers protégés : exception ciblée par empreinte', () => {
    it('une version approuvée passe, toute autre version est refusée', () => {
        const approvals = { 'src/utils/pdfGenerator.js': { sha256: sha256('version A') } };
        const staged = ['src/utils/pdfGenerator.js', 'src/App.jsx'];
        expect(findViolations(staged, () => 'version A', approvals)).toEqual([]);
        expect(findViolations(staged, () => 'version A modifiée', approvals)).toEqual(['src/utils/pdfGenerator.js']);
        expect(findViolations(['src/utils/cloudinary.js'], () => 'x', approvals)).toEqual(['src/utils/cloudinary.js']); // jamais approuvé
        expect(findViolations(['src/App.jsx'], () => 'x', {})).toEqual([]); // fichier non protégé : libre
    });

    it('la version actuelle de pdfGenerator.js est approuvée ; cloudinary.js reste verrouillé', () => {
        const approvals = loadApprovals();
        expect(approvals['src/utils/pdfGenerator.js']?.sha256).toBe(sha256(fs.readFileSync('src/utils/pdfGenerator.js')));
        expect(approvals['src/utils/cloudinary.js']).toBeUndefined();
        expect(PROTECTED_FILES).toContain('src/utils/cloudinary.js');
    });

    describe('dans un vrai dépôt git (le hook, de bout en bout)', () => {
        let dir;
        const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
        const hook = () => spawnSync('node', ['scripts/check-protected-files.mjs'], { cwd: dir, encoding: 'utf8' });

        beforeAll(() => {
            dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-'));
            fs.mkdirSync(path.join(dir, 'scripts'));
            fs.mkdirSync(path.join(dir, 'src/utils'), { recursive: true });
            fs.copyFileSync('scripts/check-protected-files.mjs', path.join(dir, 'scripts/check-protected-files.mjs'));
            git('init', '-q'); git('config', 'user.email', 't@t.fr'); git('config', 'user.name', 't');
            fs.writeFileSync(path.join(dir, 'src/utils/pdfGenerator.js'), 'v1');
            fs.writeFileSync(path.join(dir, 'src/utils/cloudinary.js'), 'c1');
        });

        it('non approuvé → refusé (code 1)', () => {
            git('add', 'src/utils/pdfGenerator.js');
            const r = hook();
            expect(r.status).toBe(1);
            expect(r.stderr).toMatch(/non approuvée/);
        });

        it('approuvé (--approve) → accepté ; modifié ensuite → de nouveau refusé', () => {
            const approve = spawnSync('node', ['scripts/check-protected-files.mjs', '--approve', 'src/utils/pdfGenerator.js'], { cwd: dir, encoding: 'utf8' });
            expect(approve.status).toBe(0);
            expect(hook().status).toBe(0);
            fs.writeFileSync(path.join(dir, 'src/utils/pdfGenerator.js'), 'v2 modifiée après approbation');
            git('add', 'src/utils/pdfGenerator.js');
            expect(hook().status).toBe(1);
        });

        it('cloudinary.js reste verrouillé même quand pdfGenerator.js est approuvé', () => {
            git('add', 'src/utils/cloudinary.js');
            const r = hook();
            expect(r.status).toBe(1);
            expect(r.stderr).toMatch(/cloudinary\.js/);
        });
    });
});
