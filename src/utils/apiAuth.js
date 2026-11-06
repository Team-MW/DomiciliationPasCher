/**
 * Joint le jeton de session Clerk (`Authorization: Bearer …`) à chaque appel vers /api/*
 * du même domaine. Les handlers serveur (api/_auth.js) s'en servent pour identifier
 * l'utilisateur ; sans lui, toutes les routes protégées répondent 401.
 *
 * Installé une fois dans main.jsx : aucun appelant n'a besoin de gérer le jeton lui-même.
 */

export function isSameOriginApiUrl(url, origin = globalThis.location?.origin) {
    if (!url) return false;
    try {
        const parsed = new URL(url, origin);
        return parsed.origin === origin && parsed.pathname.startsWith('/api/');
    } catch {
        return false;
    }
}

export async function getClerkSessionToken() {
    try {
        const session = globalThis.window?.Clerk?.session;
        return session ? await session.getToken() : null;
    } catch {
        return null;
    }
}

export function installApiAuth({ getToken = getClerkSessionToken, target = globalThis.window } = {}) {
    if (!target?.fetch || target.fetch.__dpcApiAuth) return;
    const originalFetch = target.fetch.bind(target);

    const wrapped = async (input, init = {}) => {
        const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
        if (!isSameOriginApiUrl(url, target.location?.origin)) return originalFetch(input, init);

        const token = await getToken();
        if (!token) return originalFetch(input, init);

        const headers = new Headers(init.headers || (typeof input === 'object' && 'headers' in input ? input.headers : undefined));
        if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
        return originalFetch(input, { ...init, headers });
    };
    wrapped.__dpcApiAuth = true;
    target.fetch = wrapped;
}
