#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# archive-audit-logs.sh - archive les journaux d'audit vers un bucket
# Object Storage immuable, AVANT que la purge ne les supprime.
#
# WORKFLOW :
#   1. Determine les MOIS CALENDAIRES entierement au-dela du seuil
#   2. Pour chacun : export JSONL depuis Postgres, gzip, chiffrement age
#   3. Upload S3 avec Object Lock (WORM) + empreinte SHA-256 en metadonnee
#   4. Verification : l'objet distant existe et fait la bonne taille
#   5. Nettoyage du /tmp local
#
# PRE-REQUIS sur l'host :
#   - postgresql-client (psql)
#   - age (chiffrement asymetrique Curve25519)
#   - awscli v2 (s3api, seul client exposant --object-lock-*)
#   - gzip, sha256sum
#
#   Debian/Ubuntu : sudo apt install postgresql-client age awscli
#
# VARIABLES D'ENV REQUISES (cf. /etc/humanix/archive.env) :
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   ARCHIVE_AGE_RECIPIENT     cle PUBLIQUE age1xxx (jamais la privee ici)
#   ARCHIVE_S3_BUCKET         nom du bucket, Object Lock ACTIVE A LA CREATION
#   AWS_ACCESS_KEY_ID         cle en ECRITURE SEULE
#   AWS_SECRET_ACCESS_KEY
#
# VARIABLES OPTIONNELLES :
#   ARCHIVE_S3_ENDPOINT       defaut https://s3.fr-par.scw.cloud
#   ARCHIVE_S3_REGION         defaut fr-par
#   ARCHIVE_THRESHOLD_DAYS    defaut 370 (cf. « la marge » plus bas)
#   ARCHIVE_RETAIN_YEARS      defaut 10 (duree du verrou WORM)
#
# USAGE :
#   ./scripts/archive-audit-logs.sh --dry-run   # montre le plan, n'ecrit rien
#   ./scripts/archive-audit-logs.sh             # archive et televerse
#
# EXIT CODES :
#   0 = succes (y compris « rien a archiver »)
#   1 = erreur de configuration (env manquant, binaire absent)
#   2 = erreur d'export psql
#   3 = erreur de chiffrement age
#   4 = erreur d'upload S3
#   5 = verification post-upload echouee
#
# CRON RECOMMANDE (avant audit-logs-purge, qui tourne a 04h00) :
#   30 3 * * * /opt/humanix-prod/scripts/archive-audit-logs.sh >> /var/log/humanix/archive.log 2>&1
#
# ---------------------------------------------------------------------
# POURQUOI CE SCRIPT EXISTE, ET POURQUOI UN BUCKET PLUTOT QU'UN MAIL
# ---------------------------------------------------------------------
#
# `audit-logs-purge` SUPPRIME les entrees de plus de 400 jours. C'est une
# obligation, pas une option : le RGPD (art. 5.1.e) interdit de conserver
# indefiniment. Mais d'autres textes imposent de POUVOIR produire ces
# journaux apres coup. Il faut donc archiver avant de supprimer.
#
# Le mail a ete ecarte : taille limitee, transit par des tiers, aucune
# preuve d'integrite, et surtout la boite devient une copie incontrolee
# de tout l'historique — une compromission de messagerie et tout part.
#
# Ce que le bucket apporte et que le mail ne peut pas : l'OBJECT LOCK.
# L'archive devient immuable pendant la duree fixee. Un attaquant qui
# compromet l'application, la machine, ou meme cette cle d'acces NE PEUT
# PAS effacer ses traces. Pour des journaux d'audit, c'est le critere
# decisif ; tout le reste est secondaire.
#
# ---------------------------------------------------------------------
# LA MARGE : pourquoi 370 et pas 400
# ---------------------------------------------------------------------
#
# La purge supprime a 400 jours. On archive a 370. Ces 30 jours d'ecart
# ne sont pas de la prudence decorative : ils font que l'echec de ce
# script produit un MOIS d'alertes avant la moindre perte de donnee.
#
# Sans marge, un archivage rate la nuit du 399e jour et une purge reussie
# la nuit du 400e suffiraient a perdre definitivement les donnees, sans
# que personne n'ait eu l'occasion de voir passer l'erreur.
#
# ---------------------------------------------------------------------
# IDEMPOTENCE
# ---------------------------------------------------------------------
#
# Un fichier par MOIS CALENDAIRE, nomme de facon deterministe. Avant
# d'exporter, on demande au bucket si l'objet existe deja ; si oui, on
# passe. Aucun fichier d'etat local a maintenir, donc rien a perdre ni a
# desynchroniser : la verite est dans le bucket.

set -euo pipefail

DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

log() { printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"; }
die() { printf '[%s] ERREUR : %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$1" >&2; exit "${2:-1}"; }

# --- 0. Pre-requis ----------------------------------------------------
for bin in psql age aws gzip sha256sum; do
  command -v "$bin" >/dev/null 2>&1 || die "binaire manquant : $bin" 1
done

: "${ARCHIVE_AGE_RECIPIENT:?ARCHIVE_AGE_RECIPIENT non defini (cle publique age)}"
: "${ARCHIVE_S3_BUCKET:?ARCHIVE_S3_BUCKET non defini}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID non defini}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY non defini}"

ENDPOINT="${ARCHIVE_S3_ENDPOINT:-https://s3.fr-par.scw.cloud}"
REGION="${ARCHIVE_S3_REGION:-fr-par}"
SEUIL_JOURS="${ARCHIVE_THRESHOLD_DAYS:-370}"
RETENTION_ANS="${ARCHIVE_RETAIN_YEARS:-10}"

# La cle privee n'a rien a faire ici : `age -r` chiffre avec la seule cle
# PUBLIQUE. Ce script ne peut donc pas relire ce qu'il produit — c'est
# voulu, et c'est ce qui limite les degats s'il est compromis.
case "$ARCHIVE_AGE_RECIPIENT" in
  age1*) : ;;
  *) die "ARCHIVE_AGE_RECIPIENT ne ressemble pas a une cle publique age (doit commencer par age1)" 1 ;;
esac

TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT INT TERM

s3() { aws --endpoint-url "$ENDPOINT" --region "$REGION" "$@"; }

log "Seuil d'archivage : $SEUIL_JOURS jours. Verrou WORM : $RETENTION_ANS ans."
$DRY_RUN && log "MODE --dry-run : aucune ecriture, aucun upload."

# --- 1. Quels mois sont entierement au-dela du seuil ? ----------------
#
# On ne traite que des mois COMPLETS. Un mois a cheval sur le seuil
# serait archive partiellement, puis re-archive le mois suivant sous le
# meme nom d'objet — que l'Object Lock refuserait d'ecraser.
MOIS=$(
  psql -qtAX -c "
    select distinct to_char(date_trunc('month', \"createdAt\"), 'YYYY-MM')
    from \"AuditLog\"
    where \"createdAt\" < date_trunc('month', now() - interval '$SEUIL_JOURS days')
    order by 1
  "
) || die "export impossible : verifier PGHOST/PGUSER/PGPASSWORD" 2

if [ -z "$MOIS" ]; then
  log "Aucun mois complet au-dela du seuil. Rien a archiver."
  exit 0
fi

log "Mois candidats : $(echo "$MOIS" | tr '\n' ' ')"

# --- 2. Traitement mois par mois --------------------------------------
archives=0
ignores=0

for m in $MOIS; do
  OBJET="auditlog/${m}.jsonl.gz.age"

  # Idempotence : le bucket fait foi.
  if s3 s3api head-object --bucket "$ARCHIVE_S3_BUCKET" --key "$OBJET" >/dev/null 2>&1; then
    log "  $m : deja archive ($OBJET), ignore."
    ignores=$((ignores + 1))
    continue
  fi

  n=$(psql -qtAX -c "
    select count(*) from \"AuditLog\"
    where date_trunc('month', \"createdAt\") = date '${m}-01'
  ") || die "comptage impossible pour $m" 2

  if [ "$n" -eq 0 ]; then
    log "  $m : 0 ligne, rien a archiver."
    continue
  fi

  log "  $m : $n ligne(s) a archiver."
  if $DRY_RUN; then
    archives=$((archives + 1))
    continue
  fi

  BRUT="$TRAVAIL/${m}.jsonl"
  CHIFFRE="$TRAVAIL/${m}.jsonl.gz.age"

  # JSONL : une ligne JSON par entree. Format lisible sans schema,
  # rejouable, et qui se compresse tres bien. `row_to_json` conserve
  # tous les champs, y compris ceux ajoutes apres coup.
  psql -qtAX -c "
    select row_to_json(t) from (
      select * from \"AuditLog\"
      where date_trunc('month', \"createdAt\") = date '${m}-01'
      order by \"createdAt\"
    ) t
  " > "$BRUT" || die "export JSONL impossible pour $m" 2

  lignes=$(wc -l < "$BRUT")
  [ "$lignes" -eq "$n" ] || die "export incoherent pour $m : $lignes lignes exportees pour $n attendues" 2

  gzip -9 -c "$BRUT" | age -r "$ARCHIVE_AGE_RECIPIENT" -o "$CHIFFRE" \
    || die "chiffrement age echoue pour $m" 3

  EMPREINTE=$(sha256sum "$CHIFFRE" | cut -d' ' -f1)
  TAILLE=$(stat -c%s "$CHIFFRE" 2>/dev/null || stat -f%z "$CHIFFRE")

  # Verrou WORM. `--object-lock-mode COMPLIANCE` : meme le proprietaire
  # du bucket ne peut pas raccourcir la retention. C'est plus fort que
  # GOVERNANCE, ou un porteur de droits suffisants peut passer outre.
  RETENIR_JUSQU_A=$(date -u -d "+${RETENTION_ANS} years" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || date -u -v"+${RETENTION_ANS}y" +"%Y-%m-%dT%H:%M:%SZ")

  s3 s3api put-object \
    --bucket "$ARCHIVE_S3_BUCKET" \
    --key "$OBJET" \
    --body "$CHIFFRE" \
    --object-lock-mode COMPLIANCE \
    --object-lock-retain-until-date "$RETENIR_JUSQU_A" \
    --metadata "sha256=$EMPREINTE,lignes=$n,source=AuditLog" \
    >/dev/null || die "upload S3 echoue pour $m" 4

  # Verification : on RELIT les metadonnees distantes plutot que de
  # supposer que le put a fait ce qu'il annonce. Une archive jamais
  # verifiee n'est pas une archive.
  distante=$(s3 s3api head-object --bucket "$ARCHIVE_S3_BUCKET" --key "$OBJET" \
    --query 'ContentLength' --output text 2>/dev/null) \
    || die "objet introuvable apres upload : $OBJET" 5

  [ "$distante" = "$TAILLE" ] \
    || die "taille distante ($distante) differente de la locale ($TAILLE) pour $OBJET" 5

  log "    -> $OBJET  ($TAILLE octets, verrou jusqu'au ${RETENIR_JUSQU_A%T*})"
  log "       SHA-256 : $EMPREINTE"
  archives=$((archives + 1))
done

log "Termine : $archives archive(s) creee(s), $ignores deja presente(s)."

if $DRY_RUN; then
  log "--dry-run : rien n'a ete ecrit."
else
  log "Rappel : la purge (audit-logs-purge, 04h00) supprime a 400 jours."
  log "L'ecart de $((400 - SEUIL_JOURS)) jours laisse le temps de voir passer un echec."
fi
