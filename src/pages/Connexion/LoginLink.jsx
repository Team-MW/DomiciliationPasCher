import { useState } from 'react';
import { adminDataService } from '../../services/adminDataService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** « Mot de passe oublié ou code non reçu ? » → lien de connexion envoyé par notre serveur d'emails. */
export function LoginLinkRequest({ defaultEmail = '', defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const [email, setEmail] = useState(defaultEmail);
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        const clean = email.trim().toLowerCase();
        if (!EMAIL_RE.test(clean)) { setStatus('error'); setError('Saisissez l’adresse email de votre compte.'); return; }
        setStatus('sending');
        setError('');
        try {
            await adminDataService.sendLoginLink(clean);
            setStatus('sent');
        } catch (err) {
            setStatus('error');
            setError(err?.message && !/^Erreur serveur/.test(err.message) ? err.message : 'Envoi impossible pour le moment. Réessayez dans un instant ou appelez-nous au 09 60 39 69 07.');
        }
    };

    if (!open) {
        return (
            <p className="auth-link-toggle">
                Mot de passe oublié ou code non reçu ?{' '}
                <button type="button" onClick={() => setOpen(true)}>Recevoir un lien de connexion par email</button>
            </p>
        );
    }

    return (
        <form className="auth-link-box" onSubmit={submit} noValidate>
            <p className="auth-link-title">Recevoir un lien de connexion</p>
            <p className="auth-link-desc">Un clic sur le lien ouvre votre espace client, sans mot de passe ni code.</p>
            {status === 'sent' ? (
                <p className="auth-link-ok" role="status">
                    C’est envoyé. Si un compte existe pour <strong>{email.trim().toLowerCase()}</strong>, le lien arrive dans quelques instants
                    (pensez à regarder dans les spams). Le lien est valable 1 heure.
                </p>
            ) : (
                <>
                    <label htmlFor="login-link-email" className="auth-link-label">Adresse email de votre compte</label>
                    <div className="auth-link-row">
                        <input
                            id="login-link-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vous@exemple.fr"
                        />
                        <button type="submit" disabled={status === 'sending'}>
                            {status === 'sending' ? 'Envoi…' : 'Envoyer le lien'}
                        </button>
                    </div>
                    {status === 'error' && <p className="auth-link-error" role="alert">{error}</p>}
                </>
            )}
        </form>
    );
}
