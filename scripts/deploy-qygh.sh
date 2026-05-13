#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/qygh.vickyching.com}"
BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-qygh-next}"
BACKUP_ROOT="${BACKUP_ROOT:-/www/backup}"
REPO_URL="${REPO_URL:-https://github.com/vickychinghk/qygh.git}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_ROOT}/qygh-${timestamp}"

mkdir -p "${backup_dir}"
cd "${APP_DIR}"

cp -a .env "${backup_dir}/.env" 2>/dev/null || true
cp -a prisma/dev.db "${backup_dir}/dev.db" 2>/dev/null || true
cp -a public/uploads "${backup_dir}/uploads" 2>/dev/null || true

if [ ! -d .git ]; then
  git init
  git remote add origin "${REPO_URL}"
elif ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "${REPO_URL}"
else
  git remote set-url origin "${REPO_URL}"
fi

git fetch origin "${BRANCH}"
git checkout -B "${BRANCH}" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"

npm ci
npm run db:push
npm run build
systemctl restart "${SERVICE}"
systemctl is-active "${SERVICE}"

echo "Deployed ${BRANCH} to ${APP_DIR}"
echo "Backup: ${backup_dir}"
