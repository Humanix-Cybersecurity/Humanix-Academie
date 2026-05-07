# Conformité - RGPD, NIS2, ANSSI, ISO 27001

> Récapitulatif des mesures en place et des points de contrôle pour les
> auditeurs / DPO / RSSI.

## 1. RGPD (UE 2016/679)

### Principes appliqués (article 5)

| Principe | Comment |
|---|---|
| Licéité, transparence | Politique sur `/confidentialite`, CGU sur `/cgu`, consentement explicite au signup (case CGU) |
| Limitation des finalités | Données collectées uniquement pour la sensibilisation cyber et le pilotage du programme |
| Minimisation | Pas de tracking analytics tiers, IP hashée SHA-256 (jamais en clair), pas de collecte de données comportementales hors progression pédagogique |
| Exactitude | Auto-rectification depuis `/profil` (article 16) |
| Limitation de la conservation | Audit log : 13 mois (CNIL), comptes utilisateurs : indéterminée tant que le contrat tenant est actif (puis purge) |
| Intégrité, confidentialité | Chiffrement en transit (TLS), passwords scrypt, secrets 2FA, lockout, WebAuthn pour SUPERADMIN |
| Responsabilité (accountability) | Audit log centralisé `AuditLog` (cf. `lib/audit.ts`), append-only, exportable CSV |

### Droits des personnes (articles 15-22)

Tous accessibles depuis [/profil/donnees](app/profil/donnees/page.tsx) :

- **Article 15 - Accès** : vue d'ensemble + export JSON
- **Article 16 - Rectification** : auto-modif depuis `/profil`
- **Article 17 - Effacement** : bouton confirmé par saisie de `EFFACER MON COMPTE`. Cascade BDD supprime profil + progress + events + sessions + webauthn + phishingResults. Refus si l'utilisateur est admin (transfert de gouvernance requis).
- **Article 20 - Portabilité** : `/profil/donnees/export` (JSON structuré). Inclut profil, progression pédagogique, événements, notifications, credentials WebAuthn, **et participations aux simulations phishing/vishing/smishing** (status, channel, clickedAt, reportedAt).
- **Article 21 - Opposition** : à traiter ad-hoc avec le DPO

Toutes les actions sont tracées dans `AuditLog`.

### Article 30 - Registre des activités

Le **Pack NIS2** (`/admin/conformite-nis2`) génère le registre éditable.

### Article 32 - Sécurité du traitement

| Mesure | Implémentation |
|---|---|
| Chiffrement en transit | TLS imposé (haproxy + cert) |
| Chiffrement au repos | Postgres natif si configuré (pas implem app-side, dépend de l'hébergeur) |
| Pseudonymisation | IP hashées SHA-256, audit log avec IP hashée |
| Authentification | Mot de passe scrypt, 2FA TOTP, WebAuthn FIDO2, magic link signed |
| Lockout anti-bruteforce | 5 échecs / 15 min |
| Logs d'accès | `AuditLog` exhaustif |
| Tests réguliers | À la charge de l'opérateur (audit annuel recommandé) |

### Article 33 - Notification de violation (72h)

Le module **Cyber-Réflexe** (`/admin/incidents`) propose une checklist
guidée pour notifier la CNIL en 72h conformément à l'article 33.

### Sous-traitants (article 28)

Statut au démarrage : **aucun sous-traitant tiers** activé. Les modules
ci-dessous sont disponibles dans le code mais désactivés tant que les
variables d'env correspondantes ne sont pas posées.

| Sous-traitant | Localisation | Données traitées | Statut |
|---|---|---|---|
| Payplug (paiement) | **France** (Paris, Natixis/BPCE) | Email facturation + nom organisation | activable via `PAYPLUG_SECRET_KEY` |
| Scaleway TEM (emails transactionnels) | **France** (Paris) | Email + nom des destinataires | activable via `SCALEWAY_TEM_TOKEN` |
| Mistral AI (IA) | **France** (Paris) | Contexte phishing/vishing/smishing (anonymisé, anti-PII en entrée) | activable via `MISTRAL_API_KEY` |
| Postgres (BDD) | À la charge de l'opérateur self-host | Toutes les données utilisateur | requis |
| Provider SMS (smishing exécution) - **forfait sur mesure** | OVHcloud SMS / Octopush / SMSFactor / Brevo SMS (tous FR) | Numéro téléphone collaborateur, lien tracké | non activé - DPA à signer au cas par cas (action A31) |
| Provider SIP (vishing exécution) - **forfait sur mesure** | OVHcloud Telecom / Voxbone / Linkt (FR) | Numéro téléphone collaborateur, lecture TTS | non activé - DPA à signer au cas par cas (action A31) |

**Politique** : préférence pour les acteurs FR/UE. Avant l'activation
de tout sous-traitant, signer son DPA (action A22 pour le socle, A31
pour les providers d'exécution phishing/vishing/smishing en forfait
sur mesure) et mettre à jour `/confidentialite`.

## 2. NIS2

| Exigence | Couverture |
|---|---|
| Sensibilisation des employés | Cœur métier de la plate-forme - 25+ saisons MDX (phishing, MFA, ransomware, fraude au président, IA générative, deepfakes, DPO quotidien, etc.) |
| Sensibilisation aux 3 vecteurs majeurs (phishing/vishing/smishing) | Modules dédiés `/admin/phishing`, `/admin/vishing` (Mistral + Piper TTS local), `/admin/smishing` (Mistral SMS) - stack 100 % FR/UE |
| Politiques de sécurité | Pack NIS2 lite (`/admin/conformite-nis2`) |
| Gestion des incidents | Module Cyber-Réflexe (`/admin/incidents`) |
| Continuité d'activité | À la charge de l'opérateur |
| Authentification forte | 2FA + WebAuthn disponibles |
| Logs d'accès | `AuditLog` |
| Notification ANSSI 24h/72h | Cyber-Réflexe (champs ANSSI dans `IncidentResponse`) |

### Modules de simulation phishing/vishing/smishing - portée

Les trois modules suivent la même éthique pédagogique (cf. section 1, art. 32) :

| Module | Génération | Envoi/exécution | Plan | Données traitées |
|---|---|---|---|---|
| Phishing email (`/admin/phishing`) | Templates pré-validés + génération IA Mistral souveraine | À la charge du client (provider transactionnel FR : Brevo, Tipimail, Scaleway TEM, OVH) **OU** forfait sur mesure Humanix | Pro+ | Email + nom collaborateur, contexte service générique |
| Vishing (`/admin/vishing`) | Scripts via Mistral + lecture Piper TTS **local** (pas d'appel API tiers pour la voix) | À la charge du client (infra SIP : OVHcloud Telecom, Voxbone, Linkt) **OU** forfait sur mesure | Pro+ | Service générique, contexte anonymisé - aucun nom propre |
| Smishing (`/admin/smishing`) | Templates SMS via Mistral, anti-PII automatique | À la charge du client (provider SMS FR : OVHcloud SMS, Octopush, SMSFactor, Brevo SMS) **OU** forfait sur mesure | Pro+ | Service générique, anti-PII (rejette email, SIRET/SIREN, téléphone en entrée) |

**Important** : la sortie HTML du générateur Mistral est sanitizée via DOMPurify (parseur HTML5, audit Cure53, OWASP recommandé) avant tout rendu - whitelist stricte de balises sûres, blocage `javascript:` / `data:`. Cf. `lib/ai/mistral.ts:sanitizeHtml`.

**Cadre éthique RGPD/Code pénal art. 323** : tests pédagogiques jamais disciplinaires, annonce préalable obligatoire (charte, CSE), seuls chiffres agrégés exploités. Cf. bandeau légal sur chaque page admin.

## 3. ANSSI - recommandations

- **R7 (mots de passe)** : politique 10+ chars, 3 classes parmi 4 - appliquée dans `validatePasswordPolicy`.
- **R20 (journalisation)** : `AuditLog` couvre les événements d'authentification (succès/échec/lockout) et les actions sensibles, avec horodatage UTC.
- **R23 (durée de rétention)** : 13 mois recommandés CNIL, applicable via `scripts/purge-old-audit-logs.ts`.

## 4. ISO 27001 - Annexe A

| Contrôle | Couverture |
|---|---|
| A.5.10 Acceptable use | Politique tenant via `/admin` |
| A.8.1 Privileged access | Rôles RSSI / ADMIN / SUPERADMIN distincts |
| A.8.5 Secure authentication | scrypt + TOTP + WebAuthn |
| A.12.4 Logging and monitoring | `AuditLog` (append-only, exportable) |
| A.18.1 Compliance | Ce document |

## 5. Audit - pour un contrôleur

### Comment vérifier que tout est tracé

1. Se connecter en `ADMIN` ou `RSSI` → `/admin/audit`
2. Filtrer par sévérité `WARNING` ou `CRITICAL` pour voir les actions sensibles
3. Exporter en CSV (`/admin/audit/export`)
4. Pour le cross-tenant : `SUPERADMIN` peut voir tous les tenants depuis `/superadmin`

### Comment vérifier les droits RGPD pour un utilisateur

1. L'utilisateur va sur `/profil/donnees`
2. Cliquer "Télécharger mes données (JSON)" → vérifier que l'export contient bien tout
3. Tester l'effacement avec un compte LEARNER de test → vérifier la cascade
4. Vérifier dans `/admin/audit` que `DATA_EXPORTED` et `DATA_ERASURE_*` sont bien tracés

## 6. À configurer côté opérateur

- [ ] Cron de purge `scripts/purge-old-audit-logs.ts` (13 mois par défaut)
- [ ] Backups Postgres réguliers (chiffrés, hors-site)
- [ ] Certificat TLS valide (Let's Encrypt minimum)
- [ ] DPA (Data Processing Agreement) signé avec chaque sous-traitant
  activé (Payplug et/ou Scaleway TEM le moment venu)
- [ ] DPO désigné si > 250 employés ou traitement à grande échelle
- [ ] Politique de confidentialité publique à jour (`/confidentialite`)
- [ ] Page Cookies (`/cookies`) à jour si tracking ajouté

## Contacts

- **DPO Humanix Cybersecurity** : dpo@humanix-cybersecurity.fr
- **Sécurité (vulnérabilités)** : security@humanix-cybersecurity.fr
- **Trust Center** : `/securite`
