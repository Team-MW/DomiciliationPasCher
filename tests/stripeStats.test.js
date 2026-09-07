import { describe, it, expect } from 'vitest';
import {
    assembleStripeStats,
    chargeNetCents,
    percentChange,
    subscriptionItemMrrCents,
} from '../api/stripe-stats.js';
import { isLiveSecretKey } from '../api/_stripe-client.js';

describe('stripe-stats — agrégation réelle', () => {
    it('ignore un paiement non capturé ou remboursé', () => {
        expect(chargeNetCents({ status: 'succeeded', paid: true, captured: false, amount: 2400, currency: 'eur' })).toBe(0);
        expect(chargeNetCents({ status: 'succeeded', paid: true, captured: true, amount: 2400, amount_refunded: 2400, currency: 'eur' })).toBe(0);
        expect(chargeNetCents({ status: 'succeeded', paid: true, captured: true, amount: 2400, amount_refunded: 400, currency: 'eur' })).toBe(2000);
    });

    it('en local (clé test) compte les paiements livemode=false', () => {
        expect(chargeNetCents({
            status: 'succeeded', paid: true, captured: true, amount: 9900, currency: 'eur', livemode: false,
        })).toBe(9900);
    });

    it('en production (clé live) ignore les paiements de test', () => {
        expect(chargeNetCents({
            status: 'succeeded', paid: true, captured: true, amount: 9900, currency: 'eur', livemode: false,
        }, { liveOnly: true })).toBe(0);
        expect(chargeNetCents({
            status: 'succeeded', paid: true, captured: true, amount: 9900, currency: 'eur', livemode: true,
        }, { liveOnly: true })).toBe(9900);
    });

    it('convertit un abonnement annuel en MRR', () => {
        const cents = subscriptionItemMrrCents({
            quantity: 1,
            price: { unit_amount: 24000, recurring: { interval: 'year', interval_count: 1 } },
        });
        expect(cents).toBe(2000);
    });

    it('calcule encaissé du mois, historique et % vs mois précédent', () => {
        const now = new Date(2026, 8, 15); // 15 sept 2026
        const ts = (y, m, d) => Math.floor(new Date(y, m, d).getTime() / 1000);
        const stats = assembleStripeStats({
            now,
            charges: [
                { status: 'succeeded', paid: true, captured: true, amount: 39800, amount_refunded: 0, currency: 'eur', created: ts(2026, 7, 10) },
                { status: 'succeeded', paid: true, captured: true, amount: 58500, amount_refunded: 0, currency: 'eur', created: ts(2026, 8, 4) },
                { status: 'succeeded', paid: true, captured: true, amount: 2400, amount_refunded: 2400, currency: 'eur', created: ts(2026, 8, 5) },
            ],
            subscriptions: [
                {
                    status: 'active',
                    items: { data: [{ quantity: 1, price: { unit_amount: 2400, recurring: { interval: 'month', interval_count: 1 } } }] },
                },
                {
                    status: 'canceled',
                    items: { data: [{ quantity: 1, price: { unit_amount: 3800, recurring: { interval: 'month', interval_count: 1 } } }] },
                },
            ],
        });

        expect(stats.monthlyRevenue).toBe(585);
        expect(stats.mrr).toBe(24);
        expect(stats.activeSubscriptions).toBe(1);
        expect(stats.revenueChangePct).toBe(percentChange(585, 398));
        expect(stats.revenueHistory[stats.revenueHistory.length - 1]).toEqual({ label: 'Sep 2026', revenue: 585 });
        expect(stats.revenueHistory[stats.revenueHistory.length - 2]).toEqual({ label: 'Août 2026', revenue: 398 });
        expect(stats.source).toBe('stripe');
        expect(stats.livemode).toBe(false);
    });

    it('avec liveOnly, n’agrège pas les charges et abonnements de test', () => {
        const now = new Date(2026, 8, 15);
        const ts = (y, m, d) => Math.floor(new Date(y, m, d).getTime() / 1000);
        const stats = assembleStripeStats({
            now,
            liveOnly: true,
            charges: [
                { livemode: false, status: 'succeeded', paid: true, captured: true, amount: 58500, currency: 'eur', created: ts(2026, 8, 4) },
                { livemode: true, status: 'succeeded', paid: true, captured: true, amount: 2400, currency: 'eur', created: ts(2026, 8, 4) },
            ],
            subscriptions: [
                {
                    livemode: false,
                    status: 'active',
                    items: { data: [{ quantity: 1, price: { unit_amount: 2400, recurring: { interval: 'month', interval_count: 1 } } }] },
                },
                {
                    livemode: true,
                    status: 'active',
                    items: { data: [{ quantity: 1, price: { unit_amount: 1990, recurring: { interval: 'month', interval_count: 1 } } }] },
                },
            ],
        });
        expect(stats.monthlyRevenue).toBe(24);
        expect(stats.mrr).toBe(20);
        expect(stats.activeSubscriptions).toBe(1);
        expect(stats.livemode).toBe(true);
    });
});

describe('détection clé Stripe', () => {
    it('reconnaît une clé live de production', () => {
        expect(isLiveSecretKey('sk_live_abc')).toBe(true);
        expect(isLiveSecretKey('sk_test_abc')).toBe(false);
        expect(isLiveSecretKey('sk_live_remplace_moi')).toBe(false);
    });
});
