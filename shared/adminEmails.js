/**
 * Administrateurs inscrits dans le code : toujours admins, EN PLUS de ceux de la variable VITE_ADMIN_EMAILS (Vercel).
 * Une variable mal renseignée ou absente ne peut donc plus enlever l'accès à l'un d'eux.
 * Source unique pour le navigateur (src/utils/adminEmail.js) et le serveur (api/_auth.js).
 */
export const BUILT_IN_ADMIN_EMAILS = Object.freeze([
    'mwcrea.agency@gmail.com',
    'cimacludovic@gmail.com',
]);
