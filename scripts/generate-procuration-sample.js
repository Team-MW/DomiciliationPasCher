import fs from 'fs';
import { generateSignedProcurationBlob } from '../src/utils/pdfGenerator.js';

async function run() {
    try {
        const clientData = {
            id: '123',
            name: 'DEZDEZ DEZD - 📞 787878787',
            company: 'FREFE',
            address: '12 RUE DE LA PAIX'
        };
        const signatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const procurationData = {
            lieuNaissance: 'Toulouse',
            dateNaissance: '1990-01-01',
            typePiece: "Carte d'Identité",
            numeroPiece: '123456789',
            dateDelivrance: '2020-01-01',
            autoriteDelivrance: 'Préfecture',
            pointRemise: '',
            complementAdresse: '',
            adresseVoie: '12 RUE DE LA PAIX',
            lieuDit: '',
            codePostalVille: '31000 TOULOUSE',
            siret: '123456789'
        };

        console.log("Generating PDF blob...");
        const blob = await generateSignedProcurationBlob(clientData, signatureDataUrl, procurationData);
        
        console.log("Writing PDF file...");
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync('procuration-test.pdf', buffer);
        console.log("Successfully wrote procuration-test.pdf");

    } catch (err) {
        console.error("Error generating procuration:", err);
    }
}

run();
