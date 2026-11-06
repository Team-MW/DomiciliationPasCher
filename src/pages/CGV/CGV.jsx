import React from 'react';
import { Link } from 'react-router-dom';
import { PLAN_CATALOG, planAmountTtc } from '../../data/plans';
import { PAYMENT_GRACE_MONTHS } from '../../../shared/paymentGrace';
import { CONTACT_EMAIL, CONTACT_PHONE_HREF, CONTACT_PHONE_DISPLAY } from '../../constants/contact';
import LegalLayout, { LegalH2, Todo } from '../MentionsLegales/LegalLayout';
import usePageMeta from '../../components/Seo/usePageMeta';

/* PROJET de CGV — texte en français, à faire valider par un juriste. Prix lus dans PLAN_CATALOG. */

const formatEuro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const OFFRE_LABELS = {
    notification: 'Adresse de domiciliation, réception du courrier, notification d’arrivée par e-mail et scan numérique',
    scan: 'Prestations Essentiel + réexpédition physique du courrier',
    reexpedition: 'Prestations Scan+ + accès physique sur place (retrait du courrier et des colis)',
};

const cellStyle = { border: '1px solid #E2E8F0', padding: '8px 10px', textAlign: 'left', verticalAlign: 'top' };

export default function CGV() {
    usePageMeta({
        title: 'Conditions générales de vente — Domiciliation Pas Cher',
        description: 'Conditions générales de vente de Domiciliation Pas Cher : formules, prix, paiement, durée, résiliation et réexpédition du courrier.',
        path: '/cgv',
    });
    const plans = Object.values(PLAN_CATALOG);

    return (
        <LegalLayout title="Conditions générales de vente" subtitle="Version projet du 5 novembre 2026" draft>
            <LegalH2 first>1. Objet et champ d’application</LegalH2>
            <p>
                Les présentes conditions générales de vente (« CGV ») régissent les prestations de domiciliation d’entreprise
                et services associés proposées sur le site domiciliation-pas-cher.com par la société <strong>CASSIN LUDOVIC</strong>{' '}
                (nom commercial « Domiciliation Pas Cher »), capital social 2 000 €, RCS Toulouse 101 512 531, siège social
                150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse, titulaire de l’agrément préfectoral de
                domiciliation n° AG/DOM/2026/06 (ci-après « le Domiciliataire »), à toute personne physique ou morale
                souscrivant une prestation (ci-après « le Client »). Les informations légales complètes figurent dans les{' '}
                <Link to="/mentions-legales">mentions légales</Link>.
            </p>
            <p>
                Toute souscription implique l’acceptation des présentes CGV et la signature électronique du contrat de
                domiciliation, qui prévaut en cas de contradiction.
            </p>

            <LegalH2>2. Formules et prix</LegalH2>
            <p>Les formules proposées à la date de la présente version sont les suivantes :</p>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '15px' }}>
                    <thead>
                        <tr style={{ background: '#F1F5F9' }}>
                            <th style={cellStyle}>Formule</th>
                            <th style={cellStyle}>Contenu</th>
                            <th style={cellStyle}>Mensuel</th>
                            <th style={cellStyle}>Annuel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map((plan) => (
                            <tr key={plan.id} data-testid={`cgv-plan-${plan.id}`}>
                                <td style={cellStyle}><strong>{plan.name}</strong></td>
                                <td style={cellStyle}>{OFFRE_LABELS[plan.offre] || plan.offre}</td>
                                <td style={cellStyle}>
                                    {formatEuro(plan.ht)} HT<br />
                                    <span style={{ color: '#64748B' }}>soit {formatEuro(planAmountTtc(plan.ht, 'month'))} TTC / mois</span>
                                </td>
                                <td style={cellStyle}>
                                    {formatEuro(plan.ht * 10)} HT<br />
                                    <span style={{ color: '#64748B' }}>soit {formatEuro(planAmountTtc(plan.ht, 'year'))} TTC / an</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p>
                Les prix sont exprimés en euros, TVA française au taux de 20 % incluse pour les montants TTC. L’abonnement
                annuel correspond à dix (10) mensualités, soit deux mois offerts. Les codes promotionnels éventuels ne
                s’appliquent qu’aux abonnements mensuels. Le prix applicable est celui affiché au moment de la souscription.
            </p>
            <p>
                La réexpédition physique du courrier est réservée aux formules {PLAN_CATALOG['scan-plus'].name} et{' '}
                {PLAN_CATALOG.physique.name} ; elle n’est pas incluse dans la formule {PLAN_CATALOG.essentiel.name}. Les frais
                d’affranchissement de réexpédition : <Todo>[À COMPLÉTER — inclus ou refacturés ?]</Todo>
            </p>

            <LegalH2>3. Souscription</LegalH2>
            <p>
                La souscription s’effectue en ligne : choix de la formule et de la périodicité, saisie des informations sur
                l’entreprise et son représentant, transmission des pièces justificatives, signature électronique du contrat,
                puis paiement. Conformément aux articles L123-11-3 et R123-168 du Code de commerce, le Domiciliataire doit
                recueillir les pièces d’identité, justificatifs de domicile et documents relatifs à l’entreprise. La
                prestation ne débute qu’après réception de l’ensemble des pièces requises.
            </p>

            <LegalH2>4. Durée</LegalH2>
            <p>
                Conformément à l’article R123-168 du Code de commerce, le contrat de domiciliation est conclu pour une durée
                minimale de trois (3) mois. Il se renouvelle ensuite tacitement selon la périodicité choisie (mensuelle ou
                annuelle), sauf résiliation dans les conditions de l’article 7.
            </p>

            <LegalH2>5. Paiement</LegalH2>
            <p>
                Le paiement s’effectue par carte bancaire via le prestataire de paiement sécurisé <strong>Stripe</strong>.
                Le Domiciliataire ne stocke aucune donnée de carte bancaire. Les abonnements mensuels sont prélevés chaque
                mois à date anniversaire ; les abonnements annuels sont payés en une fois pour l’année. Les factures sont
                disponibles dans l’espace client.
            </p>

            <LegalH2>6. Défaut de paiement</LegalH2>
            <p>
                En cas d’échec de paiement, le Client en est informé par e-mail et invité à régulariser sa situation depuis
                son espace client. À défaut de régularisation dans un délai de {PAYMENT_GRACE_MONTHS} mois calendaires à
                compter du premier impayé, le contrat de domiciliation est résilié de plein droit et le greffe du tribunal de
                commerce est informé de la fin de la domiciliation, conformément à la réglementation.{' '}
                <Todo>[À VALIDER — le modèle de contrat mentionne un délai de 30 jours : harmoniser]</Todo>
            </p>

            <LegalH2>7. Résiliation</LegalH2>
            <p>
                Au-delà de la durée minimale légale de trois mois, le Client peut résilier à tout moment depuis son espace
                client. Lorsque le siège social du Client est fixé à l’adresse du Domiciliataire, la résiliation n’est
                effective qu’à réception d’un justificatif du transfert ou de la radiation du siège (par exemple un extrait
                Kbis). Le Domiciliataire peut résilier le contrat en cas de manquement du Client à ses obligations légales
                ou contractuelles, notamment en cas de défaut de paiement (article 6) ou de non-transmission des pièces
                justificatives.
            </p>

            <LegalH2>8. Droit de rétractation</LegalH2>
            <p>
                <Todo>[À COMPLÉTER — préciser si les clients consommateurs/non-professionnels bénéficient du délai de
                rétractation de 14 jours (art. L221-18 du Code de la consommation) et les conditions d’exécution anticipée ;
                la clientèle étant principalement professionnelle, à valider par un juriste]</Todo>
            </p>

            <LegalH2>9. Gestion du courrier</LegalH2>
            <p>
                Le Domiciliataire réceptionne le courrier adressé au Client, le notifie par e-mail et le met à disposition
                sous forme numérisée dans l’espace client selon la formule souscrite. La réexpédition physique est effectuée
                vers l’adresse de réexpédition indiquée par le Client (formules {PLAN_CATALOG['scan-plus'].name} et{' '}
                {PLAN_CATALOG.physique.name}). Durée de conservation du courrier papier non réexpédié :{' '}
                <Todo>[À COMPLÉTER]</Todo>
            </p>

            <LegalH2>10. Salles de réunion et bureaux</LegalH2>
            <p>
                Les clients domiciliés peuvent réserver des salles de réunion ou bureaux depuis leur espace client. Le prix
                de chaque réservation est affiché avant confirmation et réglé en ligne via Stripe. Conditions d’annulation
                et de remboursement des réservations : <Todo>[À COMPLÉTER]</Todo>
            </p>

            <LegalH2>11. Obligations du Client</LegalH2>
            <p>
                Le Client s’engage à fournir des informations exactes, à informer le Domiciliataire de toute modification
                (forme juridique, objet, dirigeants, adresse personnelle), à utiliser l’adresse de domiciliation
                conformément à la loi et à retirer ou faire réexpédier régulièrement son courrier.
            </p>

            <LegalH2>12. Responsabilité</LegalH2>
            <p>
                Le Domiciliataire est tenu d’une obligation de moyens. Il ne saurait être tenu responsable des retards ou
                pertes imputables aux services postaux ou aux transporteurs, ni d’un défaut de réception lié à un adressage
                incomplet. <Todo>[À COMPLÉTER — plafond de responsabilité éventuel]</Todo>
            </p>

            <LegalH2>13. Données personnelles</LegalH2>
            <p>
                Le traitement des données personnelles est décrit dans la{' '}
                <Link to="/confidentialite">politique de confidentialité</Link>.
            </p>

            <LegalH2>14. Droit applicable, médiation et litiges</LegalH2>
            <p>
                Les présentes CGV sont soumises au droit français. En cas de litige, les parties rechercheront une solution
                amiable. Médiateur de la consommation (le cas échéant) : <Todo>[À COMPLÉTER]</Todo>. À défaut d’accord, et
                pour les clients professionnels, compétence est attribuée au tribunal de commerce de Toulouse.
            </p>

            <LegalH2>15. Contact</LegalH2>
            <p>
                E-mail : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
                Téléphone : <a href={CONTACT_PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a>
            </p>
        </LegalLayout>
    );
}
