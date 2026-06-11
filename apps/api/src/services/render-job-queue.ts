import { Queue } from "bullmq";

import type { FastifyInstance } from "fastify";

export const RENDER_JOB_QUEUE_NAME = "creationflow-render-jobs";

export interface RenderJobQueuePayload {
  readonly jobId: string;
}

let queue: Queue<RenderJobQueuePayload> | undefined;

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

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getRenderJobMaxAttempts(): number {
  return readEnvInt("RENDER_JOB_MAX_ATTEMPTS", 3);
}

export function getRenderJobQueue(): Queue<RenderJobQueuePayload> {
  queue ??= new Queue<RenderJobQueuePayload>(RENDER_JOB_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: getRenderJobMaxAttempts(),
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });

  return queue;
}

export async function enqueueRenderJob(jobId: string): Promise<void> {
  await getRenderJobQueue().add(
    "render",
    { jobId },
    {
      jobId,
      attempts: getRenderJobMaxAttempts(),
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );
}

export async function closeRenderJobQueue(): Promise<void> {
  await queue?.close();
  queue = undefined;
}

/**
 * Refresh the BullMQ queue gauges on the supplied Fastify instance's
 * metrics store. Best-effort: callers are expected to swallow errors
 * so that a Redis outage cannot break the `/metrics` endpoint.
 */
export async function refreshQueueSizeMetrics(server: FastifyInstance): Promise<void> {
  if (!server.metrics) {
    return;
  }
  const counts = await getRenderJobQueue().getJobCounts();
  for (const [state, count] of Object.entries(counts)) {
    server.metrics.setQueueSize(state, count);
  }
}
