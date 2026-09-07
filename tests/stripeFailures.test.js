import { describe, it, expect, vi } from 'vitest';
import { scanFailedPayments } from '../api/_stripe-failures.js';

function asyncList(items) {
    return {
        data: items,
        has_more: false,
        async *[Symbol.asyncIterator]() {
            for (const item of items) yield item;
        },
    };
}

describe('scanFailedPayments', () => {
    it('conserve la date du premier impayé', async () => {
        const stripe = {
            subscriptions: {
                list: vi.fn((opts) => asyncList(
                    opts.status === 'past_due'
                        ? [{
                            id: 'sub_1',
                            customer: 'cus_1',
                            status: 'past_due',
                            metadata: {},
                            current_period_start: Date.parse('2026-03-01T00:00:00Z') / 1000,
                            current_period_end: Date.parse('2026-04-01T00:00:00Z') / 1000,
                            items: { data: [{ plan: { interval: 'month' } }] },
                        }]
                        : []
                )),
            },
            invoices: {
                list: vi.fn((opts) => asyncList(
                    opts.status === 'open'
                        ? [{
                            id: 'in_old',
                            customer: 'cus_1',
                            status: 'open',
                            attempt_count: 1,
                            amount_remaining: 2400,
                            currency: 'eur',
                            created: Date.parse('2026-01-15T00:00:00Z') / 1000,
                            metadata: {},
                        }]
                        : []
                )),
            },
            customers: {
                retrieve: vi.fn().mockResolvedValue({
                    id: 'cus_1',
                    email: 'a@test.fr',
                    name: 'Ada',
                    deleted: false,
                }),
            },
        };

        const failures = await scanFailedPayments(stripe);
        expect(failures).toHaveLength(1);
        expect(failures[0].failedAt).toBe('2026-01-15');
        expect(failures[0].subscriptionId).toBe('sub_1');
        expect(failures[0].invoiceId).toBe('in_old');
    });
});
