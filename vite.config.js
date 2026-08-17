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

      if (req.url === '/api/emailjs' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { email, nom, type, amount, paymentLink } = body;
            
            if (!email) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "L'email est requis." }));
              return;
            }

            let serviceId = null;
            let templateId = null;
            let publicKey = null;
            let privateKey = null;

            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const getEnv = (key) => {
                    const match = content.match(new RegExp(`${key}=(.*)`));
                    return match ? match[1].trim() : null;
                };
                serviceId = getEnv('EMAILJS_SERVICE_ID');
                templateId = getEnv('EMAILJS_TEMPLATE_ID');
                publicKey = getEnv('VITE_EMAILJS_PUBLIC_KEY');
                privateKey = getEnv('EMAILJS_PRIVATE_KEY');
            }
            if (!serviceId) serviceId = process.env.EMAILJS_SERVICE_ID;
            if (!templateId) templateId = process.env.EMAILJS_TEMPLATE_ID;
            if (!publicKey) publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY;
            if (!privateKey) privateKey = process.env.EMAILJS_PRIVATE_KEY;

            let message = "Votre paiement a été validé avec succès. Merci de créer votre compte Espace Client et de déposer vos pièces justificatives.";
            if (type === 'payment_failed') {
                message = "Bonjour,\n\nNous vous informons qu'un incident est survenu lors de votre dernier règlement.\n\nAfin de maintenir la continuité de vos services et l'accès à votre courrier, nous vous invitons à mettre à jour vos informations de facturation depuis votre espace personnel.\n\nVous pouvez régulariser la situation en vous connectant ici : https://domiciliation-pas-cher.fr/espace-client\n\nBien cordialement,\nLe service comptabilité";
            } else if (type === 'post_signature') {
                message = `Bonjour ${nom || 'Client'},\n\nNous vous confirmons la signature de votre contrat. Ce document est dès à présent disponible dans votre espace sécurisé.\n\nAfin de finaliser l'ouverture de votre dossier, nous vous invitons à nous transmettre vos pièces justificatives (Pièce d'identité, justificatif de domicile, extrait Kbis) directement depuis l'onglet "Mes Documents".\n\nAccédez à votre portail ici : https://domiciliation-pas-cher.fr/espace-client\n\nBien cordialement,\nLe service client`;
            } else if (type === 'procuration_postale') {
                message = `Bonjour ${nom || 'Client'},\n\nAfin que notre centre puisse réceptionner vos courriers recommandés, la mise en place d'une procuration postale est requise.\n\nNous vous invitons à réaliser cette démarche sur le site officiel de La Poste :\nhttps://www.laposte.fr/donner-procuration/informations-mandant\n\nBien cordialement,\nLe service administratif`;
            }
            
            let finalTemplateId = templateId;
            if (type === 'payment_reminder' || type === 'payment_failed') {
                finalTemplateId = 'template_717kmpr';
            }

            const templateParams = {
                to_email: email,
                to_name: nom || "Client",
                message: message
            };

            if (type === 'payment_reminder' || type === 'payment_failed') {
                templateParams.name = nom || "Client";
                templateParams.amount = amount || "le montant dû";
                templateParams.paymentLink = paymentLink || "https://domiciliation-pas-cher.fr/espace-client";
            }

            // Fallback for vite when offline/no keys
            if (!serviceId || !publicKey) {
               console.warn("MOCK EMAILJS SEND (Keys missing):", templateParams);
               res.statusCode = 200;
               res.setHeader('Content-Type', 'application/json');
               res.end(JSON.stringify({ success: true, mock: true }));
               return;
            }

            const fetchRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: serviceId,
                    template_id: finalTemplateId,
                    user_id: publicKey,
                    accessToken: privateKey,
                    template_params: templateParams
                })
            });

            if (fetchRes.ok) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
            } else {
                const errTxt = await fetchRes.text();
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: errTxt }));
            }
          } catch (e) {
            console.error("Vite EmailJS Error:", e);
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

            const sessionParams = {
              payment_method_types: ['card'],
              line_items: [
                {
                  price_data: priceData,
                  quantity: 1,
                },
              ],
              mode: isOneTime ? 'payment' : 'subscription',
              allow_promotion_codes: body.interval === 'month',
              success_url: body.successUrl || `http://localhost:5173/?success=true`,
              cancel_url: body.cancelUrl || `http://localhost:5173/souscription`,
            };

            if (body.email) {
              sessionParams.customer_email = body.email;
            }

            const session = await stripe.checkout.sessions.create(sessionParams);

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

      if (req.url.startsWith('/api/list-payments')) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const email = urlObj.searchParams.get('email');
        const customerId = urlObj.searchParams.get('customerId');
        const since = urlObj.searchParams.get('since');

        try {
          if (!email && !customerId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Email or CustomerId is required' }));
            return;
          }

          let sinceUnix = 0;
          if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
              // On soustrait 2 jours pour éviter les problèmes de fuseaux horaires 
              // ou si le paiement a été fait juste avant l'enregistrement en base
              sinceUnix = Math.floor(sinceDate.getTime() / 1000) - (2 * 24 * 60 * 60);
            }
          }

          let secretKey = null;
          if (fs.existsSync('.env.local')) {
            const envContent = fs.readFileSync('.env.local', 'utf-8');
            const match = envContent.match(/STRIPE_SECRET_KEY=(.*)/);
            if (match) secretKey = match[1].trim();
          }
          if (!secretKey) secretKey = process.env.STRIPE_SECRET_KEY;

          if (!secretKey || secretKey === 'sk_live_remplace_moi' || secretKey.startsWith('pk_')) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ payments: [] }));
            return;
          }

          const stripe = new Stripe(secretKey);
          let customerIds = [];

          if (customerId) {
            customerIds = [customerId];
          } else if (email) {
            const customers = await stripe.customers.list({ email: email.trim().toLowerCase(), limit: 100 });
            customerIds = customers.data.map(c => c.id);
          }

          if (customerIds.length === 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ payments: [], subscriptionStatus: 'non_trouvé' }));
            return;
          }

          let subscriptionStatus = 'active'; // par défaut
          for (const cid of customerIds) {
            try {
              const subs = await stripe.subscriptions.list({ customer: cid, status: 'all', limit: 1 });
              if (subs.data.length > 0) {
                  subscriptionStatus = subs.data[0].status;
                  break;
              }
            } catch (err) {
              if (err.code === 'resource_missing') {
                  console.warn(`[Stripe] Customer ${cid} introuvable (probablement supprimé).`);
              }
            }
          }

          const allInvoices = [];
          const allPIs = [];
          for (const cid of customerIds) {
            try {
              const paymentIntents = await stripe.paymentIntents.list({ customer: cid, limit: 100 });
              allPIs.push(...paymentIntents.data);

              const invoices = await stripe.invoices.list({ customer: cid, limit: 100 });
              allInvoices.push(...invoices.data);
            } catch (err) {
              if (err.code !== 'resource_missing') throw err;
            }
          }

          const uniquePayments = new Map();
          const invoicePiIds = new Set();

          for (const inv of allInvoices) {
            if (inv.created < sinceUnix) continue;
            if (inv.status === 'draft' || inv.status === 'void') continue;

            if (inv.payment_intent) invoicePiIds.add(typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent.id);

            uniquePayments.set(inv.id, {
                id: inv.id,
                amount: inv.amount_paid / 100,
                currency: inv.currency,
                status: inv.status === 'paid' ? 'payé' : 'échec',
                date: new Date(inv.created * 1000).toISOString().split('T')[0],
                method: 'Carte (Stripe)',
                invoice_ref: inv.number || `FAC-${new Date(inv.created * 1000).getFullYear()}${String(new Date(inv.created * 1000).getMonth() + 1).padStart(2, '0')}`
            });
          }

          for (const pi of allPIs) {
            if (pi.created < sinceUnix) continue;
            if (invoicePiIds.has(pi.id)) continue;

            uniquePayments.set(pi.id, {
                id: pi.id,
                amount: pi.amount / 100,
                currency: pi.currency,
                status: pi.status === 'succeeded' ? 'payé' : 'échec',
                date: new Date(pi.created * 1000).toISOString().split('T')[0],
                method: pi.payment_method_types?.[0] === 'card' ? 'Carte (Stripe)' : (pi.payment_method_types?.[0] || 'Stripe'),
                invoice_ref: pi.description || `FAC-${new Date(pi.created * 1000).getFullYear()}${String(new Date(pi.created * 1000).getMonth() + 1).padStart(2, '0')}`
            });
          }

          const payments = Array.from(uniquePayments.values());
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ payments, subscriptionStatus }));
        } catch (e) {
          console.error("Vite Stripe Sync Error:", e);
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
