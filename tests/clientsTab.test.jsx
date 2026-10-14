// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientsTab from '../src/pages/Admin/components/ClientsTab.jsx';

vi.mock('../src/utils/exportClientsExcel', () => ({
    exportClientsToExcel: vi.fn(),
}));

describe('ClientsTab', () => {
    it('does not crash when name or company is null and finds by email', () => {
        const onSelect = vi.fn();
        render(
            <ClientsTab
                clients={[
                    { id: '1', name: null, company: null, email: 'nouveau@test.fr', plan: 'Essentiel', since: '2026-09-07' },
                    { id: '2', name: 'Anna', company: 'Anna SAS', email: 'anna@test.fr', plan: 'Scan+', since: '2026-01-01' },
                ]}
                searchQuery="nouveau@"
                onSelect={onSelect}
                onUpdate={vi.fn()}
                onCreateClick={vi.fn()}
            />
        );

        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.queryByText('Anna SAS')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Dossier' }));
        expect(onSelect).toHaveBeenCalledWith('1');
    });
});
