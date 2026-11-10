// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createSqlJsConn, toSqlite } from '../helpers/sqlJsConn.js';

describe('Banc d’essai : la base de test se comporte comme PlanetScale', () => {
    it('traduit la syntaxe MySQL utilisée par le serveur', () => {
        expect(toSqlite('INSERT IGNORE INTO bookings (id) VALUES (?)')).toContain('INSERT OR IGNORE');
        const json = toSqlite("SELECT JSON_UNQUOTE(JSON_EXTRACT(extra_info, '$.a')) FROM clients");
        expect(json).not.toContain('JSON_UNQUOTE');
        expect(json).toContain("(JSON_EXTRACT(extra_info, '$.a'))");
        expect(toSqlite('signed_at >= (NOW() - INTERVAL 1 HOUR)')).toContain("datetime('now','-1 hours')");
        expect(toSqlite('LEFT(body_text, 6000) AS body_text')).toContain('substr(body_text,1,6000)');
    });

    it('INSERT / SELECT / UPDATE / DELETE, doublon unique, agrégats en texte, JSON', async () => {
        const conn = await createSqlJsConn();
        await conn.execute('INSERT INTO clients (id, email, extra_info) VALUES (?, ?, ?)', ['c1', 'a@b.fr', JSON.stringify({ stripe_session_id: 'cs_1' })]);
        await expect(conn.execute('INSERT INTO clients (id, email) VALUES (?, ?)', ['c2', 'a@b.fr'])).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
        const count = await conn.execute('SELECT COUNT(*) AS n FROM clients');
        expect(count.rows[0].n).toBe('1');
        const bySession = await conn.execute("SELECT * FROM clients WHERE JSON_UNQUOTE(JSON_EXTRACT(extra_info, '$.stripe_session_id')) = ?", ['cs_1']);
        expect(bySession.rows[0].id).toBe('c1');
        const upd = await conn.execute('UPDATE clients SET company = ? WHERE id = ?', ['ACME', 'c1']);
        expect(upd.rowsAffected).toBe(1);
        const sig = await conn.execute('INSERT INTO signature_logs (client_id, contract_ref) VALUES (?, ?)', ['c1', 'x']);
        expect(sig.insertId).toBe('1');
        const recent = await conn.execute('SELECT id FROM signature_logs WHERE client_id = ? AND signed_at >= (NOW() - INTERVAL 1 HOUR) LIMIT 1', ['c1']);
        expect(recent.rows).toHaveLength(1);
        await conn.execute('DELETE FROM clients WHERE id = ?', ['c1']);
        expect((await conn.execute('SELECT COUNT(*) AS n FROM clients')).rows[0].n).toBe('0');
    });
});
