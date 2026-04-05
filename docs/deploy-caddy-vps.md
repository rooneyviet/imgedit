# Deploy to Debian VPS with Caddy + GitHub Actions CI/CD

This project now includes:

- Workflow: `.github/workflows/deploy-caddy.yml`
- Deploy strategy: build `dist/` in CI, upload to VPS, switch `current` symlink

## 1) Debian VPS one-time setup

### 1.1 Create deploy user

Use an existing non-root user or create one:

```bash
sudo adduser deploy
```

### 1.2 Set up SSH key auth for deploy user

On your local machine:

```bash
ssh-keygen -t ed25519 -C "imgedit-deploy"
ssh-copy-id deploy@YOUR_VPS_IP
```

### 1.3 Create web directory owned by deploy user

```bash
sudo mkdir -p /var/www/imgedit/releases
sudo chown -R deploy:deploy /var/www/imgedit
```

### 1.4 Configure Caddy

Edit Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Example site block:

```caddy
imgedit.yourdomain.com {
    root * /var/www/imgedit/current
    encode gzip zstd
    file_server
    try_files {path} /index.html
}
```

Validate and reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Point your DNS `A` record (`imgedit.yourdomain.com`) to your VPS IP.

## 2) GitHub CLI setup (connect repo to deployment)

Run these commands from your repo root.

### 2.1 Authenticate GitHub CLI

```bash
gh auth login
```

### 2.2 Add required Actions secrets

```bash
gh secret set VPS_HOST --body "YOUR_VPS_IP_OR_HOSTNAME"
gh secret set VPS_USER --body "deploy"
gh secret set VPS_SSH_KEY < ~/.ssh/id_ed25519
```

Notes:

- `VPS_SSH_KEY` must be the private key matching the public key installed for `VPS_USER`.
- If your key file is not `~/.ssh/id_ed25519`, change the path.

### 2.3 Push to `main` to trigger deploy

```bash
git add .github/workflows/deploy-caddy.yml docs/deploy-caddy-vps.md
git commit -m "Add Caddy VPS CI/CD deployment workflow"
git push origin main
```

### 2.4 Watch workflow runs with GH CLI

```bash
gh run list --workflow "Deploy Static Site To Debian VPS (Caddy)"
gh run watch
```

## 3) How this deploy pipeline works

1. On push to `main`, GitHub Actions starts.
2. It builds production assets using project policy command style:
   - `docker compose run --rm app ... pnpm build`
3. It creates a release directory on VPS:
   - `/var/www/imgedit/releases/<sha-run>`
4. It uploads local `dist/` to that release via `rsync`.
5. It atomically updates symlink:
   - `/var/www/imgedit/current -> /var/www/imgedit/releases/<new-release>`
6. It prunes old releases and keeps the latest 5.

No container is used on VPS for serving static files. Caddy serves files directly.

## 4) Rollback (manual)

If needed:

```bash
ssh deploy@YOUR_VPS_IP
ls -1dt /var/www/imgedit/releases/*
ln -sfn /var/www/imgedit/releases/PAST_RELEASE /var/www/imgedit/current
```

## 5) Troubleshooting

- If workflow cannot SSH: check `VPS_USER`, `VPS_HOST`, key pair, and `~/.ssh/authorized_keys` on VPS.
- If app loads blank on deep routes: confirm Caddy has `try_files {path} /index.html`.
- If deploy uploads but site does not update: verify Caddy root is exactly `/var/www/imgedit/current`.
