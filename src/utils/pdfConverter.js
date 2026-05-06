
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';

// Configuration du moteur avec le worker importé directement
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
        new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
        { type: 'module' }
    );
}

export const convertPdfToPng = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            isEvalSupported: false
        });
        
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Erreur de rendu"));
                    return;
                }
                const pngFile = new File([blob], file.name.replace(/\.pdf$/i, '.png'), {
                    type: 'image/png'
                });
                resolve(pngFile);
            }, 'image/png');
        });
    } catch (error) {
        console.error("PDF Converter Error:", error);
        throw new Error("Erreur conversion : " + error.message);
    }
};
