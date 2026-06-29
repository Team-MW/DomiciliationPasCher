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
    
    // Explicitly call chmodSync on non-Windows environments to ensure executable permission is set
    if (process.platform !== 'win32') {
        try {
            fs.chmodSync(hookFile, '755');
        } catch (e) {
            console.warn('⚠️ Could not set executable permission on pre-push hook: ' + e.message);
        }
    }
    console.log('✅ Git pre-push hook installed successfully!');
} else {
    console.log('⚠️ .git directory not found. Skipping Git hook installation.');
}
