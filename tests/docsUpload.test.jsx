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
        window.localStorage.clear();
        global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ features: [] }) });
    });

    afterEach(() => {
        cleanup();
    });

    test('should progress to document step, accept files, convert PDF, and submit correctly', async () => {
        await act(async () => {
            render(<Souscription />);
        });

        // 1. Step 0: Choix du projet
        fireEvent.click(screen.getByText('Domiciliation seule'));
        fireEvent.click(screen.getByText('SASU'));
        fireEvent.click(screen.getByText('Suivant'));

        // 2. Step 1: Coordonnees
        fireEvent.change(screen.getByPlaceholderText('Duran'), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Camille'), { target: { value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('exemple@gmail.com'), { target: { value: 'john@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('06 XX XX XX XX'), { target: { value: '0612345678' } });
        const dateInput = document.querySelector('input[type="date"]');
        if (dateInput) fireEvent.change(dateInput, { target: { value: '1990-01-01' } });
        fireEvent.change(screen.getByPlaceholderText('Ville, Pays'), { target: { value: 'Paris, France' } });
        fireEvent.change(screen.getByPlaceholderText('Entrez votre adresse (ex: 10 Rue de la Paix)'), { target: { value: '1 Main St' } });
        fireEvent.change(screen.getByPlaceholderText('31000'), { target: { value: '31000' } });
        fireEvent.change(screen.getByPlaceholderText('Toulouse'), { target: { value: 'Toulouse' } });
        fireEvent.click(screen.getByText('Suivant'));

        // 3. Step 2: Entreprise
        fireEvent.change(screen.getByPlaceholderText('Ex: Ma Super SASU'), { target: { value: 'SAS Test' } });
        fireEvent.change(screen.getByPlaceholderText("Décrivez brièvement l'activité de votre entreprise…"), { target: { value: 'Consulting' } });
        fireEvent.click(screen.getByText('Suivant'));

        // 4. Step 3: Domiciliation
        fireEvent.click(screen.getByText('Toulouse (31)'));
        fireEvent.click(screen.getByText('Suivant'));

        // 5. Step 4: Courrier
        fireEvent.click(screen.getByText('Suivant'));

        // 6. Step 5: Frequence
        fireEvent.click(screen.getByText('Suivant'));

        // 7. Step 6: Documents justificatifs
        expect(screen.getByText('Vos documents justificatifs')).toBeDefined();

        const fileInputsRaw = document.querySelectorAll('input[type="file"]');
        expect(fileInputsRaw.length).toBe(3);

        const idRecto = new File(['%PDF-1.4...'], 'identity.pdf', { type: 'application/pdf' });
        const idVerso = new File([''], 'identity-verso.png', { type: 'image/png' });
        const addressFile = new File([''], 'address.png', { type: 'image/png' });

        await act(async () => {
            fireEvent.change(fileInputsRaw[0], { target: { files: [idRecto] } });
            fireEvent.change(fileInputsRaw[1], { target: { files: [idVerso] } });
            fireEvent.change(fileInputsRaw[2], { target: { files: [addressFile] } });
        });

        expect(screen.getByText('identity.pdf')).toBeDefined();
        expect(screen.getByText('identity-verso.png')).toBeDefined();
        expect(screen.getByText('address.png')).toBeDefined();

        fireEvent.click(screen.getByText('Suivant'));

        // 8. Step 7: Recapitulatif & CGV
        expect(screen.getByText('Vérifiez votre commande')).toBeDefined();

        fireEvent.click(screen.getByRole('checkbox'));

        const payBtn = screen.getByText(/Payer/);
        await act(async () => {
            fireEvent.click(payBtn);
        });

        expect(mockConvertPdfToPng).toHaveBeenCalledTimes(1);
        expect(mockConvertPdfToPng).toHaveBeenCalledWith(idRecto);
        expect(mockUploadFile).toHaveBeenCalledTimes(3);

        expect(mockAddDemande).toHaveBeenCalledTimes(1);
        expect(mockAddDemande).toHaveBeenCalledWith(expect.objectContaining({
            clientName: 'John Doe - 📞 0612345678',
            email: 'john@example.com',
            company: 'SAS Test',
            city: 'Toulouse (31)',
            plan: 'Essentiel',
            extra_info: expect.objectContaining({
                nom: 'Doe',
                prenom: 'John',
                pieceIdentiteUrl: 'https://cloudinary.com/test-file.png',
                justificatifDomicileUrl: 'https://cloudinary.com/test-file.png'
            })
        }));

        expect(mockHandleCheckout).toHaveBeenCalledTimes(1);
    });
});
