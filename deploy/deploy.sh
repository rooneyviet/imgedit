#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/imgedit}"
BRANCH="${BRANCH:-master}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker image prune -f
