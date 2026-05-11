# Politique de sauvegarde — Humanix Académie

Ce document décrit la politique de sauvegarde, de chiffrement et de
restauration des données pour les instances cloud Humanix Académie
opérées par Humanix Cybersecurity.

Pour les déploiements self-host (Community Edition AGPLv3), c'est
l'opérateur qui définit sa propre politique — ce document peut servir
de référence à adapter selon l'infrastructure cible.

---

## 1. Données concernées

| Source | Volume typique | Criticité |
|---|---|---|
| PostgreSQL (Scaleway Managed) | ~5–50 Go par tenant actif | Critique |
| Volumes Docker (TTS cache, uploads, logs) | ~80 Mo TTS + variable | Moyenne (régénérable) |
| Objet S3 compatible (Scaleway Object Storage) — captures audit, exports RGPD | ~1 Go par tenant/an | Critique |
| Secrets (variables d'environnement, certificats) | ~100 Ko | Critique (cf. § 7) |

---

## 2. Fréquence et rétention

| Cible | Fréquence | Rétention | Outil |
|---|---|---|---|
| PostgreSQL — snapshot full | Quotidien (02h00 UTC) | 30 jours | Snapshots automatiques Scaleway Managed |
| PostgreSQL — WAL streaming | Continu | 14 jours (PITR) | PITR Scaleway natif |
| PostgreSQL — dump logique chiffré off-site | Hebdomadaire (dimanche 04h00 UTC) | 90 jours | `pg_dump` + chiffrement client + S3 cross-region |
| Object Storage — versioning | Continu | 30 jours par objet | Scaleway Object Storage versioning |
| Object Storage — snapshot cross-region | Mensuel | 12 mois | Scaleway lifecycle policy |
| Secrets — backup vault | Mensuel (manuel ou cron) | Indéfini (rotation 90j sur les valeurs) | Hors-bande, support physique sécurisé |

**Justification rétention** :
- 30 jours snapshots = couvre 99 % des cas de restauration (corruption, suppression accidentelle, ransomware détecté ≤ 2 semaines).
- 90 jours dumps off-site = couvre les cas d'incident détecté tardivement (audit RGPD, demande d'effacement contestée).
- 12 mois cross-region = conformité comptable (Code de commerce art. L. 123-22 : 10 ans pour les pièces justificatives, mais Humanix ne stocke pas de pièces comptables — 12 mois est conservateur pour Object Storage).

**Suppression définitive** :
- Au-delà de la rétention, les sauvegardes sont supprimées **cryptographiquement** (suppression de la clé de chiffrement = données inaccessibles, conforme RGPD art. 17).

---

## 3. Chiffrement

### Au repos
- **PostgreSQL Scaleway Managed** : chiffrement AES-256 transparent (TDE) activé par défaut sur les volumes block.
- **Object Storage Scaleway** : chiffrement SSE-S3 par défaut (AES-256, clé gérée par Scaleway).
- **Dumps off-site** : chiffrement client-side **avant** upload via `age` (Curve25519 + ChaCha20-Poly1305). La clé privée est conservée hors-bande dans le vault Humanix.

### En transit
- TLS 1.3 obligatoire entre l'application et la base (vérification de certificat activée, pas de mode `sslmode=disable`).
- TLS 1.3 entre l'application et Object Storage.
- TLS 1.3 entre les régions Scaleway (Paris ↔ Roubaix).

### Algorithmes
- AES-256-GCM pour le chiffrement symétrique des dumps off-site
- Curve25519 pour l'échange de clés (encapsulation `age`)
- HMAC-SHA-256 pour l'authentification des dumps
- SHA-256 pour les empreintes d'intégrité

---

## 4. Tests de restauration (drill)

Une restauration **réelle** est testée **deux fois par an** (avril + octobre) en
environnement isolé. Procédure documentée :

1. Provisionner une instance Postgres vierge dans une région différente
2. Restaurer le dernier snapshot quotidien
3. Vérifier l'intégrité : `pg_dump --schema-only` et `COUNT(*)` sur les
   tables principales (`Tenant`, `User`, `Progress`, `AuditLog`)
4. Tester un login admin de bout en bout
5. Vérifier qu'un module MDX est jouable
6. Mesurer le **RTO** (objectif : ≤ 4 h pour la procédure complète)
7. Mesurer le **RPO** (objectif : ≤ 24 h pour les snapshots quotidiens,
   ≤ 15 min en utilisant PITR)
8. Comparer avec la cible SLA, documenter dans `docs/incidents/drill-<date>.md`

Un drill **échoué** déclenche une revue obligatoire dans les 7 jours.

---

## 5. RTO / RPO cibles

| Scénario | RPO cible | RTO cible | Procédure |
|---|---|---|---|
| Suppression accidentelle d'une ligne | ≤ 0 min | ≤ 30 min | Restore PITR ciblé |
| Corruption d'une table | ≤ 24 h | ≤ 2 h | Restore snapshot quotidien |
| Perte complète du primary | ≤ 15 min | ≤ 4 h | Failover replica + restore PITR |
| Perte région Paris | ≤ 7 j | ≤ 24 h | Restore dump cross-region (Roubaix) |
| Ransomware avec rétention compromise | ≤ 14 j | ≤ 24 h | Dump off-site chiffré hors-domaine |

---

## 6. Conformité

- **RGPD art. 32** : sécurité du traitement → chiffrement + sauvegardes
  redondantes + drill documenté.
- **RGPD art. 17** : droit à l'effacement → suppression cryptographique
  (clé) appliquée même aux sauvegardes après la rétention.
- **NIS2 art. 21** : politique de gestion des incidents → drill semestriel
  + procédure documentée.
- **DORA art. 9** : test de résilience opérationnelle → drill semestriel.
- **ISO 27001 A.12.3.1** : politique de sauvegarde → présent document.

---

## 7. Secrets et clés de chiffrement

Les secrets (variables d'environnement, clés age pour les dumps,
certificats) sont gérés séparément des données applicatives. Cf.
roadmap Sprint 3 (`ROADMAP_SECURITY_ARCHITECTURE.md`) pour la
migration vers un Vault (HashiCorp Vault auto-hébergé ou Scaleway
Secret Manager).

Tant que le Vault n'est pas en place :
- Les clés age sont conservées hors-bande sur 2 supports physiques
  géographiquement distants (coffre + main)
- Les valeurs `.env` de production ne sont jamais commitées
- La rotation est manuelle, trimestrielle (cf. agenda fondateur)

---

## 8. Accès et audit

L'accès aux backups est restreint à :
- L'utilisateur Scaleway "operator" (compte fondateur, MFA obligatoire)
- L'utilisateur Scaleway "restore-bot" en lecture seule pour les drills
  automatisés

Chaque accès à un dump off-site est journalisé dans le bucket
"audit-access" avec timestamp + identité IAM + IP source. Les logs
sont conservés 12 mois.

---

## 9. Contacts

- **Responsable des sauvegardes** : Florian Durano (fondateur)
- **Procédure d'urgence restauration** : `docs/DEPLOYMENT_RUNBOOK.md` §
  "Restauration d'urgence"
- **Contact incident** : `security@humanix-cybersecurity.fr`

---

## Historique des révisions

| Date | Auteur | Changements |
|---|---|---|
| 2026-05-11 | Florian + Claude | Création du document — politique initiale |
