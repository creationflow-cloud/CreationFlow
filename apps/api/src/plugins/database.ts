import { createPrismaClient } from "@creationflow/database";
import type { PrismaClient } from "@creationflow/database";
import type { FastifyInstance } from "fastify";

import type { ApiConfig } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

export async function registerDatabase(server: FastifyInstance, config: ApiConfig): Promise<void> {
  if (!config.databaseUrl) {
    server.log.warn("DATABASE_URL is not set. Database health checks will report unavailable.");
  }

  const db = createPrismaClient();

  server.decorate("db", db);
  server.addHook("onClose", async (instance) => {
    await instance.db.$disconnect();
  });
}
