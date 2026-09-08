# Instructions pour l’IA

À lire **avant** toute modification. Application React/Vite de domiciliation d’entreprises (espace client, admin, Stripe, Clerk, PlanetScale).

Ne pas committer ni pousser sauf demande explicite. Ne jamais `--no-verify` : le hook `pre-push` lance `npm run test:deploy` (Vitest + build Vite).

---


## Base de données — un seul profil de test

**Seul compte autorisé** pour manipuler, nettoyer ou réinitialiser la base :

| Champ | Valeur |
|---|---|
| Nom | `frefe` |
| E-mail | `benilias757@gmail.com` |

- Ne jamais supprimer contrats, signatures ou documents d’**autres** clients.
- Ne jamais `DELETE` / `TRUNCATE` global sur les tables en production.
- Script ciblé : `npm run db:clean-docs -- benilias757@gmail.com` (`scripts/reset-test-client.cjs`). L’e-mail en argument **doit** être celui-ci.
- Un autre compte interne (`sasu` / `mwcreationv2@gmail.com`) sert parfois à **se connecter** pour vérifier l’UI. Ce n’est **pas** un compte à nettoyer en base.

---

## Ne jamais casser

### 1. Stripe (`api/checkout.js`, `api/change-plan.js`, `shared/plans.js`)

- Montants Stripe **en centimes** : `Math.round(amount * 100)` (jamais de float brut).
- Ne pas recréer un customer : `stripe.customers.list({ email })` d’abord.
- Métadonnées Checkout (`demande_id`, `email`, etc.) : ne pas les retirer, le retour de paiement s’appuie dessus.
- Prix et noms de forfaits : **uniquement** `PLAN_CATALOG` dans `shared/plans.js` (réexporté par `src/data/plans.js`). Interdit d’écrire `19.90€` ou `"Scan+"` en dur dans l’UI.
- Forfaits : Essentiel (scan/notif), Scan+, Physique+. La réexpédition physique n’est **pas** dans Essentiel (`canRequestPhysicalForward`).
- URLs de succès/annulation Checkout : garder la query string. `/espace-client` redirige vers `/app/espace-client` via `RedirectKeepSearch` (`src/App.jsx`). Sans `?tab=` / `booking_success=`, les réservations salles & bureaux ne s’enregistrent pas.
- Impayés : grâce de **2 mois calendaires** puis résiliation auto (`shared/paymentGrace.js`, cron `api/cron/reminders.js` + `api/_payment-dunning.js`). Ne pas raccourcir ce délai sans instruction.

### 2. Auth & routes (`src/App.jsx`)

- Espace client réel : `/app/espace-client`. L’ancienne URL `/espace-client` doit **conserver** search et hash.
- `ProtectedRoute` : non connecté → `/connexion`, sauf `?preview=true` (prévisualisation admin).
- `PublicOnlyRoute` : déjà connecté → `/app/admin` si l’e-mail est dans `VITE_ADMIN_EMAILS`, sinon `/app/espace-client`.
- Admin : `/app/admin`.

### 3. PDF, signatures, Cloudinary

**Ne pas modifier** `src/utils/pdfGenerator.js`, le flux Cloudinary, ni la génération contrat / procuration / attestation, sauf demande explicite et ciblée.

- Logo : chargement async `new Image()`, fallback texte si échec (ne pas bloquer).
- Procuration : `doc.getImageProperties(signatureDataUrl)` pour le ratio de signature — ne pas figer largeur/hauteur au hasard.

---

## Données métier à ne pas confondre

`extra_info` (JSON, parfois double-encodé) porte le dossier. Toujours `parseExtraInfo()` depuis `src/utils/contractLegalFields.js` — pas un `JSON.parse` isolé.

Trois adresses **distinctes** :

| Adresse | Où | Usage |
|---|---|---|
| Domiciliation (siège) | Onglet Adresse, fixe (Vauquelin, Toulouse) | Kbis, greffe, banques |
| Personnelle | `clients.address` + `extra_info.adressePerso` | Contrat, identité |
| Réexpédition | `extra_info.adresseReexp` **uniquement** | Originaux postaux (Scan+ / Physique+) |

`resolvePersonalAddress` ≠ `resolveForwardingAddress`. Ne jamais préremplir la réexpédition avec le domicile.

Après `updateClientExtraInfo`, réécrire `clientData.extra_info` en `JSON.stringify(merged)` pour que le reste de l’espace client voie le changement.

---

## i18n

- Site public : `src/i18n/fr.js`, `en.js`, `ru.js`.
- Espace client : un module par onglet dans `src/i18n/espaceClient/` (enregistrer dans `index.js`).
- Toute nouvelle clé : **fr + en + ru**. `tests/i18nEspaceClient.test.js` échoue si les clés divergent ou si une valeur est vide.
- Copie UI en français d’abord. Les valeurs métier en base (forme juridique, statuts) restent en français.

---

## Tests et fin de tâche

```bash
npm run test          # vitest uniquement
npm run test:deploy   # vitest + build Vite — hook pre-push et avant un déploiement
```

CI GitHub (`.github/workflows/ci.yml`) : les mêmes deux étapes sur chaque push / PR.

- Tests : `tests/`, plus `src/**/__tests__/` et `src/pages/api/__tests__/`.
- Paiement, auth, PDF, extra_info, i18n : la suite doit rester verte **avant** de dire que c’est fini.
- Nouveau comportement → mettre à jour ou ajouter le test du même dossier.
- Mocks Stripe / jsPDF : classes constructibles (`new Stripe()`, `new jsPDF()`), sinon `TypeError: ... is not a constructor` à cause des imports dynamiques.
- Changement UI (layout, onglet, état client) : vérifier le flux dans le navigateur (`npm run dev`, souvent `http://localhost:5173/`). Un screenshot ne suffit pas. Contrôler les autres onglets qui lisent les mêmes données.

---

## Comment travailler

1. Changement **localisé**. Pas de réécriture d’un écran ou d’un utilitaire « pour faire propre ».
2. JSX : ternaires et fragments équilibrés avant d’écrire le fichier. Une parenthèse manquante fait tomber Vite (`Unterminated regexp` / `Unexpected token`).
3. Signatures de fonctions existantes : si tu les changes, mets à jour **tous** les appelants et les tests.
4. Dialogues : `appAlert` / `AppDialog`, pas `window.alert`.
5. E-mails : `src/utils/emailService.js` + handlers `api/`. Le cron d’impayés exige `CRON_SECRET`.

---

## Carte rapide

| Besoin | Fichier |
|---|---|
| Routes, redirections | `src/App.jsx` |
| Accès BDD | `src/lib/db.js`, `src/services/adminDataService.js` |
| API Vercel / Stripe / cron | `api/` |
| Forfaits, TTC, réexp. | `shared/plans.js` |
| Grâce impayés | `shared/paymentGrace.js` |
| extra_info, adresses, contrat | `src/utils/contractLegalFields.js` |
| Espace client | `src/pages/EspaceClient/` |
| Admin | `src/pages/Admin/` |
| PDF (ne pas toucher) | `src/utils/pdfGenerator.js` |
| Traductions espace client | `src/i18n/espaceClient/` |
