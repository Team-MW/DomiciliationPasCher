# Instructions pour l'IA

À lire **en entier avant toute modification**. Application de domiciliation d'entreprises à Toulouse
(site public, tunnel d'inscription, espace client, admin) : React 18 + Vite, fonctions serveur Vercel
(`api/`), Clerk (connexion), PlanetScale (base), Stripe (paiement), Gmail SMTP (emails).

Ce fichier est **vivant** : à la fin de chaque intervention, mets à jour la section concernée et ajoute
une ligne au [Journal des leçons](#journal-des-leçons) si tu as découvert un piège. Une instruction
devenue fausse est pire qu'une instruction absente : corrige-la ou supprime-la.

---

## 1. Règles absolues

1. **Ne jamais committer ni pousser** sans demande explicite de l'utilisateur.
2. **Ne jamais `--no-verify`.** Le hook `pre-push` lance `npm run verify` (section 9). S'il échoue, il y a
   un vrai problème : corrige le code, jamais le test pour le faire passer.
3. **Base de production** : seul compte manipulable = `frefe` / `benilias757@gmail.com`. Jamais de
   `DELETE` / `TRUNCATE` / `DROP` global. Ne jamais toucher aux contrats, signatures ou documents d'un
   autre client. Les lectures de la base de production par l'IA sont bloquées par les permissions :
   ne pas les contourner.
4. **Fichiers verrouillés** (hook `pre-commit`) : `src/utils/pdfGenerator.js`, `src/utils/cloudinary.js`.
   Exception accordée par le propriétaire (6 nov. 2026) : le CONTENU de `pdfGenerator.js` (textes, adresses, numéros,
   dates) peut être corrigé ; la façon de générer et de télécharger les PDF ne change pas. Adresse = `shared/company.js`
   (`DOMICILIATION_ADDRESS`, `COMPANY_SIRET`), jamais écrite à la main. Tests : `tests/pdfContent.test.js`.
   Ne pas les modifier. Pour changer le contrat, passer par `src/utils/contractBuilder*.js` (section 5).
5. **Aucun secret côté navigateur** : tout ce qui commence par `VITE_` est publié dans le JavaScript du
   site. Mots de passe, clés secrètes, SMTP → variables serveur sans `VITE_`, lues via `api/_env.js`.
6. **Prix, noms de formules, quotas, frais** : uniquement `shared/plans.js`. **Adresse de domiciliation et
   n° d'agrément** : uniquement `shared/company.js` (toujours complète : « Bâtiment B, Lot 308 »).
   **Email de contact** : `CONTACT_EMAIL` (`src/constants/contact.js`), domaine `.com` (le `.fr` est mort).
   Jamais en dur dans un composant (des tests le vérifient).
7. **Toute nouvelle clé de traduction** existe en `fr`, `en` et `ru`, avec la même structure.
8. En cas de doute sur une règle métier (prix, délais, juridique) : **ne pas deviner**. Faire ce qui est
   clair et préparer une liste de questions pour le client.

---

## 2. Architecture

```
Navigateur ── fetch /api/* (jeton Clerk ajouté par src/utils/apiAuth.js)
   │
   ├─ /api/data        → api/data.js : routeur { method, args } avec contrôle d'accès
   │                      → api/_data-service.js (toute la logique base de données)
   ├─ /api/checkout, /api/verify-session, /api/stripe-webhook, /api/change-plan, /api/pay …
   ├─ /api/email       → api/_email-core.js (règles d'accès par type d'email)
   └─ /api/cron/reminders (Vercel Cron, protégé par CRON_SECRET)
```

- **Le navigateur ne parle jamais à la base.** `src/services/adminDataService.js` n'est qu'un proxy
  vers `/api/data` (mêmes noms de méthodes).
- `api/data.js` classe chaque méthode : `PUBLIC_METHODS` (visiteur), `CLIENT_METHODS` (client connecté,
  vérification de propriété), le reste = admin. `NEVER_EXPOSED` : jamais appelables (`init`,
  `confirmDemandePayment`). Une méthode ajoutée au service est **admin par défaut**.
- Fichiers `api/_*.js` = modules internes, jamais exposés comme routes (même en dev : 404).
- `api/_auth.js` : `requireUser`, `requireAdmin`, `getOwnership`. Admin = email vérifié présent dans
  `VITE_ADMIN_EMAILS`, contrôlé **côté serveur**.
- `api/_env.js` : **seule** façon de lire une variable serveur (`readServerEnv`). Ordre : `process.env`,
  puis `.env.local` en dev local uniquement (jamais sur Vercel, jamais pendant les tests).
- `shared/` : code commun front + serveur (`plans.js`, `contract.js`, `paymentGrace.js`…).
- Serveur de dev (`vite.config.js`) : exécute les **vrais** handlers de `api/`, avec les mêmes contrôles
  qu'en production.

---

## 3. Sécurité des données

- `extra_info` (JSON, parfois double-encodé) porte le dossier client. Toujours `parseExtraInfo()`
  (`src/utils/contractLegalFields.js`), jamais un `JSON.parse` isolé.
- Un client ne peut écrire dans son `extra_info` qu'à travers `sanitizeClientExtra` (`api/_client-extra.js`).
  Clés interdites au client : paiement, statut, offre, plan, `grille_tarifaire`, `tarif*`,
  `contract_version`, signature (sauf preuve récente dans `signature_logs`). Toute URL `…Url` doit être
  sûre (`isSafeDocumentUrl`) : React n'empêche pas `javascript:`.
- Montants Stripe **toujours recalculés côté serveur** à partir de la demande / du catalogue. Le nom du
  produit Stripe d'un abonnement vient du catalogue, jamais du navigateur.
- Échappement HTML de toute donnée utilisateur dans les emails (`escapeHtml`).
- **Suppression d'un client** (`deleteClient`) : efface la fiche, les données liées à son id ET toutes les
  traces de son email (demandes, prospect, journal des emails, preuves de signature) + ses comptes Clerk.
  Le compte Clerk d'un **admin** n'est jamais supprimé. Les fichiers Cloudinary et l'historique Stripe
  restent (verrouillé / obligation comptable).

---

## 4. Formules et prix (grille « 2026-11 »)

| id interne | Nom affiché | HT/mois | Numérisation | Réexpédition | Colis ≤ 5 kg |
|---|---|---|---|---|---|
| `essentiel` | Essentiel | 16 € | non | payante | 3 € HT |
| `scan-plus` | Confort | 24 € | 40 plis/mois | payante | 3 € HT |
| `physique` | Premium | 38 € | 100 plis/mois | 2/mois incluses | inclus |

- Annuel = 12 mois − 20 % (`annualHt`, `planAmountTtc`). Frais annexes : `EXTRA_FEES_HT`.
- Les **identifiants internes ne changent jamais** (stockés en base et dans Stripe). `resolvePlanId`
  accepte anciens et nouveaux noms (Scan+ = Confort, Physique+ = Premium).
- **Clients existants : ils gardent leur prix.** Marqueur `extra_info.grille_tarifaire = '2026-11'` posé
  à la création de demande, au paiement Checkout, à la création admin et au changement de formule.
  Sans marqueur → `LEGACY_PLAN_CATALOG` (Essentiel 20 €, annuel = 10 mois). Pour afficher ou facturer le
  prix d'un client : **`clientPlanPricing(plan, extra)`**, jamais `PLAN_CATALOG` directement.
- Quotas et frais annexes : affichés partout, **pas encore facturés automatiquement** (voir section 12).
- Impayés : le site applique **2 mois de grâce** puis résiliation auto (`shared/paymentGrace.js`, cron).
  Décision de l'utilisateur ; les CGV/contrat permettent 15 j / 30 j (« peut »). Ne pas changer sans
  instruction.

---

## 5. Contrat de domiciliation

- Texte actuel : `src/utils/contractBuilderCurrent.js` (contrat de novembre 2026, fourni par le client).
- Ancien texte : `buildLegacyContractContent` dans `src/utils/contractBuilder.js` — **figé**.
- Point d'entrée (appelé par `pdfGenerator.js`, signature inchangée) : `buildContractContent`.
- Règle (`shared/contract.js`) : tout contrat généré prend le texte actuel, **sauf** un contrat déjà signé
  avec l'ancien texte. Raison : beaucoup de contrats « signés » sont **regénérés à chaque téléchargement**
  à partir de l'image de signature (`#local-signature`) ; une signature ne doit jamais apparaître sous un
  texte que le client n'a pas signé. À la première signature, le serveur pose `contract_version`
  (`api/update-client-extra.js`).
- Un ancien client non signé reçoit le texte actuel avec **son** prix et le nom actuel de sa formule.
- Pièges jsPDF : `cleanForPdf` supprime les tirets « – » ; la police mange l'espace après « € » (doubler
  l'espace) ; après un saut de page, réappliquer police/couleur (l'en-tête les modifie).
- Vérifier un changement de contrat en **générant le PDF** et en le relisant (voir section 9).

---

## 6. Front, design et UX

- Direction artistique : bleu `#1A56DB` (primaire), fonds `#F8FAFC` / `#EFF6FF`, arrondis 12–14 px,
  vert pour le succès, orange pour l'avertissement, rouge pour le danger. Les encadrés d'information
  sont **bleus** (le jaune est réservé aux alertes).
- **Le CSS est global** (fichiers `.css` importés par page). Toute nouvelle classe doit être préfixée par
  la page ou le composant (`sous-…`, `tarifs-…`, `formule-…`). **Avant d'en créer une, vérifier qu'elle
  n'existe pas déjà** : `grep -rn "\.ma-classe\b" src`.
- Montants affichés au format français : `28,80 €` (virgule, espace avant €). HT en gros, TTC en petit.
- Dialogues : `appAlert` / `showAlert` / `showConfirm` (`AppDialog`), jamais `window.alert`. Options :
  `title`, `isDanger`, `isWarning` (succès partiel : ex. dossier créé mais email non envoyé).
- Mobile obligatoire : vérifier en 390 px de large, **aucun débordement horizontal**.
- Composants asynchrones (suggestions, recherches) : un résultat qui arrive après que l'utilisateur a
  quitté le champ ne doit pas rouvrir de liste (`AddressAutocomplete` vérifie le focus). Échap ferme.
- Routes : espace client `/app/espace-client`, admin `/app/admin`. `/espace-client` et `/admin`
  redirigent en conservant `?query` et `#hash` (`RedirectKeepSearch`) : les retours Stripe en dépendent.
- SEO : chaque page appelle `usePageMeta` (titre unique). Nouvelle page publique → l'ajouter au
  générateur de sitemap (`scripts/generate-sitemap.mjs`), sinon `npm run verify` échoue.
- Le tunnel d'inscription (`src/pages/Souscription/`) ne propose pas « Création d'entreprise » (retiré
  volontairement en sept. 2026, question ouverte au client).
- **Aperçu de l'espace client** (`/app/espace-client?preview=true`) : données de démonstration et **aucune
  écriture vers le serveur** (`setPreviewMode` dans `src/utils/apiAuth.js` bloque tout sauf les lectures).
  Un nouvel écran qui écrit doit fonctionner avec ce verrou (gérer le refus 403 sans planter).
- **États du compte** (aucun dossier, validation, impayé, résilié) : un seul composant,
  `src/pages/EspaceClient/components/AccountStateScreen.jsx` (préfixe CSS `ecs-`). Aperçu de chaque état :
  `/app/espace-client?preview=true&etat=introuvable|validation|impaye|resilie`.
- **Ne jamais afficher un statut inventé** (« Enregistré ✔ », « 100 % », « immédiat ») : un statut affiché
  reflète une donnée réelle, sinon on affiche l'état inconnu ou manquant.
- Tout chargement de données dans un composant est dans un `try/catch` (réseau coupé, session expirée).
- Courriers : bouton « Consulter le scan » seulement si `preview` existe ; sinon dire quoi faire (retrait sur
  rendez-vous). Compteur de numérisation : `scanQuotaFor` + `currentQuotaPeriodStart` (date anniversaire).
- **Coquille de l'espace client (refonte nov. 2026)** : sidebar bleu nuit à navigation groupée (Courrier /
  Mon dossier / Facturation / Services), en-tête avec fil d'Ariane `ec-crumbs` (libellés via
  `SECTION_LABEL_KEY` dans `EspaceClient.jsx` : un nouvel onglet doit y être ajouté), tableau de bord en
  classes `ecd-` (CSS en fin de `EspaceClient.css`, section « REFONTE ESPACE CLIENT »).
  Couleur d'action : `--ec-accent` = `#1A56DB`, redéfinie **sur `.ec-layout`** (pas sur `:root`, pour ne pas
  toucher l'admin). Icônes : toutes en trait (`stroke="currentColor"`), jamais de couleur codée en dur.
- **Avatar du support** : `components/SupportAvatar.jsx` (astérisque de la marque, SVG inline). Il est
  dans l'en-tête de la messagerie et à côté de chaque message de l'admin (test `messagesAvatar.test.jsx`).

---

### Performance (nov. 2026, test `tests/performance.test.jsx`)
- Bundle principal = accueil + /offre (pages Google Ads) seulement. Toute autre page : `lazy()` dans
  `App.jsx` + ajout à `PREFETCH_PAGES` (préchargement quand le navigateur est libre).
- Gros modules (pdfjs, jspdf, xlsx…) : `await import()` au moment de l'action, jamais d'import statique.
- Langues : `fr` dans le bundle, `en` / `ru` via `loadLanguage()` ; `main.jsx` précharge la langue
  initiale avant le rendu. Un test qui affiche en/ru doit faire `await loadLanguage('en')` avant.
- Images : logo = SVG (`DomiciliationPasCher-Logo-11.svg`). Le PNG 8434 px ne sert qu'aux PDF.
- Polling : jamais quand l'onglet est caché (`document.hidden`).

## 7. Emails

- SMTP Gmail : `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`/`SMTP_FROM` = l'adresse Gmail,
  `SMTP_PASS` = **mot de passe d'application** Google (16 caractères, sans espaces).
- Nom d'expéditeur affiché : `SENDER_NAME` (`api/_email-kit.js`). Pied de page : adresse + agrément.
- Domaine réel du site : **`https://www.domiciliation-pas-cher.com`** (le `.fr` ne répond pas).
- Tester : `npm run test:smtp` (connexion), `-- --send` (vrai envoi), `-- --send --template`.
- **Contenu des emails** : `api/_email-templates.js` (clients) et `buildTransactionalEmail` (`api/_email-core.js`),
  fonctions pures testables qui n'envoient rien ; `deliverEmail` se charge de l'envoi. Toujours utiliser les
  éléments communs de `api/_email-kit.js` : `greetingText`/`greetingHtml` (« Bonjour, » si le nom manque, jamais
  « Bonjour Client »), `SIGNATURE`, `emailButton`, `formatEuro`, `escapeHtml`/`escapeMultiline` pour toute donnée
  saisie, liens **absolus**. Prix d'un client : `clientPlanPricing` + nom actuel de la formule. Objets sobres
  (pas d'émoji, pas de « ! », pas de majuscules). Délai d'impayé : `PAYMENT_GRACE_MONTHS`, jamais écrit en dur.
- Ne pas envoyer `nom: 'Client'` par défaut depuis le front : laisser vide (le serveur gère la formule d'appel).

---

**Règles d'envoi (nov. 2026, test `tests/emailDelivery.test.js`)** :
- Types d'email : liste fermée `EMAIL_TYPES` dans `api/_email-core.js`. Un type inconnu → 400 (avant : partait
  comme « bienvenue »). Nouveau type = l'ajouter à la liste + au moteur.
- Front : tout passe par `src/utils/emailService.js` (`postEmail` lève une erreur avec le message serveur).
  Un envoi déclenché par l'admin doit TOUJOURS afficher l'échec à l'admin. Pas de `fetch('/api/email')` ailleurs
  (seule exception : accusés client dans `Docs.jsx`).
- Historique : chaque email (envoyé OU en échec, y compris « SMTP manquant ») est écrit dans `email_logs`
  avec son contenu texte, son origine (`source` : auto / manuel / client / interne) et le message-id.
  Nouveau type d'email = l'ajouter aussi dans `shared/emailTypes.js` (libellé de l'historique ; test
  `emailHistory.test.jsx`). Affichage : `src/pages/Admin/components/EmailHistory.jsx` (préfixe CSS `eh-`).
- Souscription : les 3 justificatifs sont vérifiés sur le FICHIER, pas sur le nom restauré
  (`src/pages/Souscription/souscriptionDocuments.js`) ; un échec de téléversement bloque le paiement.
- Automatique : ne marquer « envoyé » (métadonnée Stripe, notified_at, compteur de relances) qu'APRÈS un envoi
  réussi, pour qu'un échec SMTP soit retenté au passage suivant.

## 8. Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `DATABASE_HOST/USERNAME/PASSWORD` | serveur | PlanetScale (repli temporaire sur `VITE_DATABASE_*`, à supprimer) |
| `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` | serveur / public | Connexion. **En local : clés Development** (`sk_test`/`pk_test`) ; les clés live ne marchent pas sur localhost |
| `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` | serveur / public | **En local : clés de test**, jamais live |
| `STRIPE_WEBHOOK_SECRET` | serveur | Webhook `/api/stripe-webhook` |
| `SMTP_*` | serveur | Emails (section 7) |
| `CRON_SECRET` | serveur | Cron des rappels / impayés |
| `VITE_ADMIN_EMAILS` | public + serveur | Liste des admins |
| `PUBLIC_SITE_URL` | serveur | Liens des emails envoyés sans requête (cron) |

`.env.local` : local uniquement, ignoré par git, **jamais lu par les tests** (`envDir` isolé dans
`vitest.config.js` + `api/_env.js`). Une variable ajoutée dans Vercel ne s'applique qu'au **redéploiement**.

---

## 9. Vérification avant de dire « fini »

`npm run verify` (hook `pre-push` et CI GitHub) — s'arrête au premier échec :

1. `scripts/deploy-check.mjs` — routes, forfaits, prix, config Vercel, routes API.
2. Sitemap à jour (`generate-sitemap.mjs --check`).
3. `scripts/lint-critical.mjs` — règles qui signalent de vrais bugs (`no-undef`, hooks React…).
4. Vitest (`tests/`, `src/**/__tests__/`) — dont `tests/apiModulesLoad.test.js` : chaque fonction de
   `api/` se charge et répond 4xx à une requête anonyme invalide.
5. `scripts/browser-smoke.mjs` — build de production ouvert dans Chrome, 18 pages × ordinateur/mobile :
   page blanche, erreur JavaScript, contenu/titre manquant, débordement mobile, secret dans le JS public.

Checklist :

- [ ] Nouveau comportement → test ajouté. Un test n'a de valeur que s'il **échoue** quand on casse le
      code : le vérifier en cassant volontairement la fonctionnalité, puis restaurer (`git checkout -- fichier`).
- [ ] Changement UI → vérifié dans un vrai navigateur (ordinateur + 390 px), y compris les autres écrans
      qui lisent les mêmes données. Pour parcourir un tunnel sans effets de bord, intercepter `/api/**`.
- [ ] Changement de contrat/PDF → PDF généré et relu.
- [ ] `npm run verify` → « ✅ Tout est vert ».
- [ ] Site déployé : `npm run smoke -- https://www.domiciliation-pas-cher.com` (aucun envoi, aucune écriture).
- [ ] Ce fichier mis à jour + ligne dans le journal si un piège a été découvert.

Mocks : Stripe et jsPDF doivent être des classes constructibles (`new Stripe()`), sinon
`TypeError: … is not a constructor` (imports dynamiques).

---

## 10. Scripts de maintenance

`scripts/maintenance/` (voir son `README.md`) : scripts ponctuels qui agissent sur les **vraies** données.
Ils refusent de démarrer sans `CONFIRM=oui`. Tout nouveau script de ce type : dans ce dossier, avec
`import './_confirm.cjs';` en première ligne, ciblant un `id` précis. Un script terminé et inutile est
supprimé (git le garde). Les scripts du quotidien restent dans `scripts/`.

---

## 11. Méthode de travail

1. Lire le code concerné **avant** de modifier ; chercher tous les appelants (`grep`).
2. Changement localisé, pas de réécriture « pour faire propre ».
3. JSX : ternaires et balises équilibrés (une parenthèse manquante fait tomber Vite).
4. Modifier une signature de fonction → mettre à jour tous les appelants et tests.
5. Après une édition par commande shell (`sed`, script), relire le fichier avant de l'éditer à nouveau.
6. Rendre compte honnêtement : ce qui est vérifié, ce qui ne l'est pas, ce qui reste à faire.

---

## 12. Chantiers en attente (réponses du client nécessaires)

Liste détaillée des questions : historique de la conversation du 06/11/2026 (document « Changements à
faire sur le site »). En attente : code BIENVENUE + bandeau, produits Stripe fixes + SEPA, extras
(table + facturation Stripe automatique), compteurs/procuration/résiliation dans l'espace client, outils
admin (courrier, colis, alerte 80 jours), 8 emails automatiques, calendrier des impayés 15/22/30 j,
réservation de salle (en ligne vs email). Les CGV en ligne (`/cgv`) décrivent déjà ces fonctions.

---

## 13. Carte rapide

| Besoin | Fichier |
|---|---|
| Routes, redirections | `src/App.jsx` |
| Accès base (serveur) | `api/data.js` → `api/_data-service.js` ; connexion `api/_db.js` |
| Accès base (front) | `src/services/adminDataService.js` (proxy) |
| Auth serveur | `api/_auth.js` |
| Variables serveur | `api/_env.js` |
| Formules, prix, quotas, frais | `shared/plans.js` |
| Adresse du siège, agrément | `shared/company.js` |
| Version du contrat | `shared/contract.js` |
| Contrat PDF | `src/utils/contractBuilderCurrent.js` (actuel), `contractBuilder.js` (entrée + ancien) |
| Grâce impayés | `shared/paymentGrace.js`, `api/_payment-dunning.js`, `api/cron/reminders.js` |
| Emails | `api/_email-core.js`, `api/_email-kit.js`, `api/_email-templates.js`, `api/_smtp.js` |
| extra_info, adresses | `src/utils/contractLegalFields.js` |
| Tunnel d'inscription | `src/pages/Souscription/` |
| Page de prix | `src/pages/Tarifs/` + `src/i18n/*.js` (`tarifs`) |
| CGV | `src/pages/CGV/CGV.jsx` (texte du client, 06/11/2026) |
| Espace client / Admin | `src/pages/EspaceClient/`, `src/pages/Admin/` |
| Vérification | `scripts/verify.mjs` et les scripts qu'il lance |

Trois adresses distinctes : siège (fixe, Vauquelin), personnelle (`clients.address` +
`extra_info.adressePerso`, `resolvePersonalAddress`), réexpédition (`extra_info.adresseReexp`,
`resolveForwardingAddress`). Ne jamais préremplir la réexpédition avec le domicile.

---

## Journal des leçons

Une ligne par piège découvert : date, ce qui s'est passé, la règle qui en découle. Ne jamais effacer.

- **2026-11-05** — Les identifiants de la base étaient dans le JavaScript public (`VITE_DATABASE_*`) :
  toute la base était lisible et modifiable par n'importe qui. → Règle 1.5, accès base uniquement serveur.
- **2026-11-05** — Un paquet listé dans `optimizeDeps.exclude` a été retiré de `package.json` : page
  blanche en dev. → Ces paquets restent des dépendances directes (test dédié).
- **2026-11-06** — Dès que `.env.local` a existé, Vitest a injecté les `VITE_DATABASE_*` et les tests
  ont tenté de joindre la vraie base. → `envDir` isolé + `api/_env.js` ignore les fichiers en test.
- **2026-11-06** — Les liens des emails envoyés par le cron pointaient vers `domiciliation-pas-cher.fr`,
  domaine mort. → Domaine de repli `www.domiciliation-pas-cher.com`.
- **2026-11-06** — Redéployer l'ancienne version avec le SMTP configuré aurait ouvert un relais d'emails
  (l'ancien `/api/email` acceptait tout sans connexion). → Vérifier la sécurité d'un endpoint avant de
  lui donner des identifiants.
- **2026-11-06** — Le contrôle `pre-push` exigeait une règle Vercel écrite à l'identique ; une
  amélioration l'a cassé. → Les contrôles vérifient le **but** (pages servies, API non réécrites), pas
  le texte exact.
- **2026-11-06** — Les contrats signés sont regénérés à la demande avec l'image de signature. → Ne jamais
  changer le texte d'un contrat déjà signé (section 5).
- **2026-11-06** — Classe `cc-badge` créée alors qu'elle existait déjà (section Création d'entreprise) :
  badge positionné hors écran. → Préfixer et vérifier l'unicité des classes CSS.
- **2026-11-06** — La liste de suggestions d'adresse se rouvrait après la sortie du champ et masquait le
  bouton « Suivant ». → Un résultat asynchrone n'ouvre une liste que si le champ a le focus.
- **2026-11-06** — `scripts/dbSetup.js` faisait `DROP TABLE` sur toutes les tables de production, et
  `reset-docs.js` effaçait signatures et documents du **premier client trouvé** (pas forcément le compte
  de test). → Supprimés ; scripts sensibles dans `scripts/maintenance/` derrière `CONFIRM=oui` ; un
  script qui supprime des données vérifie lui-même qu'il vise le compte de test.
- **2026-11-06** — Le texte du tunnel annonçait des choses fausses (« adresse confidentielle »,
  « fichiers jamais partagés », « scan inclus » en Essentiel). → Toute promesse affichée doit
  correspondre au contrat, aux CGV et au fonctionnement réel.
- **2026-11-06** — L'adresse du siège était écrite à 11 endroits en 3 versions (sans « Bâtiment B, Lot 308 »
  dans l'espace client, « 3ème étage » dans les traductions). Le bouton « Copier » donnait une adresse
  incomplète, alors que les CGV imposent l'adresse complète. → `shared/company.js` + test anti-réécriture.
- **2026-11-06** — L'onglet Aide affichait `contact@domiciliation-pas-cher.fr` (domaine mort). → Test qui
  interdit ce domaine dans le code.
- **2026-11-06** — En aperçu, un admin pouvait déclencher de vraies écritures (messages, documents) pour un faux
  client. → Verrou `setPreviewMode` dans l'intercepteur `/api/`.
- **2026-11-06** — « Moyen de paiement : Enregistré & Sécurisé ✔ » s'affichait même sans carte. → Règle :
  jamais de statut inventé.
- **2026-11-06 — William R. ne pouvait pas se connecter après son paiement** : le paiement ne crée pas de compte de
  connexion, mais les emails renvoyaient vers « Se connecter » (compte introuvable) et /inscription exigeait « le même
  navigateur ». → Bienvenue/validation pointent vers `/inscription?email=…` (vérifié côté serveur). Ne jamais supposer
  qu'un client payeur a déjà un compte Clerk.
- **2026-11-06 — Le connecteur Stripe de l'assistant n'est pas forcément le compte du site** : une session introuvable
  ne prouve rien. Ne pas écrire « paiement vérifié » sans l'avoir retrouvé ; demander un contrôle au tableau de bord Stripe.
- **2026-11-06 — Erreurs silencieuses** : un `try { await … } finally {}` sans `catch` dans un clic/formulaire laisse le
  client sans message (bouton « Payer » : dossier non créé, aucune alerte). Toujours un `catch` qui affiche l'erreur.
  Le parcours de souscription est testé de bout en bout dans `scripts/browser-smoke.mjs` (justificatifs → paiement).
- **2026-11-06 — Audit croisé (4 analyses parallèles) : motifs à ne plus écrire** :
  - Propriété d'une ressource Stripe : lire la CLÉ `extra_info.stripe_customer_id` (`stripeCustomerIdOf`), jamais une regex
    sur le texte entier (un client pouvait écrire `cus_…` d'un autre dans un champ libre → accès à son portail Stripe).
  - Données saisies par un visiteur ou un client : toujours `sanitizeClientExtra` (même liste noire partout, y compris
    `addDemande` publique), jamais un filtre local plus faible.
  - Écrire `extra_info` : si le JSON existant est illisible, REFUSER (500), ne jamais repartir de `{}` (efface Stripe, signature, grille).
  - Un paiement encaissé mais non activé (`ok:false` dans `fulfillCheckoutSession`) alerte l'admin (`admin_payment_problem`) ;
    marquer « traité/envoyé » seulement après réussite (bienvenue : marqueur `welcome_pending` retenté au rejeu).
  - Impayés : la date de départ du délai de grâce et le statut « résilié » viennent de l'impayé EN COURS (abonnement/facture
    ouverte), pas d'anciennes factures irrécouvrables.
  - Lien de paiement admin (`/api/pay`) : jamais de 2e session si un abonnement actif existe ; le webhook rattrape un paiement
    dont le client n'est pas revenu sur le site (`meta.admin_client_id`).
  - Le centre de domiciliation est TOUJOURS Toulouse (`DOMICILIATION_ADDRESS.city`) : `clientData.city` est la ville du client.
  - Date « Fait à Toulouse, le … » d'un contrat signé = date de SIGNATURE (`contractSignedAt`), pas celle du téléchargement.
  - Lien « Choisir <formule> » : toujours `?plan=<id>` ; l'URL prime sur un ancien brouillon localStorage.
  - Admin e-mails : `isAdminEmail` (trim + minuscules), identique au serveur.
  - Un `useEffect`/`useCallback` dont la dépendance est l'onglet actif ne doit pas recharger toutes les données : lire l'onglet via une ref.
  - Sous-agents d'audit : leurs rapports sont des hypothèses. Vérifier chaque bug dans le code avant de corriger.
- **2026-11-06 — 2e vague d'audit** :
  - Cron : l'heure de Paris vient de `getParisHour()` (format `en-GB` + `formatToParts`). `Number("09 h")` = NaN avait empêché
    pendant des semaines tout email « nouveau courrier » et toute relance d'inscription (la colonne `mail.notified_at` n'existait
    même pas en production). Quand un automatisme semble marcher, vérifier qu'il a laissé une trace réelle (`email_logs`, colonne créée).
  - Le cron relit `extra_info` juste avant d'écrire (`mergeClientExtra`) et ne modifie que ses clés ; il vérifie l'état frais avant d'envoyer une relance.
  - Signature : preuve du BON document (`contract_ref`), date posée par le serveur, jamais écrasée ; signature = PNG ; document = hébergeur de confiance.
  - Email public : UNE adresse valide (`isSingleEmail`), champs libres plafonnés, objet sans saut de ligne.
  - Liste admin légère (`lightenExtraInfo`) : les gros fichiers se chargent à l'ouverture de la fiche. Vercel refuse > 4,5 Mo de réponse.
  - Écran du compte : une ERREUR (serveur, session, email non vérifié) n'est jamais présentée comme « Aucun dossier trouvé ».
  - En local, la base est CELLE DE PRODUCTION : se connecter avec l'email d'un vrai client lie le compte Clerk de test à sa fiche.
    Tester uniquement avec le compte de test dédié.
