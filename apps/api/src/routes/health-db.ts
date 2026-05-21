import type { FastifyInstance } from "fastify";

export async function registerHealthDbRoute(server: FastifyInstance): Promise<void> {
  server.get(
    "/health/db",
    {
      schema: {
        tags: ["System"],
        summary: "Database health check",
        response: {
          200: {
            type: "object",
            required: ["status", "database"],
            properties: {
              status: { type: "string", const: "ok" },
              database: { type: "string", const: "connected" },
            },
          },
          503: {
            type: "object",
            required: ["status", "database"],
            properties: {
              status: { type: "string", const: "error" },
              database: { type: "string", const: "unavailable" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        await server.db.$queryRaw`SELECT 1`;

        return {
          status: "ok",
          database: "connected",
        };
      } catch {
        return reply.code(503).send({
          status: "error",
          database: "unavailable",
        });
      }
    },
  );
}
