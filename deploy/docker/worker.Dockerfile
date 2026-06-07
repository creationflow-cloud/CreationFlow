FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/worker/package.json ./apps/worker/package.json
RUN pnpm fetch --frozen-lockfile
RUN pnpm install --frozen-lockfile --filter @creationflow/worker...

FROM deps AS build
COPY packages ./packages
COPY apps/worker ./apps/worker
COPY tsconfig.base.json ./
RUN pnpm --filter @creationflow/worker build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/node_modules ./apps/worker/node_modules
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "cd apps/worker && node dist/index.js"]
