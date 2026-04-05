# Deploy to Debian VPS with Caddy + GitHub Actions CI/CD

This project now includes:

- Workflow: `.github/workflows/deploy-caddy.yml`
- Deploy strategy: build `dist/` in CI, upload to VPS, switch `current` symlink
- Deploy path on VPS: `/home/YOUR_VPS_USER/imgedit`

Important:

- You do NOT run `docker compose` on your VPS for this setup.
- `docker compose` runs in GitHub Actions only, to build `dist/`.
- Deploy to VPS is automatic on each push to `master`.

## 1) Debian VPS one-time setup

### 1.1 Choose SSH user

Use an existing non-root user (for example `debian`) or create one:

```bash
sudo adduser deploy
```

### 1.2 Set up SSH key auth for selected user

On your local machine:

```bash
ssh-keygen -t ed25519 -C "imgedit-deploy"
ssh-copy-id YOUR_VPS_USER@YOUR_VPS_IP
```

### 1.3 Create deploy directory (no sudo required)

```bash
mkdir -p ~/imgedit/releases
chmod 755 ~ ~/imgedit ~/imgedit/releases
```

### 1.4 Configure Caddy

Edit Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Example site block:

```caddy
imgedit.yourdomain.com {
    root * /home/YOUR_VPS_USER/imgedit/current
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

### 2.2 Find the exact SSH key you already use (recommended)

If you can already SSH into VPS without password, detect the exact key path first:

```bash
ssh -vv YOUR_VPS_USER@YOUR_VPS_IP
```

Look for:

- `Offering public key: /Users/.../.ssh/<keyname>`
- `Server accepts key: /Users/.../.ssh/<keyname>`

Use that exact private key file for `VPS_SSH_KEY`.

Real example:

- user: `debian`
- host: `YOUR_VPS_IP_OR_HOSTNAME`
- key: `~/.ssh/id_rsa`

### 2.3 Add required Actions secrets

```bash
gh secret set VPS_HOST --body "YOUR_VPS_IP_OR_HOSTNAME"
gh secret set VPS_USER --body "YOUR_VPS_USER"
gh secret set VPS_SSH_KEY < ~/.ssh/YOUR_KEY_FILE
```

Notes:

- `VPS_SSH_KEY` must be the private key matching the public key installed for `VPS_USER`.
- Example for your current VPS login:
  - `gh secret set VPS_HOST --body "YOUR_VPS_IP_OR_HOSTNAME"`
  - `gh secret set VPS_USER --body "debian"`
  - `gh secret set VPS_SSH_KEY < ~/.ssh/id_rsa`

### 2.4 Push to `master` to trigger deploy

```bash
git add .github/workflows/deploy-caddy.yml docs/deploy-caddy-vps.md
git commit -m "Add Caddy VPS CI/CD deployment workflow"
git push origin master
```

### 2.5 Watch workflow runs with GH CLI

```bash
gh run list --workflow "Deploy Static Site To Debian VPS (Caddy)"
gh run watch
```

## 3) How this deploy pipeline works

1. On push to `master`, GitHub Actions starts.
2. It builds production assets using project policy command style:
   - `docker compose run --rm app ... pnpm build`
3. It creates a release directory on VPS:
   - `/home/YOUR_VPS_USER/imgedit/releases/<sha-run>`
4. It uploads local `dist/` to that release via `rsync`.
5. It atomically updates symlink:
   - `/home/YOUR_VPS_USER/imgedit/current -> /home/YOUR_VPS_USER/imgedit/releases/<new-release>`
6. It prunes old releases and keeps the latest 5.

No container is used on VPS for serving static files. Caddy serves files directly.

## 4) Rollback (manual)

If needed:

```bash
ssh YOUR_VPS_USER@YOUR_VPS_IP
ls -1dt /home/YOUR_VPS_USER/imgedit/releases/*
ln -sfn /home/YOUR_VPS_USER/imgedit/releases/PAST_RELEASE /home/YOUR_VPS_USER/imgedit/current
```

## 5) Troubleshooting

- If workflow cannot SSH: check `VPS_USER`, `VPS_HOST`, key pair, and `~/.ssh/authorized_keys` on VPS.
- If app loads blank on deep routes: confirm Caddy has `try_files {path} /index.html`.
- If deploy uploads but site does not update: verify Caddy root is exactly `/home/YOUR_VPS_USER/imgedit/current`.
