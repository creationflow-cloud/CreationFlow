# Docker Development Setup

Initial Docker Compose setup for local CreationFlow development.

This is not production-ready. It is a development foundation for local infrastructure and future self-hosted deployments.

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
- `api`: Placeholder API service on port `3000`.
- `editor`: Placeholder editor service on port `3001`.
- `admin`: Placeholder admin service on port `3002`.
- `renderer`: Placeholder renderer service.
- `worker`: Placeholder worker service.

## Notes

- App services are placeholders and do not use production images yet.
- No real secrets are included.
- No license server logic is included.
- No cloud services are required.
- Postgres data is stored in the `creationflow-postgres-data` Docker volume.
