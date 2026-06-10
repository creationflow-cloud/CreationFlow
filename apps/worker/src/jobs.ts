import { Worker } from "bullmq";

export const RENDER_JOB_QUEUE_NAME = "creationflow-render-jobs";

export interface RenderJobQueuePayload {
  readonly jobId: string;
}

export interface RenderWorkerOptions {
  readonly maxAttempts?: number;
  readonly backoffMs?: number;
}

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

export function createRenderWorker(
  options: RenderWorkerOptions = {},
): Worker<RenderJobQueuePayload> {
  const apiUrl = (process.env.API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const maxAttempts = options.maxAttempts ?? readEnvInt("RENDER_JOB_MAX_ATTEMPTS", 3);
  const backoffMs = options.backoffMs ?? readEnvInt("RENDER_JOB_BACKOFF_MS", 2_000);

  return new Worker<RenderJobQueuePayload>(
    RENDER_JOB_QUEUE_NAME,
    async (job) => {
      await performRenderRequest(apiUrl, job.data.jobId, fetch);
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: readEnvInt("WORKER_CONCURRENCY", 2),
      settings: {
        backoffStrategy: (attemptsMade: number) =>
          backoffMs * Math.pow(2, Math.max(0, attemptsMade - 1)),
      },
    },
  );
}

export async function performRenderRequest(
  apiUrl: string,
  jobId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(`${apiUrl}/render-jobs/${jobId}/render`, {
    method: "POST",
  });

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
