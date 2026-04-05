# Deploy to Debian VPS with Caddy + GitHub Actions (TanStack Start / Nitro)

This app is a TanStack Start server app (Nitro), not a static-only site.
Deployment uses:

- GitHub Actions to build `.output` with `docker compose`
- SSH deploy to VPS release folders
- `systemd` service to run `node .output/server/index.mjs`
- Caddy as reverse proxy to `127.0.0.1:3000`

## 1) One-time VPS setup

### 1.1 Choose deploy user

Use your existing user (example: `debian`) or create one.

### 1.2 Install Node.js runtime (required on VPS)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

### 1.3 Create deploy directories

Run as deploy user:

```bash
mkdir -p ~/imgedit/releases ~/imgedit/shared
chmod 755 ~ ~/imgedit ~/imgedit/releases ~/imgedit/shared
```

### 1.4 Create systemd service

Create `/etc/systemd/system/imgedit.service`:

```ini
[Unit]
Description=IMG Edit TanStack Start server
After=network.target

[Service]
Type=simple
User=YOUR_VPS_USER
WorkingDirectory=/home/YOUR_VPS_USER/imgedit/current
EnvironmentFile=/home/YOUR_VPS_USER/imgedit/shared/.env
Environment=HOST=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/bin/node /home/YOUR_VPS_USER/imgedit/current/.output/server/index.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable imgedit
sudo systemctl start imgedit
sudo systemctl status imgedit --no-pager
```

### 1.5 Allow deploy user to restart only this service from CI

```bash
echo "YOUR_VPS_USER ALL=(root) NOPASSWD:/usr/bin/systemctl restart imgedit,/usr/bin/systemctl is-active imgedit" | sudo tee /etc/sudoers.d/imgedit-deploy
sudo chmod 440 /etc/sudoers.d/imgedit-deploy
sudo visudo -cf /etc/sudoers.d/imgedit-deploy
```

### 1.6 Configure Caddy as reverse proxy

Edit `/etc/caddy/Caddyfile`:

```caddy
imgedit.yourdomain.com {
    encode gzip zstd
    reverse_proxy 127.0.0.1:3000
}
```

Apply config:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 2) GitHub repository secrets (via gh CLI)

### 2.1 Login

```bash
gh auth login
```

### 2.2 Set VPS access secrets

```bash
gh secret set VPS_HOST --body "YOUR_VPS_IP_OR_HOSTNAME"
gh secret set VPS_USER --body "YOUR_VPS_USER"
gh secret set VPS_SSH_KEY < ~/.ssh/YOUR_KEY_FILE
```

Tip to discover your key file:

```bash
ssh -vv YOUR_VPS_USER@YOUR_VPS_IP
```

Use the key shown in `Server accepts key: ...`.

### 2.3 Set runtime env secrets used by server functions

```bash
gh secret set TRIGGER_SECRET_KEY
gh secret set TRIGGER_PROJECT_REF
gh secret set REPLICATE_API_TOKEN
gh secret set R2_ACCOUNT_ID
gh secret set R2_BUCKET
gh secret set R2_ACCESS_KEY_ID
gh secret set R2_SECRET_ACCESS_KEY
gh secret set R2_PUBLIC_BASE_URL
```

`gh` will prompt for each value.

## 3) CI/CD flow (automatic)

On each push to `master`, workflow `.github/workflows/deploy-caddy.yml`:

1. Builds app with `docker compose run --rm app ... pnpm build`.
2. Verifies `.output/server/index.mjs` exists.
3. Uploads `.output` to `/home/<user>/imgedit/releases/<release-id>`.
4. Writes runtime env file to `/home/<user>/imgedit/shared/.env`.
5. Switches `current` symlink to new release.
6. Restarts `imgedit` service.
7. Keeps latest 5 releases.

No manual deploy commands are needed after setup.

## 4) First deploy

```bash
git add .github/workflows/deploy-caddy.yml docs/deploy-caddy-vps.md README.md
git commit -m "Deploy Nitro server to VPS via systemd and Caddy"
git push origin master
```

Watch run:

```bash
gh run list --workflow "Deploy TanStack Start To Debian VPS (Caddy + Node)"
gh run watch
```

## 5) Rollback

```bash
ssh YOUR_VPS_USER@YOUR_VPS_IP
ls -1dt /home/YOUR_VPS_USER/imgedit/releases/*
ln -sfn /home/YOUR_VPS_USER/imgedit/releases/PAST_RELEASE /home/YOUR_VPS_USER/imgedit/current
sudo systemctl restart imgedit
```

## 6) Troubleshooting

- `Permission denied` on restart: sudoers rule in step 1.5 is missing or wrong.
- `502` from Caddy: check `sudo systemctl status imgedit` and `journalctl -u imgedit -n 200 --no-pager`.
- Startup env errors: confirm all GitHub secrets are set and workflow step `Write runtime environment file on VPS` succeeded.
