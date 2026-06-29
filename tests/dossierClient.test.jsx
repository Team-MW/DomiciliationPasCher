// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { adminDataService } from '../src/services/adminDataService';

vi.mock('../src/utils/pdfConverter', () => ({ convertPdfToPng: vi.fn() }));
vi.mock('../src/utils/cloudinary', () => ({ uploadFile: vi.fn().mockResolvedValue({ url: 'https://res.cloudinary.com/test.pdf', publicId: 'test' }) }));
vi.mock('../src/utils/emailService', () => ({ sendFailedPaymentEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/utils/api', () => ({ fetchWithRetry: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) }));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: true, user: { primaryEmailAddress: { emailAddress: 'admin@dompascher.fr' } } }),
  SignedIn: ({ children }) => <>{children}</>,
  SignedOut: ({ children }) => <>{children}</>,
}));

const { mockAdminDataService } = vi.hoisted(() => ({
  mockAdminDataService: {
    getDocuments: vi.fn().mockResolvedValue([]),
    getPayments: vi.fn().mockResolvedValue([]),
    getInvoices: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    syncStripePayments: vi.fn().mockResolvedValue([]),
    addDocument: vi.fn().mockResolvedValue({ id: 'doc_123' }),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../src/services/adminDataService', () => ({
  adminDataService: mockAdminDataService,
}));

vi.mock('../src/utils/pdfGenerator', () => ({
  generateSignedContratBlob: vi.fn(),
  generateSignedProcurationBlob: vi.fn(),
  generateAttestationPdf: vi.fn(),
  generateContratPdf: vi.fn(),
}));

vi.mock('../src/components/SignatureModal/SignatureModal', () => ({ default: () => null }));

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import DossierClient from '../src/pages/Admin/components/DossierClient.jsx';

const mockClient = {
  id: 'client_123',
  name: 'Client Test',
  email: 'benilias757@gmail.com',
  company: 'Test Company',
  address: '10 Rue de la Paix',
  plan: 'Starter',
  status: 'actif',
  since: '2024-01-01',
  extra_info: JSON.stringify({
    pieceIdentiteUrl: 'data:application/pdf;base64,identity_base64_data',
    justificatifDomicileUrl: 'data:application/pdf;base64,domicile_base64_data',
    kbisUrl: 'data:application/pdf;base64,kbis_base64_data',
  }),
};

describe('DossierClient Document Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    // Note: DO NOT mock document.body.appendChild/removeChild before render()
    // as @testing-library/react uses document.body to mount components
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  test('should render KBIS, ID, and Justificatif buttons and click handles data url download', async () => {
    await act(async () => {
      render(
        <DossierClient
          client={mockClient}
          onBack={vi.fn()}
          onUpdate={vi.fn()}
          showConfirm={vi.fn()}
          showAlert={vi.fn()}
        />
      );
    });

    // Click the Documents tab using data-testid
    const tabBtn = screen.getByTestId('tab-docs');
    await act(async () => { fireEvent.click(tabBtn); });

    // Verify the buttons are rendered
    const kbisBtn = screen.getByText("👁️ Voir l'Extrait KBIS");
    const idBtn = screen.getByText("👁️ Voir la Pièce d'identité");
    const domBtn = screen.getByText("👁️ Voir le Justificatif de domicile");

    expect(kbisBtn).toBeDefined();
    expect(idBtn).toBeDefined();
    expect(domBtn).toBeDefined();

    // NOW mock appendChild/removeChild for the click test
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    fireEvent.click(kbisBtn);
    fireEvent.click(idBtn);
    fireEvent.click(domBtn);

    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  test('should handle admin PDF file upload without Cloudinary', async () => {
    const mockAddDocument = vi.fn().mockResolvedValue({ id: 'doc_123' });
    const mockGetDocuments = vi.fn().mockResolvedValue([]);
    
    vi.mocked(adminDataService.addDocument).mockImplementation(mockAddDocument);
    vi.mocked(adminDataService.getDocuments).mockImplementation(mockGetDocuments);

    await act(async () => {
      render(
        <DossierClient
          client={mockClient}
          onBack={vi.fn()}
          onUpdate={vi.fn()}
          showConfirm={vi.fn()}
          showAlert={vi.fn()}
        />
      );
    });

    const originalFileReader = global.FileReader;
    const mockFR = class MockFileReader {
      readAsDataURL(blob) {
        this.result = 'data:application/pdf;base64,mock_base64_pdf';
        setTimeout(() => {
          if (this.onloadend) this.onloadend();
        }, 5);
      }
    };
    global.FileReader = mockFR;
    if (typeof window !== 'undefined') window.FileReader = mockFR;

    const tabBtn = screen.getByTestId('tab-docs');
    await act(async () => { fireEvent.click(tabBtn); });

    const fileInput = document.getElementById('admin-file-upload');
    expect(fileInput).toBeDefined();

    const pdfFile = new File(['%PDF-1.4...'], 'contract.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    });

    const validerBtn = screen.getByText('Valider');
    expect(validerBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(validerBtn);
    });

    await vi.waitFor(() => {
      expect(mockAddDocument).toHaveBeenCalledTimes(1);
    });

    expect(mockAddDocument).toHaveBeenCalledWith(mockClient.id, expect.objectContaining({
      name: 'contract.pdf',
      type: 'application/pdf',
      owner: 'admin',
      url: expect.stringMatching(/^data:application\/pdf;base64,/)
    }));

    global.FileReader = originalFileReader;
    if (typeof window !== 'undefined') window.FileReader = originalFileReader;
  });

  test('should automatically append file extension if admin inputs custom name without it', async () => {
    const mockAddDocument = vi.fn().mockResolvedValue({ id: 'doc_123' });
    const mockGetDocuments = vi.fn().mockResolvedValue([]);
    
    vi.mocked(adminDataService.addDocument).mockImplementation(mockAddDocument);
    vi.mocked(adminDataService.getDocuments).mockImplementation(mockGetDocuments);

    await act(async () => {
      render(
        <DossierClient
          client={mockClient}
          onBack={vi.fn()}
          onUpdate={vi.fn()}
          showConfirm={vi.fn()}
          showAlert={vi.fn()}
        />
      );
    });

    const originalFileReader = global.FileReader;
    const mockFR = class MockFileReader {
      readAsDataURL(blob) {
        this.result = 'data:application/pdf;base64,mock_base64_pdf';
        setTimeout(() => {
          if (this.onloadend) this.onloadend();
        }, 5);
      }
    };
    global.FileReader = mockFR;
    if (typeof window !== 'undefined') window.FileReader = mockFR;

    const tabBtn = screen.getByTestId('tab-docs');
    await act(async () => { fireEvent.click(tabBtn); });

    const fileInput = document.getElementById('admin-file-upload');
    expect(fileInput).toBeDefined();

    const pdfFile = new File(['%PDF-1.4...'], 'contract.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    });

    const inputName = screen.getByPlaceholderText('contract.pdf');
    fireEvent.change(inputName, { target: { value: 'mon_contrat_perso' } });

    const validerBtn = screen.getByText('Valider');
    expect(validerBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(validerBtn);
    });

    await vi.waitFor(() => {
      expect(mockAddDocument).toHaveBeenCalledTimes(1);
    });

    expect(mockAddDocument).toHaveBeenCalledWith(mockClient.id, expect.objectContaining({
      name: 'mon_contrat_perso.pdf',
      type: 'application/pdf',
      owner: 'admin',
      url: expect.stringMatching(/^data:application\/pdf;base64,/)
    }));

    global.FileReader = originalFileReader;
    if (typeof window !== 'undefined') window.FileReader = originalFileReader;
  });
});
