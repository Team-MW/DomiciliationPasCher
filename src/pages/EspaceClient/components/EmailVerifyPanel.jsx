import { useState, useEffect, useRef } from 'react';
import { callDataApi } from '../../../services/adminDataService';

/**
 * Vérification de l'email depuis l'écran de blocage. Le code part de NOTRE serveur d'emails (pas de Clerk) :
 * c'est le même envoi que les emails de bienvenue, donc il arrive quand le reste arrive.
 */
export default function EmailVerifyPanel({ t, onVerified }) {
    const [step, setStep] = useState('idle'); // idle | sending | sent | checking
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [sentTo, setSentTo] = useState('');

    const send = async () => {
        setError('');
        setStep('sending');
        try {
            const res = await callDataApi('sendEmailVerificationCode', []);
            if (res?.alreadyVerified) { onVerified(); return; }
            setSentTo(res?.email || '');
            setStep('sent');
        } catch (err) {
            setError(err?.message || t('espaceClient.shell.verifySendError'));
            // Code déjà envoyé il y a moins d'une minute (429) : on affiche quand même la saisie.
            setStep(err?.status === 429 ? 'sent' : 'idle');
        }
    };
    const submit = async (value) => {
        setError('');
        setStep('checking');
        try {
            await callDataApi('confirmEmailVerificationCode', [value]);
            onVerified();
        } catch (err) {
            setError(err?.message || t('espaceClient.shell.verifyCodeError'));
            setCode('');
            setStep('sent');
        }
    };
    const check = (event) => { event.preventDefault(); submit(code); };

    // Automatique : le code part dès l'ouverture de l'écran (une seule fois), le client n'a rien à cliquer.
    const autoSent = useRef(false);
    useEffect(() => {
        if (autoSent.current) return;
        autoSent.current = true;
        send();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="ecs-verify" style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
            {step === 'sent' || step === 'checking' ? (
                <form onSubmit={check} style={{ display: 'grid', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>{t('espaceClient.shell.verifySentTo')} <strong>{sentTo}</strong></p>
                    <input
                        inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} autoFocus onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) submit(v); }}
                        placeholder={t('espaceClient.shell.verifyCodePlaceholder')} aria-label={t('espaceClient.shell.verifyCodePlaceholder')}
                        style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 18, textAlign: 'center', letterSpacing: 6 }}
                    />
                    <button type="submit" className="ecs-btn ecs-btn-primary" disabled={step === 'checking' || code.replace(/\s/g, '').length < 6}>{t('espaceClient.shell.verifyConfirm')}</button>
                    <button type="button" className="ecs-btn ecs-btn-ghost" onClick={send}>{t('espaceClient.shell.verifyResend')}</button>
                </form>
            ) : (
                <button type="button" className="ecs-btn ecs-btn-primary" onClick={send} disabled={step === 'sending'}>{t('espaceClient.shell.verifySend')}</button>
            )}
            {error && <p role="alert" style={{ margin: 0, color: '#b91c1c', fontSize: 14 }}>{error}</p>}
        </div>
    );
}
