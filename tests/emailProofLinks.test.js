// @vitest-environment node
/** Tous les boutons d'accès de nos emails portent la preuve signée : un clic = compte validé, jamais bloqué. */
import { describe, it, expect } from 'vitest';
import { buildApprovalEmail, buildWelcomeEmail } from '../api/_email-templates.js';
import { isValidSignupProof } from '../api/_signup-proof.js';

const links = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).filter((u) => /\/(app\/espace-client|connexion|inscription)/.test(u));

describe('preuve dans les liens d’accès des emails', () => {
    for (const [name, build] of [['dossier validé', buildApprovalEmail], ['bienvenue', buildWelcomeEmail]]) {
        it(`${name} : « Accéder », « Créer mon accès » et « Se connecter » valident l’adresse sans code`, () => {
            const { html, text } = build({ nom: 'Sherine Amri', baseUrl: 'https://site.test', email: 'Sherinee.Amrii@gmail.com' });
            const found = links(html);
            expect(found.length).toBeGreaterThanOrEqual(2);
            for (const u of found) {
                const url = new URL(u);
                expect(url.searchParams.get('email')).toBe('sherinee.amrii@gmail.com');
                expect(isValidSignupProof('sherinee.amrii@gmail.com', url.searchParams.get('v'))).toBe(true);
            }
            expect(text).toMatch(/connexion\?email=sherinee\.amrii%40gmail\.com&v=/);
        });
    }
});
