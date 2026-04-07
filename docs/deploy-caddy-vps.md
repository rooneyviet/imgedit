# Deploy to Debian VPS with CI/CD (TanStack Start SSR)

This app is a TanStack Start SSR app using Nitro output (`.output/server/index.mjs`).

## 1. One-time VPS setup (Debian 12)

```bash
sudo apt update
sudo apt install -y ca-certificates curl git gnupg

curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin caddy
sudo usermod -aG docker $USER
```

Log out / log in again so Docker group takes effect.

## 2. Prepare app directory

```bash
sudo mkdir -p /opt/imgedit
sudo chown -R "$USER":"$USER" /opt/imgedit
git clone <YOUR_REPO_SSH_OR_HTTPS_URL> /opt/imgedit
cd /opt/imgedit
```

## 3. Store runtime env in GitHub Secrets

Set these repository secrets (never commit real values):

- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`
- `REPLICATE_API_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `DIRECT_URL` (optional)
- `SUPABASE_JWT_SECRET`
- `SUPABASE_AUTH_EXTERNAL_URL`
- `SUPABASE_AUTH_INTERNAL_URL` (optional)
- `VITE_SUPABASE_AUTH_URL`

`ci.yml` writes `$HOME/imgedit/.env.production` on each deploy from these secrets automatically.

## 4. Configure Caddy

```bash
sudo cp "$HOME/imgedit/deploy/Caddyfile.example" /etc/caddy/Caddyfile
```

Edit `/etc/caddy/Caddyfile` and replace `your-domain.com` with your real domain.

Then apply:

```bash
sudo systemctl reload caddy
sudo systemctl enable caddy
sudo systemctl restart caddy
```

## 5. GitHub Actions secrets

Set these repository secrets:

- `VPS_HOST`: VPS IP or hostname
- `VPS_USER`: SSH user
- `VPS_SSH_KEY`: private key for that user
- `VPS_PORT`: usually `22`

## 6. CI/CD behavior in this repo

- `.github/workflows/ci.yml`
  - Runs on pull requests and pushes.
  - Runs typecheck + build using `docker compose run`.
  - On push to `master`, deploy job runs after checks:
    - bootstraps `$HOME/imgedit` on first deploy
    - writes `$HOME/imgedit/.env.production` from GitHub Secrets
    - runs `deploy/deploy.sh`
      - `git pull --ff-only`
      - `docker compose -f docker-compose.prod.yml up -d --build`

## 7. Port used in production

- App container listens on `3030`.
- Host binding is `127.0.0.1:3030:3030` (not public).
- Caddy proxies to `127.0.0.1:3030`.

## 8. Trigger.dev production note

This app calls Trigger tasks from server functions. Make sure your Trigger jobs are deployed to production too:

```bash
docker compose run --rm app sh -lc "corepack enable && pnpm run deploy:trigger"
```

Do this after updating Trigger task code.
