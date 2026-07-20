import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractRectangles() {
    const data = new Uint8Array(fs.readFileSync('public/Formulaire-procuration-postale.pdf'));
    const doc = await pdfjsLib.getDocument({data}).promise;
    const page = await doc.getPage(1);
    const ops = await page.getOperatorList();
    
    let currentFillColor = null;
    let x = 0, y = 0, w = 0, h = 0;
    
    // ops.fnArray contains function IDs, ops.argsArray contains arguments
    for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i];
        
        // pdfjsLib.OPS.constructPath is often used to draw rectangles
        if (fn === pdfjsLib.OPS.constructPath) {
            const pathOps = args[0];
            const pathArgs = args[1];
            // If it's a rectangle: ops are usually [OPS.rectangle]
            // For pdf.js, OPS.rectangle is not always directly in fnArray, it might be inside constructPath
            let argIdx = 0;
            for (let j = 0; j < pathOps.length; j++) {
                if (pathOps[j] === pdfjsLib.OPS.rectangle) {
                    const rx = pathArgs[argIdx];
                    const ry = pathArgs[argIdx+1];
                    const rw = pathArgs[argIdx+2];
                    const rh = pathArgs[argIdx+3];
                    if (ry > 65 && ry < 75) {
                        console.log(`Rectangle at X: ${rx}, Y: ${ry}, Width: ${rw}, Height: ${rh}`);
                    }
                    argIdx += 4;
                } else if (pathOps[j] === pdfjsLib.OPS.moveTo) {
                    argIdx += 2;
                } else if (pathOps[j] === pdfjsLib.OPS.lineTo) {
                    argIdx += 2;
                }
            }
        }
    }
}

extractRectangles().catch(console.error);
