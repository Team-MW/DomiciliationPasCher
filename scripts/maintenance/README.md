# Scripts de maintenance

⚠️ **Ces scripts agissent sur les données réelles** : ils lisent `.env.local` (base PlanetScale de
production, compte Stripe). Chacun refuse de démarrer sans confirmation :

```bash
CONFIRM=oui node scripts/maintenance/<script>
```

Règles (voir aussi `AI_INSTRUCTIONS.md`) :

- Lancer depuis la racine du projet (les scripts lisent `.env.local` dans le dossier courant).
- Jamais sur un autre client que le compte de test **frefe / benilias757@gmail.com**.
- Jamais de `DELETE` / `TRUNCATE` / `DROP` global. Toute suppression vise un `id` précis.
- Un script ponctuel terminé et devenu inutile : le supprimer (l'historique git le conserve).

| Script | Rôle | Écrit ? |
|---|---|---|
| `reset-test-client.cjs` | Réinitialise les documents et signatures du client de test (`npm run db:clean-docs -- benilias757@gmail.com`). Refuse tout autre email | Base (client de test uniquement) |
| `create-test-client.js` | Crée un client de test | Base |
| `cleanup-duplicate-payments.js` | Supprime les paiements en double (un par un, par `id`) | Base |
| `migrate-db.js` | Passe `documents.url` et `clients.extra_info` en LONGTEXT (déjà appliqué) | Schéma |
| `alter_mail_preview.js` | Passe `mail.preview` en LONGTEXT (déjà appliqué) | Schéma |
| `create-signature-logs.js` | Crée la table `signature_logs` si absente (déjà appliqué) | Schéma |
| `generate-procuration-sample.js` | Génère un PDF de procuration d'exemple | Non (fichier local) |
| `test-stripe-integration.mjs` | Test Stripe de bout en bout, **clé de test uniquement** | Stripe (test) |
| `cleanup-stripe-test-impaye.mjs` | Nettoie le client Stripe de test créé pour les impayés | Stripe (test) |
| `test-failed-payment.js` | Ancien test manuel d'impayé (modifie le statut d'un client) | Base |
| `test-stripe-link.js` | Ancien test manuel de liaison paiement ↔ demande | Base |
| `get-stripe-info.js`, `test-stripe-customers.js`, `test-stripe-email.js`, `test-stripe-pi.js`, `test-stripe-promo.js` | Lecture / exploration du compte Stripe | Non (lecture) |

Les tests automatiques (`npm test`, `npm run verify`) **n'utilisent jamais** ces scripts ni la vraie base.

Supprimés le 06/11/2026 (récupérables via git) : `dbSetup.js` (faisait `DROP TABLE` sur toutes les
tables de production), `reset-docs.js` (effaçait les signatures et documents du premier client trouvé,
n'importe lequel), `fix-stripe-id.js` et `backfill-stripe-ids.js` (cassés : imports inexistants).
