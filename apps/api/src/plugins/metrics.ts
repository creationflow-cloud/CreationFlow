import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface MetricsSnapshot {
  readonly total: number;
  readonly byStatus: Record<string, number>;
  readonly byRoute: Record<string, number>;
  readonly uptimeSeconds: number;
}

interface MetricsStore {
  readonly recordResponse: (method: string, url: string, status: number) => void;
  readonly render: () => string;
  readonly snapshot: () => MetricsSnapshot;
}

declare module "fastify" {
  interface FastifyInstance {
    metrics: MetricsStore;
  }
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
  const startedAt = process.hrtime.bigint();

  const store: MetricsStore = {
    recordResponse(method, url, status) {
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
    },
    snapshot() {
      return {
        total: total.count,
        byStatus: { ...byStatus },
        byRoute: { ...byRoute },
        uptimeSeconds: Number(process.hrtime.bigint() - startedAt) / 1e9,
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
      return lines.join("\n") + "\n";
    },
  };

  server.decorate("metrics", store);

  server.addHook("onResponse", (request: FastifyRequest, reply: FastifyReply, done) => {
    server.metrics.recordResponse(request.method, request.url, reply.statusCode);
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
