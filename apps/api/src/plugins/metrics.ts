import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface RenderJobMetricLabels {
  readonly status: string;
  readonly workspaceId: string;
}

interface MetricsStore {
  readonly recordResponse: (
    method: string,
    url: string,
    status: number,
    durationMs: number,
  ) => void;
  readonly recordRenderJob: (
    labels: RenderJobMetricLabels,
    durationSeconds: number,
    pdfSizeBytes: number,
  ) => void;
  readonly recordPreflightWarning: (code: string) => void;
  readonly recordStoragePut: (durationSeconds: number) => void;
  readonly setQueueSize: (state: string, count: number) => void;
  readonly render: () => string;
  readonly snapshot: () => MetricsSnapshot;
}

interface MetricsSnapshot {
  readonly total: number;
  readonly byStatus: Record<string, number>;
  readonly byRoute: Record<string, number>;
  readonly uptimeSeconds: number;
  readonly renderJobsByStatus: Record<string, number>;
  readonly preflightWarningTotal: number;
  readonly storagePutCount: number;
  readonly renderJobDurationCount: number;
  readonly renderJobPdfSizeCount: number;
  readonly apiRequestDurationCount: number;
  readonly queueSize: Record<string, number>;
}

const RENDER_JOB_DURATION_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120] as const;
const PDF_SIZE_BUCKETS = [
  1024, 10_240, 102_400, 1_048_576, 10_485_760, 52_428_800, 104_857_600,
] as const;
const API_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;
const STORAGE_PUT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] as const;

declare module "fastify" {
  interface FastifyInstance {
    metrics: MetricsStore;
  }
}

interface HistogramSeries {
  readonly buckets: readonly number[];
  readonly counts: number[];
  sum: number;
}

function newHistogram(buckets: readonly number[]): HistogramSeries {
  return { buckets, counts: new Array(buckets.length + 1).fill(0), sum: 0 };
}

function observe(histogram: HistogramSeries, value: number): void {
  for (let i = 0; i < histogram.buckets.length; i += 1) {
    const bucket = histogram.buckets[i] ?? Number.POSITIVE_INFINITY;
    if (value <= bucket) {
      histogram.counts[i] = (histogram.counts[i] ?? 0) + 1;
    }
  }
  histogram.counts[histogram.buckets.length] =
    (histogram.counts[histogram.buckets.length] ?? 0) + 1;
  histogram.sum += value;
}

function renderHistogram(
  metric: string,
  help: string,
  histogram: HistogramSeries,
  labels: Readonly<Record<string, string>>,
): string[] {
  const labelString = formatLabels(labels);
  const lines: string[] = [];
  lines.push(`# HELP ${metric} ${help}`);
  lines.push(`# TYPE ${metric} histogram`);
  for (let i = 0; i < histogram.buckets.length; i += 1) {
    const bucket = histogram.buckets[i];
    const count = histogram.counts[i] ?? 0;
    const bucketLabels = { ...labels, le: String(bucket) };
    lines.push(`${metric}_bucket${formatLabels(bucketLabels)} ${count}`);
  }
  lines.push(
    `${metric}_bucket${formatLabels({ ...labels, le: "+Inf" })} ${histogram.counts[histogram.buckets.length] ?? 0}`,
  );
  lines.push(`${metric}_sum${labelString} ${histogram.sum.toFixed(3)}`);
  lines.push(`${metric}_count${labelString} ${histogram.counts[histogram.buckets.length] ?? 0}`);
  return lines;
}

function formatLabels(labels: Readonly<Record<string, string>>): string {
  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return "";
  }
  const parts = keys.map((key) => {
    const value = String(labels[key] ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    return `${key}="${value}"`;
  });
  return `{${parts.join(",")}}`;
}

export async function registerMetrics(server: FastifyInstance): Promise<void> {
  const total = { count: 0 };
  const byStatus: Record<string, number> = {
    "1xx": 0,
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  };
  const byRoute: Record<string, number> = {};
  const renderJobsByStatus: Record<string, number> = {};
  const startedAt = process.hrtime.bigint();

  const renderDuration = newHistogram(RENDER_JOB_DURATION_BUCKETS);
  const pdfSize = newHistogram(PDF_SIZE_BUCKETS);
  const preflightWarnings: Record<string, number> = {};
  const storagePutDuration = newHistogram(STORAGE_PUT_BUCKETS);
  const apiRequestDuration = newHistogram(API_DURATION_BUCKETS);
  const queueSize: Record<string, number> = {};

  const store: MetricsStore = {
    recordResponse(method, url, status, durationMs) {
      total.count += 1;
      const bucket =
        status >= 500
          ? "5xx"
          : status >= 400
            ? "4xx"
            : status >= 300
              ? "3xx"
              : status >= 200
                ? "2xx"
                : "1xx";
      byStatus[bucket] = (byStatus[bucket] ?? 0) + 1;
      const key = `${method} ${url}`;
      byRoute[key] = (byRoute[key] ?? 0) + 1;
      observe(apiRequestDuration, Math.max(0, durationMs) / 1000);
    },
    recordRenderJob(labels, durationSeconds, pdfSizeBytes) {
      const status = labels.status;
      const key = `${labels.workspaceId}|${status}`;
      renderJobsByStatus[key] = (renderJobsByStatus[key] ?? 0) + 1;
      observe(renderDuration, Math.max(0, durationSeconds));
      if (pdfSizeBytes > 0) {
        observe(pdfSize, pdfSizeBytes);
      }
    },
    recordPreflightWarning(code) {
      const safe = code || "unknown";
      preflightWarnings[safe] = (preflightWarnings[safe] ?? 0) + 1;
    },
    recordStoragePut(durationSeconds) {
      observe(storagePutDuration, Math.max(0, durationSeconds));
    },
    setQueueSize(state, count) {
      queueSize[state] = Math.max(0, Math.floor(count));
    },
    snapshot() {
      return {
        total: total.count,
        byStatus: { ...byStatus },
        byRoute: { ...byRoute },
        uptimeSeconds: Number(process.hrtime.bigint() - startedAt) / 1e9,
        renderJobsByStatus: { ...renderJobsByStatus },
        preflightWarningTotal: Object.values(preflightWarnings).reduce((a, b) => a + b, 0),
        storagePutCount: storagePutDuration.counts[storagePutDuration.buckets.length] ?? 0,
        renderJobDurationCount: renderDuration.counts[renderDuration.buckets.length] ?? 0,
        renderJobPdfSizeCount: pdfSize.counts[pdfSize.buckets.length] ?? 0,
        apiRequestDurationCount: apiRequestDuration.counts[apiRequestDuration.buckets.length] ?? 0,
        queueSize: { ...queueSize },
      };
    },
    render() {
      const snap = store.snapshot();
      const lines: string[] = [];
      lines.push(`# HELP cf_requests_total Total HTTP requests served.`);
      lines.push(`# TYPE cf_requests_total counter`);
      lines.push(`cf_requests_total ${snap.total}`);
      lines.push(`# HELP cf_requests_by_status_total Requests by HTTP status bucket.`);
      lines.push(`# TYPE cf_requests_by_status_total counter`);
      for (const [bucket, value] of Object.entries(snap.byStatus)) {
        lines.push(`cf_requests_by_status_total{status="${bucket}"} ${value}`);
      }
      lines.push(`# HELP cf_uptime_seconds Process uptime in seconds.`);
      lines.push(`# TYPE cf_uptime_seconds gauge`);
      lines.push(`cf_uptime_seconds ${snap.uptimeSeconds.toFixed(3)}`);
      lines.push(`# HELP cf_route_requests_total Requests grouped by method+route.`);
      lines.push(`# TYPE cf_route_requests_total counter`);
      const sorted = Object.entries(snap.byRoute).sort((a, b) => b[1] - a[1]);
      for (const [route, value] of sorted) {
        const [method = "?", url = "?"] = route.split(" ", 2);
        lines.push(`cf_route_requests_total{method="${method}",route="${url}"} ${value}`);
      }

      lines.push(
        "# HELP creationflow_render_jobs_total Render jobs grouped by status and workspace.",
      );
      lines.push(`# TYPE creationflow_render_jobs_total counter`);
      for (const [key, value] of Object.entries(snap.renderJobsByStatus)) {
        const [workspaceId = "unknown", status = "unknown"] = key.split("|", 2);
        lines.push(
          `creationflow_render_jobs_total{status="${status}",workspace_id="${workspaceId}"} ${value}`,
        );
      }

      lines.push(
        ...renderHistogram(
          "creationflow_render_job_duration_seconds",
          "End-to-end render duration in seconds.",
          renderDuration,
          {},
        ),
      );
      lines.push(
        ...renderHistogram(
          "creationflow_render_job_pdf_size_bytes",
          "Generated PDF size in bytes.",
          pdfSize,
          {},
        ),
      );
      lines.push("# HELP creationflow_render_preflight_warnings_total Preflight warnings by code.");
      lines.push(`# TYPE creationflow_render_preflight_warnings_total counter`);
      for (const [code, value] of Object.entries(preflightWarnings)) {
        lines.push(`creationflow_render_preflight_warnings_total{code="${code}"} ${value}`);
      }
      lines.push(
        ...renderHistogram(
          "creationflow_storage_put_duration_seconds",
          "Storage PUT duration in seconds.",
          storagePutDuration,
          {},
        ),
      );
      lines.push(
        ...renderHistogram(
          "creationflow_render_api_request_duration_seconds",
          "HTTP request duration in seconds.",
          apiRequestDuration,
          {},
        ),
      );
      lines.push("# HELP creationflow_render_queue_size Render queue size by state.");
      lines.push(`# TYPE creationflow_render_queue_size gauge`);
      for (const [state, value] of Object.entries(snap.queueSize)) {
        lines.push(`creationflow_render_queue_size{state="${state}"} ${value}`);
      }

      return lines.join("\n") + "\n";
    },
  };

  server.decorate("metrics", store);

  server.addHook("onResponse", (request: FastifyRequest, reply: FastifyReply, done) => {
    const durationMs = reply.elapsedTime ?? 0;
    server.metrics.recordResponse(request.method, request.url, reply.statusCode, durationMs);
    done();
  });
}

export async function metricsRoute(
  this: FastifyInstance,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  void this;
  reply.header("content-type", "text/plain; version=0.0.4");
  return reply.send(this.metrics.render());
}

/**
 * Resolves the metrics store on a Fastify instance, or returns a no-op store
 * when called outside a request context (for example from background code
 * or unit tests that did not register the metrics plugin).
 */
export function resolveMetrics(target?: FastifyInstance): MetricsStore {
  if (target && target.metrics) {
    return target.metrics;
  }

  const noop = (): void => {};
  return {
    recordResponse: noop,
    recordRenderJob: noop,
    recordPreflightWarning: noop,
    recordStoragePut: noop,
    setQueueSize: noop,
    render: () => "",
    snapshot: () => ({
      total: 0,
      byStatus: {},
      byRoute: {},
      uptimeSeconds: 0,
      renderJobsByStatus: {},
      preflightWarningTotal: 0,
      storagePutCount: 0,
      renderJobDurationCount: 0,
      renderJobPdfSizeCount: 0,
      apiRequestDurationCount: 0,
      queueSize: {},
    }),
  };
}

export type { MetricsStore };
