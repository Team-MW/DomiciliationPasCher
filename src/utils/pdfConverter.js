
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
        const numPages = pdf.numPages;
        
        const pages = [];
        let totalHeight = 0;
        let maxWidth = 0;
        const gap = 60; // Espace entre les pages
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 3.0 });
            pages.push({ page, viewport });
            totalHeight += viewport.height;
            if (viewport.width > maxWidth) maxWidth = viewport.width;
        }

        // Ajouter de l'espace pour les marges/gaps
        totalHeight += gap * (numPages + 1);
        maxWidth += gap * 2;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = maxWidth;
        canvas.height = totalHeight;

        // Fond gris comme un vrai visualiseur PDF
        context.fillStyle = '#f1f5f9';
        context.fillRect(0, 0, canvas.width, canvas.height);

        let currentY = gap;
        for (const p of pages) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = p.viewport.width;
            tempCanvas.height = p.viewport.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Lissage haute qualité pour le texte
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';

            await p.page.render({
                canvasContext: tempCtx,
                viewport: p.viewport
            }).promise;
            
            // Dessiner une ombre portée pour faire "feuille de papier"
            context.shadowColor = 'rgba(0, 0, 0, 0.1)';
            context.shadowBlur = 15;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 4;
            
            // Centrer horizontalement
            const x = (maxWidth - p.viewport.width) / 2;
            
            // Dessiner la page blanche (fond)
            context.fillStyle = '#ffffff';
            context.fillRect(x, currentY, p.viewport.width, p.viewport.height);
            
            // Enlever l'ombre pour le contenu
            context.shadowColor = 'transparent';
            
            // Dessiner le contenu de la page
            context.drawImage(tempCanvas, x, currentY);
            
            currentY += p.viewport.height + gap;
        }

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
            }, 'image/png'); // Qualité max par défaut pour PNG
        });
    } catch (error) {
        console.error("PDF Converter Error:", error);
        throw new Error("Erreur conversion : " + error.message);
    }
};
