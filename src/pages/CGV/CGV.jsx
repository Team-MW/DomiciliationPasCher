import React from 'react';
import { PLAN_CATALOG, EXTRA_FEES_HT, MIN_COMMITMENT_MONTHS } from '../../data/plans';
import LegalLayout, { LegalH2 } from '../MentionsLegales/LegalLayout';
import usePageMeta from '../../components/Seo/usePageMeta';

/*
 * Conditions générales de vente — texte fourni par le Domiciliataire (CGV_domiciliation.pdf,
 * en vigueur au 06/11/2026). Les prix, quotas et frais sont lus dans shared/plans.js : ils
 * reproduisent les montants du document et restent alignés sur le reste du site.
 */

const P = PLAN_CATALOG;
const F = EXTRA_FEES_HT;
const PLANS = [P.essentiel, P['scan-plus'], P.physique];
const euro = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;
const CONTACT = 'contact@domiciliation-pas-cher.com';

const cellStyle = { border: '1px solid #E2E8F0', padding: '8px 10px', textAlign: 'left', verticalAlign: 'top' };
const headStyle = { ...cellStyle, background: '#1A56DB', color: '#FFFFFF', fontWeight: 700 };

const scanCell = (p) => (p.scanQuota ? `${p.scanQuota} plis par mois` : 'Non');
const FORMULA_ROWS = [
    ['Adresse de domiciliation, contrat et attestation', () => 'Inclus'],
    ['Réception et conservation du courrier', () => 'Inclus'],
    ["Notification par email avec photographie de l'enveloppe", () => 'Inclus'],
    ['Espace client en ligne', () => 'Inclus'],
    ['Retrait du courrier sur place, sur rendez-vous', () => 'Inclus'],
    ['Numérisation du contenu du courrier', scanCell],
    ['Réexpédition du courrier', (p) => (p.forwardsIncluded ? `${p.forwardsIncluded} par mois incluses, affranchissement refacturé` : 'En option payante')],
    ["Réception de colis (jusqu'à 5 kg)", (p) => (p.parcelsIncluded ? 'Inclus' : 'En option payante')],
];

const EXTRA_ROWS = [
    ['Numérisation au-delà du quota de la formule', `${euro(F.scanPerPage)} par pli`],
    [`Réexpédition (${P.essentiel.name}, ${P['scan-plus'].name}, ou ${P.physique.name} au-delà de ${P.physique.forwardsIncluded} par mois)`, `${euro(F.forward)} + coût réel de l'affranchissement`],
    [`Affranchissement d'une réexpédition incluse (${P.physique.name})`, 'Coût réel'],
    [`Réception d'un colis (${P.essentiel.name}, ${P['scan-plus'].name})`, `${euro(F.parcel)} par colis`],
    ["Conservation d'un colis au-delà de 15 jours", `${euro(F.parcelStoragePerDay)} par jour`],
    ['Location de la salle de réunion', `${euro(F.meetingRoomHour)} par heure`],
];

function Table({ head, rows, testIdPrefix }) {
    return (
        <div style={{ overflowX: 'auto', margin: '12px 0 16px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '15px' }}>
                <thead>
                    <tr>{head.map((h) => <th key={h} style={headStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} data-testid={testIdPrefix ? `${testIdPrefix}-${i}` : undefined}>
                            {row.map((cell, j) => <td key={j} style={cellStyle}>{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function CGV() {
    usePageMeta({
        title: 'Conditions générales de vente — Domiciliation Pas Cher',
        description: 'Conditions générales de vente de Domiciliation Pas Cher : formules, prestations complémentaires, prix, paiement, durée, résiliation, courrier, colis et salle de réunion.',
        path: '/cgv',
    });

    const formulaRows = [
        ...FORMULA_ROWS.map(([label, cell]) => [label, ...PLANS.map((p) => cell(p))]),
        ['Prix mensuel HT', ...PLANS.map((p) => euro(p.ht))],
    ];

    return (
        <LegalLayout title="Conditions générales de vente" subtitle="domiciliation-pas-cher.com · domiciliation d'entreprise à Toulouse · CGV en vigueur au 06/11/2026">
            <LegalH2 first>Article 1 – Identification du prestataire</LegalH2>
            <p>
                Les présentes conditions générales de vente (les « CGV ») sont proposées par la société CASSIN LUDOVIC, SAS,
                au capital de 2 000,00 €, immatriculée au RCS Toulouse 101 512 531, SIRET 101 512 531 00019, dont le siège et
                l'adresse de domiciliation sont situés 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse,
                exerçant sous le nom commercial domiciliation-pas-cher.com (le « Domiciliataire »).
            </p>
            <p>
                Le Domiciliataire est titulaire de l'agrément préfectoral de domiciliation n° AG/DOM/2026/06. Numéro de TVA
                intracommunautaire : FR91101512531. Contact : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>

            <LegalH2>Article 2 – Objet et champ d'application</LegalH2>
            <p>
                Les CGV définissent les conditions dans lesquelles le Domiciliataire fournit des prestations de domiciliation
                d'entreprise et des services associés (les « Prestations ») à toute personne qui les souscrit (le « Client »
                ou « Domicilié »).
            </p>
            <p>
                Les Prestations sont exclusivement destinées aux professionnels : sociétés, entrepreneurs individuels,
                associations, et personnes physiques agissant pour le compte d'une société en cours de constitution.
            </p>
            <p>
                Toute souscription implique l'acceptation sans réserve des CGV, matérialisée par une case à cocher lors de la
                commande en ligne. Les documents contractuels sont, par ordre de priorité décroissante : le Contrat de
                domiciliation, son Annexe 1 (bon de commande), puis les CGV. L'Annexe 1 prévaut sur les autres documents pour
                les éléments tarifaires et les services inclus.
            </p>

            <LegalH2>Article 3 – Formules</LegalH2>
            <p>
                Le Domiciliataire propose trois formules d'abonnement. Le contenu de la formule souscrite est rappelé dans
                l'Annexe 1 du Contrat.
            </p>
            <Table head={['Service', ...PLANS.map((p) => p.name)]} rows={formulaRows} testIdPrefix="cgv-formules" />
            <p>
                Les quotas de numérisation et de réexpédition sont mensuels, non reportables et remis à zéro à chaque date
                anniversaire. Un pli correspond à une enveloppe, quel que soit le nombre de pages.
            </p>
            <p>
                Conformément à l'article R123-168 du Code de commerce, le Domiciliataire met à la disposition de tout
                Domicilié, quelle que soit sa formule, une pièce propre à assurer la confidentialité nécessaire et à permettre
                la réunion des organes de direction, d'administration ou de surveillance de l'entreprise, ainsi que la tenue,
                la conservation et la consultation de ses livres, registres et documents légaux. Cette salle est réservable
                dans les conditions et au tarif prévus à l'article 15.
            </p>

            <LegalH2>Article 4 – Prestations complémentaires</LegalH2>
            <p>Les prestations suivantes sont facturées en plus de l'abonnement, aux tarifs suivants (HT) :</p>
            <Table head={['Prestation', 'Tarif HT']} rows={EXTRA_ROWS} testIdPrefix="cgv-extras" />
            <p>Le détail des prestations complémentaires consommées est consultable en temps réel dans l'espace client.</p>

            <LegalH2>Article 5 – Souscription</LegalH2>
            <p>
                La souscription se fait en ligne sur le site domiciliation-pas-cher.com ou dans les locaux du Domiciliataire.
                Elle comprend : le choix de la formule et de la périodicité (mensuelle ou annuelle), l'enregistrement d'un
                moyen de paiement, l'acceptation des CGV et la signature électronique du Contrat.
            </p>
            <p>
                Conformément à ses obligations de vigilance en matière de lutte contre le blanchiment de capitaux et le
                financement du terrorisme (articles L561-2 et suivants du Code monétaire et financier), le Domiciliataire
                demande au Client les pièces listées dans le Contrat, notamment : pièce d'identité du représentant légal et
                des bénéficiaires effectifs, justificatif de domicile de moins de 3 mois, statuts ou projet de statuts, et
                extrait Kbis ou équivalent.
            </p>
            <p>
                Le Client complète dans son espace client la procuration postale permettant au Domiciliataire de réceptionner
                les envois recommandés.
            </p>
            <p>
                Les Prestations débutent à réception du dossier complet. Le Domiciliataire peut refuser une souscription,
                notamment si le dossier est incomplet ou si les vérifications réglementaires ne sont pas satisfaisantes.
            </p>

            <LegalH2>Article 6 – Prix</LegalH2>
            <p>Les prix sont exprimés en euros hors taxes. La TVA au taux en vigueur (20 % à la date des CGV) s'y ajoute.</p>
            <p>
                Le prix de l'abonnement est garanti pendant 12 mois à compter de la souscription. Au-delà, le Domiciliataire
                peut modifier ses tarifs en informant le Client par email au moins 1 mois avant leur application. Le Client
                qui refuse la modification peut résilier son abonnement dans les conditions de l'article 10, sans que le
                nouveau tarif lui soit appliqué pendant le préavis.
            </p>
            <p>Aucun frais d'ouverture de dossier n'est facturé.</p>

            <LegalH2>Article 7 – Offres promotionnelles</LegalH2>
            <p>Les offres promotionnelles en vigueur sont présentées sur le site. À la date des CGV :</p>
            <ul>
                <li>
                    <strong>Code BIENVENUE</strong> : le premier mois d'abonnement est offert pour la formule {P.essentiel.name}{' '}
                    souscrite en paiement mensuel. Le code est utilisable une seule fois par Client. Le mois offert est compris
                    dans la durée minimale d'engagement de {MIN_COMMITMENT_MONTHS} mois.
                </li>
                <li>
                    <strong>Paiement annuel</strong> : une remise de 20 % s'applique au prix de l'abonnement de toute formule
                    payée annuellement en une fois.
                </li>
            </ul>
            <p>
                Ces deux offres ne sont pas cumulables. Le Domiciliataire peut mettre fin à une offre promotionnelle à tout
                moment, sans effet sur les abonnements déjà souscrits.
            </p>

            <LegalH2>Article 8 – Paiement et facturation</LegalH2>
            <p>
                Le paiement s'effectue par carte bancaire ou par prélèvement SEPA, via le prestataire de paiement Stripe. Le
                Client doit maintenir un moyen de paiement valide pendant toute la durée du Contrat, y compris en paiement
                annuel.
            </p>
            <ul>
                <li><strong>Abonnement mensuel</strong> : prélevé chaque mois à la date anniversaire de la souscription.</li>
                <li><strong>Abonnement annuel</strong> : payé en une seule fois à la souscription, puis à chaque renouvellement.</li>
                <li>
                    <strong>Prestations complémentaires</strong> : facturées le mois suivant leur réalisation. En mensuel, elles
                    figurent sur la facture d'abonnement suivante. En annuel, elles font l'objet d'une facture distincte en fin
                    de mois.
                </li>
            </ul>
            <p>Les factures sont disponibles dans l'espace client.</p>

            <LegalH2>Article 9 – Retard de paiement</LegalH2>
            <p>En cas d'échec de paiement, le Client en est informé par email et doit régulariser sans délai.</p>
            <ul>
                <li>
                    Après <strong>15 jours</strong> de retard, le Domiciliataire peut suspendre les Prestations (numérisation,
                    réexpédition, remise du courrier et des colis). Le courrier continue d'être réceptionné et conservé.
                </li>
                <li>
                    Après <strong>30 jours</strong> de retard, le Domiciliataire peut résilier le Contrat de plein droit, après
                    mise en demeure par email restée sans effet pendant 8 jours.
                </li>
            </ul>
            <p>
                Conformément à l'article L441-10 du Code de commerce, toute somme non payée à l'échéance entraîne de plein droit
                des pénalités de retard égales à trois fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire pour
                frais de recouvrement de 40 €.
            </p>

            <LegalH2>Article 10 – Durée, renouvellement et résiliation</LegalH2>
            <p>
                Conformément à l'article R123-168 du Code de commerce, le contrat est conclu pour une durée minimale de{' '}
                {MIN_COMMITMENT_MONTHS} mois.
            </p>
            <ul>
                <li>
                    <strong>Abonnement mensuel</strong> : à l'issue des {MIN_COMMITMENT_MONTHS} premiers mois, il se renouvelle
                    tacitement par périodes d'un mois.
                </li>
                <li>
                    <strong>Abonnement annuel</strong> : il se renouvelle tacitement par périodes d'un an. Le Domiciliataire
                    informe le Client de l'approche de l'échéance au plus tard 2 mois avant celle-ci.
                </li>
            </ul>
            <p>
                Le Client peut résilier depuis son espace client, avec un préavis d'un mois avant la fin de la période en
                cours. La résiliation ne peut prendre effet avant la fin de la durée minimale de {MIN_COMMITMENT_MONTHS} mois.
            </p>
            <p>
                Lorsque le siège social du Client est domicilié chez le Domiciliataire, la résiliation n'est effective qu'après
                réception d'un justificatif officiel du transfert ou de la radiation du siège (extrait Kbis par exemple).
                Jusqu'à cette réception, le Contrat continue de produire ses effets.
            </p>
            <p>
                Le Domiciliataire peut résilier le Contrat en cas de manquement du Client à ses obligations, après mise en
                demeure par email restée sans effet pendant 8 jours, ou sans délai en cas de manquement grave (fausse
                déclaration, utilisation frauduleuse de l'adresse, refus de fournir les pièces réglementaires).
            </p>
            <p>
                À la fin du Contrat, quelle qu'en soit la cause, le Domiciliataire informe le greffe de la cessation de la
                domiciliation. Le courrier reçu ensuite est retourné à l'expéditeur avec la mention « n'habite plus à l'adresse
                indiquée ». Les colis sont refusés.
            </p>

            <LegalH2>Article 11 – Remboursement et droit de rétractation</LegalH2>
            <p>
                Les sommes versées ne sont pas remboursables en cas de résiliation par le Client, y compris pour un abonnement
                annuel résilié en cours de période. Les Prestations restent alors fournies jusqu'au terme de la période payée.
            </p>
            <p>
                Lorsque le Domiciliataire met fin au Contrat sans faute du Client (notamment en cas de cessation d'activité ou
                de perte de l'agrément), il rembourse au Client les sommes correspondant aux mois entiers non utilisés.
            </p>
            <p>
                Les Prestations étant fournies à des professionnels, le Client ne bénéficie pas du droit de rétractation, sauf
                dans le cas prévu à l'article L221-3 du Code de la consommation : contrat conclu hors établissement, avec un
                professionnel employant 5 salariés au plus, dont l'objet n'entre pas dans le champ de son activité principale.
                Dans ce seul cas, le Client dispose d'un délai de 14 jours pour se rétracter.
            </p>

            <LegalH2>Article 12 – Courrier, numérisation et réexpédition</LegalH2>
            <p>
                Le Client communique à ses correspondants l'adresse complète de domiciliation, y compris le bâtiment et le
                numéro de lot. Le Domiciliataire n'est pas responsable du courrier mal adressé, retardé ou perdu par les
                services postaux.
            </p>
            <p>Chaque courrier reçu fait l'objet d'une notification par email avec une photographie de l'enveloppe.</p>
            <p>
                Pour les formules qui l'incluent, le Client autorise le Domiciliataire à ouvrir son courrier pour le numériser.
                La numérisation est réalisée sous 24 heures ouvrées après réception et mise en ligne dans l'espace client. Les
                originaux sont conservés et remis au Client ou réexpédiés à sa demande.
            </p>
            <p>
                La réexpédition est effectuée à l'adresse indiquée par le Client dans son espace client, selon la fréquence
                prévue par sa formule ou à sa demande.
            </p>
            <p>
                Le courrier non numérisé est tenu à disposition du Client, qui le retire sur rendez-vous. Conformément à la
                loi, lorsque le Client n'a pas pris connaissance de son courrier depuis 3 mois, le Domiciliataire en informe le
                greffe.
            </p>

            <LegalH2>Article 13 – Colis</LegalH2>
            <p>
                Le Domiciliataire réceptionne les colis d'un poids maximal de 5 kg. Sont refusés : les colis de plus de 5 kg,
                les objets dangereux ou illicites, les denrées périssables et les objets de valeur.
            </p>
            <p>
                Les colis sont conservés 15 jours à compter de leur réception. Au-delà, ils sont soit retournés à l'expéditeur,
                soit conservés moyennant {euro(F.parcelStoragePerDay)} HT par jour, au choix du Domiciliataire après
                information du Client.
            </p>
            <p>
                Le Domiciliataire n'assure pas la valeur du contenu des colis. Sa responsabilité est limitée dans les
                conditions de l'article 16.
            </p>

            <LegalH2>Article 14 – Retrait sur place</LegalH2>
            <p>
                Le Client peut retirer son courrier et ses colis du lundi au vendredi, de 9h à 18h, sur rendez-vous uniquement.
                La demande est adressée par email à <a href={`mailto:${CONTACT}`}>{CONTACT}</a> au moins 24 heures à l'avance
                (48 heures pour un colis volumineux). Le Domiciliataire confirme le créneau sous 1 jour ouvré.
            </p>
            <p>
                Le retrait est effectué par le représentant légal ou par toute personne munie d'une pièce d'identité et d'un
                pouvoir écrit.
            </p>

            <LegalH2>Article 15 – Salle de réunion</LegalH2>
            <p>
                La salle de réunion, y compris pour les réunions des organes de direction et la consultation des registres, est
                réservable sur demande écrite par email au moins 48 heures à l'avance, au tarif de {euro(F.meetingRoomHour)} HT
                par heure. Toute réservation annulée moins de 24 heures avant son début est due.
            </p>
            <p>
                Le Client utilise la salle conformément à sa destination et la restitue en bon état. Il répond des dommages
                causés par lui-même ou ses invités.
            </p>

            <LegalH2>Article 16 – Responsabilité</LegalH2>
            <p>
                Le Domiciliataire est tenu d'une obligation de moyens. Il n'est pas responsable du contenu des plis et colis, des
                retards ou pertes imputables aux services postaux ou aux transporteurs, ni des conséquences d'une adresse
                incomplète ou erronée communiquée par le Client.
            </p>
            <p>
                Sauf faute lourde ou intentionnelle, la responsabilité du Domiciliataire est limitée, tous préjudices
                confondus, au montant HT des sommes payées par le Client au titre des 12 derniers mois.
            </p>
            <p>
                Le Client est seul responsable de l'exactitude des informations transmises et de l'usage qu'il fait de
                l'adresse de domiciliation.
            </p>

            <LegalH2>Article 17 – Données personnelles</LegalH2>
            <p>
                Le Domiciliataire traite les données personnelles du Client et de ses représentants pour l'exécution du Contrat,
                la facturation et le respect de ses obligations légales, notamment de vigilance LCB-FT. Les photographies
                d'enveloppes et les numérisations sont accessibles uniquement au Client et au personnel habilité.
            </p>
            <p>
                Les données sont conservées pendant la durée du Contrat, puis pendant les durées légales applicables (notamment
                5 ans après la fin de la relation pour les pièces LCB-FT). Le Client dispose d'un droit d'accès, de
                rectification, d'effacement, de limitation et de portabilité, qu'il exerce à{' '}
                <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Il peut saisir la CNIL.
            </p>

            <LegalH2>Article 18 – Force majeure</LegalH2>
            <p>
                Aucune des parties n'est responsable d'un manquement causé par un cas de force majeure au sens de l'article 1218
                du Code civil.
            </p>

            <LegalH2>Article 19 – Modification des CGV</LegalH2>
            <p>
                Le Domiciliataire peut modifier les CGV. Les CGV applicables sont celles en vigueur à la date de souscription.
                Toute modification substantielle est notifiée au Client par email au moins 1 mois avant son entrée en vigueur ;
                le Client qui la refuse peut résilier dans les conditions de l'article 10.
            </p>

            <LegalH2>Article 20 – Droit applicable et litiges</LegalH2>
            <p>
                Les CGV sont soumises au droit français. Tout litige relatif à leur validité, leur interprétation ou leur
                exécution relève de la compétence exclusive du tribunal de commerce de Toulouse.
            </p>
            <p>Si une clause des CGV est déclarée nulle, les autres clauses restent applicables.</p>

            <p style={{ marginTop: '32px', color: '#64748B' }}>CGV en vigueur au 06/11/2026.</p>
        </LegalLayout>
    );
}
