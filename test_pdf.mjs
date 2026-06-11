import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fs from 'fs';

async function run() {
    const existingPdfBytes = fs.readFileSync('public/Procuration_Postale.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    
    // Draw text with rotation 90 degrees
    const draw = (text, x, y) => {
        page.drawText(text, { 
            x, y, size: 12, color: rgb(1, 0, 0), rotate: degrees(90) 
        });
    };

    draw('X:100 Y:100', 100, 100);
    draw('X:300 Y:100', 300, 100);
    draw('X:500 Y:100', 500, 100);
    
    draw('X:100 Y:400', 100, 400);
    draw('X:300 Y:400', 300, 400);
    draw('X:500 Y:400', 500, 400);

    draw('X:100 Y:700', 100, 700);
    draw('X:300 Y:700', 300, 700);
    draw('X:500 Y:700', 500, 700);
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('test_output.pdf', pdfBytes);
}
run().catch(console.error);
