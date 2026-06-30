import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function generateTest() {
    const existingPdfBytes = fs.readFileSync('public/Formulaire-procuration-postale.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // We know from extraction: [X: 360.4, Y: 497.0] is Raison sociale
    const startX = 360.4;
    const startY = 497.0;
    
    // Try different box widths to see which one perfectly aligns with the grid.
    // Let's draw tick marks for boxWidth = 11.5, 12, 12.2, 12.5
    // Page is 842 wide. 38 boxes. 842 - 360 = 482. 482 / 38 = ~12.6.
    
    const testWidths = [12.0, 12.2, 12.35, 12.5, 12.6, 12.8];
    const colors = [rgb(1,0,0), rgb(0,1,0), rgb(0,0,1), rgb(1,0,1), rgb(0,1,1), rgb(0,0,0)];
    
    for (let i = 0; i < testWidths.length; i++) {
        const bw = testWidths[i];
        const c = colors[i];
        for (let j = 0; j < 38; j++) {
            page.drawLine({
                start: { x: startX + j * bw, y: startY + 10 + i * 2 },
                end: { x: startX + j * bw, y: startY - 5 + i * 2 },
                color: c,
                thickness: 0.5
            });
        }
        page.drawText(`W=${bw}`, { x: startX + 38 * bw + 5, y: startY + i * 5, size: 5, color: c });
    }
    
    // Also mark the Checkbox positions
    page.drawRectangle({ x: 575, y: 342, width: 15, height: 15, borderColor: rgb(1,0,0), borderWidth: 1 });
    page.drawRectangle({ x: 580, y: 342, width: 15, height: 15, borderColor: rgb(0,1,0), borderWidth: 1 });
    page.drawRectangle({ x: 585, y: 342, width: 15, height: 15, borderColor: rgb(0,0,1), borderWidth: 1 });

    page.drawRectangle({ x: 104, y: 130, width: 10, height: 10, borderColor: rgb(1,0,0), borderWidth: 1 });
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('Formulaire_box_test.pdf', pdfBytes);
}

generateTest().catch(console.error);
