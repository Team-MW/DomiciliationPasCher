# Instructions pour l'IA (À lire avant toute modification)

Ce document récapitule les points névralgiques de l'application **Domiciliation Pas Cher**, les règles strictes pour ne rien casser, et la méthodologie à suivre pour l'améliorer pas à pas.

---

## 🚨 Profil de Test Unique & Sécurité de la Base de Données

> [!WARNING]
> **Le seul profil de test autorisé pour les manipulations, tests et nettoyages en base de données est :**
> - **Nom d'utilisateur** : `frefe`
> - **E-mail** : `benilias757@gmail.com`
> 
> Tout nettoyage de documents, de contrats ou de signatures doit cibler **uniquement** cet utilisateur. Ne jamais vider globalement les tables en production ou impacter d'autres clients.

---

## 🚨 Points Critiques à ne JAMAIS Casser (Règles d'Or)

L'application repose sur trois piliers fondamentaux. Toute modification sur ces parties doit être effectuée avec une vigilance extrême :

### 1. Le Flux de Paiement (Stripe)
- **Fonctionnement** : Le client choisit son forfait, le frontend appelle `/api/checkout` (handler Vercel), qui crée ou récupère un client Stripe puis génère une Stripe Checkout Session.
- **Règles d'or** :
  - **Conversion des montants** : Stripe attend des montants en centimes. Toujours utiliser `Math.round(amount * 100)` pour éviter les erreurs de virgule flottante JS.
  - **Liaison Client** : Ne jamais recréer un client Stripe s'il existe déjà avec cet e-mail. Toujours rechercher le client via `stripe.customers.list({ email })` d'abord.
  - **Métadonnées** : Les métadonnées (`demande_id`, `email`, etc.) passées à Stripe Checkout sont cruciales pour le système anti-perte. Ne pas les altérer.

### 2. La Connexion & La Sécurité des Routes (Clerk & React Router)
- **Fonctionnement** : L'accès à l'Espace Client est régi par `ProtectedRoute` et `PublicOnlyRoute` (exportées dans [App.jsx](file:///Users/elamine/Desktop/MWCREA/logiciel/domiciliation-pas-cher/src/App.jsx)).
- **Règles d'or** :
  - `ProtectedRoute` doit bloquer et rediriger vers `/connexion` tout utilisateur non authentifié (sauf si l'URL contient le paramètre `?preview=true` pour la prévisualisation admin).
  - `PublicOnlyRoute` doit empêcher un utilisateur connecté d'accéder aux pages de login/inscription/souscription, et le rediriger vers `/app/admin` (s'il s'agit d'un e-mail admin listé dans `VITE_ADMIN_EMAILS`) ou vers `/app/espace-client` (pour les clients normaux).

### 3. La Génération de Documents PDF (jsPDF)
- **Fonctionnement** : Les attestations, procurations et contrats signés sont générés en PDF côté client dans [pdfGenerator.js](file:///Users/elamine/Desktop/MWCREA/logiciel/domiciliation-pas-cher/src/utils/pdfGenerator.js) en important dynamiquement `jspdf`.
- **Règles d'or** :
  - Le logo est chargé de manière asynchrone via `new Image()`. Ne pas bloquer l'exécution si le logo échoue à charger, utiliser un fallback textuel.
  - La procuration postale utilise `doc.getImageProperties(signatureDataUrl)` pour conserver le ratio de la signature du client. Les dimensions et ratios de calcul de taille d'image doivent rester précis pour éviter les débordements sur le PDF.

---

## 🧪 Processus Obligatoire de Test & Validation

Nous disposons d'une suite de tests unitaires et d'intégration automatisés avec **Vitest** sous le dossier `/tests`.

### Commandes utiles :
- Lancer les tests une fois : `npm run test`
- Lancer les tests en mode interactif/veille : `npx vitest`

### Hook Git automatique :
Un hook `pre-push` est installé dans `.git/hooks/pre-push`. Il lance automatiquement `npm run test` à chaque `git push`. Si un seul test échoue, le push est avorté.

> [!IMPORTANT]
> **Règle absolue :** Si vous modifiez du code lié au paiement, aux routes/authentification ou à la génération de PDF, vous **devez** vérifier que la suite de tests est toujours au vert avant de déclarer la tâche terminée. Si vous introduisez de nouveaux comportements, mettez à jour ou enrichissez les fichiers de test correspondants dans `/tests`.

---

## 📈 Amélioration Continue (Petit à Petit)

Pour faire évoluer la base de code sereinement :
1. **Éviter les réécritures complètes** : Préférez des refactorisations localisées et progressives.
2. **Maintenir la compatibilité des signatures de fonction** : Si vous changez une fonction utilitaire (ex. dans `pdfGenerator.js`), assurez-vous que tous les composants consommateurs et les tests unitaires associés sont mis à jour en conséquence.
3. **Mocks de tests robustes** : Lors de l'écriture ou de la mise à jour des mocks dans les tests (ex. `stripe` ou `jspdf`), veillez à utiliser des syntaxes de classes constructibles pour éviter les erreurs de type `TypeError: ... is not a constructor` induites par le chargement asynchrone des modules.
