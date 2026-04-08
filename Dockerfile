FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
FROM deps AS build
ARG VITE_SUPABASE_AUTH_URL
ENV VITE_SUPABASE_AUTH_URL=$VITE_SUPABASE_AUTH_URL
COPY . .
RUN pnpm run build && pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3030
ENV HOST=0.0.0.0

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3030
CMD ["node", ".output/server/index.mjs"]
