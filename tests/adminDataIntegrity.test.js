import { describe, it, expect, vi, beforeEach } from 'vitest';

const { execute } = vi.hoisted(() => ({
    execute: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock('../src/lib/db.js', () => ({
    conn: { execute },
    executeQuery: vi.fn(),
}));

vi.mock('../src/services/emailService.js', () => ({
    sendApprovalEmail: vi.fn(),
    sendDocumentRequestEmail: vi.fn(),
}));

vi.mock('../src/utils/api.js', () => ({
    fetchWithRetry: vi.fn(),
}));

import { adminDataService } from '../src/services/adminDataService.js';
import { sendApprovalEmail, sendDocumentRequestEmail } from '../src/services/emailService.js';

describe('intégrité des données client (déploiement)', () => {
    beforeEach(() => {
        execute.mockReset();
        execute.mockResolvedValue({ rows: [] });
        sendApprovalEmail.mockClear();
        sendDocumentRequestEmail.mockClear();
    });

    it('fusionne extra_info double-encodé sans perdre stripe_customer_id', async () => {
        const nested = JSON.stringify({ stripe_customer_id: 'cus_keep', prenom: 'Jean' });
        execute.mockImplementation(async (sql) => {
            if (sql.includes('SELECT extra_info FROM clients')) {
                return { rows: [{ extra_info: JSON.stringify(nested) }] };
            }
            return { rows: [] };
        });

        const merged = await adminDataService.updateClientExtraInfo('cli_1', { adresseReexp: '99 rue Bureau' });

        expect(merged.stripe_customer_id).toBe('cus_keep');
        expect(merged.prenom).toBe('Jean');
        expect(merged.adresseReexp).toBe('99 rue Bureau');
        const update = execute.mock.calls.find(([sql]) => sql.includes('UPDATE clients SET extra_info'));
        expect(update).toBeTruthy();
        expect(JSON.parse(update[1][0])).toMatchObject({
            stripe_customer_id: 'cus_keep',
            adresseReexp: '99 rue Bureau',
        });
    });

    it('écrit extra_info sur la demande si le client n’existe pas encore', async () => {
        execute.mockImplementation(async (sql) => {
            if (sql.includes('SELECT extra_info FROM clients')) return { rows: [] };
            if (sql.includes('SELECT extra_info FROM demandes')) {
                return { rows: [{ extra_info: JSON.stringify({ prenom: 'Camille' }) }] };
            }
            return { rows: [] };
        });

        const merged = await adminDataService.updateClientExtraInfo('req_1', { kbisUrl: 'https://example/kbis.pdf' });
        expect(merged.prenom).toBe('Camille');
        expect(merged.kbisUrl).toBe('https://example/kbis.pdf');
        const update = execute.mock.calls.find(([sql]) => sql.includes('UPDATE demandes SET extra_info'));
        expect(update).toBeTruthy();
        expect(update[1][1]).toBe('req_1');
    });

    it('enregistre l’adresse perso sur la demande si pas de ligne clients', async () => {
        execute.mockImplementation(async (sql) => {
            if (sql.includes('SELECT id FROM clients')) return { rows: [] };
            if (sql.includes('SELECT extra_info FROM demandes')) {
                return { rows: [{ extra_info: '{}' }] };
            }
            return { rows: [] };
        });

        await adminDataService.updateClientAddress('req_1', '1 rue Maison 31000 Toulouse');
        const update = execute.mock.calls.find(([sql]) => sql.includes('UPDATE demandes SET extra_info'));
        expect(JSON.parse(update[1][0]).adressePerso).toBe('1 rue Maison 31000 Toulouse');
    });

    it('met à jour name, email, téléphone, société et ville sur clients', async () => {
        await adminDataService.updateClientProfile('cli_1', {
            name: 'Marie Curie',
            email: 'Marie@Test.fr',
            address: '10 rue Perso',
            phone: '0612345678',
            company: 'SAS Marie',
            city: 'Lyon',
        });
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toMatch(/UPDATE clients SET name = \?, email = \?, address = \?, phone = \?, company = \?, city = \?/);
        expect(params).toEqual(['Marie Curie', 'marie@test.fr', '10 rue Perso', '0612345678', 'SAS Marie', 'Lyon', 'cli_1']);
    });

    it('cherche une session Stripe avec JSON_UNQUOTE (clients et demandes)', async () => {
        execute.mockResolvedValue({ rows: [] });
        await adminDataService.getClientBySessionId('cs_abc');
        await adminDataService.getDemandeBySessionId('cs_abc');
        expect(execute.mock.calls[0][0]).toMatch(/JSON_UNQUOTE\(JSON_EXTRACT\(extra_info, '\$\.stripe_session_id'\)\)/);
        expect(execute.mock.calls[1][0]).toMatch(/JSON_UNQUOTE\(JSON_EXTRACT\(extra_info, '\$\.stripe_session_id'\)\)/);
        expect(execute.mock.calls[0][1]).toEqual(['cs_abc']);
    });

    it('à l’approbation, migre documents, réservations et réexpéditions vers le nouveau client', async () => {
        execute.mockImplementation(async (sql) => {
            if (sql.includes('SELECT * FROM demandes WHERE id')) {
                return {
                    rows: [{
                        id: 'req_9',
                        email: 'a@test.fr',
                        company: 'SAS Test',
                        city: 'Lyon',
                        plan: 'Scan+',
                        amount: 24,
                        extra_info: { prenom: 'Ada', nom: 'Lovelace', stripe_session_id: 'cs_1' },
                        clientName: 'Ada Lovelace',
                        clerkId: 'user_1',
                    }],
                };
            }
            if (sql.includes('SELECT id FROM clients WHERE email')) return { rows: [] };
            return { rows: [] };
        });

        const created = await adminDataService.traiterDemande('req_9');
        const sqls = execute.mock.calls.map(([sql]) => sql);
        expect(sqls.some((s) => /UPDATE messages SET clientId/.test(s))).toBe(true);
        expect(sqls.some((s) => /UPDATE documents SET clientId/.test(s))).toBe(true);
        expect(sqls.some((s) => /UPDATE bookings SET clientId/.test(s))).toBe(true);
        expect(sqls.some((s) => /UPDATE reexpeditions SET clientId/.test(s))).toBe(true);
        expect(sqls.some((s) => /DELETE FROM demandes/.test(s))).toBe(true);
        const insert = execute.mock.calls.find(([sql]) => /INSERT INTO clients/.test(sql));
        expect(insert[1][0]).not.toBe('req_9');
        expect(created.id).toBe(insert[1][0]);
        expect(sendApprovalEmail).toHaveBeenCalledWith('a@test.fr', 'Ada Lovelace');
        expect(sendDocumentRequestEmail).not.toHaveBeenCalled();
        const docRequestUpdate = execute.mock.calls.find(([sql, params]) =>
            /UPDATE clients SET extra_info/.test(sql) && String(params?.[0]).includes('doc_request'));
        expect(JSON.parse(docRequestUpdate[1][0]).doc_request).toMatchObject({
            missing: ['statuts', 'kbis'],
            initial_pending: true,
        });
    });
});
