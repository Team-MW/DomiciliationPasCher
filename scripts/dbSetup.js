import { connect } from '@planetscale/database';
import 'dotenv/config';

const config = {
    host: process.env.VITE_DATABASE_HOST,
    username: process.env.VITE_DATABASE_USERNAME,
    password: process.env.VITE_DATABASE_PASSWORD
};

const conn = connect(config);

async function setup() {
    console.log('🚀 Réinitialisation et Initialisation de la base de données PlanetScale...');

    try {
        await conn.execute(`DROP TABLE IF EXISTS clients`);
        await conn.execute(`DROP TABLE IF EXISTS mail`);
        await conn.execute(`DROP TABLE IF EXISTS demandes`);
        await conn.execute(`DROP TABLE IF EXISTS documents`);
        await conn.execute(`DROP TABLE IF EXISTS bookings`);

        await conn.execute(`CREATE TABLE clients (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            company VARCHAR(255),
            city VARCHAR(100),
            plan VARCHAR(50),
            status VARCHAR(50),
            since VARCHAR(50),
            renewal VARCHAR(50),
            clerkId VARCHAR(100),
            clerkStatus VARCHAR(50)
        )`);

        await conn.execute(`CREATE TABLE IF NOT EXISTS mail (
            id VARCHAR(100) PRIMARY KEY,
            clientId VARCHAR(100),
            company VARCHAR(255),
            type VARCHAR(100),
            \`from\` VARCHAR(255),
            date VARCHAR(50),
            status VARCHAR(50),
            preview TEXT
        )`);

        await conn.execute(`CREATE TABLE IF NOT EXISTS demandes (
            id VARCHAR(100) PRIMARY KEY,
            clientName VARCHAR(255),
            email VARCHAR(255),
            company VARCHAR(255),
            plan VARCHAR(50),
            amount DECIMAL(10,2),
            date VARCHAR(50),
            status VARCHAR(50)
        )`);

        await conn.execute(`CREATE TABLE IF NOT EXISTS documents (
            id VARCHAR(100) PRIMARY KEY,
            clientId VARCHAR(100),
            name VARCHAR(255),
            size VARCHAR(50),
            type VARCHAR(100),
            uploadedAt VARCHAR(50),
            owner VARCHAR(50),
            folder VARCHAR(100),
            url TEXT
        )`);

        await conn.execute(`CREATE TABLE IF NOT EXISTS bookings (
            id VARCHAR(100) PRIMARY KEY,
            clientId VARCHAR(100),
            type VARCHAR(100),
            date VARCHAR(50),
            duration VARCHAR(50),
            status VARCHAR(50),
            createdAt VARCHAR(50)
        )`);

        console.log('✅ Tables créées avec succès !');

        // SEED DATA
        console.log('🌱 Seeding initial data...');

        // Seed Clients
        for (const c of INITIAL_DATA.clients) {
            await conn.execute(
                `INSERT IGNORE INTO clients (id, name, email, company, city, plan, status, since, renewal, clerkId, clerkStatus) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [c.id, c.name, c.email, c.company, c.city, c.plan, c.status, c.since, c.renewal, '', 'mock_initial']
            );
        }

        // Seed Mail
        for (const m of INITIAL_DATA.mail) {
            await conn.execute(
                `INSERT IGNORE INTO mail (id, clientId, company, type, \`from\`, date, status, preview) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [m.id, m.clientId, m.company, m.type, m.from, m.date, m.status, m.preview]
            );
        }

        // Seed Demandes
        for (const d of INITIAL_DATA.demandes) {
            await conn.execute(
                `INSERT IGNORE INTO demandes (id, clientName, email, company, plan, amount, date, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [d.id, d.clientName, d.email, d.company, d.plan, d.amount, d.date, d.status]
            );
        }

        // Seed Documents
        for (const clientId in INITIAL_DATA.documents) {
            for (const doc of INITIAL_DATA.documents[clientId]) {
                await conn.execute(
                    `INSERT IGNORE INTO documents (id, clientId, name, size, type, uploadedAt, owner, folder, url) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [doc.id, clientId, doc.name, doc.size, doc.type, doc.uploadedAt, doc.owner, doc.folder || 'Documents', doc.url]
                );
            }
        }

        console.log('✅ Données initiales insérées avec succès !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la configuration :', error);
        process.exit(1);
    }
}

const INITIAL_DATA = {
    clients: [
        { id: '1', name: 'Marie Lambert', email: 'marie.l@gmail.com', company: 'ML Consulting', city: 'Lyon', plan: 'Scan+', status: 'actif', since: '2024-11-15', renewal: '2025-11-15', stats: { mail: 12, spent: 450 } },
        { id: '2', name: 'Thomas Bernard', email: 'thomas.b@startup.io', company: 'Bernard Tech', city: 'Paris', plan: 'Essentiel', status: 'actif', since: '2024-10-02', renewal: '2025-10-02', stats: { mail: 5, spent: 230 } },
    ],
    mail: [
        { id: 'm1', clientId: '1', company: 'ML Consulting', type: 'Recommandé', from: 'URSSAF', date: '2025-03-04', status: 'non lu', preview: null },
        { id: 'm2', clientId: '1', company: 'ML Consulting', type: 'Lettre Simple', from: 'Banque Populaire', date: '2025-03-01', status: 'lu', preview: null },
        { id: 'm3', clientId: '2', company: 'Bernard Tech', type: 'Pli Administratif', from: 'Impôts Gouv', date: '2025-03-03', status: 'non lu', preview: null },
    ],
    demandes: [
        { id: 'req1', clientName: 'Jean Dupont', email: 'j.dupont@web.fr', company: 'Dupont Web', plan: 'Scan+', amount: '28.00', date: '2025-03-04T10:15:00', status: 'en_attente' },
        { id: 'req2', clientName: 'Alice Roche', email: 'alice@design.com', company: 'Alice Studio', plan: 'Essentiel', amount: '23.00', date: '2025-03-04T09:20:00', status: 'en_attente' },
    ],
    documents: {
        '1': [
            { id: 'd1', name: 'KBIS_2024.pdf', size: '250KB', type: 'application/pdf', uploadedAt: '2024-11-16', owner: 'client', url: '#' },
            { id: 'd2', name: 'IDCard_Recto.jpg', size: '1.2MB', type: 'image/jpeg', uploadedAt: '2024-11-16', owner: 'client', url: '#' },
            { id: 'd3', name: 'Contrat_Domiciliation.pdf', size: '1.5MB', type: 'application/pdf', uploadedAt: '2024-11-15', owner: 'admin', url: '#' }
        ],
        '2': [
            { id: 'd4', name: 'Contrat_Essentiel.pdf', size: '800KB', type: 'application/pdf', uploadedAt: '2024-10-02', owner: 'admin', url: '#' }
        ]
    }
};

setup();
