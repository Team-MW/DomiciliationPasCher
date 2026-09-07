/** extra_info peut arriver en objet, en JSON, ou double-encodé. */
export function parseExtraInfo(raw) {
    if (!raw) return {};
    try {
        let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function splitDisplayName(name) {
    const cleaned = String(name || '').replace(/\s*-?\s*📞.*$/, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { prenom: '', nom: '' };
    if (parts.length === 1) return { prenom: parts[0], nom: '' };
    return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}

/** Adresse saisie à la souscription (`adresse`, `adresseComplete`) ou en dossier (`adressePerso`). */
export function resolvePersonalAddress(clientData, extra = {}) {
    const assembled = [
        extra.adresse,
        extra.complement,
        [extra.codePostal, extra.villePerso].filter(Boolean).join(' '),
        extra.pays && extra.pays !== 'France' ? extra.pays : '',
    ].filter(Boolean).join(', ').replace(/\s+,/g, ',').trim();

    return String(
        clientData?.address
        || extra.adressePerso
        || extra.adresseComplete
        || extra.address
        || assembled
        || extra.adresse
        || ''
    ).trim();
}

export function normalizeSubscriptionExtra(extra) {
    const e = extra && typeof extra === 'object' ? { ...extra } : {};
    const adressePerso = resolvePersonalAddress({}, e);
    if (adressePerso && !e.adressePerso) e.adressePerso = adressePerso;
    return e;
}

/**
 * Champs indispensables au contrat (art. identité du domicilié).
 * Les values métier restent en français (stockées en base).
 */
export function getContractLegalFields(clientData) {
    const extra = parseExtraInfo(clientData?.extra_info);
    const split = splitDisplayName(clientData?.name);
    const prenom = (extra.prenom || split.prenom || '').trim();
    const nom = (extra.nom || split.nom || '').trim();
    const cName = nom ? `${prenom} ${nom}`.trim() : (clientData?.name || '').trim();
    const compName = (clientData?.company || extra.nomSociete || '').trim();
    const address = resolvePersonalAddress(clientData, extra);
    const nationalite = (extra.nationalite || '').trim();
    const qualite = (extra.qualite || '').trim();
    const dateNaissance = String(extra.dateNaissance || '').trim();
    const lieuNaissance = (extra.lieuNaissance || '').trim();

    const missing = [];
    if (!cName) missing.push('name');
    if (!compName) missing.push('company');
    if (!address) missing.push('address');
    if (!nationalite) missing.push('nationalite');
    if (!qualite) missing.push('qualite');
    if (!dateNaissance) missing.push('dateNaissance');
    if (!lieuNaissance) missing.push('lieuNaissance');

    return {
        extra,
        prenom,
        nom,
        cName,
        compName,
        address,
        nationalite,
        qualite,
        dateNaissance,
        lieuNaissance,
        missing,
    };
}
