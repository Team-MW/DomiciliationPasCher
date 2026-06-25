import dotenv from 'dotenv';
dotenv.config();
import { connect } from '@planetscale/database';
const config = {
    host: process.env.VITE_DATABASE_HOST,
    username: process.env.VITE_DATABASE_USERNAME,
    password: process.env.VITE_DATABASE_PASSWORD
};
const conn = connect(config);
async function test() {
    try {
        const res = await conn.execute("DESCRIBE documents");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    }
}
test();
