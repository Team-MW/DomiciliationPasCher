/**
 * Catalogue de TOUS les emails journalisés (email_logs.type) : libellé lisible, catégorie, et
 * origine par défaut. Utilisé par le serveur (colonne `source`) et par l'historique admin.
 *
 * source :
 *  - 'auto'    : envoyé tout seul (cron, paiement Stripe, relances)
 *  - 'manuel'  : déclenché par un admin (bouton, message, validation)
 *  - 'client'  : accusé envoyé au client suite à une action de sa part (signature…)
 *  - 'interne' : alerte envoyée à l'équipe (boîte admin / contact)
 */
export const EMAIL_TYPE_INFO = Object.freeze({
    welcome: { label: 'Bienvenue (paiement confirmé)', category: 'Compte', source: 'auto' },
    account_created: { label: 'Dossier créé : lien de paiement', category: 'Paiement', source: 'manuel' },
    payment_link_reminder: { label: 'Relance du lien de paiement', category: 'Paiement', source: 'auto' },
    approval: { label: 'Dossier validé', category: 'Compte', source: 'manuel' },
    access_activation: { label: 'Activation de l’accès (lien 1 clic)', category: 'Compte', source: 'auto' },
    login_link: { label: 'Lien de connexion demandé', category: 'Compte', source: 'client' },
    booking_decision: { label: 'Réservation acceptée / refusée', category: 'Réservations', source: 'manuel' },
    request_documents: { label: 'Demande de documents', category: 'Documents', source: 'auto' },
    request_documents_reminder: { label: 'Relance documents manquants', category: 'Documents', source: 'auto' },
    post_signature: { label: 'Contrat signé (accusé)', category: 'Documents', source: 'client' },
    procuration_postale: { label: 'Procuration signée (accusé)', category: 'Documents', source: 'client' },
    new_mail: { label: 'Nouveau courrier reçu', category: 'Courrier', source: 'auto' },
    reexpedition_sent: { label: 'Réexpédition effectuée', category: 'Courrier', source: 'manuel' },
    reexpedition_refused: { label: 'Réexpédition refusée', category: 'Courrier', source: 'manuel' },
    new_message: { label: 'Nouveau message de l’équipe', category: 'Messagerie', source: 'manuel' },
    payment_failed: { label: 'Paiement en échec', category: 'Paiement', source: 'auto' },
    payment_reminder: { label: 'Relance de paiement', category: 'Paiement', source: 'manuel' },
    renewal_reminder: { label: 'Rappel d’échéance annuelle', category: 'Paiement', source: 'auto' },
    domicile_terminated: { label: 'Résiliation pour impayé', category: 'Paiement', source: 'auto' },
    souscription_reminder: { label: 'Relance inscription non terminée', category: 'Prospect', source: 'auto' },
    consultation_creation: { label: 'Demande de consultation (accusé)', category: 'Prospect', source: 'client' },
    email_verification: { label: 'Code de vérification de l’adresse email', category: 'Compte', source: 'client' },
    admin_new_client: { label: 'Alerte : nouveau client', category: 'Interne', source: 'interne' },
    admin_new_message: { label: 'Alerte : message du client', category: 'Interne', source: 'interne' },
    admin_reexpedition: { label: 'Alerte : réexpédition demandée', category: 'Interne', source: 'interne' },
    admin_document_uploaded: { label: 'Alerte : document déposé', category: 'Interne', source: 'interne' },
    admin_consultation: { label: 'Alerte : demande de consultation', category: 'Interne', source: 'interne' },
    admin_payment_received: { label: 'Alerte : abonnement démarré', category: 'Interne', source: 'interne' },
    admin_payment_problem: { label: 'Alerte : paiement non activé', category: 'Interne', source: 'interne' },
    admin_health_report: { label: 'Contrôle du site : points à traiter', category: 'Interne', source: 'interne' },
    admin_payment_failures: { label: 'Alerte : récap des impayés', category: 'Interne', source: 'interne' },
    souscription_lead: { label: 'Alerte : prospect (formulaire)', category: 'Interne', source: 'interne' },
    contact_advisor: { label: 'Alerte : demande conseiller', category: 'Interne', source: 'interne' },
});

export const EMAIL_SOURCES = Object.freeze({
    auto: 'Automatique',
    manuel: 'Manuel (admin)',
    client: 'Action du client',
    interne: 'Alerte équipe',
});

export function emailTypeInfo(type) {
    return EMAIL_TYPE_INFO[type] || { label: type || 'Email', category: 'Autre', source: 'auto' };
}

/** Origine d'une ligne du journal : colonne `source` si présente (nouveaux envois), sinon déduite du type. */
export function emailSourceOf(log) {
    if (log?.source && EMAIL_SOURCES[log.source]) return log.source;
    return emailTypeInfo(log?.type).source;
}
