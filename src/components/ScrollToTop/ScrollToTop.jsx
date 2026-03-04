import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Composant qui remonte automatiquement en haut de la page 
 * à chaque changement de navigation (clic sur un lien).
 */
export default function ScrollToTop() {
    const { pathname, search, hash } = useLocation();

    useEffect(() => {
        // Remonte en haut de la page immédiatement
        window.scrollTo(0, 0);
    }, [pathname, search, hash]);

    return null;
}
