import { createClerkClient } from '@clerk/backend';
import { requireAdmin, sendServerError } from './_auth.js';
import { readServerEnv } from './_env.js';
import { getBaseUrl } from './_email-kit.js';

/** Invitation Clerk d'un client créé par l'admin. Réservé à l'admin. */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body || {};
    if (!email) {
        return res.status(400).json({ error: 'Email manquant' });
    }

    const clerkSecretKey = readServerEnv('CLERK_SECRET_KEY');
    if (!clerkSecretKey) {
        console.error('CLERK_SECRET_KEY manquant');
        return res.status(500).json({ error: 'Configuration serveur manquante (Secret Key)' });
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    try {
        const clerk = createClerkClient({ secretKey: clerkSecretKey });
        const baseUrl = readServerEnv('PUBLIC_SITE_URL') || getBaseUrl(req);
        const invitation = await clerk.invitations.createInvitation({
            emailAddress: String(email).trim().toLowerCase(),
            redirectUrl: `${baseUrl}/inscription`,
            publicMetadata: { role: 'client' },
            ignoreExisting: true,
        });
        // Ne jamais renvoyer l'objet complet : il contient le lien (ticket) d'inscription.
        return res.status(200).json({
            message: 'Invitation envoyée avec succès',
            invitation: { id: invitation?.id, status: invitation?.status },
        });
    } catch (error) {
        return sendServerError(res, error, 'clerk-invite');
    }
}
