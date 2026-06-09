import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import fr from './fr';
import ru from './ru';
import en from './en';
import { detectLanguageFromIP } from './detectLanguage';

const STORAGE_KEY = 'dpc_lang';

const translations = { fr, ru, en };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === 'ru' || saved === 'fr' || saved === 'en' ? saved : 'fr';
    });
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return;

        setIsDetecting(true);
        detectLanguageFromIP().then((detected) => {
            if (detected === 'ru') {
                setLangState('ru');
                localStorage.setItem(STORAGE_KEY, 'ru');
            }
        }).finally(() => setIsDetecting(false));
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((newLang) => {
        setLangState(newLang);
        localStorage.setItem(STORAGE_KEY, newLang);
    }, []);

    const tr = translations[lang] || translations.fr;

    const t = useCallback((key) => {
        const keys = key.split('.');
        let value = tr;
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }
        return value;
    }, [tr]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, tr, t, isDetecting }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
    return ctx;
}
