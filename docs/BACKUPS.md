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

## 10. Procédure opérationnelle — self-host Docker

> Section ajoutée mai 2026 quand Humanix prod est passée en Postgres
> self-host (container Docker sur `humanix-prod-01`) avec backup off-site
> FTPS Scaleway. Les sections précédentes décrivent la cible long-terme
> (Postgres Managed Scaleway) — cette section décrit l'implémentation
> opérationnelle actuelle.

### 10.1 Scripts livrés

- `scripts/backup-db.sh` — pg_dump + chiffrement age + upload FTPS + rotation 30j (FTPS) / 7j (local)
- `scripts/restore-db.sh` — interactif (sélection backup → déchiffrement → confirmation explicite → pg_restore)

### 10.2 Setup initial (à faire 1 fois)

**1. Générer la clé age** (sur poste dev, PAS sur prod) :

```bash
brew install age            # macOS
sudo apt install age        # Debian/Ubuntu

mkdir -p ~/.config/humanix
age-keygen -o ~/.config/humanix/backup.key
chmod 600 ~/.config/humanix/backup.key
cat ~/.config/humanix/backup.key
```

Tu obtiens :
- Une ligne `# public key: age1abc...` → la **clé publique** (va dans `.env` prod)
- Une ligne `AGE-SECRET-KEY-1XYZ...` → la **clé privée** (à protéger HORS-BANDE : papier + USB chiffrée géographiquement séparés)

⚠ Si la clé privée est perdue, **tous les backups deviennent illisibles**.

**2. Installer les binaires sur humanix-prod-01** :

```bash
ssh humanix@humanix-prod-01
sudo apt update
sudo apt install -y postgresql-client age lftp jq
```

**3. Configurer /etc/humanix/backup.env sur prod** :

```bash
sudo mkdir -p /etc/humanix
sudo nano /etc/humanix/backup.env
```

Contenu :

```ini
# Postgres source (le container Docker expose 5432 sur l'host)
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=humanix
PGPASSWORD=<password BDD prod>
PGDATABASE=humanix_academie

# Clé publique age (uniquement la ligne age1xxx, sans le commentaire)
BACKUP_AGE_RECIPIENT=age1abc123...xyz

# FTPS Scaleway Backup Space
BACKUP_FTP_HOST=backup-paris-1.dedibox.fr   # adapter à ton serveur
BACKUP_FTP_USER=<user FTP fourni par Scaleway>
BACKUP_FTP_PASSWORD=<password FTP>
BACKUP_FTP_PATH=/humanix-academie

# Rétention (jours)
BACKUP_RETENTION_DAYS=30
BACKUP_LOCAL_DIR=/var/backups/humanix
```

```bash
sudo chmod 600 /etc/humanix/backup.env
sudo chown root:root /etc/humanix/backup.env
```

**4. Créer le dossier local + log** :

```bash
sudo mkdir -p /var/backups/humanix /var/log/humanix
sudo chown humanix:humanix /var/backups/humanix /var/log/humanix
```

**5. Test manuel** :

```bash
cd /opt/humanix-prod
./scripts/backup-db.sh --local-only        # dump + chiffrement, pas d'upload
./scripts/backup-db.sh --dry-run            # tout sauf upload réel
./scripts/backup-db.sh                       # full prod run
```

Vérifier le fichier produit dans `/var/backups/humanix/humanix-pg-*.dump.age`.

**6. Installer le cron** :

```bash
sudo crontab -e -u humanix
```

Ajouter :

```cron
# Humanix Académie — backup BDD vers FTPS Scaleway, 02h45 UTC quotidien
45 2 * * * /opt/humanix-prod/scripts/backup-db.sh >> /var/log/humanix/backup.log 2>&1
```

### 10.3 Vérifier que ça tourne

```bash
# Logs des 7 derniers backups
tail -200 /var/log/humanix/backup.log

# Backups locaux récents
ls -lh /var/backups/humanix/

# Backups distants
lftp -e "
  set ftp:ssl-force yes;
  open -u <user>,<password> <host>;
  cd /humanix-academie;
  cls -lh;
  bye
"
```

### 10.4 Procédure de restauration d'urgence

Sur la machine où tu veux restaurer (peut être prod, peut être une instance test) :

```bash
# 1. S'assurer d'avoir la clé privée age localement
ls -l ~/.config/humanix/backup.key   # doit exister

# 2. Lancer le restore interactif
cd /opt/humanix-prod
./scripts/restore-db.sh
```

Le script va :
1. Lister les backups locaux + distants
2. Te demander lequel restaurer (numéro)
3. Télécharger si distant, déchiffrer avec ta clé privée
4. **Te demander "OUI JE CONFIRME" en clair** avant de remplacer la BDD
5. Lancer `pg_restore --clean --if-exists` (efface la BDD cible et restaure)
6. Te suggérer les requêtes de validation

**Drill semestriel obligatoire** (avril + octobre, cf. § 4) : faire un restore complet en environnement isolé pour valider RPO/RTO.

---

## Historique des révisions

| Date | Auteur | Changements |
|---|---|---|
| 2026-05-11 | Florian + Claude | Création du document — politique initiale |
| 2026-05-22 | Florian + Claude | Ajout § 10 : implémentation opérationnelle self-host + scripts `backup-db.sh` / `restore-db.sh` + procédure cron host |
