/**
 * Date du jour (AAAA-MM-JJ) à Paris. `new Date().toISOString().split('T')[0]` donne la date UTC :
 * un courrier saisi entre minuit et 1 h (2 h en été) était daté de la veille.
 */
export function parisDateIso(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Nombre de jours calendaires (Paris) entre deux instants : 0 le même jour, 1 le lendemain… */
export function parisDaysBetween(from, to = new Date()) {
    if (!Number.isFinite(new Date(from).getTime()) || !Number.isFinite(new Date(to).getTime())) return NaN; // date illisible : aucune relance
    const day = (d) => Date.parse(`${parisDateIso(new Date(d))}T00:00:00Z`);
    return Math.round((day(to) - day(from)) / 86400000);
}
