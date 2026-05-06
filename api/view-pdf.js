
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send("URL manquante");
    }

    try {
        // Charger les clés depuis .env de manière sécurisée
        let cloud_name, api_key, api_secret;
        const envFile = fs.existsSync('.env') ? '.env' : '.env.local';
        const envContent = fs.readFileSync(envFile, 'utf-8');
        cloud_name = envContent.match(/VITE_CLOUDINARY_CLOUD_NAME=(.*)/)?.[1]?.trim();
        api_key = envContent.match(/VITE_CLOUDINARY_API_KEY=(.*)/)?.[1]?.trim();
        api_secret = envContent.match(/VITE_CLOUDINARY_API_SECRET=(.*)/)?.[1]?.trim();

        if (!api_secret) {
            throw new Error("Clés Cloudinary manquantes dans le .env");
        }

        // Extraire le public_id
        const parts = url.split('/upload/');
        if (parts.length < 2) throw new Error("URL Cloudinary invalide");
        
        let publicIdWithExt = parts[1].split('/').slice(1).join('/');
        if (!publicIdWithExt.includes('/')) publicIdWithExt = parts[1];
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");

        cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

        // Générer une URL signée officielle
        const signedUrl = cloudinary.url(publicId, {
            sign_url: true,
            resource_type: 'image',
            secure: true
        });

        // Télécharger le fichier depuis le serveur
        const response = await fetch(signedUrl);
        
        if (!response.ok) {
            throw new Error(`Cloudinary a répondu ${response.status}`);
        }

        const buffer = await response.arrayBuffer();

        // Renvoyer le fichier au navigateur
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
        res.status(200).send(Buffer.from(buffer));

    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).send(`Erreur de récupération : ${error.message}`);
    }
}
