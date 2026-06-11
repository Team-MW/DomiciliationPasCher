/**
 * CLOUDINAtgtgRY UTILS
 * Gestionnaire d'upload via le Widget Cloudinary
 */

export const openUploadWidget = (options, callback) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    if (!window.cloudinary) {
        console.error("Cloudinary widget script is not loaded.");
        alert("Le service d'upload Cloudinary n'est pas disponible pour le moment.");
        return;
    }

    const myWidget = window.cloudinary.createUploadWidget(
        {
            cloudName: cloudName,
            uploadPreset: options.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default',
            sources: ['local', 'url', 'camera'],
            folder: options.folder || 'documents',
            clientAllowedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'docx'],
            maxFileSize: 10000000, // 10MB
            ...options
        },
        (error, result) => {
            if (!error && result && result.event === "success") {
                callback(result.info);
            } else if (error) {
                console.error("Cloudinary Upload Error:", error);
            }
        }
    );

    myWidget.open();
};

/**
 * Upload direct sans widget (natif)
 */
export const uploadFile = async (file, options = {}) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = options.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

    const formData = new FormData();
    // Contournement bug WebKit : si string (Base64), on l'ajoute tel quel. Sinon on force un nom.
    if (typeof file === 'string') {
        formData.append('file', file);
    } else {
        formData.append('file', file, file.name || 'document.pdf');
    }
    formData.append('upload_preset', uploadPreset);
    
    if (options.public_id) {
        formData.append('public_id', options.public_id);
    }
    
    const isPDF = (file.name && file.name.toLowerCase().endsWith('.pdf')) 
               || file.type === 'application/pdf'
               || (typeof file === 'string' && file.startsWith('data:application/pdf'));
    
    // FORCER 'auto' pour éviter le blocage strict des uploads 'raw' non signés par Cloudinary
    const resourceType = 'auto';
    formData.append('resource_type', resourceType);

    if (options.folder) {
        formData.append('folder', options.folder);
    }

    // Utilisation de l'endpoint avec le resourceType dans l'URL
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de l\'envoi vers Cloudinary');
    }

    const result = await response.json();
    
    // Petite astuce : si c'est un PDF et qu'il est en resource_type 'image', 
    // on s'assure que l'URL ne contient pas de transformations qui pourraient bloquer
    return result;
};
