import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const res = await fetch('http://localhost:5173/api/list-payments?email=benilias757@gmail.com');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
run();
