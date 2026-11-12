import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Composant qui remonte automatiquement en haut de la page 
 * à chaque changement de navigation (clic sur un lien).
 */
export default function ScrollToTop() {
    const { pathname, search, hash } = useLocation();

    useEffect(() => {
        if (hash) {
            // Lien d'ancre (#domiciliation…) : on va à la section, au lieu de remonter en haut (ce qui annulait le clic).
            const el = document.getElementById(decodeURIComponent(hash.slice(1)));
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        }
        window.scrollTo(0, 0);
    }, [pathname, search, hash]);

    return null;
}
