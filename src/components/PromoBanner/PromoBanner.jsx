import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import { isPromoHiddenOn, PROMO_DISMISS_KEY } from './promoBannerRules';
import './PromoBanner.css';

function readDismissed() {
    try { return window.sessionStorage.getItem(PROMO_DISMISS_KEY) === '1'; } catch { return false; }
}

export default function PromoBanner() {
    const { tr } = useTranslation();
    const t = tr.promoBanner;
    const { pathname } = useLocation();
    const [dismissed, setDismissed] = useState(readDismissed);
    const ref = useRef(null);
    const visible = Boolean(t) && !dismissed && !isPromoHiddenOn(pathname);

    // Hauteur réelle du bandeau → variable CSS --promo-h : la navbar fixe et le contenu se décalent d'autant.
    useLayoutEffect(() => {
        const root = document.documentElement;
        if (!visible || !ref.current) {
            root.style.setProperty('--promo-h', '0px');
            return undefined;
        }
        const apply = () => root.style.setProperty('--promo-h', `${ref.current?.offsetHeight || 0}px`);
        apply();
        if (typeof ResizeObserver !== 'function') return undefined;
        const ro = new ResizeObserver(apply);
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, [visible, tr]);

    useEffect(() => () => document.documentElement.style.setProperty('--promo-h', '0px'), []);

    if (!visible) return null;

    const close = () => {
        try { window.sessionStorage.setItem(PROMO_DISMISS_KEY, '1'); } catch { /* navigation privée : fermé pour cette page seulement */ }
        setDismissed(true);
    };

    return (
        <div className="promo-banner" ref={ref} role="region" aria-label={t.ariaLabel}>
            <div className="promo-banner-inner">
                <p className="promo-banner-main">
                    <span className="promo-banner-desktop">{t.desktop}</span>
                    <span className="promo-banner-mobile">{t.mobile}</span>{' '}
                    <Link to="/tarifs" className="promo-banner-link">{t.cta}</Link>
                </p>
                {t.small && <p className="promo-banner-small">{t.small}</p>}
            </div>
            <button type="button" className="promo-banner-close" onClick={close} aria-label={t.close}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
