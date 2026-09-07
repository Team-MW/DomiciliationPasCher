import 'dotenv/config';
import { connect } from '@planetscale/database';

const config = {
    url: process.env.DATABASE_URL
};

const conn = connect(config);

async function main() {
    try {
        console.log("Altering mail table...");
        await conn.execute("ALTER TABLE mail MODIFY preview LONGTEXT;");
        console.log("Success!");
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
