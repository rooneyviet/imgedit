# TanStack Start + shadcn/ui

This is a template for a new TanStack Start project with React, TypeScript, and shadcn/ui.

## Trigger.dev + Replicate setup

1. Copy `.env.example` to `.env` and fill in:
   - `TRIGGER_SECRET_KEY`
   - `TRIGGER_PROJECT_REF`
   - `REPLICATE_API_TOKEN`
   - `R2_ACCOUNT_ID`
   - `R2_BUCKET`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_PUBLIC_BASE_URL`
2. Start the app:
   - `docker compose up`
3. In a second shell, run Trigger.dev dev worker:
   - `docker compose run --rm app sh -lc "corepack enable && pnpm run dev:trigger"`

## Deployment (Debian VPS + Caddy + GitHub Actions)

See step-by-step guide:

- `docs/deploy-caddy-vps.md`

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```
