import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import Stripe from 'stripe'

// Plugin local pour simuler le VRAI backend sans avoir besoin de npx vercel dev
const localStripePlugin = {
  name: 'local-stripe-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/checkout' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString() });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');

            // Récupérer la clé directement
            let secretKey = process.env.STRIPE_SECRET_KEY;
            if (!secretKey && fs.existsSync('.env.local')) {
              const envContent = fs.readFileSync('.env.local', 'utf-8');
              const match = envContent.match(/STRIPE_SECRET_KEY=(.*)/);
              if (match) secretKey = match[1].trim();
            }

            if (!secretKey || secretKey === 'sk_live_remplace_moi' || secretKey.startsWith('pk_')) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Clé Sécrète Stripe manquante ou invalide (Ne mets pas 'pk_' dans STRIPE_SECRET_KEY, il faut 'sk_')." }));
              return;
            }

            const stripe = new Stripe(secretKey);

            const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [
                {
                  price_data: {
                    currency: 'eur',
                    product_data: { name: body.productName || 'Forfait' },
                    unit_amount: Math.round(body.amount * 100),
                    recurring: { interval: body.interval || 'month' },
                  },
                  quantity: 1,
                },
              ],
              mode: 'subscription',
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
      next();
    });
  }
}

export default defineConfig({
  plugins: [react(), localStripePlugin],
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
