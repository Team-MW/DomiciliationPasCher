/**
 * Lien de nos emails avec ?email=…&v=… (preuve signée que la personne reçoit les emails de cette adresse) : gardée
 * dès l'arrivée sur N'IMPORTE quelle page (/inscription, /connexion…). Après connexion, l'espace client l'utilise
 * pour valider le compte sans code (EmailVerifyPanel).
 */
export function captureSignupProofFromUrl(search = typeof window !== 'undefined' ? window.location.search : '') {
    try {
        const params = new URLSearchParams(search);
        const email = String(params.get('email') || '').trim().toLowerCase();
        const token = params.get('v') || '';
        if (!/^\S+@\S+\.\S+$/.test(email) || !/^[\w-]{16,64}$/.test(token)) return false;
        window.localStorage.setItem('dpc_signup_proof', JSON.stringify({ email, token }));
        return true;
    } catch {
        return false; // stockage indisponible
    }
}
