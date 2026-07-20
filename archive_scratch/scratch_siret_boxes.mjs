import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function generateTest() {
    const existingPdfBytes = fs.readFileSync('public/Formulaire-procuration-postale.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    function drawInBoxes(text, startX, startY, fontObj, size, maxLen = 38) {
        if (!text) return;
        const boxWidth = 12.853;
        for (let i = 0; i < text.length && i < maxLen; i++) {
            page.drawText(text[i], {
                x: startX + (i * boxWidth) + 2.5,
                y: startY + 3.5,
                size: size,
                font: fontObj,
                color: rgb(1, 0, 0)
            });
        }
    }

    // Test X=655, Y=512.5
    drawInBoxes("12345678901234", 655, 512.5, font, 9, 14);
    
    // SIRET prestataire
    drawInBoxes("10151253100018", 655, 303.5, font, 9, 14);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('Formulaire_siret_test3.pdf', pdfBytes);
}

generateTest().catch(console.error);
