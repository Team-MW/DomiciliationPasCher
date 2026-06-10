import fs from 'fs';
import { connect } from '@planetscale/database';

// Charger les variables d'environnement
let envContent = '';
if (fs.existsSync('.env.local')) {
    envContent = fs.readFileSync('.env.local', 'utf-8');
} else if (fs.existsSync('.env')) {
    envContent = fs.readFileSync('.env', 'utf-8');
}

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const config = {
    host: env.VITE_DATABASE_HOST,
    username: env.VITE_DATABASE_USERNAME,
    password: env.VITE_DATABASE_PASSWORD
};

const conn = connect(config);

/**
 * Script de nettoyage des doublons de paiements Stripe
 * Supprime les paiements en double basés sur invoice_ref (STRIPE-xxx)
 * Garde seulement le plus récent pour chaque invoice_ref
 */

async function cleanupDuplicatePayments() {
    console.log('🔍 Début du nettoyage des doublons de paiements...');
    
    try {
        // 1. Récupérer tous les paiements
        const allPaymentsRes = await conn.execute('SELECT * FROM payments ORDER BY date DESC');
        const allPayments = allPaymentsRes.rows;
        
        console.log(`📊 Total paiements dans la base: ${allPayments.length}`);
        
        // 2. Grouper par invoice_ref
        const paymentsByRef = new Map();
        
        for (const payment of allPayments) {
            const ref = payment.invoice_ref;
            if (!paymentsByRef.has(ref)) {
                paymentsByRef.set(ref, []);
            }
            paymentsByRef.get(ref).push(payment);
        }
        
        // 3. Identifier les doublons (plus d'un paiement avec le même invoice_ref)
        const duplicates = [];
        for (const [ref, payments] of paymentsByRef) {
            if (payments.length > 1) {
                // Trier par date (plus récent en premier)
                payments.sort((a, b) => new Date(b.date) - new Date(a.date));
                // Garder le premier (plus récent), marquer les autres comme doublons
                const toKeep = payments[0];
                const toDelete = payments.slice(1);
                duplicates.push({ ref, toKeep, toDelete });
            }
        }
        
        console.log(`🔍 ${duplicates.length} invoice_ref avec des doublons trouvés`);
        
        if (duplicates.length === 0) {
            console.log('✅ Aucun doublon trouvé. Base de données propre.');
            return;
        }
        
        // 4. Afficher les doublons trouvés
        console.log('\n📋 Doublons détectés:');
        for (const dup of duplicates) {
            console.log(`\nInvoice Ref: ${dup.ref}`);
            console.log(`  ✅ Garder: ID=${dup.toKeep.id}, Date=${dup.toKeep.date}, Montant=${dup.toKeep.amount}€`);
            for (const del of dup.toDelete) {
                console.log(`  ❌ Supprimer: ID=${del.id}, Date=${del.date}, Montant=${del.amount}€`);
            }
        }
        
        // 5. Supprimer les doublons
        console.log('\n🗑️ Suppression des doublons...');
        let deletedCount = 0;
        
        for (const dup of duplicates) {
            for (const payment of dup.toDelete) {
                await conn.execute('DELETE FROM payments WHERE id = ?', [payment.id]);
                deletedCount++;
                console.log(`   ✅ Supprimé: ${payment.id}`);
            }
        }
        
        console.log(`\n✅ Nettoyage terminé! ${deletedCount} doublons supprimés.`);
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    }
}

// Exécuter le script
cleanupDuplicatePayments()
    .then(() => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script échoué:', error);
        process.exit(1);
    });
