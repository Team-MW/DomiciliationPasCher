import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import fr from './fr';
import ru from './ru';
import en from './en';
import { detectLanguageFromIP } from './detectLanguage';

const STORAGE_KEY = 'dpc_lang';

const translations = { fr, ru, en };

function readSavedLang() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === 'ru' || saved === 'fr' || saved === 'en' ? saved : null;
    } catch {
        return null;
    }
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        const saved = readSavedLang();
        if (saved) return saved;

        // Langue du navigateur (ex: téléphone en russe) — aucune géolocalisation IP.
        const prefs = typeof navigator !== 'undefined'
            ? [...(navigator.languages || []), navigator.language].filter(Boolean)
            : [];
        for (const raw of prefs) {
            const base = String(raw).toLowerCase().split('-')[0];
            if (base === 'fr' || base === 'en' || base === 'ru') return base;
        }
        return 'fr';
    });
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        if (readSavedLang()) return;

        setIsDetecting(true);
        Promise.resolve(detectLanguageFromIP()).then((detected) => {
            if (detected === 'ru' || detected === 'en' || detected === 'fr') {
                setLangState(detected);
            }
        }).catch(() => {}).finally(() => setIsDetecting(false));
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((newLang) => {
        setLangState(newLang);
        try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* stockage indisponible */ }
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
