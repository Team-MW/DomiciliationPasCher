import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getClientExtraInfo, getPlanTariff, generateAttestationPdf, generateContratPdf, generateSignedContratBlob, generateSignedProcurationBlob, cleanForPdf } from '../src/utils/pdfGenerator.js';

// Simulation (mock) de l'import dynamique de jsPDF
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
    splitTextToSize: vi.fn().mockReturnValue(['Ligne découpée 1', 'Ligne découpée 2']),
};

// Utilisation d'une classe constructible pour simuler les appels à new jsPDF()
vi.mock('jspdf', () => {
    return {
        default: class {
            constructor() {
                return mockJsPdfMethods;
            }
        }
    };
});

// Simulation de l'objet Image et des variables globales du navigateur nécessaires au générateur PDF
beforeEach(() => {
    vi.clearAllMocks();
    
    // Simulation inconditionnelle de l'objet global Image pour ces tests
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
    if (typeof window !== 'undefined') window.Image = global.Image;

    // Empêche l'erreur 'Not implemented: navigation' de jsdom lorsque jsPDF appelle save()
    if (typeof window !== 'undefined' && window.HTMLAnchorElement) {
        window.HTMLAnchorElement.prototype.click = vi.fn();
    }
    
    // Simulation de alert et de la gestion des URLs
    global.alert = vi.fn();
    // Simulation de createObjectURL/revokeObjectURL sans casser le constructeur URL
    if (typeof global.URL.createObjectURL === 'undefined') {
        global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        global.URL.revokeObjectURL = vi.fn();
    } else {
        vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
        vi.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
});

describe('Fonctions utilitaires du générateur PDF', () => {
    
    describe('cleanForPdf', () => {
        test('devrait retourner une chaîne vide si l\'entrée est vide ou nulle', () => {
            expect(cleanForPdf(null)).toBe('');
            expect(cleanForPdf(undefined)).toBe('');
            expect(cleanForPdf('')).toBe('');
        });

        test('devrait préserver le texte alphanumérique standard, les espaces et la ponctuation', () => {
            const input = ' ML Consulting - 123 Rue de la Paix! ';
            expect(cleanForPdf(input)).toBe(input);
        });

        test('devrait préserver les accents français, les ligatures, le symbole euro et normaliser les guillemets typographiques', () => {
            const input = 'Élise à côté d’un cœur œuf à 5€';
            expect(cleanForPdf(input)).toBe("Élise à côté d'un cœur œuf à 5€");
        });

        test('devrait filtrer les émojis et les caractères non standards', () => {
            const input = 'Appelez au 📞 0600000000 ✉️ ou visitez 💻!';
            expect(cleanForPdf(input)).toBe('Appelez au  0600000000  ou visitez !');
        });
    });
    
    describe('getClientExtraInfo', () => {
        test('devrait retourner un objet vide si clientData est null ou undefined', () => {
            expect(getClientExtraInfo(null)).toEqual({});
            expect(getClientExtraInfo(undefined)).toEqual({});
        });

        test('devrait retourner un objet vide si clientData n\'a pas d\'extra_info', () => {
            expect(getClientExtraInfo({ name: 'Alice' })).toEqual({});
        });

        test('devrait parser et retourner l\'objet quand extra_info est une chaîne JSON', () => {
            const client = { extra_info: JSON.stringify({ siret: '123456', nom: 'Doe' }) };
            expect(getClientExtraInfo(client)).toEqual({ siret: '123456', nom: 'Doe' });
        });

        test('devrait retourner l\'objet directement si extra_info est déjà un objet', () => {
            const client = { extra_info: { siret: '123456', nom: 'Doe' } };
            expect(getClientExtraInfo(client)).toEqual({ siret: '123456', nom: 'Doe' });
        });

        test('devrait gérer gracieusement les chaînes JSON invalides et retourner un objet vide', () => {
            // Simulation de console.error pour éviter de polluer les logs pendant le test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const client = { extra_info: '{invalid_json' };
            expect(getClientExtraInfo(client)).toEqual({});
            consoleSpy.mockRestore();
        });
    });

    describe('getPlanTariff', () => {
        test('devrait retourner le tarif correct pour le forfait Scan+', () => {
            expect(getPlanTariff('Plan Scan+')).toEqual({
                ht: 24,
                ttc: '28.80',
                tva: '4.80',
                name: 'Scan+'
            });
        });

        test('devrait retourner le tarif correct pour le forfait Physique+', () => {
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

        test('devrait retourner le forfait Essentiel par défaut pour les forfaits non reconnus', () => {
            expect(getPlanTariff('Forfait Inconnu')).toEqual({
                ht: 20,
                ttc: '24.00',
                tva: '4.00',
                name: 'Essentiel'
            });
            expect(getPlanTariff(null)).toEqual({
                ht: 20,
                ttc: '24.00',
                tva: '4.00',
                name: 'Essentiel'
            });
        });
    });

    describe('generateAttestationPdf', () => {
        test('devrait appeler les méthodes de jsPDF et déclencher la sauvegarde du PDF', async () => {
            const client = {
                id: '123',
                name: 'Alice Martin',
                company: 'Alice Corp',
                plan: 'Scan+',
                since: '2026-01-01',
                address: '12 rue de la Paix'
            };
            
            await generateAttestationPdf(client);
            
            // Attente légère pour simuler le chargement dynamique de l'image
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(mockJsPdfMethods.save).toHaveBeenCalled();
            expect(mockJsPdfMethods.text).toHaveBeenCalledWith(
                'ATTESTATION DE DOMICILIATION',
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });

        test('devrait nettoyer le nom du client contenant des émojis (ex: 📞) avant d\'appeler jsPDF text', async () => {
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
        test('devrait appeler les méthodes de jsPDF et déclencher la sauvegarde du PDF avec plusieurs pages', async () => {
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
        test('devrait générer un Blob contenant le PDF du contrat signé', async () => {
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
        let fakePage;
        
        beforeEach(async () => {
            const { PDFDocument } = await import('pdf-lib');
            fakePage = { drawText: vi.fn(), drawImage: vi.fn() };
            vi.spyOn(PDFDocument, 'load').mockResolvedValue({
                getPages: () => [fakePage],
                embedFont: vi.fn(),
                embedPng: vi.fn().mockResolvedValue({}),
                save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
            });
        }, 60000);

        test('devrait générer un Blob contenant le PDF de la procuration signée', async () => {
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

        test('devrait placer le SIRET, Représenté par et Preuve de signature exactement aux coordonnées attendues', async () => {
            const client = {
                id: '123',
                name: 'Bob Martin',
                company: 'Bob Corp',
                siret: '123456789'
            };
            
            const signatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const procurationData = { siret: '123456789' };
            const signProof = {
                signedAt: '2026-08-14T12:00:00Z',
                signeeName: 'Bob Martin',
                ipAddress: '192.168.1.1'
            };

            await generateSignedProcurationBlob(client, signatureDataUrl, procurationData, signProof);
            
            // Vérifier que le nom "Représenté par" est à X=125, Y=355
            const representeParCall = fakePage.drawText.mock.calls.find(call => call[0] === 'BOB MARTIN');
            expect(representeParCall).toBeDefined();
            expect(representeParCall[1].x).toBe(125);
            expect(representeParCall[1].y).toBe(355);

            // Vérifier que le premier chiffre du SIRET ('1') est aux coordonnées exactes attendues
            const siretFirstDigitCall = fakePage.drawText.mock.calls.find(call => 
                call[0] === '1' && Math.abs(call[1].y - 516.5) < 0.1
            );
            expect(siretFirstDigitCall).toBeDefined();
            expect(siretFirstDigitCall[1].x).toBeCloseTo(657, 1);
            expect(siretFirstDigitCall[1].y).toBeCloseTo(516.5, 1);

            // Vérifier que la preuve de signature est bien insérée (comme la fausse image est passée)
            const signProofCall = fakePage.drawText.mock.calls.find(call => 
                call[0].includes('Signé électroniquement par Bob Martin') && call[0].includes('depuis l\'IP 192.168.1.1')
            );
            expect(signProofCall).toBeDefined();
            expect(signProofCall[1].x).toBe(430);
            expect(signProofCall[1].y).toBe(80);
        });
    });
});
