import { describe, it, expect } from 'vitest';
import { resolveClientStatusFromStripe } from '../src/utils/stripeClientStatus.js';

describe('resolveClientStatusFromStripe', () => {
    it('passe un client actif en echec_paiement si l’abo Stripe est past_due', () => {
        expect(resolveClientStatusFromStripe('actif', 'past_due')).toBe('echec_paiement');
        expect(resolveClientStatusFromStripe('actif', 'unpaid')).toBe('echec_paiement');
        expect(resolveClientStatusFromStripe('actif', 'incomplete')).toBe('echec_paiement');
    });

    it('réactive un impayé quand Stripe redevient active', () => {
        expect(resolveClientStatusFromStripe('echec_paiement', 'active')).toBe('actif');
        expect(resolveClientStatusFromStripe('impayé', 'trialing')).toBe('actif');
    });

    it('ne débloque pas un résilié tout seul', () => {
        expect(resolveClientStatusFromStripe('résilié', 'active')).toBe('résilié');
    });

    it('ne change rien si Stripe ne répond pas', () => {
        expect(resolveClientStatusFromStripe('echec_paiement', null)).toBe('echec_paiement');
        expect(resolveClientStatusFromStripe('actif', 'non_trouvé')).toBe('actif');
    });
});
