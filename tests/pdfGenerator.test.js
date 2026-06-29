import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getClientExtraInfo, getPlanTariff, generateAttestationPdf, generateContratPdf, generateSignedContratBlob, generateSignedProcurationBlob, cleanForPdf } from '../src/utils/pdfGenerator.js';

// Mock dynamic import of jsPDF
const mockJsPdfMethods = {
    setFont: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    setTextColor: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    setDrawColor: vi.fn().mockReturnThis(),
    setLineWidth: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    roundedRect: vi.fn().mockReturnThis(),
    line: vi.fn().mockReturnThis(),
    setFillColor: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    save: vi.fn().mockReturnThis(),
    addImage: vi.fn().mockReturnThis(),
    getImageProperties: vi.fn().mockReturnValue({ width: 100, height: 50 }),
    output: vi.fn().mockReturnValue('data:application/pdf;base64,mockedbase64content'),
    splitTextToSize: vi.fn().mockReturnValue(['Mocked split line 1', 'Mocked split line 2']),
};

// Use constructible class to mock new jsPDF() calls
vi.mock('jspdf', () => {
    return {
        default: class {
            constructor() {
                return mockJsPdfMethods;
            }
        }
    };
});

// Mock Image and browser environment globals needed by pdfGenerator
beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the global Image object if it doesn't exist
    if (typeof global.Image === 'undefined') {
        global.Image = class {
            constructor() {
                this._src = '';
            }
            set src(value) {
                this._src = value;
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
            get src() {
                return this._src;
            }
        };
    }
    
    // Mock alert and URL.createObjectURL/revokeObjectURL
    global.alert = vi.fn();
    global.URL = {
        createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: vi.fn(),
    };
});

describe('PDF Generator Utility Functions', () => {
    
    describe('cleanForPdf', () => {
        test('should return empty string if input is empty or null', () => {
            expect(cleanForPdf(null)).toBe('');
            expect(cleanForPdf(undefined)).toBe('');
            expect(cleanForPdf('')).toBe('');
        });

        test('should preserve standard alphanumeric text, spaces, and punctuation', () => {
            const input = ' ML Consulting - 123 Rue de la Paix! ';
            expect(cleanForPdf(input)).toBe(input);
        });

        test('should preserve French accents, ligatures, and euro symbol, and normalize curly quotes', () => {
            const input = 'Élise à côté d’un cœur œuf à 5€';
            expect(cleanForPdf(input)).toBe("Élise à côté d'un cœur œuf à 5€");
        });

        test('should filter out emojis and non-standard characters', () => {
            const input = 'Appelez au 📞 0600000000 ✉️ ou visitez 💻!';
            expect(cleanForPdf(input)).toBe('Appelez au  0600000000  ou visitez !');
        });
    });
    
    describe('getClientExtraInfo', () => {
        test('should return empty object if clientData is null or undefined', () => {
            expect(getClientExtraInfo(null)).toEqual({});
            expect(getClientExtraInfo(undefined)).toEqual({});
        });

        test('should return empty object if clientData has no extra_info', () => {
            expect(getClientExtraInfo({ name: 'Alice' })).toEqual({});
        });

        test('should parse and return object when extra_info is a JSON string', () => {
            const client = { extra_info: JSON.stringify({ siret: '123456', nom: 'Doe' }) };
            expect(getClientExtraInfo(client)).toEqual({ siret: '123456', nom: 'Doe' });
        });

        test('should return object directly if extra_info is already an object', () => {
            const client = { extra_info: { siret: '123456', nom: 'Doe' } };
            expect(getClientExtraInfo(client)).toEqual({ siret: '123456', nom: 'Doe' });
        });

        test('should handle invalid JSON strings gracefully and return empty object', () => {
            // Mock console.error to avoid log pollution in test output
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const client = { extra_info: '{invalid_json' };
            expect(getClientExtraInfo(client)).toEqual({});
            consoleSpy.mockRestore();
        });
    });

    describe('getPlanTariff', () => {
        test('should return correct tariff for Scan+ plan', () => {
            expect(getPlanTariff('Plan Scan+')).toEqual({
                ht: 24,
                ttc: '28.80',
                tva: '4.80',
                name: 'Scan+'
            });
        });

        test('should return correct tariff for Physique+ plan', () => {
            expect(getPlanTariff('Plan Physique+')).toEqual({
                ht: 38,
                ttc: '45.60',
                tva: '7.60',
                name: 'Physique+'
            });
            expect(getPlanTariff('Plan Reexpedition')).toEqual({
                ht: 38,
                ttc: '45.60',
                tva: '7.60',
                name: 'Physique+'
            });
        });

        test('should return default Notification plan for unrecognized plans', () => {
            expect(getPlanTariff('Unknown Plan')).toEqual({
                ht: 20,
                ttc: '24.00',
                tva: '4.00',
                name: 'Notification'
            });
            expect(getPlanTariff(null)).toEqual({
                ht: 20,
                ttc: '24.00',
                tva: '4.00',
                name: 'Notification'
            });
        });
    });

    describe('generateAttestationPdf', () => {
        test('should invoke jsPDF methods and trigger pdf save', async () => {
            const client = {
                id: '123',
                name: 'Alice Martin',
                company: 'Alice Corp',
                plan: 'Scan+',
                since: '2026-01-01',
                address: '12 rue de la Paix'
            };
            
            await generateAttestationPdf(client);
            
            // Wait slightly for dynamic onload Image loading mock
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(mockJsPdfMethods.save).toHaveBeenCalled();
            expect(mockJsPdfMethods.text).toHaveBeenCalledWith(
                'ATTESTATION DE DOMICILIATION',
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });

        test('should clean client name containing emojis (e.g. 📞) before calling jsPDF text', async () => {
            const client = {
                id: '123',
                name: 'Alice Martin 📞 787878787',
                company: 'Alice Corp ✉️',
                plan: 'Scan+',
                since: '2026-01-01',
                address: '12 rue de la Paix'
            };
            
            await generateAttestationPdf(client);
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const textCalls = mockJsPdfMethods.text.mock.calls.map(call => call[0]);
            expect(textCalls).toContain('Représentant légal : M./Mme Alice Martin  787878787');
            expect(textCalls).toContain('Alice Corp ');
            textCalls.forEach(t => {
                expect(t).not.toContain('📞');
                expect(t).not.toContain('✉️');
            });
        });
    });

    describe('generateContratPdf', () => {
        test('should invoke jsPDF methods and trigger pdf save with multiple pages', async () => {
            const client = {
                id: '123',
                name: 'Bob Martin',
                company: 'Bob Corp',
                plan: 'Physique+',
                since: '2026-01-01',
                address: '14 rue de la Paix'
            };
            
            await generateContratPdf(client);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(mockJsPdfMethods.save).toHaveBeenCalled();
            expect(mockJsPdfMethods.addPage).toHaveBeenCalled();
        });
    });

    describe('generateSignedContratBlob', () => {
        test('should output a Blob containing the signed contract PDF', async () => {
            const client = {
                id: '123',
                name: 'Bob Martin',
                company: 'Bob Corp',
                plan: 'Physique+',
                since: '2026-01-01',
                address: '14 rue de la Paix'
            };
            
            const signatureDataUrl = 'data:image/png;base64,mockedsignature';
            
            const blob = await generateSignedContratBlob(client, signatureDataUrl);
            
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/pdf');
        });
    });

    describe('generateSignedProcurationBlob', () => {
        test('should output a Blob containing the signed procuration PDF', async () => {
            const client = {
                id: '123',
                name: 'Bob Martin',
                company: 'Bob Corp',
                plan: 'Physique+',
                since: '2026-01-01',
                address: '14 rue de la Paix'
            };
            
            const signatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const procurationData = {
                lieuNaissance: 'Toulouse',
                dateNaissance: '1990-01-01',
                typePiece: "Carte d'Identité",
                numeroPiece: '12345',
                dateDelivrance: '2020-01-01',
                autoriteDelivrance: 'Prefecture',
                pointRemise: '',
                complementAdresse: '',
                adresseVoie: '',
                lieuDit: '',
                codePostalVille: '',
                siret: '123456789'
            };
            
            const blob = await generateSignedProcurationBlob(client, signatureDataUrl, procurationData);
            
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/pdf');
        });
    });
});
