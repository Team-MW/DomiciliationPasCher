import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractRectangles() {
    const data = new Uint8Array(fs.readFileSync('public/Formulaire-procuration-postale.pdf'));
    const doc = await pdfjsLib.getDocument({data}).promise;
    const page = await doc.getPage(1);
    const operatorList = await page.getOperatorList();
    
    let currentX = 0;
    let currentY = 0;
    
    console.log("Looking for SIRET boxes around Y=515 and Y=305...");
    for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];
        
        if (fn === pdfjsLib.OPS.constructPath) {
            const ops = args[0];
            const coords = args[1];
            let coordIdx = 0;
            
            for (let j = 0; j < ops.length; j++) {
                if (ops[j] === pdfjsLib.OPS.moveTo) {
                    currentX = coords[coordIdx];
                    currentY = coords[coordIdx + 1];
                    coordIdx += 2;
                } else if (ops[j] === pdfjsLib.OPS.lineTo) {
                    currentX = coords[coordIdx];
                    currentY = coords[coordIdx + 1];
                    coordIdx += 2;
                } else if (ops[j] === pdfjsLib.OPS.rectangle) {
                    const x = coords[coordIdx];
                    const y = coords[coordIdx + 1];
                    const w = coords[coordIdx + 2];
                    const h = coords[coordIdx + 3];
                    coordIdx += 4;
                    // Check if rectangle is near SIRET Y coords
                    if ((y > 510 && y < 525) || (y > 300 && y < 315)) {
                        console.log(`Rect: X=${x.toFixed(2)}, Y=${y.toFixed(2)}, W=${w.toFixed(2)}, H=${h.toFixed(2)}`);
                    }
                }
            }
        }
    }
}

extractRectangles().catch(console.error);
