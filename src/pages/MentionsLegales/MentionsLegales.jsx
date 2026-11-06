import React from 'react';
import { Link } from 'react-router-dom';
import { CONTACT_PHONE_HREF, CONTACT_ADDRESS_HREF, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '../../constants/contact';
import LegalLayout, { LegalH2, Todo } from './LegalLayout';
import usePageMeta from '../../components/Seo/usePageMeta';

/* Texte légal volontairement en français (non traduit). */
const MentionsLegales = () => {
    usePageMeta({
        title: 'Mentions légales — Domiciliation Pas Cher',
        description: 'Mentions légales de Domiciliation Pas Cher (CASSIN LUDOVIC) : éditeur, agrément préfectoral de domiciliation, hébergeur et contact.',
        path: '/mentions-legales',
    });
    return (
        <LegalLayout title="Mentions Légales" subtitle="En vigueur au 5 novembre 2026">
            <LegalH2 first>1. Édition du site</LegalH2>
            <p>
                Le présent site, accessible à l’URL <strong>domiciliation-pas-cher.com</strong>, est édité par la société{' '}
                <strong>CASSIN LUDOVIC</strong>, exploitée sous le nom commercial <strong>Domiciliation Pas Cher</strong>.
            </p>
            <ul>
                <li>Capital social : 2 000 €</li>
                <li>Immatriculation : RCS Toulouse 101 512 531</li>
                <li>SIRET : 101 512 531 00019</li>
                <li>N° de TVA intracommunautaire : <Todo>[À COMPLÉTER]</Todo></li>
                <li>
                    Siège social :{' '}
                    <a href={CONTACT_ADDRESS_HREF} target="_blank" rel="noopener noreferrer">
                        150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse
                    </a>
                </li>
                <li>Agrément préfectoral de domiciliation n° AG/DOM/2026/06</li>
            </ul>

            <LegalH2>2. Directeur de la publication</LegalH2>
            <p>
                Le directeur de la publication est <strong>M. Ludovic Cassin</strong>, en qualité de Président.
            </p>

            <LegalH2>3. Hébergement</LegalH2>
            <p>
                Le site est hébergé par la société <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723,
                États-Unis —{' '}
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">https://vercel.com</a>.
            </p>

            <LegalH2>4. Propriété intellectuelle</LegalH2>
            <p>
                L’ensemble de ce site relève de la législation française et internationale sur le droit d’auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
            </p>

            <LegalH2>5. Données personnelles et cookies</LegalH2>
            <p>
                Le traitement de vos données à caractère personnel, ainsi que l’usage des cookies, sont décrits dans notre{' '}
                <Link to="/confidentialite">Politique de confidentialité</Link>, conformément au Règlement Général sur la
                Protection des Données 2016/679 du 27 avril 2016 (« RGPD ») et à la loi Informatique et Libertés.
            </p>

            <LegalH2>6. Conditions générales de vente</LegalH2>
            <p>
                Les conditions applicables aux services de domiciliation sont disponibles sur la page{' '}
                <Link to="/cgv">Conditions générales de vente</Link>.
            </p>

            <LegalH2>7. Contact</LegalH2>
            <p>
                Par e-mail : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
                Par téléphone : <a href={CONTACT_PHONE_HREF}>{CONTACT_PHONE_DISPLAY}</a><br />
                Par courrier : CASSIN LUDOVIC, 150 rue Nicolas Louis Vauquelin, Bâtiment B, Lot 308, 31100 Toulouse
            </p>
        </LegalLayout>
    );
};

export default MentionsLegales;
