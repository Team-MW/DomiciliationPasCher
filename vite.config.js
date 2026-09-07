import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import Stripe from 'stripe'

// Adapte une réponse Node à l'interface `res` attendue par les handlers Vercel.
const makeVercelRes = (res) => {
  const wrapper = {
    status: (code) => { res.statusCode = code; return wrapper; },
    json: (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return wrapper;
    },
    send: (data) => { res.end(data); return wrapper; },
  };
  return wrapper;
};

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

      if (req.url === '/api/clerk-invite' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            req.body = body;

            // Charger la clé secrète Clerk
            if (!process.env.CLERK_SECRET_KEY) {
              const fs = await import('fs');
              let sk = null;
              if (fs.existsSync('.env.local')) {
                const match = fs.readFileSync('.env.local', 'utf-8').match(/CLERK_SECRET_KEY=(.*)/);
                if (match) sk = match[1].trim();
              }
              if (!sk && fs.existsSync('.env')) {
                const match = fs.readFileSync('.env', 'utf-8').match(/CLERK_SECRET_KEY=(.*)/);
                if (match) sk = match[1].trim();
              }
              if (sk) process.env.CLERK_SECRET_KEY = sk;
            }

            const { default: handler } = await import('./api/clerk-invite.js');
            
            const resMock = {
              status: (code) => {
                res.statusCode = code;
                return resMock;
              },
              json: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              }
            };

            await handler(req, resMock);
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      if (req.url === '/api/email' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            req.body = body;

            const { default: handler } = await import('./api/email.js');
            
            const resMock = {
              status: (code) => {
                res.statusCode = code;
                return resMock;
              },
              json: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              }
            };

            await handler(req, resMock);
          } catch (e) {
            console.error("Vite SMTP Error:", e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }


      if (req.url === '/api/checkout' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString() });
        req.on('end', async () => {
          try {
            req.body = JSON.parse(bodyStr || '{}');
            const { default: handler } = await import('./api/checkout.js');
            await handler(req, makeVercelRes(res));
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
      if ((req.url === '/api/update-client-extra' || req.url.startsWith('/api/update-client-extra?')) && req.method === 'POST') {
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

      // Handle log-signature endpoint
      if ((req.url === '/api/log-signature' || req.url.startsWith('/api/log-signature?')) && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          console.log('[log-signature] Request received');
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { clientId, contractRef, signeeName, signeeEmail } = body;

            if (!clientId || !contractRef || !signeeName || !signeeEmail) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing parameters' }));
              return;
            }

            const readEnvVar = (file, key) => {
              try {
                if (fs.existsSync(file)) {
                  const content = fs.readFileSync(file, 'utf-8');
                  const match = content.match(new RegExp(`^${key}=(.*)`, 'm'));
                  if (match) {
                    return match[1].trim().replace(/^['"]|['"]$/g, '');
                  }
                }
              } catch (_) {}
              return null;
            };

            const dbHost     = readEnvVar('.env.local', 'VITE_DATABASE_HOST')     || readEnvVar('.env', 'VITE_DATABASE_HOST');
            const dbUsername = readEnvVar('.env.local', 'VITE_DATABASE_USERNAME') || readEnvVar('.env', 'VITE_DATABASE_USERNAME');
            const dbPassword = readEnvVar('.env.local', 'VITE_DATABASE_PASSWORD') || readEnvVar('.env', 'VITE_DATABASE_PASSWORD');

            if (!dbHost || !dbUsername || !dbPassword) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Configuration DB manquante' }));
              return;
            }

            const { connect } = await import('@planetscale/database');
            const conn = connect({ host: dbHost, username: dbUsername, password: dbPassword });

            let ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
            if (ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0].trim();

            const sql = `
                INSERT INTO signature_logs 
                (client_id, contract_ref, signee_name, signee_email, ip_address)
                VALUES (?, ?, ?, ?, ?)
            `;
            const result = await conn.execute(sql, [clientId, contractRef, signeeName, signeeEmail, ipAddress]);
            
            const selectSql = `SELECT signed_at FROM signature_logs WHERE id = ?`;
            const selectResult = await conn.execute(selectSql, [result.insertId]);
            let signedAt = new Date().toISOString();
            if (selectResult.rows && selectResult.rows.length > 0) {
                signedAt = selectResult.rows[0].signed_at;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, logId: result.insertId, ipAddress, signedAt }));
          } catch (e) {
            console.error('[log-signature] ❌ Error:', e.message);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message || 'Internal server error' }));
            }
          }
        });
        return;
      }

      if (req.url === '/api/change-plan' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          try {
            req.body = JSON.parse(bodyStr || '{}');
            const { default: handler } = await import('./api/change-plan.js');
            await handler(req, makeVercelRes(res));
          } catch (e) {
            console.error('Vite change-plan error:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      if (req.url.startsWith('/api/list-payments')) {
        // Délégation au handler de production : dupliquer cette logique ici a déjà
        // provoqué des divergences dev/prod (doublons, montants à 0, faux impayés).
        try {
          const { default: handler } = await import('./api/list-payments.js');
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          req.query = Object.fromEntries(urlObj.searchParams);
          await handler(req, makeVercelRes(res));
        } catch (e) {
          console.error('Vite Stripe Sync Error:', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }
      if (req.url === '/api/create-portal-session' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { customerId } = body;

            if (!customerId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Customer ID is required' }));
              return;
            }

            let secretKey = null;
            if (fs.existsSync('.env.local')) {
              const envContent = fs.readFileSync('.env.local', 'utf-8');
              const match = envContent.match(/STRIPE_SECRET_KEY=(.*)/);
              if (match) secretKey = match[1].trim();
            }
            if (!secretKey) secretKey = process.env.STRIPE_SECRET_KEY;

            if (!secretKey || secretKey === 'sk_live_remplace_moi' || secretKey.startsWith('pk_')) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }));
              return;
            }

            const stripe = new Stripe(secretKey);
            const returnUrl = req.headers.referer || `http://${req.headers.host}/espace-client`;

            const session = await stripe.billingPortal.sessions.create({
              customer: customerId,
              return_url: returnUrl,
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: session.url }));
          } catch (e) {
            console.error("Vite Stripe Portal Error:", e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      if (req.url === '/api/ensure-stripe-customer' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { email, name } = body;

            if (!email) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Email is required' }));
              return;
            }

            let secretKey = null;
            if (fs.existsSync('.env.local')) {
              const envContent = fs.readFileSync('.env.local', 'utf-8');
              const match = envContent.match(/STRIPE_SECRET_KEY=(.*)/);
              if (match) secretKey = match[1].trim();
            }
            if (!secretKey) secretKey = process.env.STRIPE_SECRET_KEY;

            if (!secretKey || secretKey === 'sk_live_remplace_moi' || secretKey.startsWith('pk_')) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }));
              return;
            }

            const stripe = new Stripe(secretKey);
            const cleanEmail = email.trim().toLowerCase();
            const customers = await stripe.customers.list({ email: cleanEmail, limit: 1 });

            let customerId;
            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
                if (name && !customers.data[0].name) {
                    await stripe.customers.update(customerId, { name });
                }
            } else {
                const newCustomer = await stripe.customers.create({
                    email: cleanEmail,
                    name: name || undefined,
                    metadata: { source: 'auto_ensure_customer' }
                });
                customerId = newCustomer.id;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ customerId }));
          } catch (e) {
            console.error("Vite Stripe Ensure Customer Error:", e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      // Handlers GET servis tels quels : sans ce routage, Vite renvoie le code source
      // du fichier au lieu de l'exécuter, et le front reçoit du JS à la place du JSON.
      const passthroughGetRoutes = [
        'stripe-failed-payments',
        'get-payment-method',
        'stripe-customers',
        'verify-session',
      ];
      const passthrough = passthroughGetRoutes.find(name => req.url.startsWith(`/api/${name}`));
      if (passthrough && req.method === 'GET') {
        try {
          const { default: handler } = await import(`./api/${passthrough}.js`);
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          req.query = Object.fromEntries(urlObj.searchParams);
          await handler(req, makeVercelRes(res));
        } catch (e) {
          console.error(`Vite API Error (${passthrough}):`, e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      if (req.url === '/api/stripe-stats' && req.method === 'GET') {
        try {
          const { default: handler } = await import('./api/stripe-stats.js');
          
          const customRes = {
            status: (code) => {
              res.statusCode = code;
              return customRes;
            },
            json: (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            }
          };
          
          await handler(req, customRes);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
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
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
    fileParallelism: false,
  }
})
