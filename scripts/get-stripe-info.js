import fs from 'fs';
import Stripe from 'stripe';

async function getInfo() {
    try {
        let secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) secretKey = match[1].trim();
            }
        }

        if (!secretKey) {
            console.error("No STRIPE_SECRET_KEY found.");
            process.exit(1);
        }

        const stripe = new Stripe(secretKey);
        const customerId = 'cus_V2vPDlC5BmFO3a';
        
        console.log(`\n=== INFO FOR CUSTOMER: ${customerId} ===\n`);

        try {
            const customer = await stripe.customers.retrieve(customerId);
            console.log("--- CUSTOMER DETAILS ---");
            console.log(JSON.stringify(customer, null, 2));
        } catch(e) {
            console.log("Customer fetch failed:", e.message);
        }

        try {
            const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all' });
            console.log("\n--- SUBSCRIPTIONS ---");
            if (subscriptions.data.length === 0) console.log("No subscriptions found.");
            subscriptions.data.forEach(sub => {
                console.log(`Sub ID: ${sub.id} | Status: ${sub.status} | Current Period End: ${new Date(sub.current_period_end * 1000).toLocaleString()}`);
                if (sub.items.data.length > 0) {
                    console.log(`  Price ID: ${sub.items.data[0].price.id}`);
                    console.log(`  Amount: ${sub.items.data[0].price.unit_amount / 100} ${sub.items.data[0].price.currency.toUpperCase()}`);
                }
            });
        } catch(e) {
            console.log("Subscriptions fetch failed:", e.message);
        }

        try {
            const payments = await stripe.paymentIntents.list({ customer: customerId });
            console.log("\n--- RECENT PAYMENTS ---");
            if (payments.data.length === 0) console.log("No payments found.");
            payments.data.forEach(pi => {
                console.log(`Payment ID: ${pi.id} | Amount: ${pi.amount / 100} ${pi.currency.toUpperCase()} | Status: ${pi.status} | Date: ${new Date(pi.created * 1000).toLocaleString()}`);
            });
        } catch(e) {
            console.log("Payments fetch failed:", e.message);
        }

        try {
            const invoices = await stripe.invoices.list({ customer: customerId });
            console.log("\n--- RECENT INVOICES ---");
            if (invoices.data.length === 0) console.log("No invoices found.");
            invoices.data.forEach(inv => {
                console.log(`Invoice ID: ${inv.id} | Amount: ${inv.total / 100} ${inv.currency.toUpperCase()} | Status: ${inv.status} | Number: ${inv.number}`);
            });
        } catch(e) {
            console.log("Invoices fetch failed:", e.message);
        }
        
    } catch (e) {
        console.error("Error:", e);
    }
}

getInfo();
