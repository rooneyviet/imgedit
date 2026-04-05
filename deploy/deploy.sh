#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/imgedit}"
BRANCH="${BRANCH:-master}"

cd "$APP_DIR"

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  git -c http.extraheader="Authorization: Bearer ${GITHUB_TOKEN}" fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git -c http.extraheader="Authorization: Bearer ${GITHUB_TOKEN}" pull --ff-only origin "$BRANCH"
else
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker image prune -f
