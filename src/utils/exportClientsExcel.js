import * as XLSX from 'xlsx';

const TYPE_PROJET_LABELS = {
    creation: "Création d'entreprise",
    transfert: 'Transfert de siège',
    domiciliation: 'Domiciliation seule',
};

const OFFRE_LABELS = {
    scan: 'Scan numérique',
    reexpedition: 'Réexpédition physique',
    notification: 'Notification email',
};

const STATUS_LABELS = {
    actif: 'Actif',
    echec_paiement: 'Échec paiement',
    impayé: 'Impayé',
    inactif: 'Inactif',
};

const CLERK_STATUS_LABELS = {
    linked: 'Lié',
    manual: 'Manuel',
    invitation_sent: 'Invitation envoyée',
    mock_initial: 'Initial',
};

function parseExtraInfo(extraInfo) {
    if (!extraInfo) return {};
    try {
        const parsed = typeof extraInfo === 'string' ? JSON.parse(extraInfo) : extraInfo;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return dateStr;
}

function clientToRow(client) {
    const extra = parseExtraInfo(client.extra_info);

    return {
        'ID': client.id || '',
        'Entreprise': client.company || extra.nomSociete || '',
        'Nom dirigeant': client.name || `${extra.prenom || ''} ${extra.nom || ''}`.trim(),
        'Prénom': extra.prenom || '',
        'Nom': extra.nom || '',
        'Email': client.email || extra.email || '',
        'Téléphone': client.phone || extra.telephone || '',
        'Adresse personnelle': client.address || extra.adressePerso || '',
        'Date de naissance': extra.dateNaissance || '',
        'Lieu de naissance': extra.lieuNaissance || '',
        'Nationalité': extra.nationalite || '',
        'Ville domiciliation': client.city || extra.ville || '',
        'Formule': client.plan || '',
        'Statut': STATUS_LABELS[client.status] || client.status || '',
        'Date inscription': formatDate(client.since),
        'Date renouvellement': formatDate(client.renewal),
        'Type projet': TYPE_PROJET_LABELS[extra.typeProjet] || extra.typeProjet || '',
        'Forme juridique': extra.formeJuridique || '',
        'Nom société': extra.nomSociete || client.company || '',
        'SIREN': extra.siren || '',
        'Activité': extra.activite || '',
        'Offre courrier': OFFRE_LABELS[extra.offre] || extra.offre || '',
        'Fréquence': extra.frequence === 'annuel' ? 'Annuelle (2 mois offerts)' : extra.frequence === 'mensuel' ? 'Mensuelle' : (extra.frequence || ''),
        'Compte Clerk': client.clerkId ? 'Lié' : 'Non lié',
        'Statut Clerk': CLERK_STATUS_LABELS[client.clerkStatus] || client.clerkStatus || '',
        'ID Clerk': client.clerkId || '',
        'ID Client Stripe': extra.stripe_customer_id || '',
        'Messages non lus': parseInt(client.unreadCount, 10) || 0,
    };
}

export function exportClientsToExcel(clients) {
    if (!clients || clients.length === 0) {
        throw new Error('Aucun client à exporter');
    }

    const rows = clients.map(clientToRow);
    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0]).map((key) => {
        const maxLen = Math.max(
            key.length,
            ...rows.map((row) => String(row[key] ?? '').length)
        );
        return { wch: Math.min(maxLen + 2, 50) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `clients-export-${date}.xlsx`);
}
