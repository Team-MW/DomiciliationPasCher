// tests/docsUpload.debug.test.jsx
// @vitest-environment jsdom
import { describe, test, vi } from 'vitest';
import React from 'react';

vi.mock('../src/utils/pdfConverter', () => ({ convertPdfToPng: vi.fn() }));
vi.mock('../src/utils/cloudinary', () => ({ uploadFile: vi.fn().mockResolvedValue({}) }));
vi.mock('../src/utils/emailService', () => ({ sendFailedPaymentEmail: vi.fn() }));
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

describe('Debug render', () => {
  test('DossierClient import does not crash', async () => {
    const { render } = await import('@testing-library/react');
    let DossierClient;
    try {
      DossierClient = (await import('../src/pages/Admin/components/DossierClient.jsx')).default;
      console.log('DossierClient imported OK');
    } catch (e) {
      console.error('DossierClient import FAILED:', e.message);
      throw e;
    }
    try {
      const { container } = render(
        <DossierClient
          client={{ id: '1', name: 'Test', email: 'test@test.fr', company: 'Co', plan: 'Starter', status: 'actif', since: '2024-01-01', extra_info: null }}
          onBack={vi.fn()}
          onUpdate={vi.fn()}
          showConfirm={vi.fn()}
          showAlert={vi.fn()}
        />
      );
      console.log('DossierClient rendered, body:', container.innerHTML.slice(0, 500));
    } catch (e) {
      console.error('DossierClient render FAILED:', e.message);
      throw e;
    }
  });
});
