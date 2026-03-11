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
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    if (options.folder) {
        formData.append('folder', options.folder);
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de l\'envoi vers Cloudinary');
    }

    return await response.json();
};
