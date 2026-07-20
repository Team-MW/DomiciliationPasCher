import fs from 'fs';
import Stripe from 'stripe';

const envLocal = fs.readFileSync('.env.local', 'utf8');
const secretKey = envLocal.match(/STRIPE_SECRET_KEY=(.*)/)[1].trim();
const stripe = new Stripe(secretKey);

async function checkCustomer() {
    const customers = await stripe.customers.list({ email: 'altitoitoccitan@gmail.com' });
    if (customers.data.length === 0) {
        console.log("Customer not found.");
        return;
    }
    const customer = customers.data[0];
    console.log("Customer ID:", customer.id);
    
    const subscriptions = await stripe.subscriptions.list({ customer: customer.id });
    console.log("Subscriptions:", JSON.stringify(subscriptions.data, null, 2));

    const paymentIntents = await stripe.paymentIntents.list({ customer: customer.id });
    console.log("PaymentIntents:", JSON.stringify(paymentIntents.data.map(pi => ({
        id: pi.id, amount: pi.amount, status: pi.status, created: new Date(pi.created * 1000)
    })), null, 2));
}
checkCustomer();
