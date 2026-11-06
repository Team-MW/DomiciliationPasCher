import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  // Aucun fichier .env n'est chargé pendant les tests (le dossier tests/ n'en contient pas) :
  // sinon Vitest injecte les VITE_DATABASE_* du .env.local et les tests touchent la vraie base.
  envDir: './tests',
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
    fileParallelism: false,
    pool: 'threads',
    maxWorkers: 1,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
