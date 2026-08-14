import fs from 'fs';
import Stripe from 'stripe';

async function test() {
    let secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        if (fs.existsSync('.env.local')) {
            const content = fs.readFileSync('.env.local', 'utf-8');
            const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
            if (match) secretKey = match[1].trim();
        }
    }
    const stripe = new Stripe(secretKey);
    try {
        const pi = await stripe.paymentIntents.retrieve('pi_3U2pYuBBllOzjDOT1Lv1cL3n');
        console.log("PI Found! Customer:", pi.customer);
    } catch(e) {
        console.log("Error:", e.message);
    }
}
test();
