#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# =============================================================================
# scripts/server-init.sh — Hardening initial d'un serveur dédié OVH/bare-metal
# -----------------------------------------------------------------------------
# A executer UNE FOIS sur un serveur fraichement installe (Ubuntu 24.04 LTS
# recommande), connecte en SSH root.
#
# Ce script :
#   1. Update + upgrade les paquets systeme
#   2. Cree un user `humanix` avec sudo + sa cle SSH (depuis la cle root)
#   3. Durcit SSH : refus mot de passe, refus root login, port custom optionnel
#   4. Active UFW : SSH, 80, 443 (le reste est ferme)
#   5. Installe + configure fail2ban (anti-bruteforce SSH)
#   6. Cree un swap file de 8 Go (safety net OOM)
#   7. Installe Docker + plugin compose
#   8. Set timezone Europe/Paris + locale fr_FR.UTF-8
#   9. Configure unattended-upgrades pour les patches securite auto
#  10. Affiche le recap (next steps : cloner repo, .env, deploy)
#
# Usage :
#   wget https://raw.githubusercontent.com/Humanix-Cybersecurity/Humanix-Academie/main/scripts/server-init.sh
#   chmod +x server-init.sh
#   sudo ./server-init.sh
#
# Variables overridables (env ou prompt interactif) :
#   SSH_PORT        (defaut 22)
#   ADMIN_USER      (defaut humanix)
#   SWAP_SIZE_GB    (defaut 8)
#   TIMEZONE        (defaut Europe/Paris)
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

log()   { printf '%s[server-init]%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ok()    { printf '%s✓%s  %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn()  { printf '%s⚠%s  %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
err()   { printf '%s✗%s  %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
fatal() { err "$*"; exit 1; }

# -----------------------------------------------------------------------------
# Pre-checks
# -----------------------------------------------------------------------------
[[ "$EUID" -eq 0 ]] || fatal "Ce script doit etre execute en root (sudo)."

if [[ ! -f /etc/os-release ]]; then
  fatal "OS non identifiable (/etc/os-release manquant)."
fi
. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ok "OS detecte : ${PRETTY_NAME}" ;;
  *)
    warn "Cet OS n'est pas testé : ${PRETTY_NAME}"
    read -r -p "Continuer quand meme ? [y/N] " resp
    [[ "$resp" =~ ^[yY] ]] || exit 0
    ;;
esac

# -----------------------------------------------------------------------------
# Variables (env ou prompt)
# -----------------------------------------------------------------------------
SSH_PORT="${SSH_PORT:-22}"
ADMIN_USER="${ADMIN_USER:-humanix}"
SWAP_SIZE_GB="${SWAP_SIZE_GB:-8}"
TIMEZONE="${TIMEZONE:-Europe/Paris}"

cat <<EOF

${C_BOLD}=== Configuration ===${C_RESET}
  ADMIN_USER    : $ADMIN_USER
  SSH_PORT      : $SSH_PORT
  SWAP_SIZE_GB  : $SWAP_SIZE_GB
  TIMEZONE      : $TIMEZONE

EOF
read -r -p "Continuer avec ces valeurs ? [Y/n] " resp
[[ ! "$resp" =~ ^[nN] ]] || { log "Annule."; exit 0; }

# -----------------------------------------------------------------------------
# 1. Update systeme
# -----------------------------------------------------------------------------
log "1/10  Update + upgrade des paquets..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -yqq
apt-get install -yqq \
  ca-certificates curl gnupg lsb-release \
  ufw fail2ban unattended-upgrades \
  git vim htop ncdu rsync \
  python3-pip python3-venv
ok "Paquets a jour."

# -----------------------------------------------------------------------------
# 2. Timezone + locale
# -----------------------------------------------------------------------------
log "2/10  Timezone + locale..."
timedatectl set-timezone "$TIMEZONE"
locale-gen fr_FR.UTF-8 en_US.UTF-8 >/dev/null 2>&1 || true
update-locale LANG=fr_FR.UTF-8
ok "Timezone $TIMEZONE / locale fr_FR.UTF-8."

# -----------------------------------------------------------------------------
# 3. User admin sudo
# -----------------------------------------------------------------------------
log "3/10  Creation user $ADMIN_USER avec sudo..."
if id "$ADMIN_USER" >/dev/null 2>&1; then
  ok "User $ADMIN_USER existe deja."
else
  useradd -m -s /bin/bash -G sudo "$ADMIN_USER"
  ok "User $ADMIN_USER cree."
fi

# Copie la cle SSH de root si presente
if [[ -f /root/.ssh/authorized_keys ]]; then
  mkdir -p "/home/$ADMIN_USER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$ADMIN_USER/.ssh/authorized_keys"
  chown -R "$ADMIN_USER:$ADMIN_USER" "/home/$ADMIN_USER/.ssh"
  chmod 700 "/home/$ADMIN_USER/.ssh"
  chmod 600 "/home/$ADMIN_USER/.ssh/authorized_keys"
  ok "Cle SSH de root copiee vers $ADMIN_USER."
else
  warn "Pas de /root/.ssh/authorized_keys - le user $ADMIN_USER n'a pas de cle SSH."
  warn "TU DOIS ajouter ta cle dans /home/$ADMIN_USER/.ssh/authorized_keys avant de continuer."
fi

# Sudo NOPASSWD pour humanix (optionnel mais pratique pour deploy automatise)
echo "$ADMIN_USER ALL=(ALL) NOPASSWD: ALL" > "/etc/sudoers.d/$ADMIN_USER"
chmod 440 "/etc/sudoers.d/$ADMIN_USER"
ok "Sudo NOPASSWD configure pour $ADMIN_USER."

# -----------------------------------------------------------------------------
# 4. SSH hardening
# -----------------------------------------------------------------------------
log "4/10  Durcissement SSH..."
SSH_CONFIG=/etc/ssh/sshd_config.d/99-humanix-hardening.conf
cat > "$SSH_CONFIG" <<EOF
# Genere par scripts/server-init.sh
Port $SSH_PORT
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
MaxAuthTries 3
LoginGraceTime 30
AllowUsers $ADMIN_USER
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
chmod 644 "$SSH_CONFIG"
sshd -t  # validate config
systemctl restart ssh || systemctl restart sshd
ok "SSH durci : port $SSH_PORT, root login refuse, mdp refuse, AllowUsers=$ADMIN_USER."

# -----------------------------------------------------------------------------
# 5. UFW firewall
# -----------------------------------------------------------------------------
log "5/10  Configuration UFW..."
ufw --force reset >/dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT/tcp" comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ok "UFW : seuls SSH ($SSH_PORT), HTTP (80), HTTPS (443) ouverts."

# -----------------------------------------------------------------------------
# 6. fail2ban
# -----------------------------------------------------------------------------
log "6/10  Configuration fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
maxretry = 3
EOF
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl restart fail2ban
ok "fail2ban actif : 3 echecs SSH = ban 1 heure."

# -----------------------------------------------------------------------------
# 7. Swap file (anti-OOM)
# -----------------------------------------------------------------------------
log "7/10  Swap file ${SWAP_SIZE_GB} Go..."
if [[ -f /swapfile ]]; then
  ok "Swap file existant : $(swapon --show | tail -1)"
else
  fallocate -l "${SWAP_SIZE_GB}G" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Tuning : on prefere garder en RAM autant que possible (swappiness bas)
  sysctl -w vm.swappiness=10 >/dev/null
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
  ok "Swap ${SWAP_SIZE_GB} Go cree, swappiness=10."
fi

# -----------------------------------------------------------------------------
# 8. Docker + Compose plugin
# -----------------------------------------------------------------------------
log "8/10  Installation Docker..."
if command -v docker >/dev/null 2>&1; then
  ok "Docker deja installe : $(docker --version)"
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/${ID}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -yqq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker >/dev/null 2>&1
  ok "Docker installe : $(docker --version)"
fi

# Ajout du user admin au groupe docker
usermod -aG docker "$ADMIN_USER" || true
ok "$ADMIN_USER ajoute au groupe docker (effectif a la prochaine connexion)."

# -----------------------------------------------------------------------------
# 9. Unattended-upgrades (security patches auto)
# -----------------------------------------------------------------------------
log "9/10  Unattended-upgrades..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
  "${distro_id}:${distro_codename}-security";
  "${distro_id}ESMApps:${distro_codename}-apps-security";
  "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades >/dev/null 2>&1
ok "Patches securite auto activés (reboot 04:00 si necessaire)."

# -----------------------------------------------------------------------------
# 10. Recap
# -----------------------------------------------------------------------------
PUBLIC_IP=$(curl -s -m 5 https://api.ipify.org || echo "<inconnu>")
cat <<EOF

${C_GREEN}${C_BOLD}═══════════════════════════════════════════════════════════════${C_RESET}
${C_GREEN}${C_BOLD}  Serveur durci. Pret pour le deploiement Humanix.${C_RESET}
${C_GREEN}${C_BOLD}═══════════════════════════════════════════════════════════════${C_RESET}

  ${C_BOLD}Connexion${C_RESET}
    ssh -p $SSH_PORT $ADMIN_USER@$PUBLIC_IP
    ${C_YELLOW}NB :${C_RESET} root login interdit, password interdit, seul $ADMIN_USER autorise

  ${C_BOLD}Etat${C_RESET}
    SSH       : port $SSH_PORT, AllowUsers=$ADMIN_USER
    Firewall  : UFW actif (22/tcp ou $SSH_PORT, 80/tcp, 443/tcp)
    fail2ban  : 3 echecs SSH = ban 1h
    Swap      : ${SWAP_SIZE_GB} Go (swappiness 10)
    Docker    : installe + $ADMIN_USER dans le groupe docker
    Updates   : auto-patches securite, reboot 04:00 si necessaire
    Timezone  : $TIMEZONE
    Locale    : fr_FR.UTF-8

  ${C_BOLD}Prochaines etapes${C_RESET}
    1. Pointer ton DNS  : academie.tonentreprise.fr -> $PUBLIC_IP
    2. Se reconnecter en  : ssh -p $SSH_PORT $ADMIN_USER@$PUBLIC_IP
    3. Suivre la suite   : docs/deploiement-ovh.md (sur le repo)
       ou en bref :
         git clone https://github.com/Humanix-Cybersecurity/Humanix-Academie.git
         cd humanix-academie
         cp .env.example .env  # editer avec tes secrets
         docker compose up -d
         docker compose exec app npx prisma migrate deploy
         docker compose exec app npx prisma db seed

  ${C_BOLD}Verification securite${C_RESET}
    sudo ufw status verbose
    sudo fail2ban-client status sshd
    sudo systemctl status docker

EOF