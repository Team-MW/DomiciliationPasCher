import { lazy } from 'react';

const RELOAD_FLAG = 'dpc_chunk_reload';

/**
 * Comme React.lazy, mais si le fichier de la page ne se charge pas (hors ligne, ou après un déploiement : les anciens
 * fichiers n'existent plus), on recharge la page UNE fois pour récupérer la version à jour, au lieu d'une page blanche.
 * Si ça échoue encore, l'erreur remonte au ErrorBoundary (message + bouton « Recharger »).
 */
export function loadWithRetry(factory) {
    return factory()
        .then((module) => {
            try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* stockage indisponible */ }
            return module;
        })
        .catch((error) => {
            try {
                if (!sessionStorage.getItem(RELOAD_FLAG)) {
                    sessionStorage.setItem(RELOAD_FLAG, '1');
                    window.location.reload();
                    return new Promise(() => {}); // la page se recharge : on n'affiche rien entre-temps
                }
            } catch { /* stockage indisponible : on laisse remonter l'erreur */ }
            throw error;
        });
}

export function lazyWithRetry(factory) {
    return lazy(() => loadWithRetry(factory));
}
