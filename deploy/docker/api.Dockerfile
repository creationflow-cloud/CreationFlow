FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/editor/package.json ./apps/editor/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/renderer/package.json ./apps/renderer/package.json
RUN pnpm fetch --frozen-lockfile
RUN pnpm install --frozen-lockfile --filter @creationflow/api... --filter @creationflow/database... --filter @creationflow/pdf-engine... --filter @creationflow/schema... --filter @creationflow/storage...

FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.base.json ./
RUN pnpm --filter @creationflow/database exec prisma generate
RUN pnpm --filter @creationflow/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "cd apps/api && node dist/index.js"]
