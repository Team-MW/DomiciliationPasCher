// Page Tarifs : annuel par défaut, gros prix = équivalent mensuel (12,80 €), annuel + TTC en petit.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Tarifs from '../src/pages/Tarifs/Tarifs.jsx';
import fr from '../src/i18n/fr.js';
import en from '../src/i18n/en.js';
import ru from '../src/i18n/ru.js';

vi.mock('../src/i18n/LanguageContext', () => ({ useTranslation: () => ({ tr: fr, lang: 'fr', t: (k) => k }) }));
vi.mock('../src/hooks/usePageMeta', () => ({ default: () => {}, usePageMeta: () => {} }));

const card = (id) => document.querySelector(`#plan-${id}`);

describe('Tarifs : affichage annuel', () => {
    it('arrive directement sur 12,80 € HT/mois, avec 153,60 € HT/an et 184,32 € TTC/an en petit', () => {
        render(<MemoryRouter><Tarifs /></MemoryRouter>);
        const ess = card('essentiel');
        expect(ess.querySelector('.pricing-value').textContent).toBe('12,80');
        expect(ess.querySelector('.pricing-period').textContent).toBe('HT/mois');
        expect(ess.querySelector('.pricing-ttc').textContent).toBe('soit 153,60 € HT/an · soit 184,32 € TTC/an');
        expect(card('scan-plus').querySelector('.pricing-value').textContent).toBe('19,20');
        expect(card('physique').querySelector('.pricing-value').textContent).toBe('30,40');
        expect(ess.querySelector('a[href*="frequence=annuel"]')).not.toBeNull();
    });
    it('en mensuel : 16 € HT/mois et le TTC mensuel', () => {
        render(<MemoryRouter><Tarifs /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: /^Mensuel$/ }));
        const ess = card('essentiel');
        expect(ess.querySelector('.pricing-value').textContent).toBe('16');
        expect(ess.querySelector('.pricing-ttc').textContent).toBe('soit 19,20 € TTC/mois');
        expect(ess.querySelector('a[href*="frequence=mensuel"]')).not.toBeNull();
    });
    it('clé equivAnnual présente en fr/en/ru', () => {
        for (const dict of [fr, en, ru]) expect(dict.tarifs.toggle.equivAnnual).toContain('{price}');
    });
});
