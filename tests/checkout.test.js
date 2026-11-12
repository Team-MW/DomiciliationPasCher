import { describe, test, expect, vi, beforeEach } from 'vitest';
import handler, { withCheckoutSessionId } from '../api/checkout.js';
import Stripe from 'stripe';

// Mock stripe module
vi.mock('stripe', () => {
    const list = vi.fn();
    const create = vi.fn();
    const update = vi.fn();
    const sessionsCreate = vi.fn();
    const promoList = vi.fn();
    const subsList = vi.fn();
    return {
        default: class {
            constructor() {
                return {
                    customers: {
                        list,
                        create,
                        update,
                    },
                    checkout: {
                        sessions: {
                            create: sessionsCreate,
                        }
                    },
                    promotionCodes: { list: promoList },
                    subscriptions: { list: subsList },
                };
            }
        }
    };
});

// Mock fs to simulate env variables detection
vi.mock('fs', () => {
    return {
        default: {
            existsSync: vi.fn().mockReturnValue(false),
            readFileSync: vi.fn(),
        }
    };
});

const authMocks = vi.hoisted(() => ({ getAuthUser: vi.fn(), getOwnership: vi.fn() }));
vi.mock('../api/_auth.js', async (importOriginal) => ({
    ...(await importOriginal()),
    getAuthUser: authMocks.getAuthUser,
    getOwnership: authMocks.getOwnership,
}));
// Demandes enregistrées : c'est leur forfait qui fait foi, pas celui envoyé par le navigateur.
const DEMANDES = {
    req_scan: { plan: 'Scan+', email: 'test@example.com', status: 'en_attente_paiement', extra_info: '{"frequence":"mensuel"}' },
    req_phys: { plan: 'Physique+', email: 'new-client@example.com', status: 'en_attente_paiement', extra_info: '{"frequence":"annuel"}' },
    req_paid: { plan: 'Essentiel', email: 'a@b.fr', status: 'en_attente', extra_info: '{}' },
    req_ess: { plan: 'Essentiel', email: 'ess@x.fr', status: 'en_attente_paiement', extra_info: '{"frequence":"mensuel"}' },
};
vi.mock('../api/_db.js', () => ({
    getDbConn: vi.fn(() => ({
        execute: vi.fn(async (sql, params = []) => ({ rows: /FROM demandes WHERE id/.test(sql) && DEMANDES[params[0]] ? [DEMANDES[params[0]]] : [] })),
    })),
}));

describe('withCheckoutSessionId', () => {
    test('ajoute session_id sur une URL custom (salles, souscription)', () => {
        expect(withCheckoutSessionId(
            'http://localhost:5173/app/espace-client?tab=meeting&booking_success=true',
            'http://localhost:5173'
        )).toBe('http://localhost:5173/app/espace-client?tab=meeting&booking_success=true&session_id={CHECKOUT_SESSION_ID}');
    });

    test('ne double pas le paramètre s’il est déjà là', () => {
        const url = 'http://x/?success=true&session_id={CHECKOUT_SESSION_ID}';
        expect(withCheckoutSessionId(url, 'http://x')).toBe(url);
    });

    test('fallback si URL absente', () => {
        expect(withCheckoutSessionId(null, 'http://localhost')).toBe(
            'http://localhost?success=true&session_id={CHECKOUT_SESSION_ID}'
        );
    });
});

describe('Checkout API Handler (api/checkout.js)', () => {
    let mockReq;
    let mockRes;
    let originalEnv;
    let stripeMocks;

    beforeEach(() => {
        vi.clearAllMocks();
        originalEnv = process.env;
        process.env = {
            ...originalEnv,
            STRIPE_SECRET_KEY: 'sk_test_mock_secret_key'
        };

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        mockReq = {
            method: 'POST',
            headers: {
                origin: 'http://localhost'
            },
            body: {}
        };

        // Retrieve mock references from a Stripe instance
        const stripe = new Stripe();
        stripeMocks = {
            list: stripe.customers.list,
            create: stripe.customers.create,
            update: stripe.customers.update,
            sessionsCreate: stripe.checkout.sessions.create,
            promoList: stripe.promotionCodes.list,
            subsList: stripe.subscriptions.list,
        };
    });

    test('should return 405 Method Not Allowed if request method is not POST', async () => {
        mockReq.method = 'GET';

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    test('should reject request if STRIPE_SECRET_KEY is missing', async () => {
        delete process.env.STRIPE_SECRET_KEY;
        mockReq.body = {};

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('STRIPE_SECRET_KEY') })
        );
    });

    test('le prix vient du catalogue : un montant falsifié par le navigateur est ignoré', async () => {
        mockReq.body = {
            planId: 'essentiel', // falsifié : la demande req_scan est en Scan+
            amount: 0.5, // tentative de paiement à 0,50 €
            productName: 'Forfait Scan+',
            interval: 'month',
            email: ' Test@Example.com ',
            clientName: 'Alice Test',
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel',
            metadata: { demande_id: 'req_scan', email: 'victime@x.fr', customField: 'value1' }
        };
        stripeMocks.list.mockResolvedValue({ data: [{ id: 'cus_existing123', name: 'Alice Test' }] });
        stripeMocks.sessionsCreate.mockResolvedValue({ id: 'cs_test_session123', url: 'https://stripe.com/checkout/mock-url' });

        await handler(mockReq, mockRes);

        expect(stripeMocks.list).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
        expect(stripeMocks.create).not.toHaveBeenCalled();
        const expectedMetadata = {
            demande_id: 'req_scan',
            planId: 'scan-plus',
            interval: 'month',
            email: 'test@example.com', // la valeur serveur l'emporte sur metadata.email
            clientName: 'Alice Test',
        };
        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Forfait Confort' },
                    unit_amount: 2880, // 24 € HT × 1,2 = 28,80 € TTC
                    recurring: { interval: 'month' }
                },
                quantity: 1,
            }],
            mode: 'subscription',
            allow_promotion_codes: false, // Confort : pas de code promo (BIENVENUE = Essentiel mensuel uniquement)
            payment_method_collection: 'always',
            success_url: 'http://localhost/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost/cancel',
            customer: 'cus_existing123',
            metadata: expectedMetadata,
            subscription_data: { metadata: expectedMetadata },
        });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ id: 'cs_test_session123', url: 'https://stripe.com/checkout/mock-url' });
    });

    test('annuel : nouveau client Stripe (clé d’idempotence), prix annuel TTC, pas de code promo', async () => {
        mockReq.body = {
            planId: 'physique',
            amount: 38,
            productName: 'Forfait Physique+',
            interval: 'month', // falsifié : la demande est annuelle
            email: 'new-client@example.com',
            clientName: 'Bob Client',
            metadata: { demande_id: 'req_phys' },
        };
        stripeMocks.list.mockResolvedValue({ data: [] });
        stripeMocks.create.mockResolvedValue({ id: 'cus_new999' });
        stripeMocks.sessionsCreate.mockResolvedValue({ id: 'cs_test_session999', url: 'https://stripe.com/checkout/mock-url-2' });

        await handler(mockReq, mockRes);

        expect(stripeMocks.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'new-client@example.com', name: 'Bob Client' }),
            { idempotencyKey: 'customer-create-new-client@example.com' }
        );
        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            customer: 'cus_new999',
            mode: 'subscription',
            allow_promotion_codes: false,
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Forfait Premium' },
                    unit_amount: 43776, // 38 € × 12 mois − 20 % = 364,80 € HT × 1,2
                    recurring: { interval: 'year' }
                },
                quantity: 1,
            }]
        }));
    });

    test('abonnement : refusé sans demande enregistrée, ou si elle est déjà payée', async () => {
        mockReq.body = { planId: 'essentiel', interval: 'month', email: 'a@b.fr' };
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);

        const res2 = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
        await handler({ ...mockReq, body: { planId: 'essentiel', interval: 'month', metadata: { demande_id: 'req_paid' } } }, res2);
        expect(res2.status).toHaveBeenCalledWith(400);
        expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    test('URL de retour vers un autre domaine : remplacée par celle du site', async () => {
        mockReq.body = {
            planId: 'essentiel', interval: 'month', email: 'a@b.fr', metadata: { demande_id: 'req_scan' },
            successUrl: 'https://phishing.example/merci', cancelUrl: 'https://phishing.example/annule',
        };
        stripeMocks.list.mockResolvedValue({ data: [{ id: 'cus_a', name: 'A' }] });
        stripeMocks.sessionsCreate.mockResolvedValue({ id: 'cs_x', url: 'https://stripe.com/x' });

        await handler(mockReq, mockRes);

        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            success_url: 'http://localhost/?success=true&session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost/souscription',
        }));
    });

    const meetingBody = (overrides = {}) => ({
        planId: 'salle',
        amount: 0.01, // ignoré
        productName: 'Réservation Salle de réunion (6-8 pers) (Matinée (9h-12h))',
        interval: 'one_time',
        successUrl: 'http://localhost/app/espace-client?tab=meeting&booking_success=true',
        cancelUrl: 'http://localhost/app/espace-client?tab=meeting&booking_cancel=true',
        email: 'jean@test.fr',
        clientName: 'Jean Dupont',
        metadata: {
            client_id: 'cli_42',
            type: 'meeting_booking',
            meeting_type: 'Salle de réunion (6-8 pers)',
            duration: 'Matinée (9h-12h)',
            date: '2026-12-01',
            city: 'Toulouse',
        },
        ...overrides,
    });

    test('réservation sans être connecté : 401', async () => {
        authMocks.getAuthUser.mockResolvedValue(null);
        mockReq.body = meetingBody();
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    test('réservation pour la fiche d’un autre client : 403', async () => {
        authMocks.getAuthUser.mockResolvedValue({ userId: 'user_1', email: 'jean@test.fr', isAdmin: false });
        authMocks.getOwnership.mockResolvedValue({ ids: new Set(['cli_autre']), emails: new Set(), stripeCustomerIds: new Set() });
        mockReq.body = meetingBody();
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    test('réservation : prix déduit de la prestation, métadonnées en liste blanche', async () => {
        authMocks.getAuthUser.mockResolvedValue({ userId: 'user_1', email: 'jean@test.fr', isAdmin: false });
        authMocks.getOwnership.mockResolvedValue({ ids: new Set(['cli_42']), emails: new Set(), stripeCustomerIds: new Set() });
        stripeMocks.list.mockResolvedValue({ data: [{ id: 'cus_jean', name: 'Jean Dupont' }] });
        stripeMocks.sessionsCreate.mockResolvedValue({ id: 'cs_meeting', url: 'https://checkout.stripe.com/c/pay/cs_meeting' });
        mockReq.body = meetingBody();

        await handler(mockReq, mockRes);

        expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            mode: 'payment',
            allow_promotion_codes: false,
            customer: 'cus_jean',
            success_url: 'http://localhost/app/espace-client?tab=meeting&booking_success=true&session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost/app/espace-client?tab=meeting&booking_cancel=true',
            metadata: expect.objectContaining({ client_id: 'cli_42', type: 'meeting_booking', date: '2026-12-01' }),
            payment_intent_data: expect.objectContaining({
                metadata: expect.objectContaining({ type: 'meeting_booking' }),
            }),
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Réservation Salle de réunion (6-8 pers) (Matinée (9h-12h))' },
                    unit_amount: 9000, // matinée salle : 75 € HT → 90 € TTC (meetingPrices), pas 0,01 €
                },
                quantity: 1,
            }],
        }));
        expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('réservation avec une prestation inexistante : 400', async () => {
        authMocks.getAuthUser.mockResolvedValue({ userId: 'user_1', email: 'jean@test.fr', isAdmin: false });
        mockReq.body = meetingBody({ metadata: { ...meetingBody().metadata, duration: '1 semaine' } });
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });
});

describe('Code promo BIENVENUE (Essentiel en mensuel uniquement)', () => {
    let stripeMocks;
    const res = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });
    const BIENVENUE = { id: 'promo_1', code: 'BIENVENUE', coupon: { percent_off: 100, duration: 'once' } };
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock_secret_key';
        const stripe = new Stripe();
        stripeMocks = {
            list: stripe.customers.list, sessionsCreate: stripe.checkout.sessions.create,
            promoList: stripe.promotionCodes.list, subsList: stripe.subscriptions.list,
        };
        stripeMocks.list.mockResolvedValue({ data: [] });
        stripeMocks.subsList.mockResolvedValue({ data: [] });
        stripeMocks.sessionsCreate.mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com/x' });
    });
    const call = async (body) => {
        const r = res();
        await handler({ method: 'POST', headers: { origin: 'http://localhost' }, body }, r);
        return r;
    };

    test('vérification depuis le tunnel : Essentiel mensuel + code actif → « 1er mois : 0 € »', async () => {
        stripeMocks.promoList.mockResolvedValue({ data: [BIENVENUE] });
        const r = await call({ action: 'checkPromo', code: ' bienvenue ', planId: 'essentiel', interval: 'month', email: 'new@x.fr' });
        expect(stripeMocks.promoList).toHaveBeenCalledWith({ code: 'BIENVENUE', active: true, limit: 1 });
        expect(r.json).toHaveBeenCalledWith({ valid: true, code: 'BIENVENUE', label: '1er mois : 0 €', percentOff: 100, firstMonthOnly: true });
    });

    test.each([['scan-plus', 'month'], ['physique', 'month'], ['essentiel', 'year'], ['essentiel', 'annuel']])('refusé sur %s / %s avec le message du cahier des charges', async (planId, interval) => {
        const r = await call({ action: 'checkPromo', code: 'BIENVENUE', planId, interval });
        expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ valid: false, message: 'Le code BIENVENUE est réservé à la formule Essentiel en mensuel.' }));
        expect(stripeMocks.promoList).not.toHaveBeenCalled();
    });

    test('code inconnu ou désactivé dans Stripe : refusé', async () => {
        stripeMocks.promoList.mockResolvedValue({ data: [] });
        const r = await call({ action: 'checkPromo', code: 'BIENVENUE', planId: 'essentiel', interval: 'month' });
        expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ valid: false, message: 'Ce code promo n’existe pas ou n’est plus valable.' }));
    });

    test('déjà client (abonnement passé) : une seule fois par client', async () => {
        stripeMocks.promoList.mockResolvedValue({ data: [BIENVENUE] });
        stripeMocks.list.mockResolvedValue({ data: [{ id: 'cus_old' }] });
        stripeMocks.subsList.mockResolvedValue({ data: [{ id: 'sub_old' }] });
        const r = await call({ action: 'checkPromo', code: 'BIENVENUE', planId: 'essentiel', interval: 'month', email: 'old@x.fr' });
        expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ valid: false, message: 'Ce code est réservé à une première souscription.' }));
    });

    test('paiement Essentiel mensuel avec code : remise appliquée, carte toujours enregistrée, code noté', async () => {
        stripeMocks.promoList.mockResolvedValue({ data: [BIENVENUE] });
        const r = await call({ interval: 'month', promoCode: 'BIENVENUE', metadata: { demande_id: 'req_ess' } });
        expect(r.status).toHaveBeenCalledWith(200);
        const opts = stripeMocks.sessionsCreate.mock.calls[0][0];
        expect(opts.discounts).toEqual([{ promotion_code: 'promo_1' }]);
        expect(opts.allow_promotion_codes).toBe(false); // Stripe refuse discounts + allow_promotion_codes ensemble
        expect(opts.payment_method_collection).toBe('always');
        expect(opts.metadata.promo_code).toBe('BIENVENUE');
    });

    test('paiement Essentiel mensuel sans code : champ code de Stripe disponible', async () => {
        await call({ interval: 'month', metadata: { demande_id: 'req_ess' } });
        const opts = stripeMocks.sessionsCreate.mock.calls[0][0];
        expect(opts.allow_promotion_codes).toBe(true);
        expect(opts.discounts).toBeUndefined();
    });

    test('paiement Confort avec BIENVENUE forcé par le navigateur : refusé, aucune session', async () => {
        const r = await call({ interval: 'month', promoCode: 'BIENVENUE', metadata: { demande_id: 'req_scan' } });
        expect(r.status).toHaveBeenCalledWith(400);
        expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PROMO_INVALID' }));
        expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });
});
