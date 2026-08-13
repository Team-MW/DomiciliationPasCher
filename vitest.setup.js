import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Nettoyage après chaque test pour éviter les fuites de mémoire et les tests figés
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// Mock basique pour les variables d'environnement globales
process.env.VITE_ADMIN_EMAILS = 'mwcrea.agency@gmail.com';

// Mock pour localStorage si besoin
const localStorageMock = (function () {
    let store = {};
    return {
        getItem(key) {
            return store[key] || null;
        },
        setItem(key, value) {
            store[key] = value.toString();
        },
        removeItem(key) {
            delete store[key];
        },
        clear() {
            store = {};
        }
    };
})();
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});
