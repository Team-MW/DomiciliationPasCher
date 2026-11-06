/**
 * Les fichiers (File) ne survivent ni à un rechargement ni au lien de reprise des emails : seuls leurs
 * noms étaient restaurés, l'étape « Requis » passait, et le dossier arrivait chez l'admin SANS documents.
 * À chaque restauration, on remet donc fichiers ET noms à vide : le client doit les rejoindre.
 */
export const NO_DOCUMENT_FILES = Object.freeze({
    pieceIdentiteFile: null,
    pieceIdentiteVersoFile: null,
    justificatifDomicileFile: null,
    pieceIdentiteRecto: '',
    pieceIdentiteVerso: '',
    justificatifDomicile: '',
});

/** Pièces obligatoires : champ du fichier → champ du nom affiché. */
export const REQUIRED_DOCUMENTS = Object.freeze([
    { file: 'pieceIdentiteFile', name: 'pieceIdentiteRecto', label: 'pièce d’identité (recto)' },
    { file: 'pieceIdentiteVersoFile', name: 'pieceIdentiteVerso', label: 'pièce d’identité (verso)' },
    { file: 'justificatifDomicileFile', name: 'justificatifDomicile', label: 'justificatif de domicile' },
]);

/** Erreurs de l'étape documents : se base sur le FICHIER réellement présent, pas sur le nom affiché. */
export function missingDocumentErrors(data) {
    const errors = {};
    for (const doc of REQUIRED_DOCUMENTS) {
        if (!data[doc.file]) errors[doc.name] = data[doc.name] ? 'Fichier à joindre à nouveau' : 'Requis';
    }
    return errors;
}
