#!/usr/bin/env bash
# =============================================================================
# Archon — EC2 Ubuntu 22.04 First-Time Setup Script
# Run once as root (or sudo) on a fresh EC2 instance.
#
# Usage:
#   chmod +x infrastructure/scripts/setup-ec2.sh
#   sudo bash infrastructure/scripts/setup-ec2.sh
# =============================================================================

set -euo pipefail

APP_USER="archon"
APP_DIR="/home/${APP_USER}/app"
FRONTEND_DIR="/var/www/archon/frontend"
LOG_DIR="${APP_DIR}/logs"
CERTBOT_WEBROOT="/var/www/certbot"
NODE_VERSION="20"  # LTS

echo "================================================================="
echo "  Archon EC2 Setup — Ubuntu 22.04"
echo "================================================================="

# ── System packages ────────────────────────────────────────────────────────────
echo "[1/9] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git build-essential \
  nginx \
  certbot python3-certbot-nginx \
  ufw \
  htop \
  unzip \
  jq

# ── Node.js (via NodeSource) ───────────────────────────────────────────────────
echo "[2/9] Installing Node.js ${NODE_VERSION} LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node --version)  npm: $(npm --version)"

# ── PM2 (global) ──────────────────────────────────────────────────────────────
echo "[3/9] Installing PM2..."
npm install -g pm2@latest
pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" || true
echo "  PM2: $(pm2 --version)"

# ── App user ──────────────────────────────────────────────────────────────────
echo "[4/9] Creating app user: ${APP_USER}..."
if ! id "${APP_USER}" &>/dev/null; then
  useradd -m -s /bin/bash "${APP_USER}"
fi

# ── Directory structure ────────────────────────────────────────────────────────
echo "[5/9] Creating directory structure..."
mkdir -p "${APP_DIR}" "${FRONTEND_DIR}" "${LOG_DIR}" "${CERTBOT_WEBROOT}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chown -R www-data:www-data "${FRONTEND_DIR}"
chmod 755 "${FRONTEND_DIR}"

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo "[6/9] Configuring Nginx..."
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Install http config (pre-SSL)
cp /dev/stdin /etc/nginx/sites-available/archon << 'NGINX_EOF'
# Placeholder — deploy.sh will copy the real config
server {
    listen 80 default_server;
    location /health { return 200 '{"status":"setup"}'; add_header Content-Type application/json; }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/archon /etc/nginx/sites-enabled/archon
nginx -t
systemctl enable nginx
systemctl start nginx
echo "  Nginx: active"

# ── UFW Firewall ──────────────────────────────────────────────────────────────
echo "[7/9] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  UFW: enabled (SSH, 80, 443)"

# ── Swap (helpful for t2.micro) ───────────────────────────────────────────────
echo "[8/9] Configuring swap (1GB)..."
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  Swap: 1GB enabled"
else
  echo "  Swap: already configured"
fi

# ── SSH hardening (optional) ──────────────────────────────────────────────────
echo "[9/9] Hardening SSH..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config || true
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config || true
systemctl reload sshd || true

echo ""
echo "================================================================="
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Clone your repo to ${APP_DIR}:"
echo "       sudo -u ${APP_USER} git clone https://github.com/Ragulvl/Archon.git ${APP_DIR}"
echo ""
echo "  2. Create backend env file:"
echo "       sudo -u ${APP_USER} cp ${APP_DIR}/backend/.env.example ${APP_DIR}/backend/.env"
echo "       sudo -u ${APP_USER} nano ${APP_DIR}/backend/.env"
echo ""
echo "  3. Run the deploy script:"
echo "       sudo -u ${APP_USER} bash ${APP_DIR}/infrastructure/scripts/deploy.sh"
echo ""
echo "  4. Configure SSL (after DNS points to this server):"
echo "       sudo certbot --nginx -d archon.dinez.in"
echo ""
echo "  5. Copy the HTTPS nginx config:"
echo "       sudo cp ${APP_DIR}/infrastructure/nginx/archon.conf /etc/nginx/sites-available/archon"
echo "       sudo nginx -t && sudo systemctl reload nginx"
echo "================================================================="
