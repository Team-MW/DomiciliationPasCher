import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function generateTest() {
    const existingPdfBytes = fs.readFileSync('public/Formulaire-procuration-postale.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Create a helper function
    function drawInBoxes(text, startX, startY, font, size) {
        if (!text) return;
        const boxWidth = 12.853; // From our calculation!
        // The letter should be centered in the box. A typical letter is maybe 6-7 pts wide if size is 9.
        // Box is ~12.85 wide. So we can just add a small offset, e.g., ~2-3 pts.
        for (let i = 0; i < text.length && i < 38; i++) { // Max 38 letters for a full line
            page.drawText(text[i], {
                x: startX + (i * boxWidth) + 3, // +3 to center it roughly
                y: startY + 3, // slightly above the bottom line
                size: size,
                font: font,
                color: rgb(0, 0, 0)
            });
        }
    }

    drawInBoxes("EZADD (REP. PAR DEIODE DUFOR)", 360.4488, 496.9791, fontBold, 9);
    drawInBoxes("VFDSF", 360.4488, 476.6271, font, 9);
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('Formulaire_box_drawer_test.pdf', pdfBytes);
}

generateTest().catch(console.error);
