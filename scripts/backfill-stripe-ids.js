import { adminDataService } from '../src/services/adminDataService.js';
import Stripe from 'stripe';
import fs from 'fs';

async function backfill() {
    let secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        try {
            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) secretKey = match[1].trim();
            } else if (fs.existsSync('.env')) {
                const content = fs.readFileSync('.env', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) secretKey = match[1].trim();
            }
        } catch (e) { }
    }

    if (!secretKey || secretKey === 'sk_live_remplace_moi') {
        console.error("Clé secrète Stripe introuvable.");
        return;
    }

    const stripe = new Stripe(secretKey);
    const clients = await adminDataService.getClients();
    
    let updatedCount = 0;

    for (const client of clients) {
        let extraInfo = {};
        if (client.extra_info) {
            try {
                extraInfo = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
            } catch (e) {}
        }

        if (!extraInfo.stripe_customer_id && client.email) {
            console.log(`Recherche Stripe ID pour ${client.email}...`);
            try {
                const customers = await stripe.customers.list({ email: client.email.trim().toLowerCase(), limit: 1 });
                if (customers.data.length > 0) {
                    const customerId = customers.data[0].id;
                    extraInfo.stripe_customer_id = customerId;
                    
                    // Mise à jour de la DB
                    await adminDataService.updateClientExtraInfo(client.id, { stripe_customer_id: customerId });
                    console.log(`✅ ID Stripe ${customerId} ajouté pour ${client.company}`);
                    updatedCount++;
                } else {
                    console.log(`❌ Aucun compte Stripe trouvé pour ${client.email}`);
                }
            } catch (err) {
                console.error(`Erreur pour ${client.email}:`, err.message);
            }
        }
    }

    console.log(`Terminé. ${updatedCount} clients mis à jour.`);
    process.exit(0);
}

backfill();
