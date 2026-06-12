import { Worker } from "bullmq";

export const RENDER_JOB_QUEUE_NAME = "creationflow-render-jobs";

export interface RenderJobQueuePayload {
  readonly jobId: string;
}

export interface RenderWorkerOptions {
  readonly backoffMs?: number;
  readonly apiKey?: string;
  readonly log?: WorkerLogger;
}

const SENSITIVE_LOG_KEYS = new Set([
  "x-api-key",
  "authorization",
  "api_token",
  "password",
  "secret",
  "credentials",
  "document",
  "body",
  "payload",
  "data",
]);

const REDACTED = "[REDACTED]";

export interface WorkerLogger {
  info: (bindings: Record<string, unknown>, message: string) => void;
  warn: (bindings: Record<string, unknown>, message: string) => void;
  error: (bindings: Record<string, unknown>, message: string) => void;
}

function redact(bindings: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bindings)) {
    if (SENSITIVE_LOG_KEYS.has(key.toLowerCase())) {
      out[key] = REDACTED;
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redact(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function writeLog(
  level: "info" | "warn" | "error",
  bindings: Record<string, unknown>,
  message: string,
): void {
  const payload = {
    level,
    time: new Date().toISOString(),
    component: "creationflow-worker",
    ...redact(bindings),
    message,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

const defaultLogger: WorkerLogger = {
  info: (bindings, message) => writeLog("info", bindings, message),
  warn: (bindings, message) => writeLog("warn", bindings, message),
  error: (bindings, message) => writeLog("error", bindings, message),
};

interface RedisConnectionOptions {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly db?: number;
}

function getRedisConnectionOptions(
  redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379",
): RedisConnectionOptions {
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
  };
}

export class PermanentRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentRenderError";
  }
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const TRANSIENT_NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "EPIPE",
  "EAI_FAIL",
  "ECONNABORTED",
]);

function isTransientNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") {
    return TRANSIENT_NETWORK_ERROR_CODES.has(code);
  }
  return false;
}

const MAX_BACKOFF_MS = 60_000;

export function createRenderWorker(
  options: RenderWorkerOptions = {},
): Worker<RenderJobQueuePayload> {
  const apiUrl = (process.env.API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const backoffMs = options.backoffMs ?? readEnvInt("RENDER_JOB_BACKOFF_MS", 2_000);
  const apiKey = options.apiKey ?? process.env.CREATIONFLOW_API_KEY?.trim();
  const logger = options.log ?? defaultLogger;

  return new Worker<RenderJobQueuePayload>(
    RENDER_JOB_QUEUE_NAME,
    async (job) => {
      const bindings = { jobId: job.data.jobId, attempt: job.attemptsMade + 1 };
      const startedAt = process.hrtime.bigint();
      logger.info({ ...bindings, event: "render.worker.start" }, "worker received render job");
      try {
        await performRenderRequest(apiUrl, job.data.jobId, fetch, { apiKey });
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        logger.info(
          { ...bindings, event: "render.worker.done", durationSeconds },
          "render request completed",
        );
      } catch (error) {
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        const err =
          error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) };
        logger.error(
          { ...bindings, event: "render.worker.failed", durationSeconds, err },
          "render request failed",
        );
        throw error;
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: readEnvInt("WORKER_CONCURRENCY", 2),
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          const exponential = backoffMs * Math.pow(2, Math.max(0, attemptsMade - 1));
          const jitter = Math.random() * 1000;
          return Math.min(exponential + jitter, MAX_BACKOFF_MS);
        },
      },
    },
  );
}

export interface PerformRenderRequestOptions {
  readonly apiKey?: string | undefined;
}

function buildRenderHeaders(options: PerformRenderRequestOptions): HeadersInit {
  const headers: Record<string, string> = {};
  if (options.apiKey) {
    headers["X-API-Key"] = options.apiKey;
  }
  return headers;
}

export async function performRenderRequest(
  apiUrl: string,
  jobId: string,
  fetcher: typeof fetch = fetch,
  options: PerformRenderRequestOptions = {},
): Promise<void> {
  let response: Response;
  try {
    response = await fetcher(`${apiUrl}/render-jobs/${jobId}/render`, {
      method: "POST",
      headers: buildRenderHeaders(options),
    });
  } catch (error) {
    if (isTransientNetworkError(error)) {
      const code = (error as { code?: string }).code ?? "UNKNOWN";
      throw new Error(
        `Render job ${jobId} hit transient network error (${code}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    throw new PermanentRenderError(
      `Render job ${jobId} hit permanent network error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    const body = await response.text();
    const isTransient =
      response.status >= 500 || response.status === 408 || response.status === 429;
    const message = `Render job ${jobId} failed through API (${response.status}): ${body}`;
    if (isTransient) {
      throw new Error(message);
    }
    throw new PermanentRenderError(message);
  }
}
