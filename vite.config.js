import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import Stripe from 'stripe'

// Plugin local pour simuler le VRAI backend sans avoir besoin de npx vercel dev
const localStripePlugin = {
  name: 'local-stripe-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/log-error' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString() });
        req.on('end', () => {
          try {
            fs.appendFileSync('client_errors.log', bodyStr + '\n');
            res.statusCode = 200;
            res.end('Logged');
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
        });
        return;
      }

      if (req.url === '/api/checkout' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString() });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');

            // Récupérer la clé directement
            // Récupérer la clé directement depuis .env.local en priorité
            let secretKey = null;
            if (fs.existsSync('.env.local')) {
              const envContent = fs.readFileSync('.env.local', 'utf-8');
              const match = envContent.match(/STRIPE_SECRET_KEY=(.*)/);
              if (match) secretKey = match[1].trim();
            }
            if (!secretKey) secretKey = process.env.STRIPE_SECRET_KEY;

            if (!secretKey || secretKey === 'sk_live_remplace_moi' || secretKey.startsWith('pk_')) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Clé Sécrète Stripe manquante ou invalide (Ne mets pas 'pk_' dans STRIPE_SECRET_KEY, il faut 'sk_')." }));
              return;
            }

            const stripe = new Stripe(secretKey);

            const isOneTime = body.interval === 'one_time';
            
            const priceData = {
              currency: 'eur',
              product_data: { name: body.productName || 'Forfait' },
              unit_amount: Math.round(body.amount * 100),
            };

            if (!isOneTime) {
                // Seulement pour mensuel / annuel
                priceData.recurring = { interval: body.interval || 'month' };
            }

            const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [
                {
                  price_data: priceData,
                  quantity: 1,
                },
              ],
              mode: isOneTime ? 'payment' : 'subscription',
              success_url: body.successUrl || `http://localhost:5173/?success=true`,
              cancel_url: body.cancelUrl || `http://localhost:5173/souscription`,
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ id: session.id, url: session.url }));
          } catch (e) {
            console.error("Vite Stripe Error:", e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      if (req.url === '/api/delete-user' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString() });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { clerkId } = body;
            
            let secretKey = null;
            if (fs.existsSync('.env')) {
               const envContent = fs.readFileSync('.env', 'utf-8');
               const match = envContent.match(/CLERK_SECRET_KEY=(.*)/);
               if (match) secretKey = match[1].trim();
            }

            if (!secretKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "CLERK_SECRET_KEY manquante dans .env" }));
              return;
            }

            const { createClerkClient } = await import('@clerk/clerk-sdk-node');
            const clerk = createClerkClient({ secretKey });
            await clerk.users.deleteUser(clerkId);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: "Supprimé avec succès de Clerk" }));
          } catch (e) {
            console.error("Vite Clerk Delete Error:", e);
            res.statusCode = 200; // On renvoie 200 même si erreur pour ne pas bloquer
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      // Handle update-client-extra endpoint
      if (req.url === '/api/update-client-extra' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          console.log('[update-client-extra] Request received');
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { clientId, extraInfo } = body;

            console.log('[update-client-extra] clientId:', clientId, '| extraInfo keys:', extraInfo ? Object.keys(extraInfo) : null);

            if (!clientId || !extraInfo) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing parameters: clientId and extraInfo are required' }));
              return;
            }

            // Read DB credentials from env files (same pattern as Stripe/Clerk above)
            const readEnvVar = (file, key) => {
              try {
                if (fs.existsSync(file)) {
                  const content = fs.readFileSync(file, 'utf-8');
                  const match = content.match(new RegExp(`^${key}=(.*)`, 'm'));
                  if (match) {
                    // Strip surrounding quotes (' or ") that some .env files use
                    return match[1].trim().replace(/^['"]|['"]$/g, '');
                  }
                }
              } catch (_) {}
              return process.env[key] || null;
            };

            const dbHost     = readEnvVar('.env.local', 'VITE_DATABASE_HOST')     || readEnvVar('.env', 'VITE_DATABASE_HOST');
            const dbUsername = readEnvVar('.env.local', 'VITE_DATABASE_USERNAME') || readEnvVar('.env', 'VITE_DATABASE_USERNAME');
            const dbPassword = readEnvVar('.env.local', 'VITE_DATABASE_PASSWORD') || readEnvVar('.env', 'VITE_DATABASE_PASSWORD');

            if (!dbHost || !dbUsername || !dbPassword) {
              console.error('[update-client-extra] DB credentials missing');
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Configuration DB manquante (VITE_DATABASE_HOST / USERNAME / PASSWORD)' }));
              return;
            }

            const { connect } = await import('@planetscale/database');
            const conn = connect({ host: dbHost, username: dbUsername, password: dbPassword });

            // Fetch existing extra_info and merge
            const selectRes = await conn.execute('SELECT extra_info FROM clients WHERE id = ?', [clientId]);
            const row = selectRes.rows[0];
            let existing = {};
            if (row && row.extra_info) {
              try {
                existing = typeof row.extra_info === 'string' ? JSON.parse(row.extra_info) : row.extra_info;
              } catch (_) {}
            }
            const merged = { ...existing, ...extraInfo };
            const mergedStr = JSON.stringify(merged);
            console.log('[update-client-extra] Saving merged extra_info, keys:', Object.keys(merged));

            await conn.execute('UPDATE clients SET extra_info = ? WHERE id = ?', [mergedStr, clientId]);

            console.log('[update-client-extra] ✅ Success');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, merged }));
          } catch (e) {
            console.error('[update-client-extra] ❌ Error:', e.message, e.stack);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message || 'Internal server error' }));
            }
          }
        });
        return;
      }
      next();
    });
  }
}

export default defineConfig({
  plugins: [react(), localStripePlugin],
  // Server config not needed; Vite middleware handles API routes
  optimizeDeps: {
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
  }
})
