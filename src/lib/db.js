import { connect } from '@planetscale/database';

const customFetch = async (url, options) => {
    let attempt = 0;
    const maxRetries = 5;
    let delay = 500;
    while (true) {
        try {
            const response = await fetch(url, options);
            if (response.status !== 429) {
                return response;
            }
            if (attempt >= maxRetries) {
                console.error(`PlanetScale rate limit: exceeded ${maxRetries} retries.`);
                return response;
            }
            console.warn(`PlanetScale rate limit (429) hit, retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            attempt++;
            delay *= 2; // exponential backoff
        } catch (err) {
            if (attempt >= maxRetries) {
                throw err;
            }
            console.warn(`PlanetScale fetch error, retrying in ${delay}ms...`, err);
            await new Promise(r => setTimeout(r, delay));
            attempt++;
            delay *= 2;
        }
    }
};

const config = {
    host: import.meta.env.VITE_DATABASE_HOST,
    username: import.meta.env.VITE_DATABASE_USERNAME,
    password: import.meta.env.VITE_DATABASE_PASSWORD,
    fetch: customFetch
};

export const conn = connect(config);

/**
 * UTILS pour gérer les erreurs et logs
 */
export async function executeQuery(query, params = []) {
    try {
        const results = await conn.execute(query, params);
        return results;
    } catch (error) {
        console.error('DATABASE_ERROR:', error);
        throw error;
    }
}
