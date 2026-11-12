// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { captureSignupProofFromUrl } from '../src/utils/signupProof.js';

describe('preuve du lien de nos emails, gardée depuis n’importe quelle page', () => {
    beforeEach(() => localStorage.clear());
    it('/connexion?email=…&v=… : preuve stockée (email en minuscules)', () => {
        expect(captureSignupProofFromUrl('?email=William%40iCloud.com&v=abcdefghijklmnop1234')).toBe(true);
        expect(JSON.parse(localStorage.getItem('dpc_signup_proof'))).toEqual({ email: 'william@icloud.com', token: 'abcdefghijklmnop1234' });
    });
    it('paramètres absents ou invalides : rien n’est stocké', () => {
        for (const q of ['', '?email=a%40b.fr', '?v=abcdefghijklmnop1234', '?email=pasunemail&v=abcdefghijklmnop1234', '?email=a%40b.fr&v=<script>']) {
            expect(captureSignupProofFromUrl(q)).toBe(false);
        }
        expect(localStorage.getItem('dpc_signup_proof')).toBeNull();
    });
});
