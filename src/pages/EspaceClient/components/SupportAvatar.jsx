import React from 'react';

/**
 * Photo de profil de l'équipe Domiciliation Pas Cher (astérisque de la marque sur fond bleu nuit).
 * SVG inline : aucune image à charger, net à toutes les tailles.
 */
export default function SupportAvatar({ size = 36, className = '' }) {
    return (
        <span
            className={`ec-support-avatar ${className}`.trim()}
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <svg viewBox="0 0 1000 1000" width="58%" height="58%" fill="#FFFFFF">
                <path d="M441.7,933.8h116.7v-292.9l207.1,207.1,82.5-82.5-207.1-207.1h292.9v-116.7h-292.9l207.1-207.1-82.5-82.5-207.1,207.1V66.2h-116.7v292.9l-207.1-207.1-82.5,82.5,207.1,207.1H66.2v116.7c124.9.4,249.7.8,374.6,1.2.3,124.8.6,249.5.8,374.3Z" />
            </svg>
        </span>
    );
}
