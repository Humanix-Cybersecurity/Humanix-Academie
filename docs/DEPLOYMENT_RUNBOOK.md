# Deployment Runbook — Humanix Académie

Toutes les **actions manuelles** à exécuter au déploiement, par phase. Ne nécessite que les accès consoles habituels (Scaleway, Payplug, Apple Developer, dépôt GitHub) + `npm` + `psql` côté serveur.

> Ce runbook est cumulatif : si tu déploies pour la première fois, exécute tout dans l'ordre. Si tu redéploies, repère les sections marquées **« First-deploy only »**.

---

## A. Pré-requis serveur

- [ ] Node 20+ installé sur la machine cible
- [ ] PostgreSQL 14+ accessible via `DATABASE_URL`
- [ ] Variables d'environnement de base posées : `DATABASE_URL`, `AUTH_SECRET` (min 32 chars, généré via `openssl rand -base64 32`), `AUTH_URL` (URL publique de l'app)
- [ ] HTTPS actif (les cookies sont `secure: true` en prod, sans HTTPS pas de session)

---

## B. Tenant Communauté (Phase 1)

> **First-deploy only** — idempotent, ne casse rien si tu relances.

```bash
npm run db:seed
```

Cette commande crée le tenant DB `humanix-community` (slug réservé) avec plan `starter`. Tous les LEARNERs gratuits y seront rattachés automatiquement.

Vérification :

```bash
psql $DATABASE_URL -c "SELECT slug, name, plan FROM \"Tenant\" WHERE slug='humanix-community';"
```

Doit retourner `humanix-community | Humanix Communauté | starter`.

Si tu vois plusieurs lignes ou un message vide : ne pas continuer Phase 2 tant que ce tenant n'existe pas.

---

## C. SSO providers (Phase 2)

Le bouton Google / Apple / Microsoft sur `/inscription` n'apparaît QUE si les env vars sont posées. L'absence d'un provider ne casse rien — les autres restent disponibles.

### C.1 — Google (recommandé en priorité)

- [ ] Console : https://console.cloud.google.com/apis/credentials
- [ ] Créer un OAuth 2.0 Client ID type "Web application"
- [ ] Authorized redirect URIs : `https://<ton-domaine>/api/auth/callback/google`
- [ ] Récupérer `Client ID` + `Client secret`
- [ ] Poser dans `.env` :
  ```
  AUTH_GOOGLE_ID="..."
  AUTH_GOOGLE_SECRET="..."
  ```

### C.2 — Microsoft Entra ID

- [ ] Azure Portal → App registrations → New registration
- [ ] Redirect URI : `https://<ton-domaine>/api/auth/callback/microsoft-entra-id`
- [ ] Récupérer Application (client) ID + créer un client secret
- [ ] Poser dans `.env` :
  ```
  AUTH_MICROSOFT_ENTRA_ID_ID="..."
  AUTH_MICROSOFT_ENTRA_ID_SECRET="..."
  AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/organizations/v2.0"
  ```

### C.3 — Apple "Sign in with Apple"

> Apple requiert un compte Apple Developer payant (99 $/an).

- [ ] Apple Developer → Certificates, Identifiers & Profiles
- [ ] Créer un **App ID** (humanix-cybersecurity.fr) avec capability "Sign in with Apple"
- [ ] Créer un **Services ID** (l'AUTH_APPLE_ID) avec :
  - Domains : `<ton-domaine>`
  - Return URL : `https://<ton-domaine>/api/auth/callback/apple`
- [ ] Créer une **Key** avec capability "Sign in with Apple", télécharger le `.p8` (à conserver, non re-téléchargeable)
- [ ] Générer le **JWT client secret** (validité max 6 mois) à partir de la `.p8` :
  ```bash
  # Méthode rapide : https://github.com/nextauthjs/next-auth-example
  # ou outil ad-hoc Node
  ```
- [ ] Poser dans `.env` :
  ```
  AUTH_APPLE_ID="<Services ID>"
  AUTH_APPLE_SECRET="<JWT généré ci-dessus>"
  ```
- [ ] **Récurrent** : régénérer le JWT tous les ~5 mois et redéployer (sinon Apple SSO casse silencieusement)

---

## D. Payplug (Phase 3 — verrou /signup + future automatisation)

### D.1 — Verrou /signup en prod

Tant que Payplug n'est pas configuré, garde le verrou. **Action :** assure-toi que la variable suivante est **absente** ou `false` :

```
SIGNUP_ALLOW_SELF_SERVICE="false"   # ou non posée du tout
```

Effet : `/signup` redirige automatiquement vers `/demande-abonnement`. Les apprenants gratuits passent par `/inscription`.

> Si tu dois réactiver `/signup` temporairement pour debug : pose `SIGNUP_ALLOW_SELF_SERVICE="true"` UNIQUEMENT en staging, **jamais en prod commerciale**.

### D.2 — Notification founder (demandes d'abonnement)

- [ ] Poser `FOUNDER_NOTIFICATION_EMAIL="contact@humanix-cybersecurity.fr"` (ou ton adresse)
- [ ] Vérifier que `EMAIL_FROM` + le serveur SMTP (Scaleway TEM) sont configurés (déjà testé via les magic links Phase 2)

À chaque soumission de `/demande-abonnement`, un email arrive sur cette adresse avec toutes les infos + un rappel CLI pour provisionner.

### D.3 — Configuration Payplug (self-service automatique)

> **Recommandé pré-launch** — sans cette config, `/souscrire` affiche un fallback gracieux qui renvoie vers `/demande-abonnement` (manuel founder).

- [ ] Compte Payplug Pro : https://www.payplug.com/
- [ ] Récupérer la **Secret Key** (Settings → API keys)
- [ ] Créer 2 **Subscription Plans** correspondant à `starter` et `pro` (cf. lib/plans.ts pour la grille). `enterprise` est manuel (devis), pas de plan Payplug self-service.
  - **Starter** : forfait 19 €/mois (mensuel) ou 15 €/mois (annuel). Limite 15 sièges, mais Payplug ne gère pas le sub-tier free <=5 — c'est l'app qui ne déclenche pas le checkout tant que `activeUsers <= 5`.
  - **Pro** : 3 €/utilisateur/mois (mensuel) ou 2,50 € (annuel). Volume 16-250 sièges.
- [ ] Créer un **webhook** :
  - URL : `https://<ton-domaine>/api/payments/webhook`
  - Events : `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.canceled`, `subscription.payment_failed`, `subscription.payment_succeeded`, `payment.failed`, `payment.paid`
- [ ] Récupérer le **webhook secret** (pour vérifier la signature HMAC)
- [ ] Poser dans `.env` :
  ```
  PAYPLUG_SECRET_KEY="..."
  PAYPLUG_WEBHOOK_SECRET="..."
  PAYPLUG_PLAN_STARTER="<plan_id>"
  PAYPLUG_PLAN_PRO="<plan_id>"
  # Enterprise: pas de plan Payplug (process commercial manuel)
  ```

Une fois ces variables posées, **le flow self-service est entièrement automatique** :

1. User sur `/tarifs` clique sur le CTA d'un plan payant (Starter ou Pro).
2. Page `/souscrire?plan=X` → form (email + organisation + sièges estimés).
3. POST `/api/payments/checkout/start` → crée Payplug Customer + Subscription anonyme.
4. User redirigé sur la page Payplug, paye.
5. Webhook `subscription.created` → fetche l'email via API Payplug → `provisionTenantWithAdmin` crée tenant + ADMIN → magic link envoyé.
6. User clic le lien dans son mail → atterrit sur `/admin`.

**Aucune intervention humaine côté Humanix dans ce parcours.**

`/demande-abonnement` reste la voie pour Enterprise (251+ sièges, instance dédiée, SecNumCloud, white-label) et tous les cas particuliers.

---

## E. Provisionner un tenant manuellement

Pour répondre à une demande de `/demande-abonnement` ou pour bootstrapper un tenant en interne :

```bash
# Option 1 — via /superadmin (UI)
# (à câbler en Phase 4 si pas déjà disponible)

# Option 2 — via script CLI (à créer si besoin)
# Exemple de syntaxe ciblée :
npm run db:provision-tenant -- \
  --email="dsi@mapme.fr" \
  --org="Ma PME SAS" \
  --plan="pro"
```

Le script appelle `lib/tenant-provisioning.ts:provisionTenantWithAdmin()` qui :
1. Vérifie que l'email n'est pas déjà ADMIN d'un autre tenant
2. Génère un slug unique
3. Crée tenant + user ADMIN dans une transaction
4. Émet un audit log `TENANT_CREATED`
5. (Optionnel) envoie un magic link de bienvenue

Si le script CLI n'existe pas encore, ouvrir une session Node depuis le serveur :

```bash
node -e "
import('./lib/tenant-provisioning.ts').then(async m => {
  const r = await m.provisionTenantWithAdmin({
    email: 'dsi@mapme.fr',
    organizationName: 'Ma PME SAS',
    plan: 'pro',
    source: 'superadmin-manual',
  });
  console.log(r);
});
"
```

---

## F. Bootstrapping du SUPERADMIN (Niveau 1)

> **First-deploy only** — un seul SUPERADMIN par défaut (le founder).

```bash
npm run db:bootstrap-admin
```

Suit les prompts pour saisir l'email + nom du founder. Le compte est créé avec `role=SUPERADMIN` sur le tenant Communauté (par défaut, peut être changé).

Vérifier :

```bash
psql $DATABASE_URL -c "SELECT email, role FROM \"User\" WHERE role='SUPERADMIN';"
```

---

## G. Flag DEMO_MODE

`DEMO_MODE` contrôle la posture globale de l'app :

| `DEMO_MODE` | `/demo` | `/inscription` | `/signup` |
|---|---|---|---|
| `true` (dev/showcase) | ✅ accessible | ❌ redirect vers `/demo` | ✅ accessible (form legacy) |
| `false` (prod) | ❌ 404 | ✅ accessible (Communauté) | ❌ redirect vers `/demande-abonnement` (sauf si `SIGNUP_ALLOW_SELF_SERVICE=true`) |

**En prod commerciale, toujours :**
- `DEMO_MODE` non posé ou `false`
- `SIGNUP_ALLOW_SELF_SERVICE` non posé ou `false`

---

## H. Smoke tests post-deploy

À lancer après chaque déploiement majeur :

- [ ] `https://<domaine>/` → page d'accueil charge sans erreur
- [ ] `https://<domaine>/inscription` → page accessible, boutons SSO visibles selon les providers configurés
- [ ] `https://<domaine>/connexion` avec email Google inconnu → rejet `NoAccount` (sécurité préservée)
- [ ] `https://<domaine>/signup` → redirige vers `/demande-abonnement` (verrou actif)
- [ ] `https://<domaine>/demande-abonnement` → form fonctionne, soumission → email arrive sur `FOUNDER_NOTIFICATION_EMAIL`
- [ ] `https://<domaine>/admin` quand non connecté → redirect `/connexion`
- [ ] `https://<domaine>/admin` quand LEARNER → redirect `/apprendre` (gating role)
- [ ] Setup MFA d'un compte → QR scanné → code TOTP accepté (cf. PR #219 résilience)
- [ ] Si Payplug configuré : `validatePayplugSetup()` (cf. lib/payplug.ts) ne reporte aucune erreur

---

## I. Checklist pré-launch OSS (26 mai 2026)

- [ ] Tenant Communauté créé (B)
- [ ] AUTH_SECRET rotaté + en coffre
- [ ] Au moins UN provider SSO actif (Google recommandé) (C)
- [ ] FOUNDER_NOTIFICATION_EMAIL pointé sur la bonne adresse (D.2)
- [ ] DEMO_MODE désactivé
- [ ] SIGNUP_ALLOW_SELF_SERVICE désactivé
- [ ] SUPERADMIN bootstrap fait (F)
- [ ] Smoke tests passés (H)
- [ ] Page `/lancement-oss` countdown affiche le bon nombre de jours
- [ ] Backups DB automatiques activés
- [ ] Logs centralisés (Sentry / Scaleway logs)

---

## J. À ajouter post-launch

- [ ] Phase 4 : redirect post-login par rôle (LEARNER → `/apprendre`, ADMIN+ → `/admin`)
- [ ] Phase 5 : transfert d'un LEARNER Communauté vers un tenant payant qui l'invite (UX : un click "Rejoindre l'équipe X")
- [ ] Renouvellement automatique du JWT Apple (cron tous les 5 mois)
- [ ] Job de purge `BillingEvent` > 13 mois (RGPD)
- [ ] Per-seat billing fin (aujourd'hui : forfait par tier, le seat count saisi est en metadata pour reconciliation manuelle si débordement)
