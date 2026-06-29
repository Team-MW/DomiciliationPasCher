// tests/docsRender.debug.test.jsx
// @vitest-environment jsdom
import { describe, test, vi } from 'vitest';
import React from 'react';

vi.mock('../src/utils/pdfConverter', () => ({ convertPdfToPng: vi.fn() }));
vi.mock('../src/utils/cloudinary', () => ({ uploadFile: vi.fn().mockResolvedValue({}) }));
vi.mock('../src/utils/api', () => ({ fetchWithRetry: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) }));
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: true, user: { primaryEmailAddress: { emailAddress: 'test@test.fr' } } }),
  SignedIn: ({ children }) => <>{children}</>,
  SignedOut: ({ children }) => <>{children}</>,
}));
vi.mock('../src/services/adminDataService', () => ({
  adminDataService: new Proxy({}, { get: () => vi.fn().mockResolvedValue([]) }),
}));
vi.mock('../src/utils/pdfGenerator', () => ({
  generateSignedContratBlob: vi.fn(),
  generateSignedProcurationBlob: vi.fn(),
  generateAttestationPdf: vi.fn(),
  generateContratPdf: vi.fn(),
}));
vi.mock('../src/components/SignatureModal/SignatureModal', () => ({ default: () => null }));

describe('Debug Docs render', () => {
  test('Docs import and render', async () => {
    const { render } = await import('@testing-library/react');
    const { act } = await import('@testing-library/react');
    let Docs;
    try {
      Docs = (await import('../src/pages/EspaceClient/components/Docs.jsx')).default;
      console.log('Docs imported OK');
    } catch (e) {
      console.error('Docs import FAILED:', e.message, e.stack);
      throw e;
    }

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
    const mockDocuments = [{ id: 'doc_1', name: 'Justificatif_Etablissement.pdf', size: '100 KB', type: 'application/pdf', owner: 'client', url: 'data:application/pdf;base64,test' }];

    let container;
    try {
      await act(async () => {
        const result = render(<Docs documents={mockDocuments} setDocuments={vi.fn()} clientData={mockClient} setClientData={vi.fn()} />);
        container = result.container;
      });
      console.log('Docs rendered, body:', container.innerHTML.slice(0, 800));
    } catch (e) {
      console.error('Docs render FAILED:', e.message);
      throw e;
    }
  });
});
