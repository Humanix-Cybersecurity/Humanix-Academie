#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# =============================================================================
# scripts/start.sh — Demarrage assiste de la stack docker en mode dev
# -----------------------------------------------------------------------------
# Ce que fait ce script :
#   1. Detecte l'OS (macOS / Linux / autre)
#   2. Verifie la presence d'un runtime Docker (OrbStack ou Docker Desktop sur
#      mac, Docker Engine sur Linux)
#   3. Verifie / installe mkcert (cert local trust-safe pour le browser)
#   4. Genere un certificat TLS local pour humanix.local (+ localhost)
#   5. Ajoute 127.0.0.1 humanix.local au /etc/hosts si absent (avec sudo)
#   6. Cree un .env minimal si absent (AUTH_URL = https://humanix.local)
#   7. Active la config HAProxy dev (HTTPS sur 443 + redirect HTTP)
#   8. Lance docker compose up -d
#   9. Affiche les URLs + instructions browser
#
# Pourquoi ce script existe :
#   En dev pur HTTP, NextAuth refuse certains flows (cookies __Secure-*,
#   redirections OAuth). Le site casse partiellement. Le minimum viable c'est
#   un cert TLS local + un hostname dedie. mkcert permet ca en 30 secondes,
#   sans pop-up "site non securise" dans le browser.
#
# Usage :
#   ./scripts/start.sh           # demarrage complet
#   ./scripts/start.sh --restart # rebuild + restart
#   ./scripts/start.sh --stop    # arrete tout
#   ./scripts/start.sh --logs    # tail des logs
#   ./scripts/start.sh --reset   # destroy DB + restart from scratch
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Couleurs et helpers
# -----------------------------------------------------------------------------
if [[ -t 1 ]]; then
  C_RED=$'\033[0;31m'
  C_GREEN=$'\033[0;32m'
  C_YELLOW=$'\033[0;33m'
  C_BLUE=$'\033[0;34m'
  C_BOLD=$'\033[1m'
  C_RESET=$'\033[0m'
else
  C_RED= C_GREEN= C_YELLOW= C_BLUE= C_BOLD= C_RESET=
fi

log() { printf '%s[start.sh]%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ok()  { printf '%s✓%s  %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s⚠%s  %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
err() { printf '%s✗%s  %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
fatal() { err "$*"; exit 1; }

# -----------------------------------------------------------------------------
# Constantes
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HOSTNAME_DEV="humanix.local"
CERTS_DIR="$ROOT_DIR/infra/haproxy/certs"
CERT_FILE="$CERTS_DIR/humanix.local.pem"  # bundled cert+key pour HAProxy
COMPOSE_DEV_FILE="$ROOT_DIR/docker-compose.dev.yml"

# -----------------------------------------------------------------------------
# 1. Detection OS
# -----------------------------------------------------------------------------
detect_os() {
  case "$(uname -s)" in
    Darwin*) echo "macos" ;;
    Linux*)  echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

OS="$(detect_os)"
log "OS detecte : $OS"

if [[ "$OS" == "windows" ]]; then
  fatal "Windows non supporte par ce script. Utilise WSL2 + scripts/start.sh dans Ubuntu, ou docker compose up -d directement."
fi

# -----------------------------------------------------------------------------
# 2. Detection Docker / OrbStack
# -----------------------------------------------------------------------------
check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    return 2
  fi
  return 0
}

install_docker_macos() {
  warn "Docker n'est pas installe sur ce mac."
  cat <<EOF

Recommendations (du plus leger au plus complet) :

  1. ${C_BOLD}OrbStack${C_RESET} (recommande pour Mac, leger, rapide)
     brew install orbstack
     puis lance OrbStack.app une fois pour init

  2. ${C_BOLD}Docker Desktop${C_RESET} (plus lourd, mais plus connu)
     brew install --cask docker
     puis lance Docker.app une fois pour init

EOF
  read -r -p "Installer OrbStack via Homebrew maintenant ? [y/N] " resp
  case "$resp" in
    [yY]*)
      if ! command -v brew >/dev/null 2>&1; then
        fatal "Homebrew n'est pas installe. Cf. https://brew.sh puis relance ce script."
      fi
      brew install orbstack
      open -a OrbStack
      log "OrbStack installe. Lance-le une fois pour init, puis relance ce script."
      exit 0
      ;;
    *)
      fatal "Installe Docker manuellement puis relance."
      ;;
  esac
}

install_docker_linux() {
  warn "Docker n'est pas installe."
  cat <<EOF

Sur Linux :
  ${C_BOLD}Ubuntu / Debian${C_RESET} :
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker \$USER
    newgrp docker

  ${C_BOLD}Fedora / RHEL${C_RESET} :
    sudo dnf install docker docker-compose
    sudo systemctl enable --now docker
    sudo usermod -aG docker \$USER

EOF
  fatal "Installe Docker manuellement puis relance."
}

ensure_docker() {
  if check_docker; then
    ok "Docker disponible : $(docker --version)"
    return
  fi
  case "$OS" in
    macos) install_docker_macos ;;
    linux) install_docker_linux ;;
  esac
}

# -----------------------------------------------------------------------------
# 3. mkcert : cert TLS local trust-safe
# -----------------------------------------------------------------------------
ensure_mkcert() {
  if command -v mkcert >/dev/null 2>&1; then
    ok "mkcert disponible : $(mkcert -version 2>&1 | head -1)"
    return
  fi
  warn "mkcert pas installe."
  case "$OS" in
    macos)
      if ! command -v brew >/dev/null 2>&1; then
        fatal "Installe Homebrew (https://brew.sh) puis relance, ou installe mkcert manuellement."
      fi
      log "Installation mkcert via Homebrew..."
      brew install mkcert nss
      ;;
    linux)
      cat <<EOF
Installe mkcert manuellement :

  ${C_BOLD}Debian/Ubuntu${C_RESET} :
    sudo apt install libnss3-tools
    curl -L https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64 -o mkcert
    chmod +x mkcert && sudo mv mkcert /usr/local/bin/

  ${C_BOLD}Fedora${C_RESET} :
    sudo dnf install nss-tools mkcert

EOF
      fatal "Installe mkcert puis relance."
      ;;
  esac
}

ensure_local_ca() {
  # mkcert -install installe le CA local dans le browser/OS trust store.
  # Idempotent : ne fait rien si deja fait.
  log "Installation du CA local (peut demander ton mot de passe sudo une fois)..."
  mkcert -install
}

generate_cert() {
  mkdir -p "$CERTS_DIR"
  if [[ -f "$CERT_FILE" ]]; then
    log "Certificat existant detecte : $CERT_FILE"
    # Verifier qu'il n'est pas expire
    if openssl x509 -in "$CERT_FILE" -noout -checkend 86400 >/dev/null 2>&1; then
      ok "Certificat valide (expiration > 1 jour)"
      return
    fi
    warn "Certificat expire ou expirera bientot, regeneration..."
    rm -f "$CERT_FILE" "$CERTS_DIR/humanix.local-key.pem"
  fi

  log "Generation cert TLS pour $HOSTNAME_DEV + localhost..."
  pushd "$CERTS_DIR" >/dev/null
  mkcert -cert-file "humanix.local.pem.crt" -key-file "humanix.local.pem.key" \
    "$HOSTNAME_DEV" "localhost" 127.0.0.1 ::1
  # HAProxy attend le bundle cert+key concatenes dans un seul .pem
  cat humanix.local.pem.crt humanix.local.pem.key > humanix.local.pem
  chmod 644 humanix.local.pem
  popd >/dev/null
  ok "Certificat genere : $CERT_FILE"
}

# -----------------------------------------------------------------------------
# 4. /etc/hosts : ajouter humanix.local -> 127.0.0.1
# -----------------------------------------------------------------------------
ensure_hosts_entry() {
  if grep -qE "^[^#]*\s$HOSTNAME_DEV(\s|$)" /etc/hosts 2>/dev/null; then
    ok "/etc/hosts contient deja $HOSTNAME_DEV"
    return
  fi
  warn "/etc/hosts ne contient pas $HOSTNAME_DEV"
  read -r -p "Ajouter '127.0.0.1 $HOSTNAME_DEV' a /etc/hosts (sudo requis) ? [y/N] " resp
  case "$resp" in
    [yY]*)
      echo "127.0.0.1 $HOSTNAME_DEV  # added by humanix-academie/scripts/start.sh" |
        sudo tee -a /etc/hosts >/dev/null
      ok "Ajoute a /etc/hosts"
      ;;
    *)
      warn "Saute - tu devras y acceder via https://localhost (mais le hostname matchera mal le cert)"
      ;;
  esac
}

# -----------------------------------------------------------------------------
# 5. .env dev minimal
# -----------------------------------------------------------------------------
ensure_env_dev() {
  local env_file="$ROOT_DIR/.env"
  if [[ -f "$env_file" ]]; then
    ok ".env existe deja (preserve)"
    return
  fi
  log "Creation .env dev minimal..."
  local secret
  secret="$(openssl rand -base64 32)"
  cat > "$env_file" <<EOF
# .env auto-genere par scripts/start.sh ($(date -Iseconds))
# Pour la prod, copie .env.example et personnalise.

DATABASE_URL="postgresql://humanix:humanix_demo@postgres:5432/humanix?schema=public"
AUTH_SECRET="$secret"
AUTH_URL="https://$HOSTNAME_DEV"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_URL="https://$HOSTNAME_DEV"
NEXT_PUBLIC_APP_NAME="Humanix Academie (dev)"

# Mode demo : pas de MISTRAL/SCALEWAY/PAYPLUG requis.
DEMO_MODE="true"
EOF
  ok ".env cree (DEMO_MODE=true, AUTH_URL=https://$HOSTNAME_DEV)"
}

# -----------------------------------------------------------------------------
# 6. Lancement docker compose (avec override dev)
# -----------------------------------------------------------------------------
docker_up() {
  cd "$ROOT_DIR"
  log "Lancement docker compose up -d (avec override dev TLS)..."
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
  ok "Stack lancee."
}

docker_down() {
  cd "$ROOT_DIR"
  log "Arret docker compose..."
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down
  ok "Stack arretee."
}

docker_logs() {
  cd "$ROOT_DIR"
  docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f --tail=100
}

docker_reset() {
  cd "$ROOT_DIR"
  warn "Reset complet : SUPPRESSION DE LA BASE DE DONNEES."
  read -r -p "Confirmer ? Tape exactement 'RESET' : " resp
  [[ "$resp" == "RESET" ]] || { log "Annule."; exit 0; }
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
  ok "Volumes supprimes. Relance avec ./scripts/start.sh."
}

# -----------------------------------------------------------------------------
# 7. Recap final
# -----------------------------------------------------------------------------
print_success() {
  cat <<EOF

${C_GREEN}${C_BOLD}═══════════════════════════════════════════════════════${C_RESET}
${C_GREEN}${C_BOLD}  Humanix Academie est pret en dev !${C_RESET}
${C_GREEN}${C_BOLD}═══════════════════════════════════════════════════════${C_RESET}

  ${C_BOLD}URLs${C_RESET}
    https://$HOSTNAME_DEV       (recommande)
    https://localhost           (alt)
    http://localhost            (redirect 301 vers HTTPS)
    http://localhost/health     (healthcheck)

  ${C_BOLD}Comptes demo (DEMO_MODE=true)${C_RESET}
    Voir /demo : selectionne un palier + role en 1 clic.

  ${C_BOLD}Logs${C_RESET}
    ./scripts/start.sh --logs

  ${C_BOLD}Arreter${C_RESET}
    ./scripts/start.sh --stop

  ${C_BOLD}Reset complet (efface BDD)${C_RESET}
    ./scripts/start.sh --reset

  ${C_BOLD}Note browser${C_RESET}
    Le certificat est signe par le CA local mkcert, qui a ete trust
    par ton OS. Aucun warning "site non securise" attendu.
    Si tu vois un warning : ferme ton browser, relance, ou execute
    'mkcert -install' a nouveau.

EOF
}

# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------
main() {
  case "${1:-}" in
    --stop)    docker_down; exit 0 ;;
    --logs)    docker_logs; exit 0 ;;
    --reset)   docker_reset; exit 0 ;;
    --restart) docker_down ;;
    --help|-h)
      head -50 "$0" | grep -E "^# " | sed 's/^# //'
      exit 0
      ;;
  esac

  log "Verification de l'environnement..."
  ensure_docker
  ensure_mkcert
  ensure_local_ca
  generate_cert
  ensure_hosts_entry
  ensure_env_dev

  if [[ ! -f "$COMPOSE_DEV_FILE" ]]; then
    fatal "Fichier $COMPOSE_DEV_FILE manquant. Verifie ton checkout du repo."
  fi

  docker_up
  print_success
}

main "$@"
