# Domiciliation Pas Cher

Site vitrine, espace client et administration d'un centre de domiciliation d'entreprises
(Toulouse). Souscription et abonnements Stripe, signature électronique du contrat,
gestion du courrier, réservation de salles.

Avant toute modification : lire [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) (règles métier et zones à ne pas casser).

## Stack

| Couche | Outil |
|---|---|
| Front | React 18, Vite 7, React Router 7 |
| Auth | Clerk (`@clerk/clerk-react` côté navigateur, `@clerk/backend` côté serveur) |
| API | Fonctions serverless Vercel dans `api/` |
| Base de données | PlanetScale (MySQL) — **accès serveur uniquement** |
| Paiement | Stripe Checkout (abonnements, réservations), portail client, webhook |
| Documents | Cloudinary (uploads), jsPDF / pdf-lib (contrats, attestations) |
| Emails | Nodemailer (SMTP) |
| Tests | Vitest + Testing Library (happy-dom) |

## Architecture

```
api/                    Fonctions Vercel (un fichier = une route /api/<nom>)
  _auth.js              Vérification du jeton Clerk, rôle admin, propriété des fiches
  _data-service.js      Couche données (SQL) — exécutée uniquement côté serveur
  data.js               POST /api/data { method, args } : point d'entrée de la couche données
  _checkout-fulfillment.js  Confirmation idempotente d'un paiement Stripe
  stripe-webhook.js     Webhook Stripe (checkout.session.completed)
  cron/reminders.js     Cron horaire : relances, impayés, rappels d'échéance
  _*.js                 Modules internes (non exposés)
shared/                 Code partagé front/serveur (catalogue des forfaits, délais)
src/
  services/adminDataService.js  Client navigateur de /api/data (aucun accès BDD direct)
  utils/apiAuth.js      Joint le jeton Clerk à chaque fetch('/api/…')
  pages/                Vitrine, EspaceClient, Admin, Souscription…
  i18n/                 Traductions fr / en / ru
tests/                  Tests Vitest (+ src/**/__tests__)
scripts/                Scripts d'exploitation (attention : certains touchent la prod)
```

### Sécurité : ce qu'il faut savoir

- Le navigateur **n'a aucun identifiant de base de données**. Toute lecture/écriture passe par
  `/api/data`, qui vérifie le jeton Clerk : un client n'accède qu'à ses propres fiches, l'admin
  (email listé dans `VITE_ADMIN_EMAILS`, vérifié côté serveur) à tout.
- Les prix sont calculés côté serveur (`shared/plans.js`, `src/utils/meetingPrices.js`) : un
  montant envoyé par le navigateur est ignoré.
- Une nouvelle méthode de données est réservée à l'admin tant qu'elle n'est pas ajoutée
  explicitement aux méthodes client de `api/data.js` (avec contrôle de propriété).
- `tests/deploySmoke.test.js` échoue si du code front référence `VITE_DATABASE_*`.

## Démarrage

```bash
npm install
npm run dev          # Vite + exécution locale des vrais handlers de api/
npm test             # Vitest
npm run verify       # vérification complète (lancée automatiquement avant chaque git push)
npm run lint
npm run test:smtp    # SMTP : config + connexion (ajouter -- --send pour un envoi réel)
npm run smoke -- https://www.domiciliation-pas-cher.com   # contrôle d'un site déployé (rien n'est envoyé)
```

Node 22 (voir `engines` dans `package.json`).

## Vérification avant mise en ligne

`npm run verify` est exécuté par le hook git **pre-push** (installé par `npm install`) et par la CI GitHub.
Il bloque le push au premier échec. **Ne jamais utiliser `git push --no-verify`.**

| Étape | Ce qui est bloqué |
|---|---|
| 1. Contrôles de déploiement (`scripts/deploy-check.mjs`) | route supprimée, forfait ou prix incohérent, config Vercel cassée, route API introuvable |
| 2. Sitemap à jour | page publique absente du sitemap |
| 3. Lint critique (`scripts/lint-critical.mjs`) | variable inexistante, hook React mal placé, code inaccessible, clé dupliquée… |
| 4. Tests automatiques (Vitest) | régression sécurité, paiements, emails, admin, espace client ; fonction `api/` qui ne se charge pas ou plante |
| 5. Test navigateur (`scripts/browser-smoke.mjs`) | page blanche, erreur JavaScript, contenu ou titre manquant, débordement mobile, secret dans le JS public |

Le test navigateur utilise Google Chrome installé sur la machine (aucun téléchargement) et bloque tout accès
réseau externe : il est reproductible hors ligne.

## Variables d'environnement

`.env.local` en local, réglages du projet sur Vercel en production.

| Variable | Où | Rôle |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | front | Clé publique Clerk |
| `VITE_STRIPE_PUBLISHABLE_KEY` | front | Clé publique Stripe |
| `VITE_ADMIN_EMAILS` | front + serveur | Emails administrateurs (séparés par des virgules) |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | front | Uploads |
| `VITE_CALENDLY_URL` | front | Page /rendez-vous (sans elle : contact par email) |
| `CLERK_SECRET_KEY` | serveur | Vérification des jetons, invitations |
| `DATABASE_HOST`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | serveur | PlanetScale (les anciens `VITE_DATABASE_*` sont encore lus, à migrer) |
| `STRIPE_SECRET_KEY` | serveur | API Stripe |
| `STRIPE_WEBHOOK_SECRET` | serveur | Signature du webhook `/api/stripe-webhook` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | serveur | Envoi des emails |
| `ADMIN_EMAIL` | serveur | Destinataires des notifications internes |
| `CRON_SECRET` | serveur | Protection du cron (obligatoire) |
| `PUBLIC_SITE_URL` | serveur | URL publique (liens des emails, retours Stripe) |

Ne jamais préfixer un secret par `VITE_` : Vite l'inclurait dans le JavaScript public.
