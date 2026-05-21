import type { FastifyInstance } from "fastify";

export async function registerVersionRoute(server: FastifyInstance, version: string): Promise<void> {
  server.get("/version", async () => ({
    name: "CreationFlow API",
    version,
  }));
}
