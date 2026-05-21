import type { FastifyInstance } from "fastify";

export async function registerHealthRoute(server: FastifyInstance): Promise<void> {
  server.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        summary: "Health check",
        response: {
          200: {
            type: "object",
            required: ["status", "service"],
            properties: {
              status: { type: "string", const: "ok" },
              service: { type: "string", const: "creationflow-api" },
            },
          },
        },
      },
    },
    async () => ({
      status: "ok",
      service: "creationflow-api",
    }),
  );
}
