#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# verifier-durcissement-ssh.sh - controle la config EFFECTIVE de sshd
#
# ---------------------------------------------------------------------
# POURQUOI CE SCRIPT EXISTE
# ---------------------------------------------------------------------
#
# Le 2026-08-14, humanix-prod-01 acceptait l'authentification PAR MOT DE
# PASSE sur le port 22 ouvert au monde, alors qu'un fichier de durcissement
# la desactivait explicitement :
#
#   /etc/ssh/sshd_config.d/50-cloud-init.conf       PasswordAuthentication yes
#   /etc/ssh/sshd_config.d/99-humanix-hardening.conf PasswordAuthentication no
#
# `sshd` retient la PREMIERE valeur rencontree pour chaque mot-cle, pas la
# derniere. Les fichiers de sshd_config.d sont lus dans l'ordre LEXICAL :
# `50-` passe donc avant `99-`, et le durcissement etait mort-ne.
#
# C'est contre-intuitif -- partout ailleurs, le fichier au numero le plus
# eleve gagne -- et invisible a la relecture : le fichier de durcissement
# existait, il etait correct, il disait exactement ce qu'on voulait lire.
#
# Le durcissement a ete renomme `01-humanix-hardening.conf`.
#
# CE PIEGE SE REJOUERA : cloud-init reecrit son fichier `50-` a chaque
# reinstallation, et quiconque posera un durcissement en `99-` refera la
# meme erreur.
#
# ---------------------------------------------------------------------
# CE SCRIPT VERIFIE L'EFFECTIF, PAS LE DECLARE
# ---------------------------------------------------------------------
#
# `sshd -T` affiche la configuration REELLEMENT appliquee, apres resolution
# de toutes les inclusions. C'est la seule source qui compte : lire les
# fichiers de configuration donne l'intention, pas le resultat.
#
# TROIS ISSUES, et la distinction n'est pas cosmetique. Une premiere version
# de ce controle tenait en une ligne :
#
#   sshd -T | grep -q '^passwordauthentication no' || echo "ALERTE"
#
# Elle criait « mot de passe accepte » quand `sshd -T` avait simplement
# echoue -- faute de privileges, ou lancee sur la mauvaise machine. Un
# controle qui ment sur la nature de son echec apprend a ne plus etre lu.
#
# USAGE : sudo ./scripts/verifier-durcissement-ssh.sh
# EXIT  : 0 conforme  1 non conforme  2 indetermine

set -uo pipefail

ATTENDU=(
  "passwordauthentication no"
  "permitrootlogin no"
  "pubkeyauthentication yes"
  "kbdinteractiveauthentication no"
)

if ! EFFECTIF="$(sshd -T 2>&1)"; then
  echo "INDETERMINE : sshd -T a echoue -- privileges insuffisants, ou mauvaise machine ?"
  printf '%s\n' "$EFFECTIF" | head -3 | sed 's/^/  /'
  exit 2
fi

ECARTS=0
for regle in "${ATTENDU[@]}"; do
  cle="${regle%% *}"
  if printf '%s\n' "$EFFECTIF" | grep -qx "$regle"; then
    printf '  OK       %s\n' "$regle"
  else
    reel="$(printf '%s\n' "$EFFECTIF" | grep -i "^$cle " || echo "$cle <absent>")"
    printf '  ECART    attendu "%s", effectif "%s"\n' "$regle" "$reel"
    ECARTS=$((ECARTS + 1))
  fi
done

if [ "$ECARTS" -gt 0 ]; then
  echo
  echo "$ECARTS ecart(s). Verifier l'ORDRE LEXICAL de /etc/ssh/sshd_config.d/ :"
  echo "sshd retient la PREMIERE valeur, un fichier 50- ecrase un 99-."
  ls -1 /etc/ssh/sshd_config.d/ 2>/dev/null | sed 's/^/  /'
  exit 1
fi

echo
echo "Configuration effective conforme."
