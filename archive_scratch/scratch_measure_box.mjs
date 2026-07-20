import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function measureText() {
    const data = new Uint8Array(fs.readFileSync('public/Formulaire-procuration-postale.pdf'));
    const doc = await pdfjsLib.getDocument({data}).promise;
    const page = await doc.getPage(1);
    const textContent = await page.getTextContent();
    
    textContent.items.forEach(item => {
        if (item.str.includes('ooooo')) {
            console.log(`Text: "${item.str}"`);
            console.log(`X: ${item.transform[4]}, Y: ${item.transform[5]}`);
            console.log(`Width: ${item.width}`);
            console.log(`Calculated Letter Spacing: ${item.width / item.str.length}`);
            console.log('---');
        }
    });
}

measureText().catch(console.error);
