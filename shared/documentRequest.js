/** Pièces que le domiciliataire peut réclamer après validation du dossier. */
export const DOC_LABELS = {
    statuts: 'Statuts',
    kbis: 'Extrait Kbis',
};

/** Relances après la première demande (en jours). La dernière est le dernier rappel. */
export const DOC_REMINDER_DAYS = [7, 30, 60, 80];

const DAY_MS = 24 * 60 * 60 * 1000;

function hasDoc(documents, pattern) {
    return (documents || []).some((d) => d && pattern.test(String(d.name || '')));
}

/** Liste des pièces encore manquantes parmi `requested`, d'après l'extra_info et les documents du client. */
export function computeMissingDocuments(requested, { extra = {}, documents = [] } = {}) {
    return (requested || []).filter((doc) => {
        if (doc === 'kbis') return !(extra.kbisUrl || hasDoc(documents, /kbis/i));
        if (doc === 'statuts') return !hasDoc(documents, /statut/i);
        return false;
    });
}

export function formatDocumentList(missing) {
    const labels = (missing || []).map((d) => DOC_LABELS[d] || d);
    if (labels.length <= 1) return labels[0] || '';
    return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}

/** Date limite d'envoi du Kbis pour une société en création : 3 mois après la signature du contrat. */
export function kbisDeadline(contractSignedAt) {
    if (!contractSignedAt) return null;
    const d = new Date(contractSignedAt);
    if (Number.isNaN(d.getTime())) return null;
    d.setMonth(d.getMonth() + 3);
    return d;
}

/**
 * Relance due pour une demande de documents, ou null.
 * Si plusieurs paliers sont dépassés (cron manqué), on n'envoie que le plus récent.
 */
export function dueDocumentReminder(request, now = new Date()) {
    if (!request?.requested_at || request.completed_at) return null;
    // Demande créée à la validation du dossier : premier email au prochain passage du cron,
    // pour ne pas arriver en même temps que l'email « Dossier validé ».
    if (request.initial_pending) return { day: 0, initial: true, isLast: false, covered: [] };
    const elapsedDays = Math.floor((now.getTime() - new Date(request.requested_at).getTime()) / DAY_MS);
    const sent = new Set(request.reminders_sent || []);
    const due = DOC_REMINDER_DAYS.filter((day) => elapsedDays >= day && !sent.has(day));
    if (due.length === 0) return null;
    const day = due[due.length - 1];
    return { day, isLast: day === DOC_REMINDER_DAYS[DOC_REMINDER_DAYS.length - 1], covered: due };
}
