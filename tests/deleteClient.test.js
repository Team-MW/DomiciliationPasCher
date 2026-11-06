// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDataService } from '../api/_data-service.js';

// Base simulée : on enregistre chaque requête pour vérifier ce qui est effacé.
function makeConn(client, { demandeIds = [] } = {}) {
    const calls = [];
    const execute = vi.fn(async (sql, params = []) => {
        calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
        if (/^SELECT \* FROM clients WHERE id = \?/i.test(sql)) return { rows: client ? [client] : [] };
        if (/^SELECT id FROM demandes WHERE LOWER\(email\)/i.test(sql)) return { rows: demandeIds.map((id) => ({ id })) };
        return { rows: [], rowsAffected: 1 };
    });
    return { conn: { execute }, calls };
}

const deletes = (calls) => calls.filter((c) => c.sql.startsWith('DELETE'));
const findDelete = (calls, table) => deletes(calls).filter((c) => c.sql.includes(`FROM ${table} `));

describe('Suppression définitive d’un client (deleteClient)', () => {
    const client = { id: 'cl_42', email: 'Jean.Dupont@Example.com', clerkId: 'user_linked' };
    let deleteClerkUser;
    let findClerkUserIdsByEmail;

    beforeEach(() => {
        deleteClerkUser = vi.fn(async () => {});
        findClerkUserIdsByEmail = vi.fn(async () => ['user_linked', 'user_unlinked']);
    });

    it('efface la fiche et toutes les données rattachées à son identifiant', async () => {
        const { conn, calls } = makeConn(client);
        await createDataService({ conn, deleteClerkUser, findClerkUserIdsByEmail }).deleteClient('cl_42');

        for (const table of ['clients', 'messages', 'documents', 'bookings', 'payments', 'mail', 'reexpeditions']) {
            const hit = findDelete(calls, table).find((c) => c.params[0] === 'cl_42');
            expect(hit, `${table} par id`).toBeTruthy();
        }
        expect(findDelete(calls, 'signature_logs').some((c) => c.params[0] === 'cl_42')).toBe(true);
    });

    it('efface aussi toutes les traces de son email (demandes, prospect, relances, journal, signatures)', async () => {
        const { conn, calls } = makeConn(client, { demandeIds: ['dem_1', 'dem_2'] });
        await createDataService({ conn, deleteClerkUser, findClerkUserIdsByEmail }).deleteClient('cl_42');

        const email = 'jean.dupont@example.com'; // normalisé en minuscules
        expect(findDelete(calls, 'demandes')[0].params).toEqual([email]);
        expect(findDelete(calls, 'souscription_leads')[0].params).toEqual([email]);
        expect(findDelete(calls, 'email_logs')[0].params).toEqual([email, email]);
        expect(findDelete(calls, 'signature_logs').some((c) => c.params[0] === email)).toBe(true);
        // Messages liés aux anciennes demandes d'inscription de cet email.
        const msgIds = findDelete(calls, 'messages').map((c) => c.params[0]);
        expect(msgIds).toEqual(expect.arrayContaining(['cl_42', 'dem_1', 'dem_2']));
    });

    it('supprime le compte de connexion lié ET ceux créés avec le même email (sans doublon)', async () => {
        const { conn } = makeConn(client);
        const report = await createDataService({ conn, deleteClerkUser, findClerkUserIdsByEmail }).deleteClient('cl_42');

        expect(findClerkUserIdsByEmail).toHaveBeenCalledWith('jean.dupont@example.com');
        expect(deleteClerkUser.mock.calls.map((c) => c[0]).sort()).toEqual(['user_linked', 'user_unlinked']);
        expect(report.clerkAccountsDeleted).toBe(2);
    });

    it('ne supprime JAMAIS le compte de connexion d’un administrateur (dossier de test à son email)', async () => {
        const adminClient = { id: 'cl_admin', email: 'mwcrea.agency@gmail.com', clerkId: 'user_admin' };
        const { conn, calls } = makeConn(adminClient);
        const report = await createDataService({
            conn, deleteClerkUser, findClerkUserIdsByEmail,
            isProtectedEmail: (e) => e === 'mwcrea.agency@gmail.com',
        }).deleteClient('cl_admin');

        expect(deleteClerkUser).not.toHaveBeenCalled();
        expect(findClerkUserIdsByEmail).not.toHaveBeenCalled();
        expect(report.clerkSkipped).toBe(true);
        // Le dossier de test est quand même effacé de la base.
        expect(findDelete(calls, 'clients')[0].params).toEqual(['cl_admin']);
    });

    it('ne touche à aucune donnée d’un autre client : chaque DELETE vise cet id ou cet email', async () => {
        const { conn, calls } = makeConn(client, { demandeIds: ['dem_1'] });
        await createDataService({ conn, deleteClerkUser, findClerkUserIdsByEmail }).deleteClient('cl_42');

        const allowed = new Set(['cl_42', 'dem_1', 'jean.dupont@example.com']);
        for (const c of deletes(calls)) {
            expect(c.sql, 'jamais de DELETE sans WHERE').toMatch(/ WHERE /);
            expect(c.params.length, c.sql).toBeGreaterThan(0);
            for (const p of c.params) expect(allowed.has(p), `${c.sql} ← ${p}`).toBe(true);
        }
    });

    it('continue la suppression même si Clerk ou une table optionnelle échoue', async () => {
        const { conn, calls } = makeConn(client);
        const original = conn.execute;
        conn.execute = vi.fn(async (sql, params) => {
            if (/souscription_leads|email_logs/.test(sql)) throw new Error("Table doesn't exist");
            return original(sql, params);
        });
        deleteClerkUser.mockRejectedValue(new Error('Clerk indisponible'));

        await expect(createDataService({ conn, deleteClerkUser, findClerkUserIdsByEmail }).deleteClient('cl_42')).resolves.toBeTruthy();
        expect(findDelete(calls, 'clients')).toHaveLength(1);
        expect(findDelete(calls, 'demandes')).toHaveLength(1);
    });

    it('client sans email : efface par identifiant sans requête par email', async () => {
        const { conn, calls } = makeConn({ id: 'cl_7', email: '', clerkId: '' });
        await createDataService({ conn, deleteClerkUser, findClerkUserIdsByEmail }).deleteClient('cl_7');

        expect(findDelete(calls, 'clients')[0].params).toEqual(['cl_7']);
        expect(findDelete(calls, 'demandes')).toHaveLength(0);
        expect(findDelete(calls, 'souscription_leads')).toHaveLength(0);
        expect(deleteClerkUser).not.toHaveBeenCalled();
    });
});
