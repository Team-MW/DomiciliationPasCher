import { adminDataService } from './src/services/adminDataService.js';
import fs from 'fs';

async function run() {
    try {
        const clients = await adminDataService.getClients();
        fs.writeFileSync('clients-dump.json', JSON.stringify(clients.slice(0, 5), null, 2));
        console.log('Dumped to clients-dump.json');
    } catch(e) {
        console.error(e);
    }
}
run();
