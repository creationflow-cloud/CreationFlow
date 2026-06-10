# Production logging and monitoring

This document captures the logging and monitoring design for the
CreationFlow API. It complements `MIGRATIONS.md` and `PROXY.md` as
part of the operational runbook.

## Logging

The API uses [Pino](https://getpino.io/) via Fastify's built-in
logger. Two log shapes are produced:

- **Production** (`NODE_ENV=production`): JSON, one object per line,
  suitable for Loki/CloudWatch/Stackdriver ingestion.
- **Development** (`NODE_ENV=development`): pretty-printed, colorized,
  human-friendly. Requires the `pino-pretty` dev dependency.

The log level is configured via `LOG_LEVEL` (default `info`) and
recognised values are `fatal`, `error`, `warn`, `info`, `debug`,
`trace`, `silent`. Anything else falls back to `info`.

### Request IDs

Every request receives a `requestId`. If the client sends a
reasonable `x-request-id` header (string, length 1-128) the server
reuses it; otherwise a UUID v4 is generated. The id is:

- attached to every log line emitted during the request lifecycle
- echoed back in the `x-request-id` response header
- accessible to handlers as `request.requestId`

This makes it easy to grep for a single transaction across the API,
the worker, and downstream services.

### What is logged

| Hook       | When                          | Level  | Fields                             |
| ---------- | ----------------------------- | ------ | ---------------------------------- |
| onRequest  | request received              | (none) | –                                  |
| onResponse | response fully sent           | info   | requestId, method, url, status, ms |
| onError    | uncaught error during request | error  | requestId, method, url, err        |

Body and query parameters are **not** logged to avoid leaking
secrets or PII. Sensitive data should be redacted at the source if
the team needs broader observability.

## Health and metrics

The API exposes the following endpoints:

- `GET /health` – liveness, returns `{ status: "ok" }` when the
  process is up.
- `GET /health/db` – readiness, pings the database.
- `GET /version` – service version, useful for rolling deploys.
- `GET /metrics` – Prometheus-compatible counters in plain text.

The `/metrics` endpoint exposes:

```
cf_requests_total                     # total requests served
cf_requests_by_status_total{status}   # 1xx, 2xx, 3xx, 4xx, 5xx buckets
cf_uptime_seconds                     # process uptime
cf_route_requests_total{method,route} # per-method+URL counter
```

These are intentionally minimal; the goal is to give the operator
visibility into traffic shape and error rate without standing up a
full APM stack.

## Recommended scrapers

A minimal Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: creationflow-api
    metrics_path: /metrics
    static_configs:
      - targets: [api.internal:3000]
```

Suggested alerts:

- `rate(cf_requests_by_status_total{status="5xx"}[5m]) > 1` for 5
  minutes → paging.
- `rate(cf_requests_total[5m]) == 0` for 10 minutes (and the
  service should be live) → liveness or routing break.
- `cf_uptime_seconds > 86400` triggers a rolling-restart
  reminder.

## Ship logs to your stack

Each log line is a single JSON object. Ingest it with your stack
of choice; the recommended snippet for `promtail` is:

```yaml
scrape_configs:
  - job_name: creationflow
    static_configs:
      - targets: [localhost]
        labels:
          job: creationflow-api
          __path__: /var/log/containers/creationflow-api-*.log
```

For CloudWatch, the `awslogs` driver already produces one JSON
object per line; set `awslogs-datetime-format` if you need a derived
timestamp.

## Local debugging

When investigating a production incident, set the log level
temporarily to `debug`:

```bash
docker compose -f deploy/docker/docker-compose.yml \
    -f deploy/docker/docker-compose.proxy.yml \
    exec api env LOG_LEVEL=debug \
        sh -c 'kill -HUP 1'
```

Or pull the running container's logs:

```bash
docker compose logs --tail=200 -f api
```

Then grep for the `requestId` reported by the affected client.
