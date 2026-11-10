/**
 * Base de test RÉELLE (sql.js = SQLite en mémoire) avec le schéma de production, exposée comme `conn.execute(sql, params)`
 * (même forme que @planetscale/database : { rows, rowsAffected, insertId }). Les requêtes du serveur sont traduites de MySQL
 * vers SQLite à la volée. Une requête que le moteur ne comprend pas lève une erreur : on le voit tout de suite.
 *
 * Fidélité volontaire avec PlanetScale : COUNT/SUM reviennent en TEXTE, une colonne UNIQUE en doublon lève « Duplicate entry »,
 * les tables optionnelles (mail.notified_at, email_logs.body_text…) sont créées « à l'ancienne » puis migrées par le code.
 */
import path from 'node:path';
import initSqlJs from 'sql.js';

const SCHEMA = `
CREATE TABLE clients (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, company TEXT, city TEXT, plan TEXT, status TEXT, since TEXT, renewal TEXT, clerkId TEXT DEFAULT '', clerkStatus TEXT, address TEXT, phone TEXT, extra_info TEXT);
CREATE TABLE demandes (id TEXT PRIMARY KEY, clientName TEXT, email TEXT, company TEXT, plan TEXT, amount TEXT, date TEXT, status TEXT, extra_info TEXT, city TEXT, clerkId TEXT DEFAULT '');
CREATE TABLE payments (id TEXT PRIMARY KEY, clientId TEXT, amount TEXT, status TEXT, method TEXT, date TEXT, invoice_ref TEXT);
CREATE TABLE messages (id TEXT PRIMARY KEY, clientId TEXT, content TEXT, sender TEXT, createdAt TEXT, status TEXT);
CREATE TABLE bookings (id TEXT PRIMARY KEY, clientId TEXT, type TEXT, date TEXT, duration TEXT, status TEXT, createdAt TEXT, city TEXT);
CREATE TABLE documents (id TEXT PRIMARY KEY, clientId TEXT, name TEXT, size TEXT, type TEXT, uploadedAt TEXT, owner TEXT, folder TEXT, url TEXT);
CREATE TABLE mail (id TEXT PRIMARY KEY, clientId TEXT, company TEXT, type TEXT, "from" TEXT, date TEXT, status TEXT, preview TEXT);
CREATE TABLE reexpeditions (id TEXT PRIMARY KEY, clientId TEXT, address TEXT, notes TEXT, status TEXT, createdAt TEXT);
CREATE TABLE signature_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT, contract_ref TEXT, ip_address TEXT, signee_name TEXT, signee_email TEXT, signed_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE email_logs (id TEXT PRIMARY KEY, to_email TEXT, client_email TEXT, type TEXT, subject TEXT, status TEXT, error TEXT, sent_at TEXT, body_text TEXT, source TEXT, message_id TEXT);
CREATE TABLE email_verifications (user_id TEXT PRIMARY KEY, email TEXT, code_hash TEXT, expires_at INTEGER, attempts INTEGER DEFAULT 0, last_sent_at INTEGER DEFAULT 0, window_start INTEGER DEFAULT 0, send_count INTEGER DEFAULT 0);
CREATE TABLE souscription_leads (email TEXT PRIMARY KEY, token TEXT UNIQUE, first_name TEXT, plan TEXT, step INTEGER DEFAULT 0, draft TEXT, created_at TEXT, updated_at TEXT, reminders_sent INTEGER DEFAULT 0, last_reminder_at TEXT, completed_at TEXT, unsubscribed_at TEXT);
`;

export function toSqlite(sql) {
    return String(sql)
        .replace(/INSERT IGNORE INTO/gi, 'INSERT OR IGNORE INTO')
        .replace(/JSON_UNQUOTE\(/gi, '(')
        .replace(/NOW\(\)\s*-\s*INTERVAL\s+(\d+)\s+HOUR/gi, "datetime('now','-$1 hours')")
        .replace(/\bLEFT\(([^,()]+),\s*(\d+)\)/gi, 'substr($1,1,$2)')
        .replace(/ON DUPLICATE KEY UPDATE/gi, 'ON CONFLICT DO UPDATE SET')
        .replace(/VALUES\((\w+)\)/g, 'excluded.$1');
}

const stringifyNumbers = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v]));

export async function createSqlJsConn() {
    const SQL = await initSqlJs({ locateFile: (file) => path.resolve('node_modules/sql.js/dist', file) });
    const db = new SQL.Database();
    db.run(SCHEMA);
    const queries = [];

    async function execute(sql, params = []) {
        const original = String(sql).trim();
        queries.push(original.replace(/\s+/g, ' ').slice(0, 160));
        if (/^CREATE TABLE/i.test(original)) return { rows: [], rowsAffected: 0 }; // le schéma existe déjà (comme en production)
        const translated = toSqlite(original);
        const binds = params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p));
        try {
            const stmt = db.prepare(translated);
            stmt.bind(binds);
            let rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            stmt.free();
            if (/COUNT\(|SUM\(/i.test(original)) rows = rows.map(stringifyNumbers); // PlanetScale renvoie ces agrégats en texte
            const isRead = /^\s*(SELECT|WITH)/i.test(original);
            const insertId = !isRead && /^\s*INSERT/i.test(original) ? String(db.exec('SELECT last_insert_rowid()')[0].values[0][0]) : undefined;
            return { rows, rowsAffected: isRead ? 0 : db.getRowsModified(), insertId };
        } catch (error) {
            const unique = /UNIQUE constraint failed: (\w+)\.(\w+)/.exec(error.message || '');
            if (unique) {
                const duplicate = Object.assign(new Error(`Duplicate entry for key '${unique[1]}.${unique[2]}'`), { code: 'ER_DUP_ENTRY' });
                throw duplicate;
            }
            throw new Error(`[sqlJsConn] ${error.message} :: ${original.replace(/\s+/g, ' ').slice(0, 140)}`);
        }
    }

    const all = (sql, params = []) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
    };
    return { execute, all, queries, db };
}
