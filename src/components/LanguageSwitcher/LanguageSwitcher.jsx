import { useTranslation } from '../../i18n/LanguageContext';
import { useState, useEffect } from 'react';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
    const { lang, setLang } = useTranslation();
    const [isWindows, setIsWindows] = useState(false);

    useEffect(() => {
        setIsWindows(navigator.userAgent.indexOf('Windows') !== -1);
    }, []);

    return (
        <div className="lang-switcher" role="group" aria-label="Language">
            <button
                type="button"
                className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
                onClick={() => setLang('fr')}
                title="Français"
                aria-label="Français"
                aria-pressed={lang === 'fr'}
            >
                <span className={`lang-flag ${isWindows ? 'text-flag' : ''}`} aria-hidden="true">{isWindows ? 'FR' : '🇫🇷'}</span>
            </button>
            <button
                type="button"
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
                title="English"
                aria-label="English"
                aria-pressed={lang === 'en'}
            >
                <span className={`lang-flag ${isWindows ? 'text-flag' : ''}`} aria-hidden="true">{isWindows ? 'EN' : '🇬🇧'}</span>
            </button>
            <button
                type="button"
                className={`lang-btn ${lang === 'ru' ? 'active' : ''}`}
                onClick={() => setLang('ru')}
                title="Русский"
                aria-label="Русский"
                aria-pressed={lang === 'ru'}
            >
                <span className={`lang-flag ${isWindows ? 'text-flag' : ''}`} aria-hidden="true">{isWindows ? 'RU' : '🇷🇺'}</span>
            </button>
        </div>
    );
}

