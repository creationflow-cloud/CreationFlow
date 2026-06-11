import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export const REQUEST_ID_HEADER = "x-request-id";

export async function registerLogging(server: FastifyInstance) {
  server.addHook("onRequest", (request: FastifyRequest, _reply, done) => {
    const incoming = request.headers[REQUEST_ID_HEADER];
    const id =
      typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128
        ? incoming
        : randomUUID();
    request.requestId = id;
    request.headers[REQUEST_ID_HEADER] = id;
    done();
  });

  server.addHook("onResponse", (request, reply, done) => {
    const method = request.method;
    const url = request.url;
    const status = reply.statusCode;
    const ms = reply.elapsedTime?.toFixed(1) ?? "?";
    const rid = request.requestId ?? "-";
    server.log.info({ requestId: rid, method, url, status, ms: Number(ms) }, "request completed");
    done();
  });

  server.addHook("onError", (request, _reply, error, done) => {
    const rid = request.requestId ?? "-";
    server.log.error(
      {
        requestId: rid,
        method: request.method,
        url: request.url,
        err: error,
      },
      "request failed",
    );
    done();
  });

  server.addHook("onSend", (request: FastifyRequest, reply: FastifyReply, payload, done) => {
    if (reply.hasHeader(REQUEST_ID_HEADER) === false) {
      void reply.header(REQUEST_ID_HEADER, request.requestId ?? "-");
    }
    done(null, payload);
  });
}

const SENSITIVE_KEYS = new Set([
  "x-api-key",
  "xapikey",
  "x_api_key",
  "authorization",
  "cookie",
  "set-cookie",
  "api_token",
  "api-token",
  "apitoken",
  "password",
  "secret",
  "credentials",
  "document",
  "documentjson",
  "body",
  "payload",
  "data",
  "apikey",
]);

const REDACTION_PLACEHOLDER = "[REDACTED]";

/**
 * Recursively strip sensitive fields from objects destined for log lines.
 * The function mutates and returns the same object reference so callers can
 * pass log payloads directly.
 */
export function redactSensitive<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      redactSensitive(item);
    }
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      (value as Record<string, unknown>)[key] = REDACTION_PLACEHOLDER;
      continue;
    }
    const child = (value as Record<string, unknown>)[key];
    if (child && typeof child === "object") {
      redactSensitive(child);
    }
  }
  return value;
}

export interface ChildLogger {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
}

/**
 * Create a child logger that strips sensitive fields and tags every entry
 * with a stable set of correlation ids (`jobId`, `requestId`,
 * `workspaceId`, `component`). The returned object exposes `info`,
 * `warn`, and `error` only — never `debug` or `trace` — so callers
 * cannot accidentally log raw request bodies.
 */
export function getChildLogger(bindings: Record<string, string> = {}): ChildLogger {
  const baseBindings = redactSensitive({ ...bindings });
  const wrap =
    (level: "info" | "warn" | "error") =>
    (obj: Record<string, unknown>, msg: string): void => {
      const merged = { ...baseBindings, ...redactSensitive({ ...obj }) };
      // eslint-disable-next-line no-console
      const line = JSON.stringify({ level, time: new Date().toISOString(), ...merged, msg });
      if (level === "error") {
        // eslint-disable-next-line no-console
        process.stderr.write(line + "\n");
      } else {
        // eslint-disable-next-line no-console
        process.stdout.write(line + "\n");
      }
    };

  return {
    info: wrap("info"),
    warn: wrap("warn"),
    error: wrap("error"),
  };
}
