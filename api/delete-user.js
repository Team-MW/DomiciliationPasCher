import { createClerkClient } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clerkId } = req.body;
    console.log('Tentative de suppression Clerk pour:', clerkId);

    if (!clerkId || clerkId === 'user_unknown') {
        return res.status(400).json({ error: 'ID Clerk manquant ou invalide' });
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
        console.error('CLERK_SECRET_KEY manquant dans .env');
        return res.status(500).json({ error: 'Configuration serveur manquante (Secret Key)' });
    }

    try {
        const clerk = createClerkClient({ secretKey: clerkSecretKey });
        await clerk.users.deleteUser(clerkId);
        console.log('Utilisateur supprimé avec succès de Clerk');
        return res.status(200).json({ message: 'Supprimé avec succès' });
    } catch (error) {
        console.error('Erreur Clerk SDK:', error.message);
        // Si l'utilisateur n'existe pas déjà, on considère ça comme un succès (déjà supprimé)
        if (error.status === 404) {
            return res.status(200).json({ message: 'Déjà supprimé de Clerk' });
        }
        return res.status(500).json({ error: error.message });
    }
}
