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

vi.mock('../src/i18n/detectLanguage', () => ({
  detectLanguageFromIP: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/components/AddressAutocomplete/AddressAutocomplete', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input aria-label="Adresse personnelle" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
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
    updateClientExtraInfo: vi.fn().mockResolvedValue({ prenom: 'Jean' }),
    updateClientAddress: vi.fn().mockResolvedValue({ address: '1 rue Test' }),
  }
}));

vi.mock('../src/utils/pdfGenerator', () => ({
  generateSignedContratBlob: vi.fn(),
  generateSignedProcurationBlob: vi.fn(),
  generateAttestationPdf: vi.fn(),
  generateContratPdf: vi.fn(),
}));

vi.mock('../src/components/SignatureModal/SignatureModal', () => ({ default: () => <div>Signature modal</div> }));

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DialogProvider } from '../src/components/AppDialog/DialogProvider';
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

const renderDocs = (props) => render(
  <LanguageProvider>
    <DialogProvider>
      <Docs documents={[]} setDocuments={vi.fn()} setClientData={vi.fn()} {...props} />
    </DialogProvider>
  </LanguageProvider>
);

const mockDocuments = [
  {
    id: 'doc_1',
    name: 'facture_test.pdf',
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
    window.localStorage.setItem('dpc_lang', 'fr');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  test('should render documents correctly and handle click download', async () => {
    await act(async () => {
      renderDocs({
        documents: mockDocuments,
        clientData: mockClient,
      });
    });

    const docLink = screen.getByText(/facture_test\.pdf/);
    expect(docLink).toBeDefined();
  });

  test('ouvre le PDF Projet Statut (data URL) au clic sur Voir le document', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ closed: false });
    const pdfDataUrl = `data:application/pdf;base64,${btoa('%PDF-1.4 fake')}`;

    await act(async () => {
      renderDocs({
        documents: [{
          id: 'doc_statut',
          name: 'Projet Statut.pdf',
          size: '20 KB',
          type: 'application/pdf',
          owner: 'client',
          url: pdfDataUrl,
        }],
        clientData: mockClient,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Voir le document' }));
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toMatch(/^blob:/);
    openSpy.mockRestore();
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
      renderDocs({
        documents: [],
        setDocuments: vi.fn(),
        clientData: mockClient,
      });
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

  test('should prioritize local generation over Cloudinary URL to prevent 401 errors on download', async () => {
    const clientWithSignature = {
      ...mockClient,
      extra_info: JSON.stringify({
        contractSigned: true,
        contractSignatureUrl: 'data:image/png;base64,fake_signature_data',
        contractSignedUrl: 'https://res.cloudinary.com/test-401-unauthorized.pdf' // Cloudinary URL that could cause 401
      })
    };

    await act(async () => {
      renderDocs({
        documents: [],
        clientData: clientWithSignature,
      });
    });

    const downloadBtn = screen.getByText(/Télécharger mon contrat signé/i);
    expect(downloadBtn).toBeDefined();

    // The href should be '#' because it uses local generation, NOT the Cloudinary URL
    expect(downloadBtn.getAttribute('href')).toBe('#');
    expect(downloadBtn.getAttribute('href')).not.toBe('https://res.cloudinary.com/test-401-unauthorized.pdf');
  });

  test('ouvre un formulaire légal au lieu d’une alerte Paramètres si des infos manquent', async () => {
    await act(async () => {
      renderDocs({ clientData: mockClient });
    });

    fireEvent.click(screen.getByRole('button', { name: /Signer mon contrat maintenant/i }));

    expect(global.alert).not.toHaveBeenCalled();
    expect(screen.getByText('Informations du contrat')).toBeInTheDocument();
    expect(screen.queryByText('Signature modal')).toBeNull();
  });

  test('passe à la signature si le dossier légal est déjà complet', async () => {
    const completeClient = {
      ...mockClient,
      name: 'Jean Dupont',
      company: 'DPC SARL',
      address: '1 Place du Capitole, 31000 Toulouse',
      extra_info: JSON.stringify({
        prenom: 'Jean',
        nom: 'Dupont',
        nationalite: 'Française',
        qualite: 'Gérant',
        dateNaissance: '1990-01-01',
        lieuNaissance: 'Toulouse',
      }),
    };

    await act(async () => {
      renderDocs({ clientData: completeClient });
    });

    fireEvent.click(screen.getByRole('button', { name: /Signer mon contrat maintenant/i }));

    expect(global.alert).not.toHaveBeenCalled();
    expect(screen.getByText('Signature modal')).toBeInTheDocument();
  });

  test('réutilise les infos d’inscription (adresse, naissance, qualité) sans redemander de formulaire', async () => {
    const fromSignup = {
      ...mockClient,
      name: 'Camille Duran - 📞 0612345678',
      company: 'En cours de création',
      address: '',
      extra_info: JSON.stringify({
        prenom: 'Camille',
        nom: 'Duran',
        nationalite: 'Française',
        qualite: 'Gérant',
        dateNaissance: '1990-01-01',
        lieuNaissance: 'Paris',
        nomSociete: 'En cours de création',
        adresse: '10 Rue de la Paix',
        codePostal: '31000',
        villePerso: 'Toulouse',
        pays: 'France',
      }),
    };

    await act(async () => {
      renderDocs({ clientData: fromSignup });
    });

    fireEvent.click(screen.getByRole('button', { name: /Signer mon contrat maintenant/i }));

    expect(screen.queryByText('Informations du contrat')).toBeNull();
    expect(screen.getByText('Signature modal')).toBeInTheDocument();
  });
});
