import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
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
