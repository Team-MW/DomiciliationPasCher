/** Tarifs HT des salles & bureaux (alignés sur /tarifs). Les values restent en français (stockées en base). */
export const MEETING_TYPES = {
    room: 'Salle de réunion (6-8 pers)',
    office: 'Bureau privé (1-2 pers)',
    cowork: 'Espace Coworking',
};

export const MEETING_DURATIONS = {
    hour: '1 heure',
    morning: 'Matinée (9h-12h)',
    afternoon: 'Après-midi (14h-18h)',
    fullday: 'Journée complète',
};

export function meetingPriceHt(type, duration) {
    const fullDay = duration === MEETING_DURATIONS.fullday;
    if ((type || '').includes('Salle') || (type || '').includes('Bureau')) {
        if (duration === MEETING_DURATIONS.hour) return 25;
        return fullDay ? 140 : 75;
    }
    return fullDay ? 30 : 15;
}

export function formatMeetingPrice(ht) {
    return Number(ht).toFixed(2).replace('.', ',');
}

export function localIsoDate(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function formatBookingDate(dateStr) {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}
