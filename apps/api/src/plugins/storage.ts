import { FileSystemStorageProvider } from "@creationflow/storage";
import type { StorageProvider } from "@creationflow/storage";
import type { FastifyInstance } from "fastify";
import { mkdir } from "node:fs/promises";

declare module "fastify" {
  interface FastifyInstance {
    storage: StorageProvider;
  }
}

export async function registerStorage(server: FastifyInstance): Promise<void> {
  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  const baseUrl = process.env.API_URL ?? `http://${server.config.host}:${server.config.port}`;

  await mkdir(uploadDir, { recursive: true });

  server.log.info({ uploadDir, baseUrl }, "Using FileSystemStorageProvider.");

  const storage = new FileSystemStorageProvider({ uploadDir, baseUrl });

  server.decorate("storage", storage);
}
