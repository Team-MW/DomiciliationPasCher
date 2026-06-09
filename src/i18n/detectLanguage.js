const RUSSIAN_SPEAKING_COUNTRIES = ['RU', 'BY', 'KZ', 'KG', 'AM', 'MD', 'UA', 'UZ', 'TJ', 'TM', 'AZ'];

export async function detectLanguageFromIP() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('IP lookup failed');
        const data = await res.json();
        if (RUSSIAN_SPEAKING_COUNTRIES.includes(data.country_code)) {
            return 'ru';
        }
    } catch {
        if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru')) {
            return 'ru';
        }
    }
    return 'fr';
}
