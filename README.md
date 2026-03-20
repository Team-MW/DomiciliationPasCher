# 🏢 Domiciliation Pas Cher - Logiciel de Gestion

Application SaaS de gestion de domiciliation avec espace client complet, paiements par abonnement et facturation automatique.

## 🛠️ Stack Technique & Technologies

Ce projet utilise une stack React moderne avec les outils suivants :

### 1. Frontend Core
- **React.js (v19)** avec **Vite** : Framework d'interface utilisateur rapide et performant.
- **React Router DOM** : Gestion de la navigation et des routes privées (Espace Client, Espace Admin, etc.).

### 2. Base de données & Serveur
- **PlanetScale (MySQL)** via `@planetscale/database` : Base de données serverless utilisée pour toute la donnée client.
- **Architecture de données** : L'accès à la DB se fait via une connexion directe/serverless dans `src/lib/db.js`. Les fonctions clés sont dans `src/services/adminDataService.js`.

### 3. Authentification
- **Clerk** (`@clerk/clerk-react`) : Gestion complète et sécurisée de l'authentification (Connexion sécurisée, Inscription et gestion des identités).

### 4. Paiements (Stripe)
- **Stripe** (`stripe` / `@stripe/react-stripe-js`) :
  - Utilisé pour la souscription des clients.
  - L'API (`api/checkout.js`) crée une session Stripe Checkout en mode **`subscription`**, ce qui permet à Stripe de gérer les **prélèvements automatiques récurrents (mensuels)**.

### 5. 📄 Génération de Factures PDF (jsPDF)
Afin d'éviter une architecture de webhooks complexe en backend, le système embarque un générateur de factures automatisé **100% Client-Side**.
- **Technologie** : `jspdf`
- **Fichier** : `src/pages/EspaceClient/components/Factures.jsx`
- **Comment ça marche pour un dev ?**
  1. L'application récupère la date du premier abonnement du client en base de données (`clientData.since`).
  2. Elle calcule automatiquement combien de mois se sont écoulés jusqu'à la date d'aujourd'hui.
  3. Elle affiche dynamiquement *"1 Facture par mois écoulé"*.
  4. Au clic sur "Télécharger", la librairie `jsPDF` assemble sur-mesure le fichier PDF contenant : Le logo de l'entreprise `DomiciliationPasCher-Logo.png`, les infos du client, et le détail du montant.
- *Astuce pour les modifs :* Si tu dois modifier le design du PDF (TVA, couleurs, textes), cherche la fonction intermédiaire `generatePdf` dans le composant `Factures.jsx`.

### 6. Design & Animations
- **Framer Motion** & **React Spring** : Utilisés pour quelques micro-animations UI fluides.
- **CSS** : Du CSS Natif propre.

---

## 📂 Architecture Principale

```
.
├── api/                  # Endpoints Serverless / Backend-like (checkout Stripe)
├── src/
│   ├── assets/           # Logos et Médias de l'application
│   ├── components/       # Petits composants réutilisables UI
│   ├── lib/              # Connexions externes ( PlanetScale db.js )
│   ├── pages/            # Écrans majeurs (Home, EspaceClient, Admin)
│   ├── services/         # Appels BDD et logique métier (adminDataService.js)
│   └── utils/            # Configurations (ex: stripe.js)
```

## 🚀 Guide de démarrage

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer les variables d'environnement (Créer un fichier `.env.local`) :
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=***
   VITE_DATABASE_HOST=***
   VITE_DATABASE_USERNAME=***
   VITE_DATABASE_PASSWORD=***
   VITE_STRIPE_PUBLISHABLE_KEY=***
   STRIPE_SECRET_KEY=***
   ```

3. Lancer le serveur local :
   ```bash
   npm run dev
   ```
