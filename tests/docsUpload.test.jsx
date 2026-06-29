// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import Souscription from '../src/pages/Souscription/Souscription.jsx';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('?plan=essentiel'), vi.fn()],
    Link: ({ children, to }) => <a href={to}>{children}</a>
}));

// Mock utils
const mockHandleCheckout = vi.fn();
vi.mock('../src/utils/stripe', () => ({
    handleCheckout: (...args) => mockHandleCheckout(...args)
}));

const mockUploadFile = vi.fn().mockResolvedValue({ secure_url: 'https://cloudinary.com/test-file.png' });
vi.mock('../src/utils/cloudinary', () => ({
    uploadFile: (...args) => mockUploadFile(...args)
}));

const mockConvertPdfToPng = vi.fn().mockResolvedValue(new File([''], 'converted.png', { type: 'image/png' }));
vi.mock('../src/utils/pdfConverter', () => ({
    convertPdfToPng: (...args) => mockConvertPdfToPng(...args)
}));

const mockAddDemande = vi.fn().mockResolvedValue({ id: 'demande_abc' });
vi.mock('../src/services/adminDataService', () => ({
    adminDataService: {
        addDemande: (...args) => mockAddDemande(...args)
    }
}));

describe('Onboarding Documents Upload Flow inside Souscription', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    test('should progress to document step, accept files, convert PDF, and submit correctly', async () => {
        await act(async () => {
            render(<Souscription />);
        });

        // 1. Step 0: Choix du projet
        // Click on Creation card
        const creationCard = screen.getByText("Création d'entreprise");
        fireEvent.click(creationCard);
        // Click on SASU
        const sasuBtn = screen.getByText('SASU');
        fireEvent.click(sasuBtn);
        // Click Suivant
        fireEvent.click(screen.getByText('Suivant'));

        // 2. Step 1: Coordonnees
        // Fill fields
        fireEvent.change(screen.getByPlaceholderText('Duran'), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Camille'), { target: { value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('exemple@gmail.com'), { target: { value: 'john@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('06 XX XX XX XX'), { target: { value: '0612345678' } });
        fireEvent.change(screen.getByPlaceholderText('Votre adresse complète (Rue, CP, Ville)'), { target: { value: '1 Main St' } });
        fireEvent.click(screen.getByText('Suivant'));

        // 3. Step 2: Entreprise
        fireEvent.change(screen.getByPlaceholderText("Décrivez brièvement l'activité de votre entreprise…"), { target: { value: 'Consulting' } });
        fireEvent.click(screen.getByText('Suivant'));

        // 4. Step 3: Domiciliation
        const toulouseBtn = screen.getByText('Toulouse (31)');
        fireEvent.click(toulouseBtn);
        fireEvent.click(screen.getByText('Suivant'));

        // 5. Step 4: Courrier
        fireEvent.click(screen.getByText('Suivant'));

        // 6. Step 5: Frequence
        fireEvent.click(screen.getByText('Suivant'));

        // 7. Step 6: Documents justificatifs page
        expect(screen.getByText("Vos documents justificatifs")).toBeDefined();

        // Query file inputs
        const fileInputsRaw = document.querySelectorAll('input[type="file"]');
        expect(fileInputsRaw.length).toBe(2);

        const idFile = new File(['%PDF-1.4...'], 'identity.pdf', { type: 'application/pdf' });
        const addressFile = new File([''], 'address.png', { type: 'image/png' });

        await act(async () => {
            fireEvent.change(fileInputsRaw[0], { target: { files: [idFile] } });
            fireEvent.change(fileInputsRaw[1], { target: { files: [addressFile] } });
        });

        expect(screen.getByText(/Fichier sélectionné : identity.pdf/)).toBeDefined();
        expect(screen.getByText(/Fichier sélectionné : address.png/)).toBeDefined();

        fireEvent.click(screen.getByText('Suivant'));

        // 8. Step 7: Recapitulatif & CGV
        expect(screen.getByText("Vérifiez votre commande")).toBeDefined();
        
        // Accept CGV
        const cgvCheckbox = screen.getByRole('checkbox');
        fireEvent.click(cgvCheckbox);

        // Click Pay
        const payBtn = screen.getByText(/Payer/);
        await act(async () => {
            fireEvent.click(payBtn);
        });

        // Verify PDF was converted to PNG
        expect(mockConvertPdfToPng).toHaveBeenCalledTimes(1);
        expect(mockConvertPdfToPng).toHaveBeenCalledWith(idFile);

        // Verify files were uploaded to Cloudinary
        expect(mockUploadFile).toHaveBeenCalledTimes(2);

        // Verify adminDataService.addDemande was called with correct data
        expect(mockAddDemande).toHaveBeenCalledTimes(1);
        expect(mockAddDemande).toHaveBeenCalledWith(expect.objectContaining({
            clientName: 'John Doe - 📞 0612345678',
            email: 'john@example.com',
            company: 'En cours de création',
            city: 'Toulouse (31)',
            plan: 'Essentiel',
            extra_info: expect.objectContaining({
                nom: 'Doe',
                prenom: 'John',
                pieceIdentiteUrl: 'https://cloudinary.com/test-file.png',
                justificatifDomicileUrl: 'https://cloudinary.com/test-file.png'
            })
        }));

        // Verify handleCheckout was triggered
        expect(mockHandleCheckout).toHaveBeenCalledTimes(1);
    });
});
