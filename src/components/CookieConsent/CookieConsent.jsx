import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import { OPEN_CONSENT_EVENT, readConsent, saveConsent } from './consent';
import './CookieConsent.css';

export default function CookieConsent() {
    const { tr } = useTranslation();
    const c = tr.cookieConsent;
    const [open, setOpen] = useState(() => readConsent() === null);
    const firstButtonRef = useRef(null);
    const reopenedRef = useRef(false);

    useEffect(() => {
        const onOpen = () => {
            reopenedRef.current = true;
            setOpen(true);
        };
        window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
    }, []);

    useEffect(() => {
        // Rouvert volontairement (lien du pied de page) : on place le focus dans le bandeau.
        if (open && reopenedRef.current) {
            reopenedRef.current = false;
            firstButtonRef.current?.focus();
        }
    }, [open]);

    if (!open) return null;

    const choose = (granted) => {
        saveConsent(granted);
        setOpen(false);
    };

    return (
        <div
            className="cookie-consent"
            role="dialog"
            aria-modal="false"
            aria-label={c.ariaLabel}
            aria-describedby="cookie-consent-text"
        >
            <div className="cookie-consent-inner">
                <div className="cookie-consent-copy">
                    <p className="cookie-consent-title">{c.title}</p>
                    <p id="cookie-consent-text" className="cookie-consent-text">
                        {c.text}{' '}
                        <Link to="/confidentialite" className="cookie-consent-link">{c.learnMore}</Link>
                    </p>
                </div>
                <div className="cookie-consent-actions">
                    <button
                        ref={firstButtonRef}
                        type="button"
                        className="cookie-consent-btn"
                        onClick={() => choose(false)}
                    >
                        {c.refuse}
                    </button>
                    <button
                        type="button"
                        className="cookie-consent-btn"
                        onClick={() => choose(true)}
                    >
                        {c.accept}
                    </button>
                </div>
            </div>
        </div>
    );
}
