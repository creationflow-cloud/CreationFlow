import type { FastifyInstance } from "fastify";

export async function registerHealthRoute(server: FastifyInstance): Promise<void> {
  server.get("/health", async () => ({
    status: "ok",
    service: "creationflow-api",
  }));
}
