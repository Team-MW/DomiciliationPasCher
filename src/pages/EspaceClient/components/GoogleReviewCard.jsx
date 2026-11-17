import React from 'react';
import { useTranslation } from '../../../i18n/LanguageContext';
import { GOOGLE_REVIEW_URL } from '../../../../shared/company.js';

/** Logo « G » officiel de Google (quatre couleurs), en SVG inline. */
export function GoogleLogo({ size = 22 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    );
}

function Stars() {
    return (
        <span className="ec-review-stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#FBBC05">
                    <path d="M12 2.5l2.95 6.26 6.85.84-5.05 4.72 1.3 6.78L12 17.77 5.95 21.1l1.3-6.78L2.2 9.6l6.85-.84z" />
                </svg>
            ))}
        </span>
    );
}

/**
 * Carte « Votre avis compte » : invite le client à laisser un avis Google (lien de la fiche, shared/company.js).
 * Masquée tant que le lien n'est pas renseigné. `compact` = version colonne latérale de l'aperçu.
 */
export default function GoogleReviewCard({ compact = false, reviewUrl = GOOGLE_REVIEW_URL }) {
    const { t } = useTranslation();
    if (!reviewUrl) return null;
    return (
        <section className={`ec-review-card${compact ? ' is-compact' : ''}`} aria-labelledby="ec-review-title">
            <div className="ec-review-head">
                <span className="ec-review-logo"><GoogleLogo size={compact ? 20 : 24} /></span>
                <div>
                    <p className="ec-review-kicker">{t('espaceClient.review.kicker')}</p>
                    <h2 id="ec-review-title" className="ec-review-title">{t('espaceClient.review.title')}</h2>
                </div>
            </div>
            <Stars />
            <p className="ec-review-body">{t('espaceClient.review.body')}</p>
            <a className="ec-review-btn" href={reviewUrl} target="_blank" rel="noopener noreferrer">
                <GoogleLogo size={18} />
                {t('espaceClient.review.cta')}
            </a>
            <p className="ec-review-foot">{t('espaceClient.review.foot')}</p>
        </section>
    );
}
