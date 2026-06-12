# Politique de sécurité - Humanix Académie

Humanix Cybersecurity prend la sécurité de ses utilisateurs et de la
communauté très au sérieux. Cette politique décrit comment signaler une
vulnérabilité de manière responsable, ce que tu peux attendre de notre
réponse, et comment nous traitons les chercheurs en sécurité.

---

## Versions supportées

| Version                         | Statut        | Patches sécurité                    |
| ------------------------------- | ------------- | ----------------------------------- |
| `main` (en développement)       | Active        | Oui, immédiat                       |
| `1.x` (dernière release stable) | Active        | Oui, dans les 7 jours pour critique |
| `0.x` (anciennes pre-release)   | Non supportée | Non - migrer vers `1.x`             |

Une version est supportée pendant **12 mois** après la sortie de la version
majeure suivante. Au-delà, elle ne reçoit plus de patches sécurité - la mise
à jour est nécessaire.

---

## Signaler une vulnérabilité

### Canal principal (RFC 9116)

Le fichier [/.well-known/security.txt](https://humanix-cybersecurity.fr/.well-known/security.txt)
publie nos coordonnées de divulgation responsable conformément au RFC 9116.

### Ce qu'il faut faire

Envoie un email **chiffré si possible** à :

**security@humanix-cybersecurity.fr**

Inclus dans ton rapport :

1. **Description** du problème (ce qui est vulnérable, comment l'exploiter)
2. **Impact** estimé (lecture / modification / déni de service / RCE / etc.)
3. **Étapes de reproduction** détaillées
4. **Version affectée** (commit hash, release tag)
5. **Configuration** où tu as observé le bug (Docker, bare-metal, OS, etc.)
6. **Proposition de fix** si tu en as une (optionnel mais bienvenu)

### Ce qu'il NE faut PAS faire

- **N'ouvre PAS d'issue publique** sur GitHub (ni de PR avec le détail)
- Ne diffuse pas le détail technique avant la sortie d'un patch (responsible disclosure)
- N'exploite pas la vulnérabilité contre des utilisateurs réels (test sur ton instance uniquement)
- Ne demande pas de récompense financière (Humanix n'a pas de bug bounty officiel à ce jour)

### Clé PGP

Pour les rapports particulièrement sensibles, tu peux chiffrer avec notre clé
PGP publique :

- **Empreinte** : à publier après création de la clé (sprint 4)
- **Téléchargement** : `https://humanix-cybersecurity.fr/security/pgp.asc`

Si la clé n'est pas encore en ligne, envoie en clair à
`security@humanix-cybersecurity.fr` - l'adresse est surveillée et restreinte.

---

## Notre engagement de réponse

| Étape                              | SLA cible                     |
| ---------------------------------- | ----------------------------- |
| Accusé de réception du rapport     | **24 h** ouvrées              |
| Triage initial (gravité, scope)    | **72 h** ouvrées              |
| Plan d'action communiqué           | **7 jours** ouvrés            |
| Patch publié - Critique (CVSS ≥ 9) | **7 jours**                   |
| Patch publié - Élevé (CVSS 7-8.9)  | **30 jours**                  |
| Patch publié - Moyen (CVSS 4-6.9)  | **60 jours**                  |
| Patch publié - Bas (CVSS < 4)      | **prochaine release mineure** |

Une fois le patch livré, nous publions un **avis de sécurité** (GitHub
Security Advisory) avec ton crédit (ou ton anonymat si tu préfères) - cf.
section Hall of Fame ci-dessous.

---

## Périmètre

### Couvert par cette politique

- Code de Humanix Académie Community Edition (ce repo)
- Connecteurs officiels (`connectors/`)
- Plugin Outlook (`outlook-addin/`)
- Documentation de configuration et de déploiement (`docs/`)
- Images Docker officielles publiées par Humanix Cybersecurity

### Hors périmètre (à signaler ailleurs)

- Cloud SaaS Humanix (`humanix-cybersecurity.fr`) → signaler à `security@` quand même, mais ce n'est pas du code OSS public
- Site web vitrine (`humanix-cybersecurity.fr`) → signaler à `security@`
- Dépendances tierces (Next.js, Prisma, Postgres, etc.) → signaler à leur projet upstream + nous prévenir si tu penses qu'on est exposé
- Vulnérabilités d'instances self-hostées par des tiers → signaler à l'opérateur

### Hors champ "vulnérabilité"

Pour éviter le bruit, ne sont **pas** considérés comme des vulnérabilités au
sens de cette politique :

- Absence de header HTTP `X-Frame-Options` (on utilise CSP `frame-ancestors`)
- Cookie sans flag `Secure` en environnement de développement local
- Tests sur l'instance de démonstration publique (réinitialisée régulièrement, vulnérabilités attendues à un environnement de démo)
- Énumération d'utilisateurs sans impact (ex: réponse différenciée signup)
- Vulnérabilités sur des dépendances dépréciées d'au moins 24 mois
- Auto-XSS qui nécessitent que la victime colle elle-même du JS dans la console

---

## Hall of Fame

Nous remercions publiquement les chercheurs qui ont contribué à la sécurité
d'Humanix. Avec ton accord, ton nom sera ajouté ici après la divulgation
responsable du patch.

| Date                                                   | Chercheur | Vulnérabilité | Sévérité |
| ------------------------------------------------------ | --------- | ------------- | -------- |
| _En attente de la première contribution communautaire_ |           |               |          |

---

## Audit de sécurité interne

Humanix Cybersecurity réalise un **audit de sécurité interne** complet à
chaque release majeure (cf. [docs/SECURITY_AUDIT.md](./docs/SECURITY_AUDIT.md)
et la page publique [/securite/rapport-audit](https://humanix-cybersecurity.fr/securite/rapport-audit)) qui couvre :

- OWASP Top 10 (2021)
- ANSSI Recommandations Sécurité Web
- Tests d'authentification / autorisation
- Tests de multi-tenant scoping (13 tests vitest dans `lib/tenant-isolation.test.ts`)
- Audit des dépendances (`npm audit`, Snyk)
- Static analysis (SonarQube ou Semgrep)

### Pentest interne v1.1 (7 mai 2026)

Test offensif réalisé depuis un container Exegol isolé contre l'instance
staging docker-compose. **25+ vecteurs d'attaque testés** (méthodes HTTP,
header injection, path traversal, SSRF, IDOR, XSS, SQLi, info disclosure,
brute-force, rate limit). Résultat :

- 🟢 **Aucun bypass d'authentification, aucune fuite de données, aucune RCE**
- 🟡 3 findings non-critiques documentés sur la page publique
- 🟢 20+ contrôles validés (HSTS, CSP, frame-ancestors, nosniff, UA filter
  sqlmap/nikto/nmap → 403, source maps protégés, host header injection
  rejetée, X-Forwarded bypass impossible, timing oracle email indétectable…)

Détails publics : [/securite/rapport-audit](https://humanix-cybersecurity.fr/securite/rapport-audit).

### Stack de défense en profondeur

- **Content-Security-Policy** strict (`default-src 'self'`, `connect-src`
  whitelist providers FR/UE uniquement, `frame-ancestors 'none'`)
- **Middleware edge** sur `/admin/**` et `/api/admin/**` (rejet 401 JSON
  ou redirect `/connexion` si pas de cookie session)
- **DOMPurify** pour la sanitization HTML générée par Mistral (audit Cure53,
  whitelist stricte de balises)
- **isSafeWebhookUrl()** anti-SSRF (refuse IP privées + `.local` + `.internal`)
- **anti-PII** sur les prompts Mistral (regex email/SIRET/SIREN/téléphone)
- **HSTS preload** + `Permissions-Policy` (camera/mic/geo désactivés)
- **HAProxy** UA filter (sqlmap/nikto/nmap → 403), méthodes HTTP allowlistées
- **Tests** : 446 tests vitest (auth, RGPD, audit log, plans, tenant
  isolation, webhooks SSRF, sanitization, errors).

---

## Reconnaissance et bug bounty

À ce jour, Humanix Cybersecurity **n'opère pas de bug bounty** officiel.
Néanmoins :

- Reconnaissance publique sur cette page (Hall of Fame ci-dessus)
- Mention dans le changelog du patch
- Goodies physiques (sticker, t-shirt) en remerciement pour les rapports
  significatifs
- Pour les vulnérabilités critiques (CVSS ≥ 9), discussion possible d'une
  récompense financière au cas par cas (à notre discrétion)

Un programme de bug bounty officiel est envisagé pour 2027, une fois la base
utilisateurs suffisamment large pour le justifier économiquement.

---

## Pour les self-hostés

Si tu héberges Humanix Académie en interne, nous te recommandons fortement de :

1. **Suivre les releases** : abonne-toi aux notifications du repo GitHub
2. **Appliquer les patches sécurité** sous 7 jours pour les sévères/critiques
3. **Ne JAMAIS exposer** les variables d'environnement contenant `AUTH_SECRET`,
   `DATABASE_URL`, ou les tokens API
4. **Activer HTTPS uniquement** (TLS 1.2+, HSTS, CSP strict)
5. **Audit régulier** de tes dépendances (`npm audit fix`)
6. **Sauvegardes chiffrées** quotidiennes de la base
7. **Logs centralisés** et rotation pour la traçabilité d'incident
8. **Réseau Docker segmenté** (DB privée, app derrière reverse proxy)

Voir [docs/installation.md](./docs/installation.md) pour les recommandations
détaillées de durcissement.

---

## Contact

| Sujet                        | Adresse                           |
| ---------------------------- | --------------------------------- |
| Vulnérabilité confirmée      | security@humanix-cybersecurity.fr |
| Question sur cette politique | security@humanix-cybersecurity.fr |
| Demande générale             | contact@humanix-cybersecurity.fr  |

Pour discussion publique non sensible, utilise les
[GitHub Discussions](https://github.com/humanix-cybersecurity/humanix-academie/discussions/categories/security)
catégorie Security.

---

_Politique de sécurité v1.0 - Mai 2026 · Sera revue annuellement._

_Humanix Cybersecurity_
