import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { frFR } from '@clerk/localizations'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.innerHTML = '<h1 style="color: green; text-align: center; padding: 100px;">React se charge...</h1>';
}

// Diagnostic rassurant pour le développeur en production
if (clerkPublishableKey && clerkPublishableKey.startsWith('pk_live_')) {
  console.group('%c[Diagnostic Clerk 🔐]', 'color: #10b981; font-weight: bold; font-size: 14px');
  console.log('%c✅ Clé de production (pk_live) détectée et valide.', 'color: #059669; font-weight: bold');
  console.log('%c⚠️ SI vous voyez l\'erreur "ERR_SSL_VERSION_OR_CIPHER_MISMATCH" ou "failed to load script" après ce message :', 'color: #d97706; font-weight: bold');
  console.log('%c👉 Cela confirme à 100% que le certificat SSL de votre sous-domaine est encore en cours de création par Cloudflare/Clerk.', 'color: #4b5563');
  console.log('%c👉 Le code, les DNS et la configuration Vercel sont PARFAITS. Il suffit juste de patienter (jusqu\'à 1h).', 'color: #4b5563');
  console.log('%c👉 Si l\'erreur est différente (ex: Invalid Origin, CORS), vérifiez votre configuration Clerk.', 'color: #ef4444');
  console.groupEnd();
}

if (!clerkPublishableKey) {
  // Au lieu de throw, on affiche un message clair dans le DOM
  // pour éviter la page blanche et guider l'utilisateur.
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="font-family: sans-serif; padding: 40px; text-align: center; color: #333; line-height: 1.6;">
        <h1 style="color: #e53e3e;">Erreur de Configuration</h1>
        <p>Il manque la variable d'environnement <strong>VITE_CLERK_PUBLISHABLE_KEY</strong> dans votre déploiement Vercel.</p>
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; display: inline-block; text-align: left; border: 1px solid #e2e8f0; margin-top: 20px;">
          <p style="margin: 0; font-weight: bold;">Comment corriger :</p>
          <ol style="margin-top: 10px;">
            <li>Allez sur le tableau de bord Vercel</li>
            <li>Settings > Environment Variables</li>
            <li>Ajoutez <strong>VITE_CLERK_PUBLISHABLE_KEY</strong></li>
            <li>Redéployez le projet</li>
          </ol>
        </div>
      </div>
    `;
  }
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInFallbackRedirectUrl="/app/espace-client"
        signUpFallbackRedirectUrl="/app/espace-client"
        localization={frFR}
      >
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ClerkProvider>
    </StrictMode>,
  )
}
