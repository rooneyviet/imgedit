# AGENTS

## Execution Rules

1. Always run project commands through `docker compose`.
2. Do not run `pnpm` directly on the host.
3. Prefer `docker compose run ...` or `docker compose exec ...` for install, dev, build, test, and lint tasks.

## UI Component Rules

1. Use Shadcn UI components as much as possible for UI work.
2. Use the Shadcn MCP tools/workflow when adding components.
3. Do not manually create Shadcn components by hand.
4. If a component is needed, add it via Shadcn tooling and then customize usage in app code.
