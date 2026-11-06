import { createClerkClient } from '@clerk/backend';
import { requireAdmin, sendServerError } from './_auth.js';
import { readServerEnv } from './_env.js';

/** Suppression d'un compte Clerk. Réservé à l'admin, qui ne peut pas se supprimer lui-même. */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clerkId } = req.body || {};
    if (!clerkId || clerkId === 'user_unknown') {
        return res.status(400).json({ error: 'ID Clerk manquant ou invalide' });
    }

    const clerkSecretKey = readServerEnv('CLERK_SECRET_KEY');
    if (!clerkSecretKey) {
        console.error('CLERK_SECRET_KEY manquant');
        return res.status(500).json({ error: 'Configuration serveur manquante (Secret Key)' });
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.userId === clerkId) {
        return res.status(400).json({ error: 'Impossible de supprimer votre propre compte administrateur' });
    }

    try {
        const clerk = createClerkClient({ secretKey: clerkSecretKey });
        await clerk.users.deleteUser(clerkId);
        return res.status(200).json({ message: 'Supprimé avec succès' });
    } catch (error) {
        if (error?.status === 404) {
            return res.status(200).json({ message: 'Déjà supprimé de Clerk' });
        }
        return sendServerError(res, error, 'delete-user');
    }
}
