import dotenv from 'dotenv';
import Stripe from 'stripe';
dotenv.config({ path: '.env.local' });

async function run() {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customers = await stripe.customers.list({ email: 'benilias757@gmail.com' });
    
    for (const c of customers.data) {
        console.log(`=== Customer: ${c.id} ===`);
        const pis = await stripe.paymentIntents.list({ customer: c.id, limit: 10 });
        pis.data.forEach(pi => {
            console.log(`PI ${pi.id} - status: ${pi.status}, error: ${pi.last_payment_error ? pi.last_payment_error.code : 'none'}`);
        });
        const invs = await stripe.invoices.list({ customer: c.id, limit: 10 });
        invs.data.forEach(inv => {
            console.log(`INV ${inv.id} - status: ${inv.status}, paid: ${inv.paid}, attempts: ${inv.attempt_count}`);
        });
    }
}
run();
