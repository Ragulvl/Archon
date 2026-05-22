#!/usr/bin/env bash
# =============================================================================
# Archon — Production Deploy Script
# Run from the repo root directory on the EC2 instance.
#
# Usage:
#   bash infrastructure/scripts/deploy.sh
#
# Environment:
#   APP_DIR   — path to repo root (default: current directory)
#   DOMAIN    — your domain (used for post-deploy smoke test)
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
FRONTEND_DEST="/var/www/archon/frontend"
LOG_DIR="${APP_DIR}/logs"
DOMAIN="${DOMAIN:-localhost}"
BACKEND_PORT="${BACKEND_PORT:-5000}"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo "================================================================="
echo "  Archon Deploy — $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "  App dir: ${APP_DIR}"
echo "================================================================="

cd "${APP_DIR}"

# ── Verify env file exists ────────────────────────────────────────────────────
log "[1/9] Checking environment files..."
if [[ ! -f "backend/.env" ]]; then
  err "backend/.env not found! Copy backend/.env.example and fill in values."
fi
log "  ✓ backend/.env found"

# ── Ensure logs directory ─────────────────────────────────────────────────────
log "[2/9] Ensuring logs directory..."
mkdir -p "${LOG_DIR}"
log "  ✓ ${LOG_DIR}"

# ── Pull latest code ──────────────────────────────────────────────────────────
log "[3/9] Pulling latest code from git..."
git fetch origin main
CURRENT=$(git rev-parse HEAD)
git pull origin main
NEW=$(git rev-parse HEAD)
if [[ "${CURRENT}" == "${NEW}" ]]; then
  warn "  No new commits. Continuing anyway..."
else
  log "  ✓ Updated: ${CURRENT:0:8} → ${NEW:0:8}"
fi

# ── Install dependencies ──────────────────────────────────────────────────────
log "[4/9] Installing dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install
npm ci --prefix backend --prefer-offline 2>/dev/null || npm install --prefix backend
npm ci --prefix frontend --prefer-offline 2>/dev/null || npm install --prefix frontend
log "  ✓ All dependencies installed"

# ── Prisma generate ───────────────────────────────────────────────────────────
log "[5/9] Generating Prisma client..."
cd backend
npx prisma generate
cd "${APP_DIR}"
log "  ✓ Prisma client generated"

# ── Build backend ─────────────────────────────────────────────────────────────
log "[6/9] Building backend (TypeScript → JavaScript)..."
npm run build --prefix backend
log "  ✓ Backend built → backend/dist/"

# ── Build frontend ─────────────────────────────────────────────────────────────
log "[7/9] Building frontend (Vite)..."
# Vite bakes VITE_* env vars at build time.
# If frontend/.env exists, it will be picked up automatically.
if [[ -f "frontend/.env" ]]; then
  log "  ✓ frontend/.env found — env vars will be baked in"
else
  warn "  No frontend/.env — VITE_API_URL will default to /api/v1 (same-origin, OK behind Nginx)"
fi
npm run build --prefix frontend
log "  ✓ Frontend built → frontend/dist/"

# ── Copy frontend to nginx root ───────────────────────────────────────────────
log "[8/9] Deploying frontend to ${FRONTEND_DEST}..."
if [[ -d "frontend/dist" ]]; then
  rm -rf "${FRONTEND_DEST:?}"/*
  cp -r frontend/dist/. "${FRONTEND_DEST}/"
  # Set correct permissions for nginx
  find "${FRONTEND_DEST}" -type f -exec chmod 644 {} \;
  find "${FRONTEND_DEST}" -type d -exec chmod 755 {} \;
  log "  ✓ Frontend deployed to ${FRONTEND_DEST}"
else
  err "frontend/dist not found — Vite build may have failed"
fi

# ── Run DB migrations ─────────────────────────────────────────────────────────
log "[9/10] Running Prisma migrations..."
cd backend
npx prisma migrate deploy
cd "${APP_DIR}"
log "  ✓ Migrations applied"

# ── Restart PM2 ───────────────────────────────────────────────────────────────
log "[10/10] Restarting application via PM2..."
if pm2 list | grep -q "archon-backend"; then
  pm2 reload ecosystem.config.cjs --env production --update-env
  log "  ✓ PM2 reloaded (zero-downtime)"
else
  pm2 start ecosystem.config.cjs --env production
  log "  ✓ PM2 started"
fi

# Save PM2 process list so it survives reboots
pm2 save
log "  ✓ PM2 process list saved"

# ── Reload Nginx ──────────────────────────────────────────────────────────────
if command -v nginx &>/dev/null; then
  if nginx -t 2>/dev/null; then
    sudo systemctl reload nginx 2>/dev/null || true
    log "  ✓ Nginx reloaded"
  else
    warn "  Nginx config test failed — skipping reload"
  fi
fi

# ── Smoke test ────────────────────────────────────────────────────────────────
echo ""
log "Running smoke tests..."
sleep 3  # Give PM2 a moment to stabilise

HEALTH_URL="http://127.0.0.1:${BACKEND_PORT}/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" || echo "000")

if [[ "${HTTP_CODE}" == "200" ]]; then
  BODY=$(curl -s "${HEALTH_URL}")
  log "  ✓ /health → HTTP ${HTTP_CODE}"
  log "    ${BODY}"
else
  err "  ✗ /health returned HTTP ${HTTP_CODE}. Check: pm2 logs archon-backend"
fi

DB_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${BACKEND_PORT}/health/db" || echo "000")
if [[ "${DB_CODE}" == "200" ]]; then
  log "  ✓ /health/db → HTTP ${DB_CODE}"
else
  warn "  ✗ /health/db returned HTTP ${DB_CODE} — check DATABASE_URL in backend/.env"
fi

echo ""
echo "================================================================="
echo -e "  ${GREEN}Deploy complete!${NC}"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "  PM2:    $(pm2 list | grep archon-backend | awk '{print $18}' || echo 'see pm2 status')"
if [[ "${DOMAIN}" != "localhost" ]]; then
  echo "  URL:    https://${DOMAIN}"
fi
echo "  Logs:   pm2 logs archon-backend"
echo "================================================================="
