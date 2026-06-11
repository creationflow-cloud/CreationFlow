import type { FastifyInstance } from "fastify";

import { getRenderJobQueue } from "../services/render-job-queue.js";

export async function registerHealthRedisRoute(server: FastifyInstance): Promise<void> {
  server.get(
    "/health/redis",
    {
      schema: {
        tags: ["System"],
        summary: "Redis health check",
        response: {
          200: {
            type: "object",
            required: ["status", "redis"],
            properties: {
              status: { type: "string", const: "ok" },
              redis: { type: "string", const: "connected" },
            },
          },
          503: {
            type: "object",
            required: ["status", "redis"],
            properties: {
              status: { type: "string", const: "error" },
              redis: { type: "string", const: "unavailable" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const counts = await getRenderJobQueue().getJobCounts();
        return {
          status: "ok",
          redis: "connected",
          jobs: counts,
        };
      } catch {
        return reply.code(503).send({
          status: "error",
          redis: "unavailable",
        });
      }
    },
  );
}
