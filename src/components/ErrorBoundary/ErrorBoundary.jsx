import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';

function ErrorFallback() {
    const { tr } = useTranslation();
    const common = tr?.common || {};
    return (
        <div role="alert" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A' }}>
            <h1 style={{ fontSize: '22px', margin: 0 }}>{common.errorTitle || 'Cette page n’a pas pu s’afficher'}</h1>
            <p style={{ margin: 0, maxWidth: '420px', color: '#475569', lineHeight: 1.5 }}>{common.errorBody || 'Un incident est survenu (connexion interrompue ou nouvelle version du site). Rechargez la page.'}</p>
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop: '8px', padding: '12px 22px', borderRadius: '10px', border: 0, background: '#1A56DB', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
                {common.reload || 'Recharger la page'}
            </button>
        </div>
    );
}

/** Attrape toute erreur d'affichage (page qui ne charge pas, bug de composant) : message + bouton, jamais une page blanche. */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        console.error('Erreur d’affichage :', error);
    }

    render() {
        return this.state.failed ? <ErrorFallback /> : this.props.children;
    }
}
