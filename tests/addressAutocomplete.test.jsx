// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AddressAutocomplete, {
    formatAddressValue,
    formatSuggestionLabel,
} from '../src/components/AddressAutocomplete/AddressAutocomplete.jsx';

const paris = {
    properties: {
        id: '75056',
        label: 'Paris',
        name: 'Paris',
        postcode: '75001',
        city: 'Paris',
        context: '75, Paris, Île-de-France',
    },
};

describe('formatAddressValue', () => {
    test('formate une commune en « code postal ville »', () => {
        expect(formatAddressValue(paris, 'municipality')).toBe('75001 Paris');
    });

    test('conserve le libellé complet pour une adresse', () => {
        expect(formatAddressValue({ properties: { label: '10 Rue de Rivoli 75001 Paris' } })).toBe(
            '10 Rue de Rivoli 75001 Paris'
        );
    });
});

describe('formatSuggestionLabel', () => {
    test('affiche code postal et ville pour une commune', () => {
        expect(formatSuggestionLabel(paris, 'municipality')).toBe('75001 Paris');
    });
});

describe('AddressAutocomplete', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            json: async () => ({ features: [paris] }),
        }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('interroge l’API BAN en type municipality et remplit code postal + ville', async () => {
        const onChange = vi.fn();
        render(
            <AddressAutocomplete
                value=""
                onChange={onChange}
                searchType="municipality"
                placeholder="Ex: 75001 Paris"
            />
        );

        fireEvent.change(screen.getByPlaceholderText('Ex: 75001 Paris'), { target: { value: 'pari' } });
        expect(onChange).toHaveBeenCalledWith('pari');

        await waitFor(() => {
            expect(fetch).toHaveBeenCalled();
        });
        const url = String(fetch.mock.calls[0][0]);
        expect(url).toContain('type=municipality');
        expect(url).toContain('q=pari');

        const option = await screen.findByRole('option', { name: /75001 Paris/ });
        await act(async () => {
            fireEvent.mouseDown(option);
        });
        expect(onChange).toHaveBeenCalledWith('75001 Paris');
    });
});
