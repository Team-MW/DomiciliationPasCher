import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function grepPDF() {
    const data = new Uint8Array(fs.readFileSync('public/Formulaire-procuration-postale.pdf'));
    const doc = await pdfjsLib.getDocument({data}).promise;
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        
        textContent.items.forEach(item => {
            if (item.str.includes("SIRET") || item.str.includes("SIREN") || item.str.includes("N°")) {
                console.log(`Page ${i}, Text: "${item.str}"`);
                console.log(`X: ${item.transform[4]}, Y: ${item.transform[5]}`);
                console.log(`Width: ${item.width}`);
                console.log('---');
            }
        });
    }
}

grepPDF().catch(console.error);
