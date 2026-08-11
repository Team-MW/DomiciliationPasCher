import dotenv from 'dotenv';
import Stripe from 'stripe';
dotenv.config({ path: '.env.local' });

async function run() {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const pis = await stripe.paymentIntents.search({ query: 'status:"requires_payment_method"', limit: 10 });
    console.log("=== ALL FAILED PIS ===");
    pis.data.forEach(pi => {
        console.log(`PI ${pi.id} - email: ${pi.receipt_email || 'none'}, status: ${pi.status}, error: ${pi.last_payment_error ? pi.last_payment_error.code : 'none'}`);
    });
}
run();
