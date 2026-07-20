import fs from 'fs';
import path from 'path';

const gitDir = path.resolve('.git');
const hooksDir = path.join(gitDir, 'hooks');
const hookFile = path.join(hooksDir, 'pre-push');

const hookContent = `#!/bin/sh
echo "🔍 Running pre-push verification tests..."
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Push aborted!"
  exit 1
fi

echo "✅ All tests passed. Proceeding with push."
exit 0
`;

if (fs.existsSync(gitDir)) {
    if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir);
    }
    fs.writeFileSync(hookFile, hookContent, { mode: 0o755 });
    
    // --- NOUVEAU: Pre-commit hook pour bloquer modifs pdfGenerator / cloudinary ---
    const preCommitFile = path.join(hooksDir, 'pre-commit');
    const preCommitContent = `#!/bin/sh
echo "🔒 Checking protected files..."
PROTECTED_FILES="src/utils/pdfGenerator.js src/utils/cloudinary.js"
for file in $PROTECTED_FILES; do
    if git diff --cached --name-only | grep -q "$file"; then
        echo "❌ ERREUR: Vous essayez de modifier un fichier protégé ($file) !"
        echo "❌ La génération de document (PDF/Cloudinary) est verrouillée car elle fonctionne parfaitement."
        echo "❌ Commit annulé."
        exit 1
    fi
done
exit 0
`;
    fs.writeFileSync(preCommitFile, preCommitContent, { mode: 0o755 });
    // --------------------------------------------------------------------------------
    
    // Explicitly call chmodSync on non-Windows environments to ensure executable permission is set
    if (process.platform !== 'win32') {
        try {
            fs.chmodSync(hookFile, '755');
            fs.chmodSync(preCommitFile, '755');
        } catch (e) {
            console.warn('⚠️ Could not set executable permission on git hooks: ' + e.message);
        }
    }
    console.log('✅ Git hooks (pre-push & pre-commit) installed successfully!');
} else {
    console.log('⚠️ .git directory not found. Skipping Git hook installation.');
}
