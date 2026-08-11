import dotenv from 'dotenv';
import Stripe from 'stripe';
dotenv.config({ path: '.env.local' });

async function run() {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const invs = await stripe.invoices.list({ status: 'open', limit: 10 });
    console.log("=== ALL OPEN INVOICES ===");
    invs.data.forEach(inv => {
        console.log(`INV ${inv.id} - customer_email: ${inv.customer_email}, status: ${inv.status}, paid: ${inv.paid}, attempts: ${inv.attempt_count}`);
    });
}
run();
