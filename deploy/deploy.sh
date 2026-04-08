#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/imgedit}"
BRANCH="${BRANCH:-master}"
REPO_URL="${REPO_URL:-}"

cd "$APP_DIR"

if [[ -n "$REPO_URL" ]]; then
  git fetch "$REPO_URL" "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only "$REPO_URL" "$BRANCH"
elif [[ -n "${GITHUB_TOKEN:-}" ]]; then
  git -c http.extraheader="Authorization: Bearer ${GITHUB_TOKEN}" fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git -c http.extraheader="Authorization: Bearer ${GITHUB_TOKEN}" pull --ff-only origin "$BRANCH"
else
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker compose -f docker-compose.prod.yml run --rm app sh -lc "corepack enable && pnpm exec prisma migrate deploy"
docker image prune -f
