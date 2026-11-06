import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import fr from './fr';
import { detectLanguageFromIP } from './detectLanguage';

const STORAGE_KEY = 'dpc_lang';

/**
 * Le français est dans le bundle ; l'anglais et le russe (~150 Ko) ne sont chargés que si on les affiche.
 * main.jsx appelle preloadInitialLanguage() avant le premier rendu : pas de flash en français
 * pour un visiteur russophone ou anglophone.
 */
const LOADERS = {
    en: () => import('./en'),
    ru: () => import('./ru'),
};
const translations = { fr };

export async function loadLanguage(lang) {
    if (translations[lang]) return translations[lang];
    const loader = LOADERS[lang];
    if (!loader) return fr;
    const mod = await loader();
    translations[lang] = mod.default;
    return translations[lang];
}

function browserLanguage() {
    const prefs = typeof navigator !== 'undefined'
        ? [...(navigator.languages || []), navigator.language].filter(Boolean)
        : [];
    for (const raw of prefs) {
        const base = String(raw).toLowerCase().split('-')[0];
        if (base === 'fr' || base === 'en' || base === 'ru') return base;
    }
    return 'fr';
}

/** Langue du premier affichage, chargée avant le rendu (échec réseau : on affiche le français). */
export async function preloadInitialLanguage() {
    try {
        await loadLanguage(readSavedLang() || browserLanguage());
    } catch { /* hors ligne : repli français */ }
}

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
        return browserLanguage();
    });
    // Incrémenté quand une langue finit de charger, pour réafficher les textes.
    const [, setLoadedTick] = useState(0);

    useEffect(() => {
        if (translations[lang]) return undefined;
        let cancelled = false;
        loadLanguage(lang)
            .then(() => { if (!cancelled) setLoadedTick((n) => n + 1); })
            .catch((err) => console.error('Chargement de la langue impossible :', err));
        return () => { cancelled = true; };
    }, [lang]);
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
