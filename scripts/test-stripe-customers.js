import Stripe from 'stripe';
import fs from 'fs';

async function run() {
    let secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        if (fs.existsSync('.env.local')) {
            secretKey = fs.readFileSync('.env.local', 'utf-8').match(/STRIPE_SECRET_KEY=(.*)/)[1].trim();
        } else if (fs.existsSync('.env')) {
            secretKey = fs.readFileSync('.env', 'utf-8').match(/STRIPE_SECRET_KEY=(.*)/)[1].trim();
        }
    }
    const stripe = new Stripe(secretKey);
    const customers = await stripe.customers.list({ limit: 20 });
    customers.data.forEach(c => console.log(c.id, c.email, c.name));
    
    // Check if we can search for one of them specifically
    const search = await stripe.customers.search({
      query: 'email:"ist.express1@gmail.com"',
    });
    console.log("Search result for ist.express1@gmail.com:", search.data.map(c => c.id));
}
run();
