#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/srv/stacks/jobby"
LOCK_DIR="/tmp/jobby-deploy.lock"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Deploy already running. Exiting."
  exit 0
fi
trap 'rmdir "$LOCK_DIR"' EXIT

cd "$REPO_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Jobby deploy..."
/usr/bin/git pull --ff-only
/usr/bin/docker compose -f infra/docker-compose.yml --env-file .env up -d --build
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Jobby deploy complete."
