FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/admin/package.json ./apps/admin/package.json
RUN pnpm fetch --frozen-lockfile
RUN pnpm install --frozen-lockfile --filter @creationflow/admin...

FROM deps AS build
COPY packages ./packages
COPY apps/admin ./apps/admin
COPY tsconfig.base.json ./
RUN pnpm --filter @creationflow/admin build

FROM nginx:1.27-alpine AS runtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY deploy/docker/admin.nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3002
HEALTHCHECK CMD wget --quiet --tries=1 --spider http://localhost:3002/ || exit 1
