import { useEffect, useRef, useState } from 'react';
import { useClerk, useSignIn } from '@clerk/clerk-react';

/**
 * Connexion par lien reçu par email (?ticket=…) : jeton Clerk à usage unique créé par notre serveur.
 * Ne dépend d'aucun email ni code envoyé par Clerk lui-même.
 * @returns {'idle'|'working'|'failed'}
 */
export function useTicketSignIn(ticket, afterAuth) {
    const { isLoaded, signIn } = useSignIn();
    const { setActive, signOut, session } = useClerk();
    const [state, setState] = useState(ticket ? 'working' : 'idle');
    const started = useRef(false);

    useEffect(() => {
        if (!ticket || !isLoaded || !signIn || started.current) return;
        started.current = true;
        (async () => {
            try {
                if (session) {
                    // Déjà connecté (souvent avec un autre compte) : Clerk refuserait le jeton. On ferme la session puis
                    // on revient sur ce même lien, une seule fois (garde anti-boucle).
                    const guard = `dpc_ticket_signout_${ticket.slice(-16)}`;
                    let done = false;
                    try { done = window.sessionStorage.getItem(guard) === '1'; window.sessionStorage.setItem(guard, '1'); } catch { /* stockage indisponible */ }
                    if (!done) {
                        await signOut({ redirectUrl: window.location.href });
                        return;
                    }
                }
                const attempt = await signIn.create({ strategy: 'ticket', ticket });
                if (attempt?.status === 'complete' && attempt.createdSessionId) {
                    await setActive({ session: attempt.createdSessionId });
                    window.location.replace(afterAuth);
                    return;
                }
                setState('failed');
            } catch (err) {
                console.error('Connexion par lien :', err);
                setState('failed');
            }
        })();
    }, [ticket, isLoaded, signIn, setActive, signOut, session, afterAuth]);

    return state;
}
