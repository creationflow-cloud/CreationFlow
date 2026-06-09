# Production database migration strategy

This document explains how to apply Prisma migrations to a production
CreationFlow deployment safely. It assumes the recommended Docker
Compose setup in `deploy/docker/`, but the same workflow works for
Kubernetes or bare-metal deployments.

## Goals

1. **Zero unplanned downtime** during schema upgrades.
2. **Reversible changes** with a known-good rollback point.
3. **Auditable** trail of what migrations ran and when.
4. **Predictable** behaviour even when migrations touch existing data.

## Pre-flight checklist

Before any migration:

- [ ] Confirm the migration has been reviewed in a PR with at least
      one database-affecting approval.
- [ ] Tag the release commit (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`).
- [ ] Take a Postgres backup:
      ```bash
      docker exec creationflow-postgres \
        pg_dump -U creationflow -d creationflow \
        -Fc -f /backups/pre-$(date +%Y%m%d-%H%M%S).dump
      docker cp creationflow-postgres:/backups/ \
        ./deploy/backups/
      ```
- [ ] Verify the backup file with `pg_restore --list` and confirm it
      is non-empty.
- [ ] Notify stakeholders of the maintenance window and expected
      duration.

## Migrations

The `api` container runs `prisma migrate deploy` automatically on
start-up, but in production we want explicit control. Two strategies
are supported:

### Strategy A: Maintenance window (default for breaking changes)

1. Stop the API and worker containers (renderer and the UIs can keep
   serving static assets while the API is down):

   ```bash
   docker compose -f deploy/docker/docker-compose.yml \
       stop api worker
   ```

2. Apply the migration manually so you see the SQL run and any
   backfill timing:

   ```bash
   docker compose -f deploy/docker/docker-compose.yml \
       run --rm api \
       pnpm prisma migrate deploy \
         --schema packages/database/prisma/schema.prisma
   ```

3. Inspect the result. The command prints applied migrations and
   exits non-zero on failure. If the connection drops, the next
   step is a manual recovery (see Rollback).

4. Bring the API and worker back up:

   ```bash
   docker compose -f deploy/docker/docker-compose.yml \
       start api worker
   ```

5. Smoke test: `curl -I https://<api>/workspaces` should return
   `401` (auth required) within a few seconds.

### Strategy B: Expand-and-contract (for additive changes)

Use this for non-breaking schema changes (new tables, new columns with
defaults, new indexes). The `api` container is allowed to run
`prisma migrate deploy` on startup, but you still want CI to gate
that.

CI snippet:

```yaml
- name: Verify migrations apply to a clean database
  run: |
    docker compose -f deploy/docker/docker-compose.yml up -d postgres
    docker compose -f deploy/docker/docker-compose.yml \
        run --rm api pnpm prisma migrate deploy
    docker compose -f deploy/docker/docker-compose.yml down -v
```

If CI fails, the migration has a problem with the production
schema; fix the migration before tagging a release.

## Rollback

Prisma does not auto-generate down migrations. Two options:

1. **Restore from backup** (cleanest for big schema changes):

   ```bash
   docker compose -f deploy/docker/docker-compose.yml stop api worker
   docker exec -i creationflow-postgres \
     pg_restore --clean --if-exists -U creationflow -d creationflow \
     < deploy/backups/pre-<timestamp>.dump
   docker compose -f deploy/docker/docker-compose.yml start api worker
   ```

2. **Forward-fix**: write a new migration that compensates for the
   problem. This is the right path when the deployment has been live
   for a while and data has accumulated in the new shape.

The first option is preferred during a maintenance window. The second
is preferred in production with traffic.

## Backups

Schedule daily logical dumps with `pg_dump` plus weekly full
`pg_basebackup`:

```cron
# /etc/cron.d/creationflow-pgdump
0 2 * * * docker exec creationflow-postgres \
  pg_dump -U creationflow -d creationflow \
  -Fc -f /backups/daily-$(date +\%Y\%m\%d).dump
0 4 * * 0 docker exec creationflow-postgres \
  pg_basebackup -D /backups/weekly-$(date +\%Y\%m\%d) \
  -Ft -z -Xs -P
```

Mount a volume for `/backups` so the dumps survive container
restarts. Off-site copy with `rclone`, `aws s3 cp`, or your storage
provider of choice.

## Operational signals

Watch the API logs for `P2002` (unique constraint violation) and
`P2025` (record not found) after every migration. Either means
existing data blocks the migration; in production that's a
high-priority alert.

`prisma_migrations` is the source of truth for what has been
applied. Audit it as part of every release:

```sql
SELECT migration_name, started_at, finished_at, applied_steps_count
FROM _prisma_migrations
ORDER BY started_at DESC
LIMIT 20;
```

## CI/CD recipe

```yaml
jobs:
  deploy:
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: docker compose -f deploy/docker/docker-compose.yml build
      - name: Apply migrations
        run: |
          docker compose -f deploy/docker/docker-compose.yml \
              run --rm api \
              pnpm prisma migrate deploy
      - name: Smoke test
        run: |
          docker compose -f deploy/docker/docker-compose.yml up -d
          sleep 30
          curl -fsS https://staging.<DOMAIN>/version || exit 1
      - name: Roll out services
        run: |
          docker compose -f deploy/docker/docker-compose.yml \
              -f deploy/docker/docker-compose.proxy.yml up -d
```

The migration step and the smoke test are the safety net; if either
fails the rollout aborts and you stay on the previous image.

## Seed data

Production **does not** run `prisma db seed`. Seeds are an
operational convenience for local development and CI; production
data is created through the API. If you ever need to bootstrap a new
production workspace, do it through the Admin UI.
