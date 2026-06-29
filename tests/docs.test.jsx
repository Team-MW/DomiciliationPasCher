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
  adminDataService: {
    getDocuments: vi.fn().mockResolvedValue([]),
    getPayments: vi.fn().mockResolvedValue([]),
    getInvoices: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    syncStripePayments: vi.fn().mockResolvedValue([]),
    addDocument: vi.fn().mockResolvedValue({ id: 'mock_doc_123' }),
    deleteDocument: vi.fn().mockResolvedValue({}),
  }
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

  test('should handle client PDF upload directly and append file extension to custom names', async () => {
    const mockAddDocument = vi.fn().mockResolvedValue({ id: 'new_doc_999' });
    const { adminDataService } = await import('../src/services/adminDataService');
    adminDataService.addDocument = mockAddDocument;

    const originalFileReader = global.FileReader;
    const mockFR = class MockFileReader {
      readAsDataURL(blob) {
        this.result = 'data:application/pdf;base64,client_pdf_base64';
        setTimeout(() => {
          if (this.onloadend) this.onloadend();
        }, 5);
      }
    };
    global.FileReader = mockFR;
    if (typeof window !== 'undefined') window.FileReader = mockFR;

    await act(async () => {
      render(
        <Docs
          documents={[]}
          setDocuments={vi.fn()}
          clientData={mockClient}
          setClientData={vi.fn()}
        />
      );
    });

    const fileInput = document.getElementById('file-upload');
    expect(fileInput).toBeDefined();

    const pdfFile = new File(['%PDF-1.4...'], 'mes_justifs.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    });

    const inputName = screen.getByPlaceholderText('mes_justifs.pdf');
    fireEvent.change(inputName, { target: { value: 'facture_edf' } });

    const validerBtn = screen.getByText('Valider');
    await act(async () => {
      fireEvent.click(validerBtn);
    });

    await vi.waitFor(() => {
      expect(mockAddDocument).toHaveBeenCalledTimes(1);
    });

    expect(mockAddDocument).toHaveBeenCalledWith(mockClient.id, expect.objectContaining({
      name: 'facture_edf.pdf',
      type: 'application/pdf',
      owner: 'client',
      url: 'data:application/pdf;base64,client_pdf_base64'
    }));

    global.FileReader = originalFileReader;
    if (typeof window !== 'undefined') window.FileReader = originalFileReader;
  });
});
