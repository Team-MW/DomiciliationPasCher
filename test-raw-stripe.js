import dotenv from 'dotenv';
import Stripe from 'stripe';
dotenv.config({ path: '.env.local' });

async function run() {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customers = await stripe.customers.list({ email: 'benilias757@gmail.com' });
    if (customers.data.length === 0) return console.log('No customer');
    
    const cid = customers.data[0].id;
    const pis = await stripe.paymentIntents.list({ customer: cid, limit: 10 });
    
    console.log("=== RAW PIs ===");
    pis.data.forEach(pi => {
        console.log(`PI ${pi.id} - status: ${pi.status}, error: ${pi.last_payment_error ? pi.last_payment_error.code : 'none'}`);
    });
    
    const invs = await stripe.invoices.list({ customer: cid, limit: 10 });
    console.log("=== RAW INVOICES ===");
    invs.data.forEach(inv => {
        console.log(`INV ${inv.id} - status: ${inv.status}, paid: ${inv.paid}, attempts: ${inv.attempt_count}`);
    });
}
run();
