import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { CONTACT_PHONE_HREF } from '../../constants/contact';

const UNAVAILABLE_AFTER_MS = 8000;

/**
 * Affiché tant que le service de connexion (Clerk) n'est pas chargé.
 * Avant : page vide pour toujours si le script Clerk ne se chargeait pas (réseau mobile instable, bloqueur, panne).
 */
export default function AuthLoading() {
    const { tr } = useTranslation();
    const [unavailable, setUnavailable] = useState(false);
    useEffect(() => {
        const id = setTimeout(() => setUnavailable(true), UNAVAILABLE_AFTER_MS);
        return () => clearTimeout(id);
    }, []);
    const c = tr.common;
    return (
        <div className="auth-loading" role="status" aria-live="polite" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px 24px' }}>
                {unavailable ? (
                    <>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>{c.authUnavailableTitle}</h2>
                        <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.55, margin: '0 0 16px' }}>{c.authUnavailableText}</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{c.reload}</button>
                            <a href={CONTACT_PHONE_HREF} className="btn btn-ghost">{tr.footer.contact.phone}</a>
                        </div>
                    </>
                ) : (
                    <>
                        <div aria-hidden="true" style={{ width: '14px', height: '14px', borderRadius: '9999px', background: '#1A56DB', margin: '0 auto 12px', animation: 'dpc-pulse 1.2s infinite' }} />
                        <p style={{ fontSize: '14.5px', color: '#475569', margin: 0 }}>{c.loading}</p>
                    </>
                )}
            </div>
        </div>
    );
}
