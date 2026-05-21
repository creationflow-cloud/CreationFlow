import { MemoryStorageProvider } from "@creationflow/storage";
import type { StorageProvider } from "@creationflow/storage";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    storage: StorageProvider;
  }
}

export async function registerStorage(server: FastifyInstance): Promise<void> {
  server.log.warn("Using MemoryStorageProvider. This is NOT suitable for production.");

  const storage = new MemoryStorageProvider();

  server.decorate("storage", storage);
}
