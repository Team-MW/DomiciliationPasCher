import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const rootElement = document.getElementById('root');

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
        signInUrl="/connexion"
        signUpUrl="/connexion"
        afterSignInUrl="/espace-client"
        afterSignUpUrl="/espace-client"
      >
        <App />
      </ClerkProvider>
    </StrictMode>,
  )
}
