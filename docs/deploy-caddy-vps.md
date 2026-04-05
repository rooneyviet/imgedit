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

`deploy-vps.yml` writes `/opt/imgedit/.env.production` on each deploy from these secrets automatically.

## 4. Configure Caddy

```bash
sudo cp /opt/imgedit/deploy/Caddyfile.example /etc/caddy/Caddyfile
```

Edit `/etc/caddy/Caddyfile` and replace `your-domain.com` with your real domain.

Then apply:

```bash
sudo systemctl reload caddy
sudo systemctl enable caddy
sudo systemctl restart caddy
```

## 5. First manual deploy

```bash
cd /opt/imgedit
chmod +x deploy/deploy.sh
APP_DIR=/opt/imgedit BRANCH=master ./deploy/deploy.sh
```

## 6. GitHub Actions secrets

Set these repository secrets:

- `VPS_HOST`: VPS IP or hostname
- `VPS_USER`: SSH user
- `VPS_SSH_KEY`: private key for that user
- `VPS_PORT`: usually `22`

## 7. CI/CD behavior in this repo

- `.github/workflows/ci.yml`
  - Runs on pull requests and pushes.
  - Runs lint + typecheck + test + build using `docker compose run`.
- `.github/workflows/deploy-vps.yml`
  - Runs on push to `master`.
  - Runs build gate, then SSH deploy to VPS.
  - On server, executes `deploy/deploy.sh`:
    - `git pull --ff-only`
    - `docker compose -f docker-compose.prod.yml up -d --build`

## 8. Trigger.dev production note

This app calls Trigger tasks from server functions. Make sure your Trigger jobs are deployed to production too:

```bash
docker compose run --rm app sh -lc "corepack enable && pnpm run deploy:trigger"
```

Do this after updating Trigger task code.
