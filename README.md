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

## Deployment (Debian VPS + Caddy + GitHub Actions, Nitro server)

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

## Paddle sandbox billing

1. Set these env vars:
   - `VITE_PADDLE_CLIENT_TOKEN`
   - `VITE_PADDLE_PRICE_ID_MONTHLY`
   - `VITE_PADDLE_PRICE_ID_ANNUAL`
   - `PADDLE_WEBHOOK_SECRET`
   - `PADDLE_CUSTOM_DATA_SIGNING_SECRET` (recommended)
2. Configure your Paddle notification destination (or Hookdeck source target) to forward to:
   - `POST /api/paddle/webhook`
   - Include at least these events: `transaction.completed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`
3. Start the app:
   - `docker compose up`
4. Open `/pricing`, choose Monthly or Annual, then use Paddle sandbox card:
   - Number: `4242 4242 4242 4242`
   - CVC: `100`
   - Expiry: any future date
