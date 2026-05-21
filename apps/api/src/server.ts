import Fastify from "fastify";
import multipart from "@fastify/multipart";

import type { ApiConfig } from "./config.js";
import { registerDatabase } from "./plugins/database.js";
import { registerOpenApi } from "./plugins/openapi.js";
import { registerStorage } from "./plugins/storage.js";
import { registerRoutes } from "./routes/index.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
  }
}

export async function createServer(config: ApiConfig) {
  const server = Fastify({
    logger: true,
  });

  server.decorate("config", config);

  await server.register(multipart, {
    limits: {
      fileSize: config.maxUploadBytes,
    },
  });

  await registerOpenApi(server, config);
  await registerDatabase(server, config);
  await registerStorage(server);
  await registerRoutes(server, config);

  return server;
}
