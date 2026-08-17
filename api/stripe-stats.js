import Stripe from 'stripe';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        let secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            if (fs.existsSync('.env.local')) {
                const content = fs.readFileSync('.env.local', 'utf-8');
                const match = content.match(/STRIPE_SECRET_KEY=(.*)/);
                if (match) secretKey = match[1].trim();
            }
        }

        if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");

        const stripe = new Stripe(secretKey);

        // 1. Calcul du MRR (Revenu Mensuel Récurrent) depuis les abonnements actifs
        let monthlyRevenue = 0;
        for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
            for (const item of sub.items.data) {
                if (item.plan && item.plan.amount) {
                    const amountInEur = item.plan.amount / 100;
                    
                    // Normaliser selon l'intervalle (ex: annuel -> mensuel)
                    let normalizedAmount = amountInEur * item.quantity;
                    if (item.plan.interval === 'year') {
                        normalizedAmount = normalizedAmount / 12;
                    }
                    
                    monthlyRevenue += normalizedAmount;
                }
            }
        }
        
        monthlyRevenue = Math.round(monthlyRevenue);

        // 2. Calcul de l'historique des 6 derniers mois
        const now = new Date();
        const last6Months = [];
        const monthlyData = {};
        const monthNamesShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${yyyy}-${mm}`;
            last6Months.push({
                key,
                label: `${monthNamesShort[d.getMonth()]} ${yyyy}`
            });
            monthlyData[key] = 0;
        }

        // Timestamp du premier jour d'il y a 5 mois (pour avoir 6 mois au total)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const sixMonthsAgoUnix = Math.floor(sixMonthsAgo.getTime() / 1000);

        // Récupérer les paiements (charges) réussis depuis 6 mois
        for await (const charge of stripe.charges.list({ created: { gte: sixMonthsAgoUnix }, limit: 100 })) {
            if (charge.paid && !charge.refunded && charge.status === 'succeeded') {
                const date = new Date(charge.created * 1000);
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const key = `${yyyy}-${mm}`;
                
                if (monthlyData[key] !== undefined) {
                    monthlyData[key] += (charge.amount / 100);
                }
            }
        }

        const revenueHistory = last6Months.map(m => ({
            label: m.label,
            revenue: Math.round(monthlyData[m.key])
        }));

        return res.status(200).json({ monthlyRevenue, revenueHistory });
    } catch (error) {
        console.error('Erreur Stripe Stats:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
