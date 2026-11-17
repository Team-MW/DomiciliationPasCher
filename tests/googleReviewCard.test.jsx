// Carte « Votre avis compte » de l'espace client : logo Google, lien de la fiche, masquée sans lien.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GoogleReviewCard from '../src/pages/EspaceClient/components/GoogleReviewCard.jsx';
import review from '../src/i18n/espaceClient/review.js';
import { GOOGLE_REVIEW_URL } from '../shared/company.js';

vi.mock('../src/i18n/LanguageContext', () => ({
    useTranslation: () => ({ t: (k) => review.fr[k.replace('espaceClient.review.', '')] || k, lang: 'fr' }),
}));

describe('GoogleReviewCard', () => {
    it('affiche le logo Google et un lien externe vers la fiche d’avis', () => {
        render(<GoogleReviewCard />);
        const link = screen.getByRole('link', { name: /Laisser un avis Google/ });
        expect(link).toHaveAttribute('href', 'https://g.page/r/CVwUvXEUUvbhEBM/review');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link.getAttribute('rel')).toMatch(/noopener/);
        expect(GOOGLE_REVIEW_URL).toBe('https://g.page/r/CVwUvXEUUvbhEBM/review');
        expect(document.querySelectorAll('.ec-review-logo svg path[fill="#4285F4"]').length).toBe(1);
        expect(screen.getByText('Votre avis compte')).toBeInTheDocument();
    });
    it('sans lien : rien n’est rendu ; version compacte pour la colonne de l’aperçu', () => {
        const { container } = render(<GoogleReviewCard reviewUrl="" />);
        expect(container).toBeEmptyDOMElement();
        render(<GoogleReviewCard compact />);
        expect(document.querySelector('.ec-review-card.is-compact')).not.toBeNull();
    });
    it('les trois langues ont les mêmes clés', () => {
        const keys = Object.keys(review.fr).sort();
        expect(Object.keys(review.en).sort()).toEqual(keys);
        expect(Object.keys(review.ru).sort()).toEqual(keys);
    });
});
