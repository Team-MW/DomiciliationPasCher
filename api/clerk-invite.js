import { createClerkClient } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email manquant' });
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
        console.error('CLERK_SECRET_KEY manquant dans .env');
        return res.status(500).json({ error: 'Configuration serveur manquante (Secret Key)' });
    }

    try {
        const clerk = createClerkClient({ secretKey: clerkSecretKey });
        
        // Obtenir l'URL de base dynamiquement
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = host ? `${protocol}://${host}` : 'https://domiciliation-pas-cher.fr';
        
        // Créer une invitation via l'API Clerk
        const invitation = await clerk.invitations.createInvitation({
            emailAddress: email,
            redirectUrl: `${baseUrl}/inscription`,
            publicMetadata: { role: 'client' },
            ignoreExisting: true // Si une invitation existe déjà pour cet email, ça renvoie l'existante
        });
        
        console.log('Invitation Clerk envoyée pour:', email);
        return res.status(200).json({ message: 'Invitation envoyée avec succès', invitation });
    } catch (error) {
        console.error('Erreur Clerk SDK Invitation:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
