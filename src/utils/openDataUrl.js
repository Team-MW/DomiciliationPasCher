/**
 * Ouvre un fichier encodé en `data:` dans un nouvel onglet. Chrome bloque la navigation directe vers une URL
 * `data:` (onglet vide) : on passe par un Blob. Les autres URL sont ouvertes telles quelles.
 */
export function openDataUrl(url) {
    const value = String(url || '');
    if (!value) return false;
    if (!value.startsWith('data:')) {
        window.open(value, '_blank', 'noopener,noreferrer');
        return true;
    }
    try {
        const [head, payload = ''] = value.split(',');
        const mime = (/^data:([^;,]+)/.exec(head) || [])[1] || 'application/octet-stream';
        const isBase64 = /;base64/i.test(head);
        const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return true;
    } catch {
        return false;
    }
}
