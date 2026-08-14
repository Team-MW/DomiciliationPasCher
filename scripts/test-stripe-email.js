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
    const email = 'travauxsudouest31@gmail.com';
    const customers = await stripe.customers.list({ email, limit: 10 });
    console.log("Customers found:", customers.data.map(c => c.id));
}
test();
