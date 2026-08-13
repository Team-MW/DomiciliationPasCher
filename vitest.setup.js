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

// Mock DOMMatrix pour pdfjs-dist dans jsdom
class MockDOMMatrix {
  constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
}
globalThis.DOMMatrix = MockDOMMatrix;
if (typeof global !== 'undefined') global.DOMMatrix = MockDOMMatrix;
if (typeof window !== 'undefined') window.DOMMatrix = MockDOMMatrix;

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
