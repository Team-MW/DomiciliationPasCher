import { connect } from '@planetscale/database';

const config = {
    host: import.meta.env.VITE_DATABASE_HOST,
    username: import.meta.env.VITE_DATABASE_USERNAME,
    password: import.meta.env.VITE_DATABASE_PASSWORD
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
