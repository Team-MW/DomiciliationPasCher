import React from 'react';
import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../constants/contact';
import { openCookieConsent } from '../../components/CookieConsent/consent';
import LegalLayout, { LegalH2, LegalH3, Todo } from '../MentionsLegales/LegalLayout';
import usePageMeta from '../../components/Seo/usePageMeta';

/* PROJET de politique de confidentialité — texte en français, à faire valider par un juriste. */

const cellStyle = { border: '1px solid #E2E8F0', padding: '8px 10px', textAlign: 'left', verticalAlign: 'top' };

const PROCESSORS = [
    { name: 'Clerk', role: 'Authentification et gestion des comptes clients', where: 'États-Unis' },
    { name: 'Stripe', role: 'Paiement en ligne et facturation des abonnements (aucune donnée de carte stockée par nos soins)', where: 'Irlande / États-Unis' },
    { name: 'PlanetScale', role: 'Hébergement de la base de données (dossiers clients, contrats, courrier)', where: <Todo>[À COMPLÉTER — région]</Todo> },
    { name: 'Cloudinary', role: 'Stockage des documents (pièces d’identité, justificatifs, contrats, courriers numérisés)', where: <Todo>[À COMPLÉTER — région]</Todo> },
    { name: 'Vercel', role: 'Hébergement du site et des services applicatifs', where: 'États-Unis' },
    { name: 'Google (Gmail)', role: 'Envoi des e-mails transactionnels (serveur SMTP)', where: 'Irlande / États-Unis' },
    { name: 'Google (Tag Manager, Google Ads)', role: 'Mesure d’audience et mesure des campagnes publicitaires — uniquement avec votre consentement', where: 'États-Unis' },
    { name: 'Calendly', role: 'Prise de rendez-vous sur la page « Rendez-vous »', where: 'États-Unis' },
];

export default function Confidentialite() {
    usePageMeta({
        title: 'Politique de confidentialité — Domiciliation Pas Cher',
        description: 'Comment Domiciliation Pas Cher collecte, utilise et protège vos données personnelles, et comment exercer vos droits (RGPD).',
        path: '/confidentialite',
    });
    return (
        <LegalLayout title="Politique de confidentialité" subtitle="Version projet du 5 novembre 2026" draft>
            <LegalH2 first>1. Responsable du traitement</LegalH2>
            <p>
                Le responsable du traitement est la société <strong>CASSIN LUDOVIC</strong> (nom commercial « Domiciliation
                Pas Cher »), RCS Toulouse 101 512 531, 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse,
                représentée par M. Ludovic Cassin, Président. Contact pour toute question relative à vos données :{' '}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>

            <LegalH2>2. Données collectées</LegalH2>
            <ul>
                <li><strong>Identité et coordonnées</strong> : nom, prénom, e-mail, téléphone, adresse personnelle, date et lieu de naissance, nationalité.</li>
                <li><strong>Informations sur l’entreprise</strong> : dénomination, forme juridique, SIREN, activité, dirigeants et bénéficiaires effectifs.</li>
                <li><strong>Pièces justificatives</strong> : pièces d’identité, justificatifs de domicile, Kbis et statuts, transmis au titre des obligations légales de la domiciliation (articles L123-11-3 et R123-168 du Code de commerce) et de la lutte contre le blanchiment des capitaux et le financement du terrorisme.</li>
                <li><strong>Signatures électroniques</strong> du contrat de domiciliation et de la procuration.</li>
                <li><strong>Courrier</strong> reçu pour votre compte : expéditeur, date, copie numérisée selon la formule souscrite, adresse de réexpédition.</li>
                <li><strong>Paiement</strong> : historique des abonnements et des paiements. Les données de carte bancaire sont traitées exclusivement par Stripe ; nous ne les stockons pas.</li>
                <li><strong>Réservations</strong> de salles de réunion et bureaux, et messages échangés via l’espace client.</li>
                <li><strong>Données de navigation</strong> : cookies et traceurs (voir article 7).</li>
            </ul>

            <LegalH2>3. Finalités et bases légales</LegalH2>
            <ul>
                <li><strong>Exécution du contrat</strong> (art. 6.1.b RGPD) : souscription, gestion du compte, réception et traitement du courrier, réservations, facturation, support.</li>
                <li><strong>Obligations légales</strong> (art. 6.1.c RGPD) : contrôle d’identité et conservation des pièces exigées pour la domiciliation, obligations de vigilance LCB-FT, informations au greffe, obligations comptables et fiscales.</li>
                <li><strong>Intérêt légitime</strong> (art. 6.1.f RGPD) : sécurité du site et des comptes, prévention de la fraude, relances d’impayés, réponse à vos demandes de contact.</li>
                <li><strong>Consentement</strong> (art. 6.1.a RGPD) : cookies de mesure d’audience et publicitaires (Google). Vous pouvez retirer votre consentement à tout moment.</li>
            </ul>

            <LegalH2>4. Destinataires et sous-traitants</LegalH2>
            <p>
                Vos données sont destinées au personnel habilité du Domiciliataire. Elles peuvent être communiquées aux
                autorités et administrations habilitées (greffe, administration fiscale, TRACFIN, autorités judiciaires)
                lorsque la loi l’exige. Nous faisons appel aux sous-traitants suivants :
            </p>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '15px' }}>
                    <thead>
                        <tr style={{ background: '#F1F5F9' }}>
                            <th style={cellStyle}>Prestataire</th>
                            <th style={cellStyle}>Finalité</th>
                            <th style={cellStyle}>Localisation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PROCESSORS.map((p) => (
                            <tr key={p.name}>
                                <td style={cellStyle}><strong>{p.name}</strong></td>
                                <td style={cellStyle}>{p.role}</td>
                                <td style={cellStyle}>{p.where}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <LegalH2>5. Transferts hors Union européenne</LegalH2>
            <p>
                Certains prestataires sont situés hors de l’Union européenne. Ces transferts sont encadrés par le Data Privacy
                Framework UE–États-Unis lorsque le prestataire y adhère, ou par les clauses contractuelles types de la
                Commission européenne, ou par une décision d’adéquation (Suisse).{' '}
                <Todo>[À VÉRIFIER — garanties prestataire par prestataire]</Todo>
            </p>

            <LegalH2>6. Durées de conservation</LegalH2>
            <ul>
                <li>Dossier de domiciliation et pièces justificatives : <Todo>[À COMPLÉTER — durée légale à confirmer]</Todo> après la fin du contrat.</li>
                <li>Données LCB-FT (identification et vigilance) : <Todo>[À COMPLÉTER — durée légale à confirmer]</Todo>.</li>
                <li>Factures et pièces comptables : <Todo>[À COMPLÉTER — durée légale à confirmer]</Todo>.</li>
                <li>Courriers numérisés : <Todo>[À COMPLÉTER — durée légale à confirmer]</Todo>.</li>
                <li>Prospects et demandes de contact sans suite : <Todo>[À COMPLÉTER — durée légale à confirmer]</Todo>.</li>
                <li>Choix relatif aux cookies : 6 mois, après quoi votre consentement vous est redemandé.</li>
            </ul>

            <LegalH2>7. Cookies et traceurs</LegalH2>
            <LegalH3>Traceurs strictement nécessaires (sans consentement)</LegalH3>
            <p>
                Cookies et stockage local nécessaires à l’authentification (Clerk), au paiement (Stripe), à la mémorisation
                de votre langue et de votre choix relatif aux cookies.
            </p>
            <LegalH3>Mesure d’audience et publicité (avec consentement)</LegalH3>
            <p>
                Google Tag Manager et Google Ads sont chargés en mode « consentement refusé par défaut » (Google Consent
                Mode v2) : aucun cookie publicitaire ou de mesure n’est déposé tant que vous n’avez pas cliqué sur « Tout
                accepter ». Vous pouvez modifier votre choix à tout moment :{' '}
                <button
                    type="button"
                    onClick={openCookieConsent}
                    style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: '#1A56DB', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    gérer les cookies
                </button>.
            </p>
            <LegalH3>Contenus tiers</LegalH3>
            <p>
                La page de prise de rendez-vous intègre le module Calendly, susceptible de déposer ses propres traceurs lors
                de son chargement. <Todo>[À VALIDER — conditionner ou non au consentement]</Todo>
            </p>

            <LegalH2>8. Vos droits</LegalH2>
            <p>
                Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de
                portabilité de vos données, ainsi que du droit de définir des directives relatives à leur sort après votre
                décès. Certaines données ne peuvent toutefois pas être effacées avant l’expiration des durées légales de
                conservation. Pour exercer vos droits, écrivez à{' '}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ou par courrier à l’adresse du siège ; un justificatif
                d’identité pourra vous être demandé en cas de doute raisonnable.
            </p>
            <p>
                Vous pouvez introduire une réclamation auprès de la CNIL (3 place de Fontenoy, TSA 80715, 75334 Paris Cedex
                07 —{' '}
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
            </p>

            <LegalH2>9. Sécurité</LegalH2>
            <p>
                Les données sont transmises de manière chiffrée (HTTPS). L’accès aux dossiers est réservé aux personnes
                authentifiées et habilitées. Les documents sont stockés chez des prestataires spécialisés.
            </p>

            <LegalH2>10. Modification</LegalH2>
            <p>
                La présente politique peut évoluer ; la date de version figure en haut de page. Voir aussi nos{' '}
                <Link to="/mentions-legales">mentions légales</Link> et nos <Link to="/cgv">conditions générales de vente</Link>.
            </p>
        </LegalLayout>
    );
}
