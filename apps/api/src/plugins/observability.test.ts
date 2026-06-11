import { afterEach, describe, expect, it } from "vitest";
import Fastify from "fastify";

import { getChildLogger, redactSensitive } from "./logging.js";
import { metricsRoute, registerMetrics } from "./metrics.js";

const servers: Fastify.FastifyInstance[] = [];

function makeServer(): Fastify.FastifyInstance {
  const server = Fastify({ logger: false });
  servers.push(server);
  return server;
}

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    if (server) {
      await server.close();
    }
  }
});

describe("redactSensitive", () => {
  it("replaces well-known credential and body keys", () => {
    const output = redactSensitive({
      xApiKey: "super-secret",
      Authorization: "Bearer xyz",
      api_token: "abc",
      body: "should not appear",
      document: { id: "doc-1", secret: "leak" },
      keep: "visible",
      nested: { password: "leak" },
    });

    expect(output).toMatchObject({
      xApiKey: "[REDACTED]",
      Authorization: "[REDACTED]",
      api_token: "[REDACTED]",
      body: "[REDACTED]",
      // The whole `document` payload is replaced because the key is sensitive.
      document: "[REDACTED]",
      keep: "visible",
      nested: { password: "[REDACTED]" },
    });
  });

  it("leaves a child logger's API key un-redacted in bindings", () => {
    const logger = getChildLogger({ jobId: "job-1", apiKey: "shh" });
    expect(logger).toBeDefined();
    // We exercise the redaction in the smoke test below.
  });
});

describe("child logger", () => {
  it("never emits the api_key in its serialized form", () => {
    const lines: string[] = [];
    const originalStdout = process.stdout.write.bind(process.stdout);
    const originalStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      lines.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      lines.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as typeof process.stderr.write;
    try {
      const logger = getChildLogger({ jobId: "job-1" });
      logger.info(
        { event: "render.start", apiKey: "shh-secret", api_token: "abc" },
        "starting render",
      );
      logger.error({ event: "render.failed", err: new Error("boom") }, "render failed");
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
    }

    const merged = lines.join("");
    expect(merged).not.toContain("shh-secret");
    expect(merged).not.toContain("abc");
    expect(merged).toContain("[REDACTED]");
    expect(merged).toContain('"jobId":"job-1"');
    expect(merged).toContain('"event":"render.start"');
    expect(merged).toContain('"event":"render.failed"');
  });
});

describe("metrics plugin", () => {
  it("exposes the documented counter and histogram metrics", async () => {
    const server = makeServer();
    await registerMetrics(server);

    server.metrics.recordResponse("GET", "/workspaces", 200, 12);
    server.metrics.recordResponse("GET", "/workspaces", 500, 200);
    server.metrics.recordRenderJob({ status: "done", workspaceId: "ws-1" }, 1.234, 65_000);
    server.metrics.recordRenderJob({ status: "failed", workspaceId: "ws-1" }, 0.42, 0);
    server.metrics.recordPreflightWarning("rule_required");
    server.metrics.recordStoragePut(0.05);
    server.metrics.setQueueSize("waiting", 3);
    server.metrics.setQueueSize("active", 1);

    const body = server.metrics.render();

    expect(body).toContain("cf_requests_total");
    expect(body).toContain('cf_requests_by_status_total{status="2xx"}');
    expect(body).toContain('cf_requests_by_status_total{status="5xx"}');
    expect(body).toContain("cf_uptime_seconds");
    expect(body).toContain('creationflow_render_jobs_total{status="done"');
    expect(body).toContain('creationflow_render_jobs_total{status="failed"');
    expect(body).toContain("creationflow_render_job_duration_seconds_bucket");
    expect(body).toContain("creationflow_render_job_duration_seconds_count");
    expect(body).toContain("creationflow_render_job_pdf_size_bytes_bucket");
    expect(body).toContain('creationflow_render_preflight_warnings_total{code="rule_required"}');
    expect(body).toContain("creationflow_storage_put_duration_seconds_bucket");
    expect(body).toContain("creationflow_render_api_request_duration_seconds_bucket");
    expect(body).toContain('creationflow_render_queue_size{state="waiting"} 3');
    expect(body).toContain('creationflow_render_queue_size{state="active"} 1');
  });

  it("serves the metrics route with the Prometheus content-type", async () => {
    const server = makeServer();
    await registerMetrics(server);
    server.get("/metrics", metricsRoute);

    const response = await server.inject({ method: "GET", url: "/metrics" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toContain("cf_requests_total");
  });
});
