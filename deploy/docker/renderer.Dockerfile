FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/renderer/package.json ./apps/renderer/package.json
RUN pnpm fetch --frozen-lockfile
RUN pnpm install --frozen-lockfile --filter @creationflow/renderer...

FROM deps AS build
COPY packages ./packages
COPY apps/renderer ./apps/renderer
COPY tsconfig.base.json ./
RUN pnpm --filter @creationflow/renderer build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build /app/apps/renderer/dist ./apps/renderer/dist
COPY --from=build /app/apps/renderer/package.json ./apps/renderer/package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/renderer/node_modules ./apps/renderer/node_modules
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "cd apps/renderer && node dist/index.js"]
