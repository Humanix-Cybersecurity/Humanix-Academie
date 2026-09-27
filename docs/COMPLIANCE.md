# Conformité - RGPD, NIS2, ANSSI, ISO 27001

> Récapitulatif des mesures en place et des points de contrôle pour les
> auditeurs / DPO / RSSI.

## 1. RGPD (UE 2016/679)

### Principes appliqués (article 5)

| Principe                        | Comment                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Licéité, transparence           | Politique sur `/confidentialite`, CGU sur `/cgu`, consentement explicite au signup (case CGU)                                                  |
| Limitation des finalités        | Données collectées uniquement pour la sensibilisation cyber et le pilotage du programme                                                        |
| Minimisation                    | Pas de tracking analytics tiers, IP hashée SHA-256 (jamais en clair), pas de collecte de données comportementales hors progression pédagogique |
| Exactitude                      | Auto-rectification depuis `/profil` (article 16)                                                                                               |
| Limitation de la conservation   | Audit log : 13 mois (CNIL), comptes utilisateurs : indéterminée tant que le contrat tenant est actif (puis purge)                              |
| Intégrité, confidentialité      | Chiffrement en transit (TLS), passwords scrypt, secrets 2FA, lockout, WebAuthn pour SUPERADMIN                                                 |
| Responsabilité (accountability) | Audit log centralisé `AuditLog` (cf. `lib/audit.ts`), append-only, exportable CSV                                                              |

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

| Mesure                  | Implémentation                                                           |
| ----------------------- | ------------------------------------------------------------------------ |
| Chiffrement en transit  | TLS imposé (haproxy + cert)                                              |
| Chiffrement au repos    | Postgres natif si configuré (pas implem app-side, dépend de l'hébergeur) |
| Pseudonymisation        | IP hashées SHA-256, audit log avec IP hashée                             |
| Authentification        | Mot de passe scrypt, 2FA TOTP, WebAuthn FIDO2, magic link signed         |
| Lockout anti-bruteforce | 5 échecs / 15 min                                                        |
| Logs d'accès            | `AuditLog` exhaustif                                                     |
| Tests réguliers         | À la charge de l'opérateur (audit annuel recommandé)                     |

### Article 33 - Notification de violation (72h)

Le module **Cyber-Réflexe** (`/admin/incidents`) propose une checklist
guidée pour notifier la CNIL en 72h conformément à l'article 33.

### Sous-traitants (article 28)

Statut au 2026-09-27 sur le SaaS : Scaleway (hébergement), Scaleway TEM
(emails), Mollie (paiement) et Mistral AI (IA) sont actifs ; les providers
SMS et SIP restent à la charge du client. En self-host, chaque module est
inerte tant que sa variable d'environnement n'est pas posée. La liste
publique est tenue sur `/confidentialite`, `/securite`, dans les CGV
(art. 13) et dans le DPA (§ 5) : les quatre doivent dire la même chose.

| Sous-traitant                                              | Localisation                                              | Données traitées                                                   | Statut                                                |
| ---------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Mollie (paiement)                                          | **UE** (Amsterdam, régulé DNB / PSD2)                     | Email facturation + nom organisation                               | activable via `MOLLIE_API_KEY`                        |
| Scaleway TEM (emails transactionnels)                      | **France** (Paris)                                        | Email + nom des destinataires                                      | activable via `SCALEWAY_TEM_TOKEN`                    |
| Mistral AI (IA)                                            | **France** (Paris)                                        | Contexte phishing/vishing/smishing (anonymisé, anti-PII en entrée) | activable via `MISTRAL_API_KEY`                       |
| Postgres (BDD)                                             | À la charge de l'opérateur self-host                      | Toutes les données utilisateur                                     | requis                                                |
| Provider SMS (smishing exécution) - **forfait sur mesure** | OVHcloud SMS / Octopush / SMSFactor / Brevo SMS (tous FR) | Numéro téléphone collaborateur, lien tracké                        | non activé - DPA à signer au cas par cas (action A31) |
| Provider SIP (vishing exécution) - **forfait sur mesure**  | OVHcloud Telecom / Voxbone / Linkt (FR)                   | Numéro téléphone collaborateur, lecture TTS                        | non activé - DPA à signer au cas par cas (action A31) |

**Politique** : préférence pour les acteurs FR/UE. Avant l'activation
de tout sous-traitant, signer son DPA (action A22 pour le socle, A31
pour les providers d'exécution phishing/vishing/smishing en forfait
sur mesure) et mettre à jour `/confidentialite`.

## 2. NIS2

| Exigence                                                           | Couverture                                                                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Sensibilisation des employés                                       | Cœur métier de la plate-forme - 25+ saisons MDX (phishing, MFA, ransomware, fraude au président, IA générative, deepfakes, DPO quotidien, etc.) |
| Sensibilisation aux 3 vecteurs majeurs (phishing/vishing/smishing) | Modules dédiés `/admin/phishing`, `/admin/vishing` (Mistral + Piper TTS local), `/admin/smishing` (Mistral SMS) - stack 100 % FR/UE             |
| Politiques de sécurité                                             | Pack NIS2 lite (`/admin/conformite-nis2`)                                                                                                       |
| Gestion des incidents                                              | Module Cyber-Réflexe (`/admin/incidents`)                                                                                                       |
| Continuité d'activité                                              | À la charge de l'opérateur                                                                                                                      |
| Authentification forte                                             | 2FA + WebAuthn disponibles                                                                                                                      |
| Logs d'accès                                                       | `AuditLog`                                                                                                                                      |
| Notification ANSSI 24h/72h                                         | Cyber-Réflexe (champs ANSSI dans `IncidentResponse`)                                                                                            |

### Modules de simulation phishing/vishing/smishing - portée

Les trois modules suivent la même éthique pédagogique (cf. section 1, art. 32) :

| Module                             | Génération                                                                             | Envoi/exécution                                                                                                           | Plan | Données traitées                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| Phishing email (`/admin/phishing`) | Templates pré-validés + génération IA Mistral souveraine                               | À la charge du client (provider transactionnel FR : Brevo, Tipimail, Scaleway TEM, OVH) **OU** forfait sur mesure Humanix | Pro+ | Email + nom collaborateur, contexte service générique                         |
| Vishing (`/admin/vishing`)         | Scripts via Mistral + lecture Piper TTS **local** (pas d'appel API tiers pour la voix) | À la charge du client (infra SIP : OVHcloud Telecom, Voxbone, Linkt) **OU** forfait sur mesure                            | Pro+ | Service générique, contexte anonymisé - aucun nom propre                      |
| Smishing (`/admin/smishing`)       | Templates SMS via Mistral, anti-PII automatique                                        | À la charge du client (provider SMS FR : OVHcloud SMS, Octopush, SMSFactor, Brevo SMS) **OU** forfait sur mesure          | Pro+ | Service générique, anti-PII (rejette email, SIRET/SIREN, téléphone en entrée) |

**Important** : la sortie HTML du générateur Mistral est sanitizée via DOMPurify (parseur HTML5, audit Cure53, OWASP recommandé) avant tout rendu - whitelist stricte de balises sûres, blocage `javascript:` / `data:`. Cf. `lib/ai/mistral.ts:sanitizeHtml`.

**Cadre éthique RGPD/Code pénal art. 323** : tests pédagogiques jamais disciplinaires (CGV art. 9), annonce préalable obligatoire (Code du travail L1222-4, CSE L2312-38), seuls chiffres agrégés exploités. Bandeau `LegalNotice` sur chaque page admin (variantes phishing, vishing, smishing, exposition ; le quishing a son propre encart), et modèle de note d'information des collaborateurs dans `/admin/conformite-rgpd/note-information` (source : `docs/modeles/note-information-collaborateurs-simulations.md`).

## 3. ANSSI - recommandations

- **R7 (mots de passe)** : politique 10+ chars, 3 classes parmi 4 - appliquée dans `validatePasswordPolicy`.
- **R20 (journalisation)** : `AuditLog` couvre les événements d'authentification (succès/échec/lockout) et les actions sensibles, avec horodatage UTC.
- **R23 (durée de rétention)** : 13 mois recommandés CNIL, applicable via `scripts/purge-old-audit-logs.ts`.

## 4. ISO 27001 - Annexe A

| Contrôle                      | Couverture                                |
| ----------------------------- | ----------------------------------------- |
| A.5.10 Acceptable use         | Politique tenant via `/admin`             |
| A.8.1 Privileged access       | Rôles RSSI / ADMIN / SUPERADMIN distincts |
| A.8.5 Secure authentication   | scrypt + TOTP + WebAuthn                  |
| A.12.4 Logging and monitoring | `AuditLog` (append-only, exportable)      |
| A.18.1 Compliance             | Ce document                               |

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
      activé (Mollie et/ou Scaleway TEM le moment venu)
- [ ] DPO désigné si > 250 employés ou traitement à grande échelle
- [ ] Politique de confidentialité publique à jour (`/confidentialite`)
- [ ] Page Cookies (`/cookies`) à jour si tracking ajouté

## 7. Règlement IA (UE 2024/1689)

Applicable depuis le 2 août 2026 pour la transparence (article 50).

| Fonction                                                        | Qualification                                                                                                      | Obligation et mise en œuvre                                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hex (`AskHexExplain`, `HexRecap`, `HexChat`), scénarios générés | Déploiement d'un modèle à usage général (Mistral) : système d'IA interagissant avec des personnes                  | Art. 50.1 : l'utilisateur est informé qu'il interagit avec une IA. Mention sous chaque réponse depuis le 2026-09-27, CGU 10 bis, sous-traitant listé sur `/confidentialite`               |
| Voix de synthèse du vishing (Voxtral ou Piper)                  | Contenu audio généré artificiellement (art. 50.2 et 50.4)                                                          | La voix n'imite aucune personne réelle ; le bandeau `LegalNotice` (variante vishing) et le générateur exigent que le débrief remis au collaborateur dise que la voix était artificielle   |
| Score de risque (`lib/risk-score.ts`), score d'exposition       | Règles déterministes, sans apprentissage : pas un « système d'IA » au sens de l'art. 3.1, donc hors annexe III 4.b | À préserver : introduire un modèle appris dans le calcul d'un score individuel de collaborateur ferait basculer le traitement en haut risque et impose un réexamen avant tout déploiement |

Art. 4 (maîtrise de l'IA) : les personnes qui exploitent ces fonctions chez
Humanix sont formées par construction (produit de sensibilisation) ; les
clients disposent de la saison « IA générative » et de la page Maturité IA.

## 8. Revendeurs : chaîne de sous-traitance

Depuis le 2026-09-25, un espace revendeur peut administrer des espaces
clients (`Tenant.isReseller`, `parentTenantId`, `/admin/revendeur`).
Qualification retenue (CGV art. 15, `docs/CONTRAT-REVENTE-MODELE.md`) :

- le client final reste **responsable de traitement** ;
- le revendeur, qui administre l'espace, est **sous-traitant** du client
  final et signe avec lui un accord de traitement qui mentionne Humanix ;
- Humanix est **sous-traitant ultérieur** (art. 28.4), lié au revendeur par
  le DPA (`docs/DPA-MODELE.md`, annexe 2 du contrat de revente).

Aucun espace client ne doit être ouvert sous un revendeur sans contrat de
revente signé.

## 9. Documents légaux : versions et preuve d'acceptation

- `lib/legal/versions.ts` porte la version et la date fixe de chaque page
  légale (CGU, CGV, confidentialité, mentions, cookies, accessibilité). Les
  pages n'affichent plus la date du jour.
- À l'inscription, `User.cguVersion` et `User.cguAcceptedAt` enregistrent
  la version acceptée ; l'`AuditLog` `CONSENT_GIVEN` la mentionne aussi.
- Changer le fond d'un document = changer sa version et sa date, et notifier
  les clients en cours pour les CGV (art. 18, préavis de 30 jours).

## Contacts

- **DPO Humanix Cybersecurity** : dpo@humanix-cybersecurity.fr
- **Sécurité (vulnérabilités)** : security@humanix-cybersecurity.fr
- **Trust Center** : `/securite`
