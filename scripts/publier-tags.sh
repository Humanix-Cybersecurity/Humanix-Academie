#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# publier-tags.sh - Pose des tags sur une image deja au registre, designee par
#                   son empreinte, et verifie qu'ils la designent bien.
#
# POURQUOI CE SCRIPT EXISTE
#
#   Le workflow de publication poussait l'image avec ses tags, PUIS l'essayait.
#   Un essai rouge ne retenait donc rien. Constate le 2026-11-20, au premier
#   vrai passage de l'essai sur `main` : echec, et `edge` pointait deja sur
#   l'image qui venait d'echouer.
#
#   L'ordre est maintenant : l'image part au registre sous sa seule empreinte,
#   sans aucun tag ; elle est essayee (scripts/essai-image.sh) ; ce script
#   pose les tags, sur cette empreinte-la et pas sur une reconstruction.
#   `edge`, `latest` et les tags de version ne designent plus que des images
#   qui ont demarre et servi.
#
# CE QU'IL FAIT
#
#   1. controle le candidat et la liste des tags, avant tout appel au
#      registre ;
#   2. lit le candidat au registre : il doit s'y trouver, sous l'empreinte
#      annoncee, et etre un index d'images ;
#   3. pose tous les tags sur le candidat, en une commande ;
#   4. relit chaque tag au registre : il doit rendre l'empreinte du candidat.
#
# POURQUOI EXIGER UN INDEX
#
#   `docker buildx imagetools create` recopie a l'identique une source unique
#   quand elle est un index (c'est sa documentation), et l'empreinte ne change
#   pas. Une source qui est un manifeste simple serait, par defaut, emballee
#   dans un index neuf : autre empreinte que celle qui a ete essayee. Nos
#   images sont toujours des index, la provenance et le SBOM y ajoutent un
#   manifeste d'attestation. On refuse donc le cas incertain au lieu de
#   compter sur une option, et l'etape 4 verifie le resultat de toute facon.
#
# USAGE
#
#   TAGS="<depot>:<tag>
#   <depot>:<autre-tag>" ./scripts/publier-tags.sh <depot>@sha256:<empreinte>
#
#   TAGS     references a poser, une par ligne, toutes dans le depot du
#            candidat. C'est la sortie `tags` de docker/metadata-action.
#            Vide : rien a poser, le script sort a 0.
#   MIROIR   depot supplementaire qui recoit les memes tags (Docker Hub, par
#            exemple). Vide : aucun. Le client doit deja y etre connecte.
#
# CODES DE SORTIE
#
#   0  tags poses et verifies, ou rien a poser
#   1  le registre a refuse, ou un tag ne designe pas le candidat
#   2  mauvais usage : rien n'a ete demande au registre
#
# OUTILS SUPPOSES : bash et docker avec son greffon buildx, rien d'autre. Ni
# awk, que les executeurs de la CI n'ont pas, ni grep, ni jq. Le test
# (scripts/publier-tags.test.ts) tourne avec ce seul chemin.

set -euo pipefail

log() { echo "[publier-tags] $*"; }

usage() {
  echo "Usage : TAGS=\"<depot>:<tag>...\" $0 <depot>@sha256:<empreinte>" >&2
  echo "  ex. : TAGS=\"ghcr.io/humanix-cybersecurity/humanix-academie:edge\" \\" >&2
  echo "        $0 ghcr.io/humanix-cybersecurity/humanix-academie@sha256:<64 hexadecimaux>" >&2
}

refus() {
  echo "$*" >&2
  exit 2
}

if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  usage
  exit 2
fi

CANDIDAT="$1"
MIROIR="${MIROIR:-}"

# -----------------------------------------------------------------------------
# 1. Controles, avant tout appel au registre
# -----------------------------------------------------------------------------
case "$CANDIDAT" in
  *@sha256:*) ;;
  *) refus "Candidat sans empreinte : $CANDIDAT. Un tag peut avoir bouge depuis l'essai." ;;
esac
DEPOT="${CANDIDAT%@sha256:*}"
EMPREINTE="${CANDIDAT##*@sha256:}"

case "$EMPREINTE" in
  "" | *[!0-9a-f]*) refus "Empreinte invalide : 64 chiffres hexadecimaux en minuscules sont attendus." ;;
esac
if [ "${#EMPREINTE}" -ne 64 ]; then
  refus "Empreinte invalide : ${#EMPREINTE} caracteres, 64 sont attendus."
fi

# Un depot ne porte ni tag ni empreinte. Les deux-points d'un port de registre
# sont avant la premiere barre : on ne regarde que le dernier segment.
depot_valide() {
  case "$1" in
    "" | *@* | *[[:space:]]*) return 1 ;;
  esac
  case "${1##*/}" in
    "" | *:*) return 1 ;;
  esac
  return 0
}

depot_valide "$DEPOT" ||
  refus "Depot du candidat invalide : $DEPOT. Il ne doit porter que son empreinte, pas de tag."

if [ -n "$MIROIR" ]; then
  depot_valide "$MIROIR" || refus "MIROIR invalide : $MIROIR. Un depot est attendu, sans tag."
  if [ "$MIROIR" = "$DEPOT" ]; then
    refus "MIROIR est le depot du candidat : $MIROIR."
  fi
fi

# Les noms de tags, dans l'ordre, sans doublon.
NOMS=()
deja_vu() {
  local n
  for n in ${NOMS[@]+"${NOMS[@]}"}; do
    if [ "$n" = "$1" ]; then
      return 0
    fi
  done
  return 1
}

while IFS= read -r ligne || [ -n "$ligne" ]; do
  ligne="${ligne%$'\r'}"
  # Espaces de debut et de fin.
  ligne="${ligne#"${ligne%%[![:space:]]*}"}"
  ligne="${ligne%"${ligne##*[![:space:]]}"}"
  if [ -z "$ligne" ]; then
    continue
  fi
  case "$ligne" in
    "$DEPOT":*) ;;
    *) refus "Tag hors du depot du candidat : $ligne. Attendu : $DEPOT:<tag>." ;;
  esac
  nom="${ligne#"$DEPOT":}"
  case "$nom" in
    "" | [!A-Za-z0-9_]* | *[!A-Za-z0-9._-]*)
      refus "Nom de tag invalide : $ligne."
      ;;
  esac
  if [ "${#nom}" -gt 128 ]; then
    refus "Nom de tag trop long : ${#nom} caracteres, 128 au plus."
  fi
  if ! deja_vu "$nom"; then
    NOMS+=("$nom")
  fi
done <<EOF
${TAGS:-}
EOF

if [ "${#NOMS[@]}" -eq 0 ]; then
  log "aucun tag a poser : l'image reste au registre sous sa seule empreinte."
  log "candidat : $CANDIDAT"
  exit 0
fi

REFERENCES=()
for nom in "${NOMS[@]}"; do
  REFERENCES+=("$DEPOT:$nom")
done
if [ -n "$MIROIR" ]; then
  for nom in "${NOMS[@]}"; do
    REFERENCES+=("$MIROIR:$nom")
  done
fi

log "candidat : $CANDIDAT"
log "${#REFERENCES[@]} reference(s) a poser"

# -----------------------------------------------------------------------------
# 2. Le candidat est-il au registre, tel qu'annonce ?
# -----------------------------------------------------------------------------
vu="$(docker buildx imagetools inspect "$CANDIDAT" \
  --format '{{.Manifest.MediaType}} {{.Manifest.Digest}}')" ||
  { log "ECHEC : le candidat est introuvable au registre. Aucun tag n'a ete pose."; exit 1; }

type_vu="${vu%% *}"
empreinte_vue="${vu##* }"

if [ "$empreinte_vue" != "sha256:$EMPREINTE" ]; then
  log "ECHEC : le registre rend $empreinte_vue pour le candidat. Aucun tag n'a ete pose."
  exit 1
fi
case "$type_vu" in
  application/vnd.oci.image.index.v1+json | application/vnd.docker.distribution.manifest.list.v2+json) ;;
  *)
    log "ECHEC : le candidat n'est pas un index d'images ($type_vu)."
    log "        Le recopier changerait son empreinte. Aucun tag n'a ete pose."
    exit 1
    ;;
esac

# -----------------------------------------------------------------------------
# 3. Les tags, sur le candidat et rien d'autre
# -----------------------------------------------------------------------------
ARGUMENTS=()
for reference in "${REFERENCES[@]}"; do
  ARGUMENTS+=(--tag "$reference")
done

docker buildx imagetools create "${ARGUMENTS[@]}" "$CANDIDAT" ||
  { log "ECHEC : le registre a refuse. Des tags ont pu etre poses, d'autres non : relancer ce job."; exit 1; }

# -----------------------------------------------------------------------------
# 4. Chaque tag designe-t-il le candidat ?
# -----------------------------------------------------------------------------
ecarts=0
for reference in "${REFERENCES[@]}"; do
  lue="$(docker buildx imagetools inspect "$reference" --format '{{.Manifest.Digest}}')" || lue="illisible"
  if [ "$lue" = "sha256:$EMPREINTE" ]; then
    log "  $reference"
  else
    log "  ECART : $reference rend $lue"
    ecarts=$((ecarts + 1))
  fi
done

if [ "$ecarts" -gt 0 ]; then
  log "ECHEC : $ecarts reference(s) ne designent pas l'image essayee (sha256:$EMPREINTE)."
  exit 1
fi

log "TAGS POSES : ${#REFERENCES[@]} reference(s) sur sha256:$EMPREINTE"
