# Docker Development Setup

Docker Compose setup for local CreationFlow development, plus production-style
Dockerfiles and a reverse-proxy profile for self-hosted deployments.

This is the development foundation and a deployable target. The CI builds all
five service images (`.github/workflows/ci.yml`).

## Start

```bash
cd deploy/docker
cp .env.example .env
docker compose --env-file .env up
```

## Validate Configuration

```bash
docker compose --env-file .env config
```

From the repository root, you can also run:

```bash
docker compose --env-file deploy/docker/.env.example -f deploy/docker/docker-compose.yml config
```

## Services

- `postgres`: Local PostgreSQL database on port `5432`.
- `redis`: Local Redis instance on port `6379`.
- `api`: Fastify API image on port `3000`, configured with `REDIS_URL=redis://redis:6379`.
- `editor`: Editor image served by Nginx on port `3001` (`editor.Dockerfile`, `editor.nginx.conf`).
- `admin`: Admin image served by Nginx on port `3002` (`admin.Dockerfile`, `admin.nginx.conf`).
- `renderer`: Standalone renderer service image (`renderer.Dockerfile`).
- `worker`: Background worker image (`worker.Dockerfile`), configured with `REDIS_URL=redis://redis:6379` and `API_URL=http://api:3000`.

## Reverse Proxy

`docker-compose.proxy.yml` adds a Traefik-based reverse proxy profile with
automatic HTTP→HTTPS redirection. See `PROXY.md` for the routing rules.

## Notes

- App services are built from the per-service Dockerfiles (not placeholders).
- No real secrets are included — use `.env` and provide your own values.
- No license server logic is included.
- No cloud services are required.
- Postgres data is stored in the `creationflow-postgres-data` Docker volume.
- `.env.example` includes a local `DATABASE_URL` placeholder for Prisma-based development.
- See `LOGGING.md` for log routing through the proxy.
