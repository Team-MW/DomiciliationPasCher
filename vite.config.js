import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

// Adapte une réponse Node à l'interface `res` attendue par les handlers Vercel.
export const makeVercelRes = (res) => {
  const wrapper = {
    status: (code) => { res.statusCode = code; return wrapper; },
    json: (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return wrapper;
    },
    send: (data) => { res.end(data); return wrapper; },
    setHeader: (name, value) => { res.setHeader(name, value); return wrapper; },
    redirect: (code, url) => {
      res.statusCode = typeof code === 'number' ? code : 302;
      res.setHeader('Location', typeof code === 'number' ? url : code);
      res.end();
      return wrapper;
    },
  };
  return wrapper;
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

/** /api/cron/reminders?x=1 → api/cron/reminders.js (null si ce n'est pas une route publique). */
export function resolveApiHandlerFile(url, root = process.cwd()) {
  const pathname = String(url || '').split('?')[0];
  const match = /^\/api\/([a-zA-Z0-9/_-]+)$/.exec(pathname);
  if (!match) return null;
  const route = match[1];
  // Les fichiers préfixés « _ » sont des modules internes, comme sur Vercel.
  if (route.split('/').some((segment) => !segment || segment.startsWith('_') || segment === '..')) return null;
  const file = path.join(root, 'api', `${route}.js`);
  return fs.existsSync(file) ? file : null;
}

/**
 * Serveur de dev : exécute les VRAIS handlers de api/ (mêmes contrôles d'accès qu'en prod).
 * L'ancienne version réécrivait plusieurs routes à la main, sans authentification et avec
 * des comportements différents de la production.
 */
const localApiPlugin = {
  name: 'local-stripe-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const file = resolveApiHandlerFile(req.url);
      if (!file) {
        // Comme sur Vercel : une route /api/* inconnue (ou un module interne « _ ») répond 404,
        // au lieu de laisser Vite servir le code source du fichier.
        if (/^\/api(\/|$)/.test(String(req.url || ''))) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        return next();
      }
      try {
        const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
        req.query = Object.fromEntries(urlObj.searchParams);
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const raw = await readBody(req);
          // Le webhook Stripe vérifie la signature sur le corps brut.
          if (urlObj.pathname === '/api/stripe-webhook') {
            req.body = raw;
          } else {
            const text = raw.toString('utf-8');
            try { req.body = text ? JSON.parse(text) : {}; } catch { req.body = text; }
          }
        }
        // ssrLoadModule (et non un import mis en cache) : une modification d'un fichier de api/ OU de shared/ est reprise
        // sans redémarrer. Avant, seul le fichier d'entrée était relu : les fichiers qu'il importe restaient en mémoire
        // dans leur ancienne version (erreur « does not provide an export named … » → 500 sur tout /api/data).
        const { default: handler } = await server.ssrLoadModule(file);
        await handler(req, makeVercelRes(res));
      } catch (e) {
        console.error(`Vite API Error (${req.url}):`, e);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Erreur serveur (dev)' }));
        }
      }
    });
  }
}

export default defineConfig({
  plugins: [react(), localApiPlugin],
  optimizeDeps: {
    // Paquets exclus du pré-bundling : ils DOIVENT rester des dépendances directes dans
    // package.json (installés à la racine de node_modules), sinon les imports de
    // react-router / jspdf ne se résolvent plus en dev et la page reste blanche.
    exclude: ['fast-png', 'raf', 'iobuffer', 'performance-now', 'jspdf', 'fflate', 'set-cookie-parser']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-clerk': ['@clerk/clerk-react'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
})
