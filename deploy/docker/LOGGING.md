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

### Render pipeline correlation

Render jobs are correlated across the API and the worker via three
fields:

- `requestId` — the API request that triggered the render
- `jobId` — the render job identifier
- `workspaceId` — the workspace that owns the configuration

The API's `getChildLogger` (in `apps/api/src/plugins/logging.ts`) and
the worker's own `WorkerLogger` (in `apps/worker/src/jobs.ts`) both
emit structured JSON with these fields on every line. A typical
line looks like:

```json
{
  "level": "info",
  "time": "2026-06-11T10:51:06.649Z",
  "jobId": "job-1",
  "workspaceId": "ws-1",
  "event": "render.done",
  "status": "done",
  "durationSeconds": 0.02,
  "pdfSizeBytes": 1376,
  "warningCount": 0,
  "msg": "render completed"
}
```

### Sensitive data redaction

Both the API and the worker apply a `redactSensitive` filter before
emitting log lines. The filter replaces the following keys (case
insensitive) with `[REDACTED]`:

- `x-api-key`, `xapikey`, `x_api_key`
- `authorization`, `cookie`, `set-cookie`
- `api_token`, `api-token`, `apitoken`, `apikey`
- `password`, `secret`, `credentials`
- `document`, `body`, `payload`, `data`

The `apps/api/src/plugins/observability.test.ts` smoke test
asserts that `apiKey` / `api_token` are absent from serialized
log output and replaced with the placeholder.

### What is logged

| Hook       | When                          | Level  | Fields                             |
| ---------- | ----------------------------- | ------ | ---------------------------------- |
| onRequest  | request received              | (none) | –                                  |
| onResponse | response fully sent           | info   | requestId, method, url, status, ms |
| onError    | uncaught error during request | error  | requestId, method, url, err        |

In addition, the render pipeline emits `render.start`, `render.done`,
`render.failed`, and `render.route.start` events with the structured
fields listed above. Body and query parameters are **not** logged to
avoid leaking secrets or PII.

## Health and metrics

The API exposes the following endpoints:

- `GET /health` – liveness, returns `{ status: "ok" }` when the
  process is up. This is what an orchestrator should consult to
  decide whether to restart the container.
- `GET /health/db` – readiness, pings the database. Remove the pod
  from the load-balancer rotation when this fails.
- `GET /health/redis` – readiness, pings the BullMQ queue. Returns
  the per-state job counts in `jobs` so the operator can see
  whether the queue is draining.
- `GET /version` – service version, useful for rolling deploys.
- `GET /metrics` – Prometheus-compatible counters and histograms in
  plain text.

The `/metrics` endpoint exposes:

```
cf_requests_total                                       # total requests served
cf_requests_by_status_total{status}                     # 1xx, 2xx, 3xx, 4xx, 5xx buckets
cf_uptime_seconds                                       # process uptime
cf_route_requests_total{method,route}                  # per-method+URL counter

creationflow_render_jobs_total{status,workspace_id}     # done/failed by workspace
creationflow_render_job_duration_seconds_bucket        # render duration histogram
creationflow_render_job_pdf_size_bytes_bucket          # generated PDF size histogram
creationflow_render_preflight_warnings_total{code}     # preflight warning counter
creationflow_storage_put_duration_seconds_bucket        # storage PUT histogram
creationflow_render_api_request_duration_seconds_bucket # API request duration histogram
creationflow_render_queue_size{state}                   # BullMQ queue gauge (waiting/active/delayed/failed/completed)
```

The API scrapes BullMQ on every `/metrics` call and refreshes the
queue gauge, so a Prometheus scrape interval of 15-30s is enough to
track queue depth.

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
- `histogram_quantile(0.95, rate(creationflow_render_job_duration_seconds_bucket[5m])) > 30`
  → page on p95 render time.
- `creationflow_render_queue_size{state="waiting"} > 100` for
  more than 10 minutes → worker pool is too small.
- `rate(creationflow_render_jobs_total{status="failed"}[5m]) > 0.1`
  → investigate preflight warnings + `render.failed` log lines.

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

## Runbook

### "Render is stuck"

1. `curl http://api.internal:3000/health/redis` and check the
   `jobs` field. If `waiting`/`active` is unusually high, the worker
   pool is undersized.
2. Grep the worker logs for `event=render.worker.failed` and the
   `jobId` from the stuck job. Look for transient (5xx) vs
   permanent (4xx) errors.
3. `curl http://api.internal:3000/metrics | grep creationflow_render_jobs_total`
   to see the failure rate by workspace.

### "API key in logs"

This is a P0 incident. `redactSensitive` is in place both in the
API (`apps/api/src/plugins/logging.ts`) and the worker
(`apps/worker/src/jobs.ts`). Add a unit test under
`apps/api/src/plugins/observability.test.ts` that captures the
redaction contract so it cannot regress.

### "Metrics endpoint returns 5xx"

`/metrics` calls `refreshQueueSizeMetrics` which touches BullMQ.
A Redis outage will make that call fail; the route handler logs
a warning and falls back to the in-process counter values, so
the endpoint should still return 200. If it doesn't, the API
itself is wedged and needs a restart.

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

Then grep for the `requestId` or `jobId` reported by the affected
client.
