/**
 * Preuve « cette personne reçoit bien les emails de cette adresse », glissée dans le lien « Créer mon accès »
 * de nos emails (?v=…). Celui qui ouvre le lien a forcément accès à la boîte : son compte de connexion est
 * validé automatiquement, sans code à saisir (fin des blocages « email non vérifié » après inscription).
 * HMAC de l'adresse avec la clé secrète du serveur : impossible à fabriquer pour l'adresse de quelqu'un d'autre.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readServerEnv } from './_env.js';

const norm = (email) => String(email || '').trim().toLowerCase();

export function signupProofToken(email) {
    const clean = norm(email);
    if (!clean) return '';
    return createHmac('sha256', readServerEnv('CLERK_SECRET_KEY') || 'dpc').update(`signup:${clean}`).digest('base64url').slice(0, 32);
}

export function isValidSignupProof(email, token) {
    const expected = Buffer.from(signupProofToken(email));
    const given = Buffer.from(String(token || ''));
    return expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given);
}
