import { useEffect } from 'react';

/**
 * Révèle les blocs `.animate-in` (cachés par défaut dans index.css) quand ils entrent dans l'écran.
 * Sans ce mécanisme, toute page qui utilise `animate-in` reste BLANCHE (opacité 0) : c'était le cas de « À propos ».
 * Navigateur sans IntersectionObserver : tout est affiché tout de suite.
 */
export default function useScrollReveal() {
    useEffect(() => {
        const items = [...document.querySelectorAll('.animate-in')];
        if (typeof IntersectionObserver === 'undefined') {
            items.forEach((el) => el.classList.add('visible'));
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
        items.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}
