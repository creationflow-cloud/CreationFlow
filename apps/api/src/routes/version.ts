import type { FastifyInstance } from "fastify";

export async function registerVersionRoute(
  server: FastifyInstance,
  version: string,
): Promise<void> {
  server.get(
    "/version",
    {
      schema: {
        tags: ["System"],
        summary: "API version",
        response: {
          200: {
            type: "object",
            required: ["name", "version"],
            properties: {
              name: { type: "string", const: "CreationFlow API" },
              version: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({
      name: "CreationFlow API",
      version,
    }),
  );
}
