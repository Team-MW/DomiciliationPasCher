// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

vi.mock('../src/utils/pdfConverter', () => ({ convertPdfToPng: vi.fn() }));
vi.mock('../src/utils/cloudinary', () => ({ uploadFile: vi.fn().mockResolvedValue({ url: 'https://res.cloudinary.com/test.pdf', publicId: 'test' }) }));
vi.mock('../src/utils/api', () => ({ fetchWithRetry: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) }));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: true, user: { primaryEmailAddress: { emailAddress: 'admin@dompascher.fr' } } }),
  SignedIn: ({ children }) => <>{children}</>,
  SignedOut: ({ children }) => <>{children}</>,
}));

vi.mock('../src/services/adminDataService', () => ({
  adminDataService: new Proxy({}, {
    get(_, prop) {
      if (['getDocuments', 'getPayments', 'getInvoices', 'getMessages', 'syncStripePayments'].includes(prop)) {
        return vi.fn().mockResolvedValue([]);
      }
      return vi.fn().mockResolvedValue({});
    },
  }),
}));

vi.mock('../src/utils/pdfGenerator', () => ({
  generateSignedContratBlob: vi.fn(),
  generateSignedProcurationBlob: vi.fn(),
  generateAttestationPdf: vi.fn(),
  generateContratPdf: vi.fn(),
}));

vi.mock('../src/components/SignatureModal/SignatureModal', () => ({ default: () => null }));

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import Docs from '../src/pages/EspaceClient/components/Docs.jsx';

const mockClient = {
  id: 'client_123',
  name: 'Test',
  email: 'test@test.fr',
  company: 'Co',
  plan: 'Starter',
  status: 'actif',
  since: '2024-01-01',
  extra_info: null,
};

const mockDocuments = [
  {
    id: 'doc_1',
    name: 'Justificatif_Etablissement.pdf',
    size: '100 KB',
    type: 'application/pdf',
    owner: 'client',
    url: 'data:application/pdf;base64,justificatif_base64_data',
  },
];

describe('Docs component download flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    // Don't mock appendChild before render — it prevents mounting
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  test('should render documents correctly and handle click download', async () => {
    await act(async () => {
      render(
        <Docs
          documents={mockDocuments}
          setDocuments={vi.fn()}
          clientData={mockClient}
          setClientData={vi.fn()}
        />
      );
    });

    const docLink = screen.getByText(/Justificatif_Etablissement\.pdf/);
    expect(docLink).toBeDefined();

    // Mock AFTER render so mounting works correctly
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    fireEvent.click(docLink);

    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });
});
