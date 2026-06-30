import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function generateTest() {
    const existingPdfBytes = fs.readFileSync('public/Formulaire-procuration-postale.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    function drawInBoxesTest(text, startX, startY, font, size, bw) {
        if (!text) return;
        for (let i = 0; i < text.length; i++) {
            page.drawText(text[i], {
                x: startX + (i * bw) + 3,
                y: startY + 3,
                size: size,
                font: font,
                color: rgb(1, 0, 0) // red to see clearly
            });
        }
    }

    // Try different box widths for PRESTATAIRE boxes
    drawInBoxesTest("MWCREA", 645, 75, fontBold, 9, 13.5);
    drawInBoxesTest("MWCREA", 645, 70, fontBold, 9, 14.0);
    drawInBoxesTest("MWCREA", 645, 65, fontBold, 9, 14.2);
    drawInBoxesTest("MWCREA", 645, 60, fontBold, 9, 14.5);
    
    // Also test CLIENT boxes start X
    drawInBoxesTest("CLIENTBOXES", 210, 75, fontBold, 9, 14.2);
    drawInBoxesTest("CLIENTBOXES", 215, 70, fontBold, 9, 14.2);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('Formulaire_bottom_test.pdf', pdfBytes);
}

generateTest().catch(console.error);
