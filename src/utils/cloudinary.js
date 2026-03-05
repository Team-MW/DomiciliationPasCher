/**
 * CLOUDINAtgtgRY UTILS
 * Gestionnaire d'upload via le Widget Cloudinary
 */

export const openUploadWidget = (options, callback) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;

    if (!window.cloudinary) {
        console.error("Cloudinary widget script is not loaded.");
        alert("Le service d'upload Cloudinary n'est pas disponible pour le moment.");
        return;
    }

    const myWidget = window.cloudinary.createUploadWidget(
        {
            cloudName: cloudName,
            apiKey: apiKey,
            uploadPreset: options.uploadPreset || 'ml_default',
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
